// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
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
    expect(host.querySelector('.inspector .who')?.textContent).toBe('主要立绘')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    expect(host.querySelectorAll('.image-asset-list .ds-catalog-row')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelector('.image-asset-list [data-selected="true"]')?.textContent).toContain(
      '主要立绘',
    )
    const faceTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('战斗头像'),
    )!
    await act(async () => faceTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 项')
    expect(host.querySelector('.image-asset-list')?.textContent).toContain('战斗头像')
    const itemIconTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('物品图标'),
    )!
    await act(async () => itemIconTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
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
})
