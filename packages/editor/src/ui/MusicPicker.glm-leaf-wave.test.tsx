// @vitest-environment jsdom

import type { AssetRecordV1 } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { MusicPicker, musicAssets, musicLabel, PreviewButton } from './MusicPicker.js'

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await stubNodeTestHost()
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

const musicRecord = (id: string, label?: string): AssetRecordV1 => ({
  kind: 'music',
  path: `assets/runtime/${id}.mid`,
  mediaType: 'audio/midi',
  bytes: 16,
  sha256: `sha-${id}`,
  ...(label ? { label } : {}),
  origin: { kind: 'authored' },
})

async function sessionWithMusic() {
  const legal = await loadLegalUiProject('glm-leaf-music-picker')
  const session = new EditSession(legal.state)
  session.dispatch(
    new UpsertAssetCommand(
      'music.lab.002',
      musicRecord('music.lab.002', '战斗曲'),
      new ArrayBuffer(4),
    ),
  )
  session.dispatch(
    new UpsertAssetCommand('music.lab.001', musicRecord('music.lab.001'), new ArrayBuffer(4)),
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

describe('musicAssets / musicLabel 剩余合同', () => {
  test('filters music records, sorts by id and labels with id fallback', async () => {
    const { session } = await sessionWithMusic()
    const catalog = session.getState().assetCatalog
    const assets = musicAssets(catalog)
    expect(assets.map((asset) => asset.id)).toEqual(['music.lab.001', 'music.lab.002'])
    expect(musicLabel(assets[1]!)).toBe('战斗曲 (music.lab.002)')
    expect(musicLabel({ ...assets[0]!, record: { ...assets[0]!.record, label: undefined } })).toBe(
      'music.lab.001',
    )
  })
})

describe('MusicPicker 剩余合同', () => {
  test('commits plain selections and (延续上一曲)/(停止音乐) sentinels exactly', async () => {
    const { session, reader } = await sessionWithMusic()
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <MusicPicker
          value="music.lab.001"
          catalog={session.getState().assetCatalog}
          resolver={reader}
          allowUnset
          allowStop
          onChange={onChange}
        />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('button.ds-select')!
    await clickOption(trigger, '(停止音乐)')
    expect(onChange).toHaveBeenLastCalledWith(null)
    await clickOption(trigger, '(延续上一曲)')
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    await clickOption(trigger, '战斗曲')
    expect(onChange).toHaveBeenLastCalledWith('music.lab.002')
  })

  test('announces an empty catalog when no unset sentinel is offered', async () => {
    const { reader } = await sessionWithMusic()
    await act(async () =>
      root.render(
        <MusicPicker
          value={undefined}
          catalog={{ version: 1, assets: {} }}
          resolver={reader}
          onChange={() => undefined}
        />,
      ),
    )
    expect(host.querySelector('button.ds-select')?.textContent).toContain('项目没有可用音乐')
  })

  test('preview button reflects the idle port state and disables without an asset', async () => {
    const { session, reader } = await sessionWithMusic()
    await act(async () =>
      root.render(
        <MusicPicker
          value="music.lab.001"
          catalog={session.getState().assetCatalog}
          resolver={reader}
          onChange={() => undefined}
        />,
      ),
    )
    const preview = host.querySelector<HTMLButtonElement>('[aria-label="试听 music.lab.001"]')!
    expect(preview.disabled).toBe(false)
    expect(preview.getAttribute('aria-pressed')).toBe('false')

    await act(async () => root.render(<PreviewButton asset={undefined} resolver={reader} />))
    const idle = host.querySelector<HTMLButtonElement>('[aria-label="试听 "]')
    expect(idle).not.toBeNull()
    expect(idle?.disabled).toBe(true)
  })
})
