// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { CutsceneTab } from './CutsceneTab.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
} from './catalog-controls-test-utils.js'

vi.mock('./FrameAnimationEditor.js', () => ({
  FrameAnimationEditor: (props: { onDirtyChange: (dirty: boolean) => void }) => (
    <button type="button" data-testid="mark-frame-dirty" onClick={() => props.onDirtyChange(true)}>
      标记帧动画已修改
    </button>
  ),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

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
  test('shows both resource groups without a redundant catalog search', async () => {
    const catalog = structuredClone(catalogControlsAssetCatalog)
    delete catalog.assets['frame-animation.logo']!.label
    const session = new EditSession(catalogControlsEditorState(catalog))
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          referenceIndex={collectCurrentProjectReferenceIndex(session.getState())}
          referenceStatus="current"
          getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
          assetBase={{} as never}
          catalog={catalog}
          reader={catalogControlsReader as never}
          session={session}
          focusObjectId="video.opening"
        />,
      )
      await Promise.resolve()
    })
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('3 项')
    expect(host.querySelector('input[aria-label="搜索过场资源"]')).toBeNull()
    const groups = host.querySelectorAll<HTMLElement>('.cutscene-library-section')
    expect(groups).toHaveLength(2)
    expect(groups[0]?.querySelector('.ds-catalog-group-header__title')?.textContent).toBe('视频')
    expect(groups[0]?.querySelector('.ds-catalog-group-header__count')?.textContent).toBe('2')
    expect(groups[1]?.querySelector('.ds-catalog-group-header__title')?.textContent).toBe(
      '帧动画',
    )
    expect(groups[1]?.querySelector('.ds-catalog-group-header__count')?.textContent).toBe('1')
    expect(
      host.querySelector('.cutscene-main > .ds-object-hero .ds-object-hero__title')?.textContent,
    ).toBe('开场视频')
    expect(
      host.querySelector('.cutscene-main > .ds-object-hero .ds-object-hero__id')?.textContent,
    ).toBe('video.opening')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('3 项')
    expect(host.querySelector('[aria-label="导入视频"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="导入帧动画"]')).not.toBeNull()
    const rows = host.querySelectorAll<HTMLElement>('.cutscene-asset-list .ds-catalog-row')
    expect(rows).toHaveLength(3)
    expect([...rows].map((row) => row.dataset.leading)).toEqual(['none', 'none', 'none'])
    const selected = host.querySelector(
      '.cutscene-asset-list .ds-catalog-row[data-selected="true"]',
    )!
    expect(selected.querySelector('.ds-catalog-row__leading')).toBeNull()
    expect(selected.querySelector('.ds-catalog-row__title')?.textContent).toBe('开场视频')
    expect(selected.querySelector('.ds-catalog-row__meta')?.textContent).toBe('video.opening')
    const unnamed = [...rows].find(
      (row) => row.querySelector('.ds-catalog-row__meta')?.textContent === 'frame-animation.logo',
    )!
    expect(unnamed.querySelector('.ds-catalog-row__title')?.textContent).toBe('未命名帧动画')
    expect(unnamed.querySelector('.ds-catalog-row__title')?.textContent).not.toBe(
      unnamed.querySelector('.ds-catalog-row__meta')?.textContent,
    )
  })

  test('distinguishes an empty project from a filtered empty result', async () => {
    const emptyCatalog = { version: 1, assets: {} } as const
    const session = new EditSession(catalogControlsEditorState(emptyCatalog))
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          referenceIndex={collectCurrentProjectReferenceIndex(session.getState())}
          referenceStatus="current"
          getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
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
          referenceIndex={collectCurrentProjectReferenceIndex(session.getState(), currentAuthor)}
          referenceStatus="current"
          getCurrentReferenceIndex={(state) =>
            collectCurrentProjectReferenceIndex(state, currentAuthor)
          }
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={{ ...catalogControlsReader, readBytes } as never}
          session={session}
          focusObjectId="video.opening"
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

  test('does not commit deletion when the live oracle changes during the video byte read', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const staleIndex = collectCurrentProjectReferenceIndex(session.getState())
    const pendingBytes = deferred<ArrayBuffer>()
    let holdDeleteRead = false
    const reader = {
      ...catalogControlsReader,
      readBytes: vi.fn(() =>
        holdDeleteRead ? pendingBytes.promise : Promise.resolve(new ArrayBuffer(4)),
      ),
    }
    let stale = false
    const getCurrentReferenceIndex = () => {
      if (stale) throw new Error('过场引用在读取期间发生变化')
      return staleIndex
    }
    await act(async () =>
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          referenceIndex={staleIndex}
          referenceStatus="current"
          getCurrentReferenceIndex={getCurrentReferenceIndex}
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={reader as never}
          session={session}
          focusObjectId="video.opening"
        />,
      ),
    )
    const deleteButton = [...host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button')].find(
      (button) => button.textContent?.trim() === '删除',
    )!
    await act(async () => deleteButton.click())
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
      (button) => button.textContent?.trim() === '删除资源',
    )!
    holdDeleteRead = true
    await act(async () => confirm.click())
    await vi.waitFor(() =>
      expect(reader.readBytes).toHaveBeenLastCalledWith('video.opening', 'video'),
    )

    stale = true
    await act(async () => pendingBytes.resolve(new ArrayBuffer(4)))
    await vi.waitFor(() => expect(host.textContent).toContain('过场引用在读取期间发生变化'))
    expect(session.getState().assetCatalog.assets['video.opening']).toBeDefined()
    expect(session.getHistoryVersion()).toBe(0)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('开场视频')
  })

  test('keeps frame edits dirty when replacement is confirmed but the file picker is cancelled', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          referenceIndex={collectCurrentProjectReferenceIndex(session.getState())}
          referenceStatus="current"
          getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
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

  test('[reorder-family:cutscene-import] 待导入图片只改本地顺序且不污染全局历史', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const dispatch = vi.spyOn(session, 'dispatch')
    await act(async () => {
      root.render(
        <CutsceneTab
          assetDiagnostics={[]}
          referenceIndex={collectCurrentProjectReferenceIndex(session.getState())}
          referenceStatus="current"
          getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={catalogControlsReader as never}
          session={session}
        />,
      )
      await Promise.resolve()
    })

    const input = host.querySelector<HTMLInputElement>(
      'input[hidden][multiple][accept="image/png,image/jpeg,image/webp"]',
    )!
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [
        new File(['1'], 'frame-1.png', { type: 'image/png' }),
        new File(['2'], 'frame-2.png', { type: 'image/png' }),
        new File(['3'], 'frame-3.png', { type: 'image/png' }),
      ],
    })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))

    const collection = host.querySelector<HTMLElement>(
      '[data-ds-reorder-adoption="asset/cutscene-import-frames"]',
    )!
    const items = () => [...collection.querySelectorAll<HTMLElement>('.cutscene-import-file')]
    const names = () => items().map((item) => item.querySelector('code')?.textContent)
    expect(names()).toEqual(['frame-1.png', 'frame-2.png', 'frame-3.png'])
    const source = items()[0]!
    const sourceToken = source.dataset.itemKey
    const handle = source.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(names()).toEqual(['frame-1.png', 'frame-2.png', 'frame-3.png'])
    expect(items()[0]?.dataset.itemKey).toBe(sourceToken)
    expect(dispatch).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(names()).toEqual(['frame-2.png', 'frame-3.png', 'frame-1.png'])
    expect(items()[2]?.dataset.itemKey).toBe(sourceToken)
    expect(dispatch).not.toHaveBeenCalled()
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.undo()).toBe(false)
    expect(session.redo()).toBe(false)
    expect(names()).toEqual(['frame-2.png', 'frame-3.png', 'frame-1.png'])
  })
})
