// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { encodeWavPcm16 } from '../__tests__/audio-fixtures.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { blankProjectBase, seedSound } from './__tests__/audio-workbench-harness.js'
import { buttonByLabel, chooseComboboxOption } from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { SoundPicker, SoundPreviewButton, soundAssets, soundLabel } from './SoundPicker.js'

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

async function sounds() {
  const base = await blankProjectBase('sound-picker')
  await seedSound(base, 'sound.b', '命中音', encodeWavPcm16([0.5]))
  await seedSound(base, 'sound.a', '', encodeWavPcm16([0.25]))
  const state = base.session.getState()
  assertProjectSaveValid(state)
  return { catalog: state.assetCatalog, reader: createEditorAssetReader(base.source, state) }
}

describe('SoundPicker selection', () => {
  test('lists sound records by ID and emits a distinct unset selection', async () => {
    const { catalog, reader } = await sounds()
    expect(soundAssets(catalog).map(soundLabel)).toEqual(['sound.a', '命中音 (sound.b)'])
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <SoundPicker
          value="sound.a"
          catalog={catalog}
          reader={reader}
          allowUnset
          onChange={onChange}
        />,
      ),
    )
    const trigger = selectionControl()
    await chooseComboboxOption(trigger, '(无音效)')
    await chooseComboboxOption(trigger, '命中音 (sound.b)')
    expect(onChange.mock.calls).toEqual([[undefined], ['sound.b']])
  })

  test('marks an existing non-sound resource invalid and prevents audition', async () => {
    const { catalog, reader } = await sounds()
    const wrongKind = Object.keys(catalog.assets).find(
      (id) => catalog.assets[id]?.kind === 'sprite',
    )
    if (!wrongKind) throw new Error('Missing starter sprite for the kind check')
    await act(async () =>
      root.render(
        <SoundPicker value={wrongKind} catalog={catalog} reader={reader} onChange={() => {}} />,
      ),
    )
    expect(selectionControl().textContent).toContain(`⚠ ${wrongKind}（缺失或类型错误）`)
    expect(buttonByLabel(host, '未选择音效').disabled).toBe(true)
  })

  test('shows the empty project message and passes a selected asset to the library action', async () => {
    const base = await blankProjectBase('sound-empty')
    const state = base.session.getState()
    const onChange = vi.fn()
    const onOpenAsset = vi.fn()
    await act(async () =>
      root.render(
        <SoundPicker
          value={undefined}
          catalog={state.assetCatalog}
          reader={createEditorAssetReader(base.source, state)}
          onChange={onChange}
        />,
      ),
    )
    expect(selectionControl().textContent).toContain('项目没有可用音效')
    expect(buttonByLabel(host, '未选择音效').disabled).toBe(true)
    const { catalog, reader } = await sounds()
    await act(async () =>
      root.render(
        <SoundPicker
          value="sound.b"
          catalog={catalog}
          reader={reader}
          onChange={onChange}
          onOpenAsset={onOpenAsset}
        />,
      ),
    )
    await act(async () => buttonByLabel(host, '在音效库打开 sound.b').click())
    expect(onOpenAsset).toHaveBeenCalledExactlyOnceWith('sound.b')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('renders a specific read error for a requested missing sound', async () => {
    const { reader } = await sounds()
    await act(async () => root.render(<SoundPreviewButton asset="sound.gone" reader={reader} />))
    await act(async () => buttonByLabel(host, '试听 sound.gone').click())
    await waitForReact(() =>
      expect(host.querySelector('.sound-preview-error')?.textContent).toContain(
        'AssetId "sound.gone" 不在 catalog',
      ),
    )
  })
})
