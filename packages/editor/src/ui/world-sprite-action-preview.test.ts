import { describe, expect, test } from 'vitest'
import { worldSpriteSemanticGroups } from './world-sprite-action-preview.js'

describe('大世界语义动作行', () => {
  test('多帧行走保留引擎步序，预制动作显示完整逐帧时间线', () => {
    const groups = worldSpriteSemanticGroups(
      [
        {
          id: 'hero',
          label: '主角',
          asset: 'sprite.hero',
          layout: { kind: 'directional', framesPerDir: 3 },
          poses: {
            sit: {
              label: '坐下',
              steps: [
                { frame: 12, durationMs: 180 },
                { frame: 13, durationMs: 320 },
              ],
            },
          },
        },
      ],
      14,
      'hero',
    )
    expect(groups[0]?.active).toBe(true)
    expect(groups[0]?.rows[0]).toMatchObject({
      label: '下 · 行走',
      frames: [0, 1, 2],
      playbackFrames: [0, 1, 0, 2],
    })
    expect(groups[0]?.rows.at(-1)).toMatchObject({
      label: '坐下',
      frames: [12, 13],
      playbackSteps: [
        { frame: 12, holdMs: 180 },
        { frame: 13, holdMs: 320 },
      ],
    })
  })
})
