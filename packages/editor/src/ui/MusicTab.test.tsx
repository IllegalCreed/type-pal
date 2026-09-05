// @vitest-environment jsdom
import { act, StrictMode } from 'react'
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
    const reader = {
      ...catalogControlsReader,
      readBytes: vi.fn(async () => new ArrayBuffer(4)),
    }
    await act(async () =>
      root.render(
        <StrictMode>
          <MusicTab
            assetDiagnostics={[]}
            referenceIndex={collectCurrentProjectReferenceIndex(session.getState())}
            referenceStatus="current"
            getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
            catalog={catalogControlsAssetCatalog}
            reader={reader as never}
            session={session}
            focusObjectId="music.opening"
          />
        </StrictMode>,
      ),
    )
    await vi.waitFor(() =>
      expect(host.querySelector('.audio-player__state')?.textContent).not.toBe('正在读取…'),
    )
    expect(reader.readBytes).toHaveBeenCalledOnce()
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 首')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索音乐"]')!
    await setCatalogSearch(search, '终章')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 首')
    expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(1)
    expect(host.querySelector('.ds-catalog-row__title')?.textContent).toBe('终章音乐')
    expect(host.querySelector('.ds-catalog-row[data-selected]')).toBeNull()
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('开场音乐')
    expect(host.querySelector('[aria-label="导入 MIDI"]')).not.toBeNull()

    await setCatalogSearch(search, '不存在')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 首')
    expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.ds-virtual-list__item')).toHaveLength(2)
    expect(
      host.querySelector('.ds-catalog-row[data-selected] .ds-catalog-row__title')?.textContent,
    ).toBe('开场音乐')
  })
})
