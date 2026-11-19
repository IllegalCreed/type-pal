import { describe, expect, test } from 'vitest'
import {
  assertPalWorldSpriteLayoutOverlaySources,
  PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT,
  PAL_WORLD_SPRITE_LAYOUT_OVERLAYS,
} from './pal-world-sprite-layouts.js'

describe('PAL 大世界精灵逐项布局证据', () => {
  test('the thirteen corrected frame debts stay on static layouts', () => {
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
    for (const { spriteNum, expectedFrameCount } of PAL_WORLD_SPRITE_LAYOUT_DEBT_AUDIT)
      expect(
        PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.find((overlay) => overlay.spriteNum === spriteNum),
      ).toMatchObject({
        layout: { kind: 'static' },
        expectedFrameCount,
      })
  })

  test('keeps exactly the audited PAL layout overrides', () => {
    const spriteNums = PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.map(({ spriteNum }) => spriteNum)
    expect(spriteNums).toEqual([
      236, 242, 259, 273, 361, 379, 385, 394, 541, 550, 627, 630, 631, 632, 193, 228, 232, 245, 521,
      531, 532, 533, 534, 538, 563, 576, 607,
    ])
  })

  test('reports a truncated source table and drift in sprite 534 frame count', () => {
    const frameCounts = Array.from({ length: 636 }, () => 1)
    for (const overlay of PAL_WORLD_SPRITE_LAYOUT_OVERLAYS)
      frameCounts[overlay.spriteNum - 1] = overlay.expectedFrameCount
    expect(() => assertPalWorldSpriteLayoutOverlaySources(frameCounts)).not.toThrow()

    expect(() => assertPalWorldSpriteLayoutOverlaySources(frameCounts.slice(1))).toThrow(
      'PAL 大世界精灵帧数表期望 636 项，收到 635',
    )
    frameCounts[534 - 1] = 15
    expect(() => assertPalWorldSpriteLayoutOverlaySources(frameCounts)).toThrow(
      /精灵 534 物理帧漂移.*期望 16.*实际 15/,
    )
  })
})
