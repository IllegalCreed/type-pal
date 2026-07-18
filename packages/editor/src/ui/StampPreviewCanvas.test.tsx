// @vitest-environment jsdom
import type { StampTemplateV1 } from '@type-pal/content'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { StampPreviewCanvas } from './StampPreviewCanvas.js'

vi.mock('@type-pal/reforge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@type-pal/reforge')>()
  const frame: import('@type-pal/reforge').RleFrame = {
    width: 32,
    height: 16,
    pixels: new Uint8Array(32 * 16),
    opaque: new Uint8Array(32 * 16),
  }
  return {
    ...original,
    loadStandardPalette: vi.fn(async () => ({
      colors: Array.from({ length: 256 }, () => [0, 0, 0]),
      cycles: [],
    })),
    loadTilesetByPath: vi.fn(async () => new Map([[0, frame]])),
    bakeFrame: vi.fn(() => document.createElement('canvas')),
  }
})

const template: StampTemplateV1 = {
  id: 'missing-member',
  name: '缺帧树',
  tilesetId: 'tiles-a',
  origin: 'authored',
  layerSlots: [{ id: 'floor', name: '地板', depthMode: 'flat' }],
  visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 9, height: 0 }],
  collision: [{ offset: { dRow: 0, du: 0 }, value: 0 }],
}

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      imageSmoothingEnabled: false,
      lineWidth: 1,
      fillStyle: '',
      strokeStyle: '',
    }),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('StampPreviewCanvas', () => {
  test('缺 tileId fail-visible，canvas 有文本等价且图层/碰撞可独立切换', async () => {
    await act(async () => {
      root.render(
        <StampPreviewCanvas
          template={template}
          tilesets={[{ id: 'tiles-a', name: 'A', category: 'test', path: 'tiles/a.rle' }]}
          tilesetBlobs={{}}
          assetBase={{} as never}
        />,
      )
      await Promise.resolve()
    })
    expect(host.textContent).toContain('瓦片集缺少 tileId：9')
    expect(host.querySelector('canvas[role="img"]')?.getAttribute('aria-label')).toContain(
      '1 层、1 个视觉成员',
    )
    const collision = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes('碰撞叠层'),
    )!
    expect(collision.getAttribute('aria-pressed')).toBe('true')
    await act(async () => collision.click())
    expect(collision.getAttribute('aria-pressed')).toBe('false')
    const layer = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes('地板'),
    )!
    await act(async () => layer.click())
    expect(layer.getAttribute('aria-pressed')).toBe('false')
    expect(host.textContent).toContain('0 个可见成员')
  })
})
