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
import {
  ImageAssetPicker,
  ImageAssetThumbnail,
  imageAssetLabel,
  imageAssets,
} from './ImageAssetPicker.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('Blob', NodeBlob)
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:glm-leaf-thumb'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
  vi.restoreAllMocks()
})

const portraitRecord = (id: string, label?: string): AssetRecordV1 => ({
  kind: 'portrait',
  path: `assets/runtime/${id}.png`,
  mediaType: 'image/png',
  bytes: 8,
  sha256: `sha-${id}`,
  ...(label ? { label } : {}),
  origin: { kind: 'authored' },
})

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer

async function sessionWithPortraits() {
  const legal = await loadLegalUiProject('glm-leaf-image-picker')
  const session = new EditSession(legal.state)
  session.dispatch(
    new UpsertAssetCommand(
      'portrait.lab.002',
      portraitRecord('portrait.lab.002', '实验立绘乙'),
      pngBytes,
    ),
  )
  session.dispatch(
    new UpsertAssetCommand(
      'portrait.lab.001',
      portraitRecord('portrait.lab.001', '实验立绘甲'),
      pngBytes,
    ),
  )
  session.dispatch(
    new UpsertAssetCommand(
      'icon.lab.001',
      {
        ...portraitRecord('icon.lab.001'),
        kind: 'item-icon',
        path: 'assets/runtime/icon-lab-001.png',
      },
      pngBytes,
    ),
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

describe('imageAssets / imageAssetLabel 剩余合同', () => {
  test('filters by kind, sorts by id and renders label with id fallback', async () => {
    const { session } = await sessionWithPortraits()
    const catalog = session.getState().assetCatalog
    const portraits = imageAssets(catalog, 'portrait')
    expect(portraits.map((asset) => asset.id)).toEqual(['portrait.lab.001', 'portrait.lab.002'])
    expect(imageAssets(catalog, 'item-icon').map((asset) => asset.id)).toEqual(['icon.lab.001'])
    expect(imageAssetLabel(portraits[0]!)).toBe('实验立绘甲 (portrait.lab.001)')
    expect(
      imageAssetLabel({ ...portraits[0]!, record: { ...portraits[0]!.record, label: undefined } }),
    ).toBe('portrait.lab.001')
  })
})

describe('ImageAssetThumbnail 剩余合同', () => {
  test('renders a real reader blob into an img and releases it on unmount', async () => {
    const { session, reader } = await sessionWithPortraits()
    session.dispatch(
      new UpsertAssetCommand('portrait.lab.003', portraitRecord('portrait.lab.003'), pngBytes),
    )
    await act(async () =>
      root.render(<ImageAssetThumbnail asset="portrait.lab.003" kind="portrait" reader={reader} />),
    )
    await vi.waitFor(() => {
      expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:glm-leaf-thumb')
    })
    await act(async () => root.unmount())
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:glm-leaf-thumb')
    await act(async () => {
      root = createRoot(host)
    })
  })

  test('surfaces reader failures as a titled error chip instead of a broken image', async () => {
    const { session, reader } = await sessionWithPortraits()
    expect(session.getState().assetCatalog.assets['portrait.missing']).toBeUndefined()
    await act(async () =>
      root.render(
        <ImageAssetThumbnail asset={'portrait.missing'} kind="portrait" reader={reader} />,
      ),
    )
    await vi.waitFor(() => {
      expect(host.querySelector('.image-asset-thumb.error')).not.toBeNull()
    })
    expect(host.querySelector('.image-asset-thumb.error')?.getAttribute('title')).toContain(
      'portrait.missing',
    )
  })

  test('renders an empty chip without an asset id', async () => {
    const { reader } = await sessionWithPortraits()
    await act(async () => root.render(<ImageAssetThumbnail kind="portrait" reader={reader} />))
    expect(host.querySelector('.image-asset-thumb.empty')).not.toBeNull()
    expect(host.querySelector('img')).toBeNull()
  })
})

describe('ImageAssetPicker 剩余合同', () => {
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
    expect(onChange).not.toHaveBeenCalledWith('icon.lab.001')
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

    const wrongKind = await sessionWithPortraits()
    await act(async () =>
      root.render(
        <ImageAssetPicker
          value="icon.lab.001"
          kind="portrait"
          catalog={wrongKind.session.getState().assetCatalog}
          reader={wrongKind.reader}
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
    const emptyCatalog = { version: 1 as const, assets: {} }
    const onChange = vi.fn()
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
          onOpenAsset={onChange}
        />,
      ),
    )
    const openButton = host.querySelector<HTMLButtonElement>(
      '[aria-label="在图片库打开 portrait.lab.001"]',
    )!
    await act(async () => openButton.click())
    expect(onChange).toHaveBeenCalledWith('portrait.lab.001')
  })
})
