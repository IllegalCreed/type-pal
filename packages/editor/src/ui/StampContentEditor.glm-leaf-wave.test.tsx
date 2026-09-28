// @vitest-environment jsdom

import type { StampTemplate } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { StampContentEditor } from './StampContentEditor.js'

await stubNodeTestHost()
vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  }),
)
Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: vi.fn(() => 'blob:glm-leaf-stamp'),
})
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.clearAllMocks()
})

function template(origin: StampTemplate['origin'] = 'authored'): StampTemplate {
  return {
    id: 'stamp.lab.001',
    name: '实验图章',
    origin,
    anchor: { row: 0, col: 0 },
    width: 2,
    height: 2,
    tilesetRefs: ['tiles-a'],
    layers: [
      {
        id: 'floor',
        name: '地板',
        tiles: [
          [1, 1],
          [null, null],
        ],
        sources: [
          [0, 1],
          [null, null],
        ],
      },
    ],
    collision: [
      [null, null],
      [null, null],
    ],
  }
}

let propertiesHost: HTMLDivElement
let layersHost: HTMLDivElement

async function renderEditor(
  overrides: Partial<Parameters<typeof StampContentEditor>[0]> = {},
  stamp = template(),
): Promise<void> {
  const legal = await loadLegalUiProject('glm-leaf-stamp-editor')
  const reader = createEditorAssetReader(legal.source, () => legal.state)
  propertiesHost = document.createElement('div')
  propertiesHost.setAttribute('data-ds-inspector-host', '')
  layersHost = document.createElement('div')
  document.body.append(propertiesHost, layersHost)
  const props: Parameters<typeof StampContentEditor>[0] = {
    template: stamp,
    tilesets: [],
    assetCatalog: { version: 1, assets: {} },
    assetReader: reader,
    assetBase: legal.assetBase,
    onOpenTilePalette: () => undefined,
    onChange: () => undefined,
    propertiesHost,
    layersHost,
    ...overrides,
  }
  await act(async () => root.render(<StampContentEditor {...props} />))
}

async function commitText(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

describe('StampContentEditor 剩余合同', () => {
  test('name and tag edits commit the full template on blur with unchanged identity', async () => {
    const onChange = vi.fn()
    await renderEditor({ onChange })
    const name = propertiesHost.querySelector<HTMLInputElement>('input[aria-label="组合名称"]')!
    expect(name.value).toBe('实验图章')
    await commitText(name, '改名图章')
    expect(onChange).toHaveBeenCalledTimes(1)
    const [first, takeOver] = onChange.mock.calls[0] as [StampTemplate, boolean]
    expect(first.name).toBe('改名图章')
    expect(first.id).toBe('stamp.lab.001')
    expect(first.layers[0]!.tiles).toEqual([
      [1, 1],
      [null, null],
    ])
    expect(takeOver).toBe(true)

    const tag = propertiesHost.querySelector<HTMLInputElement>('input[aria-label="组合标签"]')!
    await commitText(tag, '道路')
    const [second] = onChange.mock.calls[1] as [StampTemplate]
    expect(second.category).toBe('道路')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  test('migrated templates stay read-only until ownership is taken, then flip to authored', async () => {
    const onChange = vi.fn()
    await renderEditor({ onChange }, template('migrated'))
    const name = propertiesHost.querySelector<HTMLInputElement>('input[aria-label="组合名称"]')!
    expect(name.disabled).toBe(true)
    expect(layersHost.textContent).toContain('先接管迁移组合')

    const takeover = propertiesHost.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(takeover.checked).toBe(false)
    await act(async () => takeover.click())
    expect(takeover.checked).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    const [next, takeOver] = onChange.mock.calls[0] as [StampTemplate, boolean]
    expect(takeOver).toBe(true)
    expect(next.origin).toBe('authored')
    expect(name.disabled).toBe(false)
  })

  test('layer visibility and lock toggles never commit and keep the draft intact', async () => {
    const onChange = vi.fn()
    await renderEditor({ onChange })
    const toggles = [
      ...layersHost.querySelectorAll<HTMLButtonElement>(
        '[aria-label^="图层可见"], [aria-label^="图层锁定"]',
      ),
    ]
    expect(toggles.length).toBeGreaterThan(0)
    await act(async () => toggles[0]!.click())
    expect(onChange).not.toHaveBeenCalled()
    expect(
      propertiesHost.querySelector<HTMLInputElement>('input[aria-label="组合名称"]')?.value,
    ).toBe('实验图章')
  })
})
