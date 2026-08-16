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
import { MusicTab } from './MusicTab.js'

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

describe('MusicTab catalog controls', () => {
  test('filters music rows, updates the filtered count, and keeps the import action', async () => {
    const session = new EditSession(catalogControlsEditorState())
    await act(async () =>
      root.render(
        <MusicTab
          catalog={catalogControlsAssetCatalog}
          resolver={catalogControlsReader as never}
          session={session}
          focusObjectId="music.opening"
        />,
      ),
    )
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 首')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索音乐"]')!
    await setCatalogSearch(search, '终章')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 首')
    expect(host.querySelectorAll('.asset-music-table tbody tr')).toHaveLength(1)
    expect(host.querySelector<HTMLInputElement>('.asset-music-table tbody tr input')?.value).toBe(
      '终章音乐',
    )
    expect(host.querySelector('.asset-music-table tbody tr.selected')).toBeNull()
    expect(host.querySelector('.inspector .who')?.textContent).toBe('开场音乐')
    expect(host.querySelector('[aria-label="导入 MIDI"]')).not.toBeNull()

    await setCatalogSearch(search, '不存在')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 首')
    expect(host.querySelectorAll('.asset-music-table tbody tr')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.asset-music-table tbody tr')).toHaveLength(2)
    expect(
      host.querySelector<HTMLInputElement>('.asset-music-table tbody tr.selected input')?.value,
    ).toBe('开场音乐')
  })
})
