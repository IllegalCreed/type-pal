// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { encodeWavPcm16, SINGLE_NOTE_MIDI } from '../__tests__/audio-fixtures.js'
import { installReactActEnvironment } from '../__tests__/react-io-wait.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  bindMusicRoles,
  blankProjectBase,
  seedMusic,
  seedSound,
} from './__tests__/audio-workbench-harness.js'
import { chooseComboboxOption } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { MusicPicker, musicAssets, musicLabel } from './MusicPicker.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    restoreAct()
  }
})

function selectionControl() {
  const select = host.querySelector<HTMLButtonElement>('button.ds-select')
  if (!select) throw new Error('Missing asset selection control')
  return select
}

describe('MusicPicker selection', () => {
  test('lists registered music by ID and distinguishes keep, stop and select', async () => {
    const base = await blankProjectBase('music-picker')
    await seedSound(base, 'sound.first', '音效', encodeWavPcm16([0.5]))
    await seedMusic(base, 'music.b', '战斗曲', SINGLE_NOTE_MIDI)
    await seedMusic(base, 'music.a', '', SINGLE_NOTE_MIDI)
    await bindMusicRoles(base, 'music.a')
    const state = base.session.getState()
    assertProjectSaveValid(state)
    const reader = createEditorAssetReader(base.source, state)
    expect(musicAssets(state.assetCatalog).map(musicLabel)).toEqual(['music.a', '战斗曲 (music.b)'])
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <MusicPicker
          value="music.a"
          catalog={state.assetCatalog}
          resolver={reader}
          allowUnset
          allowStop
          onChange={onChange}
        />,
      ),
    )
    const trigger = selectionControl()
    await chooseComboboxOption(trigger, '(停止音乐)')
    await chooseComboboxOption(trigger, '(延续上一曲)')
    await chooseComboboxOption(trigger, '战斗曲 (music.b)')
    expect(onChange.mock.calls).toEqual([[null], [undefined], ['music.b']])
  })

  test('shows the empty project message and offers no playback without a score', async () => {
    const base = await blankProjectBase('music-empty')
    const state = base.session.getState()
    const reader = createEditorAssetReader(base.source, state)
    await act(async () =>
      root.render(
        <MusicPicker
          value={undefined}
          catalog={state.assetCatalog}
          resolver={reader}
          onChange={() => {}}
        />,
      ),
    )
    expect(selectionControl().textContent).toContain('项目没有可用音乐')
    expect(host.querySelector<HTMLButtonElement>('button[aria-pressed]')?.disabled).toBe(true)
  })
})
