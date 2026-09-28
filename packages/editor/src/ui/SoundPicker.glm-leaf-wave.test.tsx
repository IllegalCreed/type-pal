// @vitest-environment jsdom

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { AssetRecordV1 } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { SoundPicker, SoundPreviewButton, soundAssets, soundLabel } from './SoundPicker.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('crypto', webcrypto)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const soundRecord = (id: string, label?: string): AssetRecordV1 => ({
  kind: 'sound',
  path: `assets/runtime/${id}.wav`,
  mediaType: 'audio/wav',
  bytes: 16,
  sha256: `sha-${id}`,
  ...(label ? { label } : {}),
  origin: { kind: 'authored' },
})

async function sessionWithSounds() {
  const legal = await loadLegalUiProject('glm-leaf-sound-picker')
  const session = new EditSession(legal.state)
  session.dispatch(
    new UpsertAssetCommand(
      'sound.lab.002',
      soundRecord('sound.lab.002', '命中音'),
      new ArrayBuffer(4),
    ),
  )
  session.dispatch(
    new UpsertAssetCommand('sound.lab.001', soundRecord('sound.lab.001'), new ArrayBuffer(4)),
  )
  return { session, reader: createEditorAssetReader(legal.source, () => session.getState()) }
}

async function clickOption(trigger: HTMLElement, text: string): Promise<void> {
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find(
    (candidate) => candidate.textContent?.includes(text),
  )
  expect(option).not.toBeNull()
  await act(async () => option!.click())
}

describe('soundAssets / soundLabel 剩余合同', () => {
  test('filters sound records, sorts by id and labels with id fallback', async () => {
    const { session } = await sessionWithSounds()
    const catalog = session.getState().assetCatalog
    const assets = soundAssets(catalog)
    expect(assets.map((asset) => asset.id)).toEqual(['sound.lab.001', 'sound.lab.002'])
    expect(soundLabel(assets[1]!)).toBe('命中音 (sound.lab.002)')
    expect(soundLabel({ ...assets[0]!, record: { ...assets[0]!.record, label: undefined } })).toBe(
      'sound.lab.001',
    )
  })
})

describe('SoundPicker 剩余合同', () => {
  test('commits selections and the (无音效) sentinel exactly', async () => {
    const { session, reader } = await sessionWithSounds()
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <SoundPicker
          value="sound.lab.001"
          catalog={session.getState().assetCatalog}
          reader={reader}
          allowUnset
          onChange={onChange}
        />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('button.ds-select')!
    await clickOption(trigger, '(无音效)')
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    await clickOption(trigger, '命中音')
    expect(onChange).toHaveBeenLastCalledWith('sound.lab.002')
  })

  test('marks a wrong-kind value as invalid and announces an empty catalog', async () => {
    const { session, reader } = await sessionWithSounds()
    await act(async () =>
      root.render(
        <SoundPicker
          value="sound.lab.001"
          catalog={session.getState().assetCatalog}
          reader={reader}
          onChange={() => undefined}
        />,
      ),
    )
    expect(host.querySelector('button.ds-select')?.textContent).not.toContain('（缺失或类型错误）')

    await act(async () =>
      root.render(
        <SoundPicker
          value="music.lab.missing"
          catalog={{ version: 1, assets: {} }}
          reader={reader}
          onChange={() => undefined}
        />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('button.ds-select')!
    expect(trigger.textContent).toContain('⚠ music.lab.missing（缺失或类型错误）')

    await act(async () =>
      root.render(
        <SoundPicker
          value={undefined}
          catalog={{ version: 1, assets: {} }}
          reader={reader}
          onChange={() => undefined}
        />,
      ),
    )
    expect(host.querySelector('button.ds-select')?.textContent).toContain('项目没有可用音效')
  })

  test('surfaces a visible preview error when the reader rejects the asset', async () => {
    const { reader } = await sessionWithSounds()
    await act(async () => root.render(<SoundPreviewButton asset="sound.gone" reader={reader} />))
    const button = host.querySelector<HTMLButtonElement>('[aria-label="试听 sound.gone"]')!
    expect(button.disabled).toBe(false)
    await act(async () => button.click())
    await vi.waitFor(() => {
      expect(host.querySelector('.sound-preview-error')?.textContent).toContain('sound.gone')
    })
  })

  test('disables the preview button without a valid selection', async () => {
    const { session, reader } = await sessionWithSounds()
    await act(async () =>
      root.render(
        <SoundPicker
          value={undefined}
          catalog={session.getState().assetCatalog}
          reader={reader}
          onChange={() => undefined}
        />,
      ),
    )
    const preview = host.querySelector<HTMLButtonElement>('[aria-label="未选择音效"]')
    expect(preview).not.toBeNull()
    expect(preview?.disabled).toBe(true)

    await act(async () =>
      root.render(
        <SoundPicker
          value="music.lab.wrongkind"
          catalog={session.getState().assetCatalog}
          reader={reader}
          onChange={() => undefined}
        />,
      ),
    )
    const preview2 = host.querySelector<HTMLButtonElement>('[aria-label="未选择音效"]')
    expect(preview2?.disabled).toBe(true)
  })
})
