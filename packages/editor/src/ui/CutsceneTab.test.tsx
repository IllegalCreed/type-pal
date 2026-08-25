// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import { CutsceneTab } from './CutsceneTab.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
  setCatalogSearch,
} from './catalog-controls-test-utils.js'

vi.mock('./FrameAnimationEditor.js', () => ({
  FrameAnimationEditor: (props: { onDirtyChange: (dirty: boolean) => void }) => (
    <button type="button" data-testid="mark-frame-dirty" onClick={() => props.onDirtyChange(true)}>
      标记帧动画已修改
    </button>
  ),
}))

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('CutsceneTab catalog controls', () => {
  test('filters both resource groups while preserving the total header count and group actions', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          assetReferences={[]}
          assetReferenceStatus="current"
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={catalogControlsReader as never}
          session={session}
          focusObjectId="video.opening"
        />,
      )
      await Promise.resolve()
    })
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('3 项')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索过场资源"]')!
    await setCatalogSearch(search, '片尾')
    expect(host.querySelectorAll('.cutscene-asset-list .ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.cutscene-asset-list')?.textContent).toContain('片尾视频')
    expect(
      host.querySelector('.cutscene-asset-list .ds-catalog-row[data-selected="true"]'),
    ).toBeNull()
    expect(
      host.querySelector('.cutscene-main > .ds-object-hero .ds-object-hero__title')?.textContent,
    ).toBe('开场视频')
    expect(
      host.querySelector('.cutscene-main > .ds-object-hero .ds-object-hero__id')?.textContent,
    ).toBe('video.opening')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('3 项')
    expect(host.querySelector('[aria-label="导入视频"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="导入帧动画"]')).not.toBeNull()

    await setCatalogSearch(search, '不存在')
    expect(host.querySelectorAll('.cutscene-asset-list .ds-catalog-row')).toHaveLength(0)
    expect(host.querySelector('.cutscene-outliner')?.textContent).toContain('没有匹配的视频。')
    expect(host.querySelector('.cutscene-outliner')?.textContent).toContain('没有匹配的帧动画。')
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.cutscene-asset-list .ds-catalog-row')).toHaveLength(3)
    expect(
      host.querySelector('.cutscene-asset-list .ds-catalog-row[data-selected="true"]')?.textContent,
    ).toContain('开场视频')
  })

  test('distinguishes an empty project from a filtered empty result', async () => {
    const emptyCatalog = { version: 1, assets: {} } as const
    const session = new EditSession(catalogControlsEditorState(emptyCatalog))
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          assetReferences={[]}
          assetReferenceStatus="current"
          assetBase={{} as never}
          catalog={emptyCatalog}
          reader={catalogControlsReader as never}
          session={session}
        />,
      )
      await Promise.resolve()
    })

    expect(host.querySelector('.cutscene-outliner')?.textContent).toContain('此项目还没有视频。')
    expect(host.querySelector('.cutscene-outliner')?.textContent).toContain('此项目还没有帧动画。')
    expect(host.querySelector('.cutscene-empty-workspace')?.textContent).toContain('还没有过场资源')
  })

  test('fails closed when the live shared script still references the selected video', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const readBytes = vi.fn(catalogControlsReader.readBytes)
    const currentAuthor = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/live-video': {
          name: '实时过场脚本',
          self: 'none',
          body: [{ kind: 'playVideo', asset: 'video.opening' }],
        },
      },
    } as never
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          assetReferences={collectEditorAssetReferences(session.getState(), currentAuthor)}
          assetReferenceStatus="current"
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={{ ...catalogControlsReader, readBytes } as never}
          session={session}
          focusObjectId="video.opening"
          currentAuthor={currentAuthor}
        />,
      )
      await Promise.resolve()
    })

    const hero = host.querySelector('.cutscene-main > .ds-object-hero')!
    const deleteButton = [...hero.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除',
    )!
    await act(async () => deleteButton.click())

    const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-label="删除过场资源"]')!
    expect(dialog.open).toBe(true)
    expect(dialog.textContent).toContain('引用')
    expect(dialog.textContent).toContain('1 处')
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除资源',
    )!
    expect(confirm.disabled).toBe(true)
    const readsBeforeConfirm = readBytes.mock.calls.length
    await act(async () => confirm.click())
    expect(session.getState().assetCatalog.assets['video.opening']).toBeDefined()
    expect(readBytes).toHaveBeenCalledTimes(readsBeforeConfirm)
  })

  test('keeps frame edits dirty when replacement is confirmed but the file picker is cancelled', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          assetReferences={[]}
          assetReferenceStatus="current"
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={catalogControlsReader as never}
          session={session}
          focusObjectId="frame-animation.logo"
        />,
      )
      await Promise.resolve()
    })

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="mark-frame-dirty"]')!.click()
    })
    const hero = host.querySelector('.cutscene-main > .ds-object-hero')!
    const replaceButton = [...hero.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '替换',
    )!
    await act(async () => replaceButton.click())

    const firstDialog = host.querySelector<HTMLDialogElement>(
      'dialog[aria-label="放弃未保存修改"]',
    )!
    const discard = [...firstDialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '放弃并继续',
    )!
    await act(async () => discard.click())
    expect(firstDialog.open).toBe(false)

    const videoRow = [...host.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find((row) =>
      row.textContent?.includes('开场视频'),
    )!
    await act(async () => videoRow.click())

    const secondDialog = host.querySelector<HTMLDialogElement>(
      'dialog[aria-label="放弃未保存修改"]',
    )!
    expect(secondDialog.open).toBe(true)
    expect(secondDialog.textContent).toContain('开场视频')
  })
})
