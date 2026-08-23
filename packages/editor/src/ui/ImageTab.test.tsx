// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
  setCatalogSearch,
} from './catalog-controls-test-utils.js'
import { ImageTab } from './ImageTab.js'

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
    const session = new EditSession(catalogControlsEditorState())
    await act(async () => {
      root.render(
        <ImageTab
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
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
    expect(host.querySelector('.image-asset-list')?.textContent).toContain('战斗头像')
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
          assetBase={{} as never}
          catalog={catalogControlsAssetCatalog}
          reader={{ ...catalogControlsReader, readBytes } as never}
          session={session}
          focusObjectId="portrait.primary"
          currentAuthor={
            {
              scenes: [],
              items: [],
              sharedScripts: new Proxy(
                {},
                {
                  ownKeys: () => {
                    throw new Error('scan exploded')
                  },
                },
              ),
            } as never
          }
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
})
