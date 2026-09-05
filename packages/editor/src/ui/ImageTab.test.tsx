// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
  setCatalogSearch,
} from './catalog-controls-test-utils.js'
import { ImageTab } from './ImageTab.js'

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

describe('ImageTab catalog controls', () => {
  test('preserves filtered count semantics and switches the image scope through shared tabs', async () => {
    const catalog = structuredClone(catalogControlsAssetCatalog)
    delete catalog.assets['face.primary']!.label
    const session = new EditSession(catalogControlsEditorState(catalog))
    await act(async () => {
      root.render(
        <ImageTab
          assetDiagnostics={[]}
          referenceIndex={collectCurrentProjectReferenceIndex(session.getState())}
          referenceStatus="current"
          getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
          assetBase={{} as never}
          catalog={catalog}
          reader={catalogControlsReader as never}
          session={session}
        />,
      )
      await Promise.resolve()
    })
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 项')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索图像"]')!
    await setCatalogSearch(search, '次要')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 项')
    expect(host.querySelectorAll('.image-asset-list .ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.image-asset-list [data-selected="true"]')).toBeNull()
    expect(
      host.querySelector('.image-workspace > .ds-object-hero .ds-object-hero__title')?.textContent,
    ).toBe('主要立绘')
    expect(
      host.querySelector('.image-workspace > .ds-object-hero .ds-object-hero__id')?.textContent,
    ).toBe('portrait.primary')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    expect(host.querySelectorAll('.image-asset-list .ds-catalog-row')).toHaveLength(0)
    expect(host.querySelector('.image-asset-list')?.textContent).toContain('没有匹配的图片。')
    await setCatalogSearch(search, '')
    expect(host.querySelector('.image-asset-list [data-selected="true"]')?.textContent).toContain(
      '主要立绘',
    )
    const faceTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((button) =>
      button.textContent?.includes('战斗头像'),
    )!
    await act(async () => faceTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 项')
    const unnamedFace = host.querySelector('.image-asset-list .ds-catalog-row')!
    expect(unnamedFace.querySelector('.ds-catalog-row__title')?.textContent).toBe('未命名战斗头像')
    expect(unnamedFace.querySelector('.ds-catalog-row__meta')?.textContent).toBe('face.primary')
    const itemIconTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('物品图标'),
    )!
    await act(async () => itemIconTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    expect(host.querySelector('.image-asset-list')?.textContent).toContain('此项目还没有物品图标。')
    const backgroundTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('战场背景'),
    )!
    await act(async () => backgroundTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    const portraitTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('立绘'),
    )!
    await act(async () => portraitTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 项')
    expect(host.querySelector('[aria-label="导入 PNG"]')).not.toBeNull()
  })

  test('keeps delete on the selected object hero and restores the record and bytes on undo', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const onObjectFocus = vi.fn()
    await act(async () => {
      root.render(
        <ImageTab
          assetDiagnostics={[]}
          referenceIndex={collectCurrentProjectReferenceIndex(session.getState())}
          referenceStatus="current"
          getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={catalogControlsReader as never}
          session={session}
          onObjectFocus={onObjectFocus}
        />,
      )
      await Promise.resolve()
    })

    const hero = host.querySelector('.image-workspace > .ds-object-hero')!
    const deleteButton = [...hero.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除',
    )!
    await act(async () => deleteButton.click())

    const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-label="删除图片"]')!
    expect(dialog.open).toBe(true)
    expect(dialog.textContent).toContain('主要立绘')
    expect(dialog.textContent).toContain('0 处')
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除图片',
    )!
    await act(async () => {
      confirm.click()
      await Promise.resolve()
    })

    expect(session.getState().assetCatalog.assets['portrait.primary']).toBeUndefined()
    expect(onObjectFocus).toHaveBeenLastCalledWith('portrait.secondary')
    expect(session.undo()).toBe(true)
    expect(session.getState().assetCatalog.assets['portrait.primary']?.label).toBe('主要立绘')
    expect(session.getState().assetBlobs['assets/images/primary.png']?.byteLength).toBe(4)
  })

  test('shows an unknown reference count and performs no I/O when reference scanning fails', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const readBytes = vi.fn(catalogControlsReader.readBytes)
    const historyBefore = session.getHistoryVersion()
    await act(async () => {
      root.render(
        <ImageTab
          assetDiagnostics={[]}
          referenceStatus="failed"
          getCurrentReferenceIndex={() => {
            throw new Error('scan exploded')
          }}
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={{ ...catalogControlsReader, readBytes } as never}
          session={session}
          focusObjectId="portrait.primary"
        />,
      )
      await Promise.resolve()
    })

    const hero = host.querySelector('.image-workspace > .ds-object-hero')!
    const deleteButton = [...hero.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除',
    )!
    const readsBeforeDelete = readBytes.mock.calls.length
    await act(async () => deleteButton.click())

    const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-label="删除图片"]')!
    expect(dialog.open).toBe(true)
    expect(dialog.textContent).toContain('未知（扫描失败）')
    expect(dialog.textContent).not.toContain('引用0 处')
    const confirm = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除图片',
    )!
    expect(confirm.disabled).toBe(true)
    await act(async () => confirm.click())
    expect(readBytes).toHaveBeenCalledTimes(readsBeforeDelete)
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().assetCatalog.assets['portrait.primary']).toBeDefined()
  })

  test('does not commit deletion when the live oracle changes during the byte read', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const staleIndex = collectCurrentProjectReferenceIndex(session.getState())
    const pendingBytes = deferred<ArrayBuffer>()
    const reader = { ...catalogControlsReader, readBytes: vi.fn(() => pendingBytes.promise) }
    let stale = false
    const getCurrentReferenceIndex = () => {
      if (stale) throw new Error('图片引用在读取期间发生变化')
      return staleIndex
    }
    await act(async () =>
      root.render(
        <ImageTab
          assetDiagnostics={[]}
          referenceIndex={staleIndex}
          referenceStatus="current"
          getCurrentReferenceIndex={getCurrentReferenceIndex}
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={reader as never}
          session={session}
          focusObjectId="portrait.primary"
        />,
      ),
    )
    const deleteButton = [
      ...host.querySelectorAll<HTMLButtonElement>('.ds-object-hero button'),
    ].find((button) => button.textContent?.trim() === '删除')!
    await act(async () => deleteButton.click())
    const confirm = [...host.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
      (button) => button.textContent?.trim() === '删除图片',
    )!
    await act(async () => confirm.click())
    expect(reader.readBytes).toHaveBeenCalledWith('portrait.primary', 'portrait')

    stale = true
    await act(async () => pendingBytes.resolve(new ArrayBuffer(4)))
    await vi.waitFor(() => expect(host.textContent).toContain('图片引用在读取期间发生变化'))
    expect(session.getState().assetCatalog.assets['portrait.primary']).toBeDefined()
    expect(session.getHistoryVersion()).toBe(0)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('主要立绘')
  })
})
