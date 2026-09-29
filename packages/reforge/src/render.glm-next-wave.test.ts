/**
 * TEST-GLM-NEW-G-1 G03：render 公开边界残差（node 环境，canvas 只替外部 IO）。
 * 旧证（render.test.ts 遮挡/层序四题）只走 renderScene；本文件补旧题未覆盖臂：
 *   1) spriteBlitRect 资产级 +7 落底契约（render.ts:110-115；READ-FIRST 铁律 6）；
 *   2) bakeFrame colorShift 低 4 位钳制与 alpha 映射（render.ts:46-57）；
 *   3) Canvas2DRenderer.clear() 整幅黑底（render.ts:370-374）；
 *   4) drawSprite 相机相对取整 blit（render.ts:471-486）。
 * canvas 替身与 render.test.ts / dom-host 同型：仅窄化外部 Canvas IO 适配器，
 * 不强转任何工程/世界/业务输入。不以截图当完整场景证明。
 */
import type { Palette, RleFrame } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { bakeFrame, Canvas2DRenderer, spriteBlitRect } from './render.js'

const probe = new Map<object, Uint8ClampedArray>()

/** 记录 putImageData 像素的外部 canvas 替身（bakeFrame 产物从这里读回像素）。 */
function installCanvasHost(): void {
  probe.clear()
  vi.stubGlobal('document', {
    createElement: () => {
      const host: {
        width: number
        height: number
        getContext: () => unknown
      } = { width: 0, height: 0, getContext: () => ctx }
      const ctx = {
        canvas: host,
        fillStyle: '',
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (image: ImageData) => {
          probe.set(host, image.data)
        },
      }
      return host
    },
  })
}

function frame(width: number, height: number, pixel = 1): RleFrame {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height).fill(pixel),
    opaque: new Uint8Array(width * height).fill(1),
  }
}

const palette: Palette = {
  colors: Array.from({ length: 256 }, (_, v) => [v, v + 1, v + 2]),
  cycles: [],
}

describe('G03 render 公开边界残差', () => {
  beforeEach(() => installCanvasHost())
  afterEach(() => vi.unstubAllGlobals())

  test('spriteBlitRect：y 轴固定 +7 资产落底、锚点精确扣减（零锚对照）', () => {
    const anchored = spriteBlitRect({
      worldX: 100,
      worldY: 50,
      anchorX: 5,
      anchorY: 12,
      frame: frame(10, 20),
    })
    expect(anchored).toEqual({ x: 95, y: 45, w: 10, h: 20 }) // 50 - 12 + 7
    const zeroAnchor = spriteBlitRect({
      worldX: 100,
      worldY: 50,
      anchorX: 0,
      anchorY: 0,
      frame: frame(10, 20),
    })
    expect(zeroAnchor).toEqual({ x: 100, y: 57, w: 10, h: 20 }) // +7 仍生效
  })

  test('bakeFrame：colorShift 低 4 位上/下钳制，透明像素 alpha 0，高 4 位 band 不动', () => {
    const source: RleFrame = {
      width: 3,
      height: 1,
      pixels: new Uint8Array([0x00, 0x0f, 0x34]),
      opaque: new Uint8Array([1, 1, 0]),
    }
    const shifted = bakeFrame(source, palette, 2)
    // 像素0: low 0+2=2 → idx 0x02；像素1: low 0x0f+2 → 钳 0x0f；像素2: high band 0x30 不动 + low 4+2=6。
    expect(shifted.width).toBe(3)
    expect([...(probe.get(shifted)?.slice(0, 12) ?? [])]).toEqual([
      2, 3, 4, 255, 15, 16, 17, 255, 54, 55, 56, 0,
    ])
    const negative = bakeFrame(source, palette, -5)
    expect([...(probe.get(negative)?.slice(0, 8) ?? [])]).toEqual([0, 1, 2, 255, 10, 11, 12, 255])
  })

  test('clear()：以 #000 fillRect 覆盖整幅 canvas', () => {
    const fillRect = vi.fn()
    const stub: Partial<Omit<CanvasRenderingContext2D, 'canvas'>> & {
      canvas: { width: number; height: number }
    } = {
      canvas: { width: 320, height: 200 },
      fillStyle: '',
      drawImage: vi.fn(),
      fillRect,
    }
    // 外部 Canvas IO 适配器：与 dom-host.ts 同型的单次窄化（不涉工程/业务输入）。
    const ctx = stub as CanvasRenderingContext2D
    const renderer = new Canvas2DRenderer(ctx, palette, new Map())
    renderer.clear()
    expect(ctx.fillStyle).toBe('#000')
    expect(fillRect).toHaveBeenCalledWith(0, 0, 320, 200)
  })

  test('drawSprite：相机相对取整 blit，同帧共享 bake 画布', () => {
    const drawImage = vi.fn()
    const stub: Partial<Omit<CanvasRenderingContext2D, 'canvas'>> & {
      canvas: { width: number; height: number }
    } = {
      canvas: { width: 320, height: 200 },
      fillStyle: '',
      drawImage,
      fillRect: vi.fn(),
    }
    // 外部 Canvas IO 适配器：与 dom-host.ts 同型的单次窄化（不涉工程/业务输入）。
    const ctx = stub as CanvasRenderingContext2D
    const renderer = new Canvas2DRenderer(ctx, palette, new Map())
    const shared = frame(8, 6)
    renderer.drawSprite(shared, 20.4, 30.6, 4, 6, { x: 0.5, y: 0.5 })
    renderer.drawSprite(shared, 20.4, 30.6, 4, 6, { x: 0.5, y: 0.5 })
    expect(drawImage).toHaveBeenCalledTimes(2)
    const [image, dx, dy] = drawImage.mock.calls[0] as [HTMLCanvasElement, number, number]
    expect(image.width).toBe(8)
    expect(dx).toBe(16) // round(20.4 - 4 - 0.5)
    expect(dy).toBe(24) // round(30.6 - 6 - 0.5)
  })
})
