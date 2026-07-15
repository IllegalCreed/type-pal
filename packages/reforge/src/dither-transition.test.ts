import type { ScriptStage } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  applyDitherPaletteTransition,
  buildDitherPalettePlan,
  DITHER_MAX_VISITS,
  DITHER_TOTAL_STEPS,
  DitherTransitionController,
  ditherVisitsForPixel,
  hasEarlyDitherScreen,
} from './dither-transition.js'

const paletteColors = Array.from({ length: 256 }, (_, index): [number, number, number] => [
  index,
  (index * 73) & 0xff,
  (index * 151) & 0xff,
])

function frame(indices: number[], alphas?: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(
    indices.flatMap((index, pixel) => [...paletteColors[index]!, alphas?.[pixel] ?? 255]),
  )
}

function outputIndices(output: Uint8ClampedArray): number[] {
  return Array.from({ length: Math.floor(output.length / 4) }, (_, pixel) => output[pixel * 4]!)
}

describe('buildDitherPalettePlan / applyDitherPaletteTransition', () => {
  test('旧文字的亮度轮廓进入新场景色系，再向 target 逐级溶解', () => {
    const source = frame([0x00, 0x4f], [41, 42]) // 黑背景 + 旧帧高亮文字
    const target = frame([0xa8, 0xa2], [211, 212])
    const sourceBefore = source.slice()
    const targetBefore = target.slice()
    const plan = buildDitherPalettePlan(source, target, paletteColors, 2)
    const output = new Uint8ClampedArray(source.length)

    applyDitherPaletteTransition(source, target, output, 0, 2, plan)
    expect(output).toEqual(source)

    // 六相位都首访后：target 色系 A + source 明暗 0/F。文字轮廓仍存在。
    applyDitherPaletteTransition(source, target, output, 6, 2, plan)
    expect(outputIndices(output)).toEqual([0xa0, 0xaf])
    expect([output[3], output[7]]).toEqual([211, 212])

    applyDitherPaletteTransition(source, target, output, 12, 2, plan)
    expect(outputIndices(output)).toEqual([0xa1, 0xae])

    applyDitherPaletteTransition(source, target, output, DITHER_TOTAL_STEPS, 2, plan)
    expect(output).toEqual(target)
    expect(source).toEqual(sourceBefore)
    expect(target).toEqual(targetBefore)
  })

  test('六相位按 RG_INDEX={0,3,1,5,2,4} 错峰换入 target 色系', () => {
    const source = frame(Array.from({ length: 6 }, () => 0x00))
    const target = frame(Array.from({ length: 6 }, () => 0xc5))
    const plan = buildDitherPalettePlan(source, target, paletteColors, 6)
    const output = new Uint8ClampedArray(source.length)
    const phaseOrder = [0, 3, 1, 5, 2, 4]
    for (let step = 1; step <= 6; step++) {
      applyDitherPaletteTransition(source, target, output, step, 6, plan)
      const changed = outputIndices(output)
        .map((value, index) => (value === 0xc0 ? index : -1))
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

  test('单像素保留 source 层级后每趟向 target 移一格，最终帧精确切 target', () => {
    const source = frame([0x0f])
    const target = frame([0xa2])
    const plan = buildDitherPalettePlan(source, target, paletteColors, 1)
    const output = new Uint8ClampedArray(4)
    const samples: number[] = []
    for (let visit = 1; visit <= DITHER_MAX_VISITS; visit++) {
      applyDitherPaletteTransition(source, target, output, 1 + (visit - 1) * 6, 1, plan)
      samples.push(output[0]!)
    }
    expect(samples).toEqual(Array.from({ length: 12 }, (_, index) => 0xaf - index))
    applyDitherPaletteTransition(source, target, output, DITHER_TOTAL_STEPS, 1, plan)
    expect(outputIndices(output)).toEqual([0xa2])

    applyDitherPaletteTransition(source, target, output, 61, 1, plan)
    applyDitherPaletteTransition(source, target, output, 7, 1, plan)
    expect(outputIndices(output)).toEqual([0xae])
  })

  test('4× 点阵网格按逻辑像素整块使用同一级别', () => {
    const width = 8
    const height = 4
    const source = frame(Array.from({ length: width * height }, () => 0x00))
    const target = frame(Array.from({ length: width * height }, () => 0xc5))
    const plan = buildDitherPalettePlan(source, target, paletteColors, width * height)
    const output = new Uint8ClampedArray(source.length)
    applyDitherPaletteTransition(source, target, output, 1, width * height, plan, {
      width,
      pixelScale: 4,
    })
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        expect(output[(y * width + x) * 4]).toBe(x < 4 ? 0xc0 : 0x00)
      }
    }
  })

  test('未访问像素保持 source alpha，访问后属于 target 画面', () => {
    const source = frame([0x0f], [32])
    const target = frame([0xa2], [224])
    const plan = buildDitherPalettePlan(source, target, paletteColors, 1)
    const output = new Uint8ClampedArray(4)
    applyDitherPaletteTransition(source, target, output, 0, 1, plan)
    expect(output[3]).toBe(32)
    applyDitherPaletteTransition(source, target, output, 1, 1, plan)
    expect(output[3]).toBe(224)
  })

  test('色表/pixelCount/数组长度钳边界，并拒绝 output 与端点共用缓冲', () => {
    const source = frame([0x01, 0x02])
    const target = frame([0x10, 0x20, 0x30])
    expect(() => buildDitherPalettePlan(source, target, paletteColors.slice(0, 255), 2)).toThrow(
      /256/,
    )
    const plan = buildDitherPalettePlan(source, target, paletteColors, 999)
    expect(plan.sourceLevels).toHaveLength(2)
    const output = new Uint8ClampedArray(source.length)
    expect(() => applyDitherPaletteTransition(source, target, output, 999, 999, plan)).not.toThrow()
    expect(output).toEqual(frame([0x10, 0x20]))
    expect(ditherVisitsForPixel(Number.NaN, Number.NaN)).toBe(0)
    expect(() => applyDitherPaletteTransition(source, target, source, 1, 2, plan)).toThrow(/独立/)
  })
})

describe('hasEarlyDitherScreen', () => {
  test('只接受同步确定前缀中的 ditherScreen', () => {
    const stage: ScriptStage = {
      body: [
        { kind: 'playMusic', musicId: 31 },
        { kind: 'teleportParty', pos: { col: 59, row: -23, height: 0 } },
        { kind: 'ditherScreen', ms: 2160 },
        { kind: 'dialog', cue: { rows: [{ text: 'after' }] } },
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
