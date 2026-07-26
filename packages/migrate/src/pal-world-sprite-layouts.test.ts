import { describe, expect, test } from 'vitest'
import {
  assertPalWorldSpriteLayoutOverlaySources,
  PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT,
  PAL_WORLD_SPRITE_LAYOUT_OVERLAYS,
} from './pal-world-sprite-layouts.js'

describe('PAL 大世界精灵逐项布局证据', () => {
  test('13 条确定债集合、物理帧与证据文本冻结', () => {
    expect(
      PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT.map(({ spriteNum, expectedFrameCount }) => [
        spriteNum,
        expectedFrameCount,
      ]),
    ).toEqual([
      [236, 1],
      [242, 5],
      [273, 4],
      [361, 5],
      [379, 5],
      [385, 2],
      [394, 2],
      [541, 1],
      [550, 2],
      [627, 4],
      [630, 4],
      [631, 7],
      [632, 7],
    ])
    for (const audit of PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT)
      expect(audit.evidence, `sprite ${audit.spriteNum}`).not.toHaveLength(0)
  })

  test('overlay 是无重复的逐项清单，不含通用推断入口', () => {
    const spriteNums = PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.map(({ spriteNum }) => spriteNum)
    expect(new Set(spriteNums).size).toBe(spriteNums.length)
    expect(spriteNums).toEqual([
      236, 242, 259, 273, 361, 379, 385, 394, 541, 550, 627, 630, 631, 632, 193, 228, 232, 245, 521,
      531, 532, 533, 534, 538, 563, 576, 607,
    ])
    for (const overlay of PAL_WORLD_SPRITE_LAYOUT_OVERLAYS) {
      expect(overlay.usage, `sprite ${overlay.spriteNum}`).not.toHaveLength(0)
      expect(overlay.evidence, `sprite ${overlay.spriteNum}`).not.toHaveLength(0)
      expect(overlay.expectedFrameCount, `sprite ${overlay.spriteNum}`).toBeGreaterThan(0)
    }
  })

  test('物理帧只验证 overlay 漂移，不用于反推布局', () => {
    const frameCounts = Array.from({ length: 636 }, () => 1)
    for (const overlay of PAL_WORLD_SPRITE_LAYOUT_OVERLAYS)
      frameCounts[overlay.spriteNum - 1] = overlay.expectedFrameCount
    expect(() => assertPalWorldSpriteLayoutOverlaySources(frameCounts)).not.toThrow()

    frameCounts[534 - 1] = 15
    expect(() => assertPalWorldSpriteLayoutOverlaySources(frameCounts)).toThrow(
      /精灵 534 物理帧漂移.*期望 16.*实际 15/,
    )
  })
})
