// @vitest-environment jsdom

import type { AssetRecordV1 } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import { sha256Hex } from '../core/binary-signature.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { installImageDomPorts, restoreImageDomPorts } from './__tests__/image-preview-ports.js'
import {
  installBrowserHardwarePorts,
  pngRgba,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { ImageAssetPicker, ImageAssetThumbnail } from './ImageAssetPicker.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  installImageDomPorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    restoreImageDomPorts()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    restoreAct()
  }
})

async function sessionWithPortraits() {
  const legal = await loadLegalUiProject('image-picker')
  const session = new EditSession(legal.state)
  const entries = [
    { id: 'portrait.lab.002', kind: 'portrait', label: '实验立绘乙', width: 3 },
    { id: 'portrait.lab.001', kind: 'portrait', label: '实验立绘甲', width: 2 },
    { id: 'icon.lab.001', kind: 'item-icon', label: '物品图标', width: 4 },
  ] as const
  for (const { id, kind, label, width } of entries) {
    const rgba = solidRgba(width, 2, [220, 140, 44, 255])
    const png = Uint8Array.from(pngRgba(width, 2, rgba))
    const digest = await sha256Hex(png)
    const record: AssetRecordV1 = {
      kind,
      path: `assets/authored/${kind}/${digest}.png`,
      mediaType: 'image/png',
      bytes: png.byteLength,
      sha256: digest,
      label,
      origin: { kind: 'authored' },
    }
    session.dispatch(new UpsertAssetCommand(id, record, png.buffer))
  }
  assertProjectSaveValid(session.getState())
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

describe('Image asset selection', () => {
  test('selects an asset, clears through (无) and reports the actual onChange values', async () => {
    const { session, reader } = await sessionWithPortraits()
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <ImageAssetPicker
          value="portrait.lab.001"
          kind="portrait"
          catalog={session.getState().assetCatalog}
          reader={reader}
          allowUnset
          onChange={onChange}
          ariaLabel="立绘"
        />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('button.ds-select')!
    await clickOption(trigger, '(无)')
    expect(onChange).toHaveBeenLastCalledWith(undefined)
    await clickOption(trigger, '实验立绘乙')
    expect(onChange).toHaveBeenLastCalledWith('portrait.lab.002')

    await act(async () => trigger.click())
    expect(
      [...document.querySelectorAll('.ds-select-option')].map((node) => node.textContent),
    ).not.toContain('物品图标 (icon.lab.001)')
  })

  test('marks a missing or wrong-kind value with a warning option and hides its thumbnail', async () => {
    const { session, reader } = await sessionWithPortraits()
    await act(async () =>
      root.render(
        <ImageAssetPicker
          value={'portrait.gone'}
          kind="portrait"
          catalog={session.getState().assetCatalog}
          reader={reader}
          onChange={() => undefined}
        />,
      ),
    )
    const trigger = host.querySelector<HTMLButtonElement>('button.ds-select')!
    expect(trigger.textContent).toContain('⚠ portrait.gone（缺失或类型错误）')
    expect(trigger.getAttribute('aria-invalid')).toBe('true')
    expect(host.querySelector('.image-asset-thumb.empty')).not.toBeNull()

    await act(async () => trigger.click())
    const options = [...document.querySelectorAll('.ds-select-option')].map(
      (option) => option.textContent,
    )
    expect(options.some((text) => text?.includes('⚠ portrait.gone'))).toBe(true)

    await act(async () =>
      root.render(
        <ImageAssetPicker
          value="icon.lab.001"
          kind="portrait"
          catalog={session.getState().assetCatalog}
          reader={reader}
          onChange={() => undefined}
        />,
      ),
    )
    expect(host.querySelector('button.ds-select')?.textContent).toContain(
      '⚠ icon.lab.001（缺失或类型错误）',
    )
  })

  test('announces an empty catalog and wires the open-in-library action', async () => {
    const { session, reader } = await sessionWithPortraits()
    const emptyCatalog = (await loadLegalUiProject('image-picker-empty')).state.assetCatalog
    const onChange = vi.fn()
    const onOpenAsset = vi.fn()
    await act(async () =>
      root.render(
        <ImageAssetPicker
          value={undefined}
          kind="item-icon"
          catalog={emptyCatalog}
          reader={reader}
          onChange={onChange}
        />,
      ),
    )
    expect(host.querySelector('button.ds-select')?.textContent).toContain('项目没有可用图片')

    await act(async () =>
      root.render(
        <ImageAssetPicker
          value="portrait.lab.001"
          kind="portrait"
          catalog={session.getState().assetCatalog}
          reader={reader}
          onChange={onChange}
          onOpenAsset={onOpenAsset}
        />,
      ),
    )
    const openButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="在图片库打开 portrait.lab.001"]',
    )!
    await act(async () => openButton.click())
    expect(onOpenAsset).toHaveBeenCalledWith('portrait.lab.001')
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Image thumbnail fallback', () => {
  test('distinguishes an absent selection from a missing resource', async () => {
    const legal = await loadLegalUiProject('image-thumbnail-fallback')
    const reader = createEditorAssetReader(legal.source, legal.state)
    const read = vi.spyOn(reader, 'readBytes')
    await act(async () => root.render(<ImageAssetThumbnail kind="portrait" reader={reader} />))
    expect(host.querySelector('.image-asset-thumb.empty')).not.toBeNull()
    expect(host.querySelector('img')).toBeNull()
    expect(read).not.toHaveBeenCalled()
    await act(async () =>
      root.render(<ImageAssetThumbnail asset="portrait.missing" kind="portrait" reader={reader} />),
    )
    await waitForReact(() => {
      expect(host.querySelector('.image-asset-thumb.error')?.getAttribute('title')).toContain(
        'AssetId "portrait.missing" 不在 catalog',
      )
    })
    expect(host.querySelector('img')).toBeNull()
  })
})
