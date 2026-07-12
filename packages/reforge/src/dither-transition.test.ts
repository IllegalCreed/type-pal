import type { ScriptStage } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  applyDitherGradient,
  DITHER_COLOR_LEVELS,
  DITHER_TOTAL_STEPS,
  DitherTransitionController,
  ditherLevelForPixel,
  hasEarlyDitherScreen,
} from './dither-transition.js'

function rgba(values: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(values.flatMap((value) => [value, value, value, 255]))
}

describe('applyDitherGradient', () => {
  test('step 0/72 精确等于 source/target，且两端缓冲保持不可变', () => {
    const target = rgba([10, 20, 30, 40, 50, 60])
    const source = rgba([1, 2, 3, 4, 5, 6])
    const sourceBefore = source.slice()
    const targetBefore = target.slice()
    const output = new Uint8ClampedArray(source.length)

    applyDitherGradient(source, target, output, 0, 6)
    expect(output).toEqual(source)
    applyDitherGradient(source, target, output, DITHER_TOTAL_STEPS, 6)
    expect(output).toEqual(target)
    expect(source).toEqual(sourceBefore)
    expect(target).toEqual(targetBefore)
  })

  test('六相位按 RG_INDEX={0,3,1,5,2,4} 错峰进入第一级', () => {
    const source = rgba(Array.from({ length: 6 }, () => 0))
    const target = rgba(Array.from({ length: 6 }, () => 120))
    const output = new Uint8ClampedArray(source.length)
    const phaseOrder = [0, 3, 1, 5, 2, 4]
    for (let step = 1; step <= 6; step++) {
      applyDitherGradient(source, target, output, step, 6)
      const changed = Array.from({ length: 6 }, (_, index) => output[index * 4])
        .map((value, index) => (value === 10 ? index : -1))
        .filter((index) => index >= 0)
      expect(changed.sort((a, b) => a - b)).toEqual(phaseOrder.slice(0, step).sort((a, b) => a - b))
    }
  })

  test('同一像素跨 12 个 outer 单调经历全部离散中间色，且不是累积写法', () => {
    const source = rgba(Array.from({ length: 6 }, () => 0))
    const target = rgba(Array.from({ length: 6 }, () => 120))
    const output = new Uint8ClampedArray(source.length)
    const samples: number[] = []
    for (let step = 0; step <= DITHER_TOTAL_STEPS; step += 6) {
      applyDitherGradient(source, target, output, step, 6)
      samples.push(output[4 * 4]!) // phase rank 5 的最后一组像素
    }
    expect(samples).toEqual(
      Array.from({ length: DITHER_COLOR_LEVELS + 1 }, (_, level) => level * 10),
    )

    applyDitherGradient(source, target, output, 60, 6)
    applyDitherGradient(source, target, output, 6, 6)
    expect(output[4 * 4]).toBe(10)
  })

  test('sRGB 与 gamma-correct 两路都有中间色，gamma 中点亮度更高', () => {
    const source = rgba([0])
    const target = rgba([255])
    const srgb = new Uint8ClampedArray(4)
    const gamma = new Uint8ClampedArray(4)
    // phase rank 0 在 step31 时 level=6，即颜色中点。
    applyDitherGradient(source, target, srgb, 31, 1, undefined, 'srgb')
    applyDitherGradient(source, target, gamma, 31, 1, undefined, 'linear-light')
    expect(srgb).toEqual(new Uint8ClampedArray([128, 128, 128, 255]))
    expect(gamma[0]).toBeGreaterThanOrEqual(185)
    expect(gamma[0]).toBeLessThanOrEqual(187)
    expect(gamma[1]).toBe(gamma[0])
    expect(gamma[2]).toBe(gamma[0])
    expect(gamma[3]).toBe(255)
  })

  test('4× 点阵网格按逻辑像素整块使用同一级别', () => {
    const width = 8
    const height = 4
    const source = rgba(Array.from({ length: width * height }, () => 10))
    const target = rgba(Array.from({ length: width * height }, () => 130))
    const output = new Uint8ClampedArray(source.length)
    applyDitherGradient(source, target, output, 1, width * height, { width, pixelScale: 4 })
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(output[(y * width + x) * 4]).toBe(x < 4 ? 20 : 10)
      }
    }
  })

  test('step/pixelCount/数组长度钳边界，并拒绝 output 与端点共用缓冲', () => {
    const source = rgba([1, 2])
    const target = rgba([10, 20, 30])
    const output = new Uint8ClampedArray(source.length)
    expect(() => applyDitherGradient(source, target, output, 999, 999)).not.toThrow()
    expect(output).toEqual(rgba([10, 20]))
    expect(ditherLevelForPixel(Number.NaN, Number.NaN)).toBe(0)
    expect(() => applyDitherGradient(source, target, source, 1, 2)).toThrow(/独立/)
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
