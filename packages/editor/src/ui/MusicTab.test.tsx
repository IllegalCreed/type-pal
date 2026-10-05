// @vitest-environment jsdom

import { analyzeMidiBytes } from '@type-pal/reforge'
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
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
  beforeAll(async () => {
    // 预热 analyzeMidiBytes 的动态 import（spessasynth_core），让渲染后的
    // 载入链在 act 内的微任务冲刷中即可完成，状态更新不落在 act 外。
    await analyzeMidiBytes(TEST_WARM_MIDI.slice().buffer)
  })

  test('filters music rows, updates the filtered count, and keeps the import action', async () => {
    const session = new EditSession(catalogControlsEditorState())
    const reader = {
      ...catalogControlsReader,
      readBytes: vi.fn(async () => new ArrayBuffer(4)),
    }
    await act(async () => {
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
      )
      // 载入链已预热为纯微任务：在 act 内冲刷后同步断言，
      // 状态更新不落在 act 外（裸 waitFor 会在 act 外吃掉 setState）。
      for (let index = 0; index < 25; index += 1) await Promise.resolve()
    })
    expect(host.querySelector('.audio-player__state')?.textContent).not.toBe('正在读取…')
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

const TEST_WARM_MIDI = new Uint8Array([
  0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96, 0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 12, 0,
  0x90, 60, 127, 0x30, 0x80, 60, 127, 0, 0xff, 0x2f, 0,
])
