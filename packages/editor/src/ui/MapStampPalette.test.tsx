// @vitest-environment jsdom
import type { StampTemplateV1 } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MapStampPalette } from './MapStampPalette.js'

const previewRender = vi.hoisted(() => vi.fn())

vi.mock('./StampPreviewCanvas.js', () => ({
  StampMiniPreview: (props: { template: StampTemplateV1 }) => {
    previewRender(props.template.id)
    return <canvas data-stamp-preview={props.template.id} />
  },
}))

function templates(count: number): StampTemplateV1[] {
  return Array.from({ length: count }, (_, index) => {
    const suffix = index.toString().padStart(4, '0')
    return {
      id: `stamp-${suffix}`,
      name: `模板 ${suffix}`,
      category: '测试',
      tilesetId: 'tiles-a',
      origin: 'authored',
      layerSlots: [{ id: 'floor', name: '地板', depthMode: 'flat' }],
      visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
      collision: [],
    }
  })
}

function button(text: string, root: ParentNode): HTMLButtonElement {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  previewRender.mockClear()
  document.body.innerHTML = ''
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('MapStampPalette scale budget', () => {
  test('600 templates mount in deterministic 60-item batches and pointer movement does not expand work', async () => {
    const onPick = vi.fn()
    await act(async () => {
      root.render(
        <MapStampPalette
          stamps={templates(600)}
          tilesetId="tiles-a"
          tilesets={[]}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          assetBase={{} as never}
          recentStampIds={[]}
          onPick={onPick}
        />,
      )
      await Promise.resolve()
    })

    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(60)
    expect(host.querySelectorAll('[data-stamp-preview]')).toHaveLength(60)
    expect(previewRender).toHaveBeenCalledTimes(60)

    await act(async () => button('再显示 60 个', host).click())
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(120)
    expect(host.querySelectorAll('[data-stamp-preview]')).toHaveLength(120)

    await input(host.querySelector<HTMLInputElement>('[aria-label="搜索地图组合"]')!, '模板')
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(60)
    expect(host.querySelectorAll('[data-stamp-preview]')).toHaveLength(60)

    const renderCount = previewRender.mock.calls.length
    const palette = host.querySelector<HTMLElement>('.map-stamp-palette')!
    await act(async () => {
      for (let index = 0; index < 500; index++)
        palette.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    })
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(60)
    expect(previewRender).toHaveBeenCalledTimes(renderCount)

    await act(async () => host.querySelector<HTMLButtonElement>('.map-stamp-card')!.click())
    expect(onPick).toHaveBeenCalledWith('stamp-0000')
  })
})
