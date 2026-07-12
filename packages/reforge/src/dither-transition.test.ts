import type { ScriptStage } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  applyDitherGradient,
  buildDitherBridge,
  DITHER_MAX_VISITS,
  DITHER_TOTAL_STEPS,
  DitherTransitionController,
  ditherVisitsForPixel,
  hasEarlyDitherScreen,
} from './dither-transition.js'

function rgba(values: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255]))
}

function pixels(values: Array<[number, number, number, number?]>): Uint8ClampedArray {
  return new Uint8ClampedArray(values.flatMap(([r, g, b, a = 255]) => [r, g, b, a]))
}

describe('buildDitherBridge', () => {
  test('使用目标色相/色度与来源亮度，并保持端点和 alpha 不变', () => {
    const source = pixels([[20, 20, 180, 41]])
    const target = pixels([[240, 20, 20, 211]])
    const sourceBefore = source.slice()
    const targetBefore = target.slice()
    const bridge = new Uint8ClampedArray(4)

    buildDitherBridge(source, target, bridge, 1)

    expect(bridge[0]).toBeGreaterThan(bridge[1]!)
    expect(bridge[0]).toBeGreaterThan(bridge[2]!)
    expect(bridge[3]).toBe(41)
    expect(bridge).not.toEqual(source)
    expect(bridge).not.toEqual(target)
    expect(source).toEqual(sourceBefore)
    expect(target).toEqual(targetBefore)
  })

  test('覆盖中性退化、近黑两端与高饱和超色域映射', () => {
    const source = pixels([
      [240, 20, 20],
      [0, 0, 0],
      [180, 120, 80],
      [230, 230, 230],
    ])
    const target = pixels([
      [128, 128, 128],
      [255, 0, 0],
      [1, 1, 1],
      [255, 0, 255],
    ])
    const bridge = new Uint8ClampedArray(source.length)

    buildDitherBridge(source, target, bridge, 4)

    expect(Math.max(...bridge.slice(0, 3)) - Math.min(...bridge.slice(0, 3))).toBeLessThanOrEqual(1)
    expect(Array.from(bridge.slice(4, 7))).toEqual([0, 0, 0])
    expect(Math.max(...bridge.slice(8, 11)) - Math.min(...bridge.slice(8, 11))).toBeLessThanOrEqual(
      1,
    )
    expect(bridge[12]).toBeGreaterThan(bridge[13]!)
    expect(bridge[14]).toBeGreaterThan(bridge[13]!)
  })

  test('钳制 pixelCount 并拒绝 bridge 与端点共用缓冲', () => {
    const source = rgba([10, 20])
    const target = rgba([30, 40, 50])
    const bridge = new Uint8ClampedArray(source.length)
    expect(() => buildDitherBridge(source, target, bridge, 999)).not.toThrow()
    expect(() => buildDitherBridge(source, target, source, 1)).toThrow(/独立/)
  })
})

describe('applyDitherGradient', () => {
  test('step 0/6/72 精确等于 source/bridge/target，且三个输入保持不可变', () => {
    const target = rgba([10, 20, 30, 40, 50, 60])
    const source = rgba([1, 2, 3, 4, 5, 6])
    const bridge = rgba([6, 7, 8, 9, 10, 11])
    const sourceBefore = source.slice()
    const bridgeBefore = bridge.slice()
    const targetBefore = target.slice()
    const output = new Uint8ClampedArray(source.length)

    applyDitherGradient(source, bridge, target, output, 0, 6)
    expect(output).toEqual(source)
    applyDitherGradient(source, bridge, target, output, 6, 6)
    expect(output).toEqual(bridge)
    applyDitherGradient(source, bridge, target, output, DITHER_TOTAL_STEPS, 6)
    expect(output).toEqual(target)
    expect(source).toEqual(sourceBefore)
    expect(bridge).toEqual(bridgeBefore)
    expect(target).toEqual(targetBefore)
  })

  test('六相位按 RG_INDEX={0,3,1,5,2,4} 错峰首次跳到 bridge', () => {
    const source = rgba(Array.from({ length: 6 }, () => 0))
    const bridge = rgba(Array.from({ length: 6 }, () => 60))
    const target = rgba(Array.from({ length: 6 }, () => 120))
    const output = new Uint8ClampedArray(source.length)
    const phaseOrder = [0, 3, 1, 5, 2, 4]
    for (let step = 1; step <= 6; step++) {
      applyDitherGradient(source, bridge, target, output, step, 6)
      const changed = Array.from({ length: 6 }, (_, index) => output[index * 4])
        .map((value, index) => (value === 60 ? index : -1))
        .filter((index) => index >= 0)
      expect(changed.sort((a, b) => a - b)).toEqual(phaseOrder.slice(0, step).sort((a, b) => a - b))
    }
  })

  test('visits 边界覆盖首次、第二次与各相位第十二次访问', () => {
    const phaseOrder = [0, 3, 1, 5, 2, 4]
    for (let rank = 0; rank < phaseOrder.length; rank++) {
      const logicalIndex = phaseOrder[rank]!
      expect(ditherVisitsForPixel(logicalIndex, rank)).toBe(0)
      expect(ditherVisitsForPixel(logicalIndex, rank + 1)).toBe(1)
      expect(ditherVisitsForPixel(logicalIndex, rank + 6)).toBe(1)
      expect(ditherVisitsForPixel(logicalIndex, rank + 7)).toBe(2)
      expect(ditherVisitsForPixel(logicalIndex, rank + 67)).toBe(DITHER_MAX_VISITS)
    }
    expect(phaseOrder.map((index) => ditherVisitsForPixel(index, 6))).toEqual([1, 1, 1, 1, 1, 1])
    expect(phaseOrder.map((index) => ditherVisitsForPixel(index, 72))).toEqual([
      12, 12, 12, 12, 12, 12,
    ])
  })

  test('同一像素先跳 bridge，再用 11 级单调收敛 target，且不是累积写法', () => {
    const source = rgba(Array.from({ length: 6 }, () => 0))
    const bridge = rgba(Array.from({ length: 6 }, () => 10))
    const target = rgba(Array.from({ length: 6 }, () => 120))
    const output = new Uint8ClampedArray(source.length)
    const samples: number[] = []
    for (let step = 0; step <= DITHER_TOTAL_STEPS; step += 6) {
      applyDitherGradient(source, bridge, target, output, step, 6)
      samples.push(output[4 * 4]!) // phase rank 5 的最后一组像素
    }
    expect(samples).toEqual(Array.from({ length: DITHER_MAX_VISITS + 1 }, (_, level) => level * 10))

    applyDitherGradient(source, bridge, target, output, 60, 6)
    applyDitherGradient(source, bridge, target, output, 6, 6)
    expect(output[4 * 4]).toBe(10)
  })

  test('bridge 到 target 的 sRGB 与 gamma-correct 两路都有中间色，gamma 更亮', () => {
    const source = rgba([90])
    const bridge = rgba([0])
    const target = rgba([255])
    const srgb = new Uint8ClampedArray(4)
    const gamma = new Uint8ClampedArray(4)
    // phase rank 0 在 step37 时 visits=7，即 bridge→target 的 level 6/11。
    applyDitherGradient(source, bridge, target, srgb, 37, 1, undefined, 'srgb')
    applyDitherGradient(source, bridge, target, gamma, 37, 1, undefined, 'linear-light')
    expect(srgb).toEqual(new Uint8ClampedArray([139, 139, 139, 255]))
    expect(gamma[0]).toBeGreaterThan(srgb[0]!)
    expect(gamma[1]).toBe(gamma[0])
    expect(gamma[2]).toBe(gamma[0])
    expect(gamma[3]).toBe(255)
  })

  test('4× 点阵网格按逻辑像素整块使用同一级别', () => {
    const width = 8
    const height = 4
    const source = rgba(Array.from({ length: width * height }, () => 10))
    const bridge = rgba(Array.from({ length: width * height }, () => 70))
    const target = rgba(Array.from({ length: width * height }, () => 130))
    const output = new Uint8ClampedArray(source.length)
    applyDitherGradient(source, bridge, target, output, 1, width * height, {
      width,
      pixelScale: 4,
    })
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(output[(y * width + x) * 4]).toBe(x < 4 ? 70 : 10)
      }
    }
  })

  test('alpha 首访保持 source，之后线性收敛 target', () => {
    const source = pixels([[10, 20, 30, 32]])
    const bridge = pixels([[200, 30, 10, 32]])
    const target = pixels([[240, 80, 20, 224]])
    const output = new Uint8ClampedArray(4)
    applyDitherGradient(source, bridge, target, output, 1, 1)
    expect(output[3]).toBe(32)
    applyDitherGradient(source, bridge, target, output, 37, 1)
    expect(output[3]).toBe(137)
    applyDitherGradient(source, bridge, target, output, 72, 1)
    expect(output[3]).toBe(224)
  })

  test('step/pixelCount/数组长度钳边界，并拒绝 output 与任一输入共用缓冲', () => {
    const source = rgba([1, 2])
    const bridge = rgba([5, 10])
    const target = rgba([10, 20, 30])
    const output = new Uint8ClampedArray(source.length)
    expect(() => applyDitherGradient(source, bridge, target, output, 999, 999)).not.toThrow()
    expect(output).toEqual(rgba([10, 20]))
    expect(ditherVisitsForPixel(Number.NaN, Number.NaN)).toBe(0)
    expect(() => applyDitherGradient(source, bridge, target, bridge, 1, 2)).toThrow(/独立/)
  })
})

describe('hasEarlyDitherScreen', () => {
  test('只接受同步确定前缀中的 ditherScreen', () => {
    const stage: ScriptStage = {
      body: [
        { kind: 'playMusic', musicId: 31 },
        { kind: 'teleportParty', pos: { col: 59, row: -23, height: 0 } },
        { kind: 'ditherScreen', ms: 2160 },
        { kind: 'dialog', line: { text: 'after' } },
      ],
    }
    expect(hasEarlyDitherScreen(stage)).toBe(true)
  })

  test('阻塞命令或分支在前时关闭前瞻', () => {
    expect(
      hasEarlyDitherScreen({
        body: [
          { kind: 'wait', ms: 1 },
          { kind: 'ditherScreen', ms: 720 },
        ],
      }),
    ).toBe(false)
    expect(
      hasEarlyDitherScreen({
        body: [
          // biome-ignore lint/suspicious/noThenProperty: ScriptCommand 的固定 schema 字段。
          { kind: 'branch', cond: { kind: 'flag', flag: 'x', is: true }, then: [] },
          { kind: 'ditherScreen' },
        ],
      }),
    ).toBe(false)
  })
})

describe('DitherTransitionController', () => {
  test('跨场景优先消费匹配 handoff，不调用命令内 snapshot', () => {
    const controller = new DitherTransitionController<string>()
    const snapshot = vi.fn(() => 'new-snapshot')
    controller.arm('s001', 's000-final')
    void controller.begin('s001', snapshot, 2160)
    expect(controller.active?.backup).toBe('s000-final')
    expect(controller.active?.source).toBe('handoff')
    expect(controller.pendingTargetSceneId).toBeNull()
    expect(snapshot).not.toHaveBeenCalled()
  })

  test('独立站点走命令内 snapshot；cancel 清状态并兑现 Promise', async () => {
    const controller = new DitherTransitionController<string>()
    const done = controller.begin('s020', () => 'same-scene-frame', 720)
    expect(controller.active?.backup).toBe('same-scene-frame')
    expect(controller.active?.source).toBe('snapshot')
    controller.arm('s021', 'old-frame')
    await done

    const activeDone = controller.begin('s021', () => 'unused', 720)
    controller.cancel()
    await activeDone
    expect(controller.active).toBeNull()
    expect(controller.pendingTargetSceneId).toBeNull()
  })
})
