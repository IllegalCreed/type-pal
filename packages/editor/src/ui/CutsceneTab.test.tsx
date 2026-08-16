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
import { CutsceneTab } from './CutsceneTab.js'

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
    expect(host.querySelectorAll('.cutscene-asset-row')).toHaveLength(1)
    expect(host.querySelector('.cutscene-asset-list')?.textContent).toContain('片尾视频')
    expect(host.querySelector('.cutscene-asset-row.selected')).toBeNull()
    expect(host.querySelector<HTMLInputElement>('.cutscene-inspector .insp-head input')?.value).toBe(
      '开场视频',
    )
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('3 项')
    expect(host.querySelector('[aria-label="导入视频"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="导入帧动画"]')).not.toBeNull()

    await setCatalogSearch(search, '不存在')
    expect(host.querySelectorAll('.cutscene-asset-row')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.cutscene-asset-row')).toHaveLength(3)
    expect(host.querySelector('.cutscene-asset-row.selected')?.textContent).toContain('开场视频')
  })
})
