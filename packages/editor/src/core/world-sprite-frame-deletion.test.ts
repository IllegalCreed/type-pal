import type { SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { planWorldSpriteFrameDeletion } from './world-sprite-frame-deletion.js'

describe('大世界精灵源帧删除', () => {
  test('四向行走前缀内的单帧删除必须阻断', () => {
    const directional: SpriteDef = {
      id: 'hero',
      label: '主角',
      asset: 'sprite.shared',
      layout: { kind: 'directional', framesPerDir: 3 },
    }
    expect(() => planWorldSpriteFrameDeletion([directional], 5, 16)).toThrow(/四向行走/)
  })

  test('删动作尾帧会丢弃命中帧、前移后续帧号并修正循环长度', () => {
    const directional: SpriteDef = {
      id: 'hero',
      label: '主角',
      asset: 'sprite.shared',
      layout: { kind: 'directional', framesPerDir: 2 },
      poses: {
        vanish: { label: '消失', steps: [{ frame: 9, durationMs: 250 }] },
        later: {
          label: '后续',
          steps: [
            { frame: 8, durationMs: 100 },
            { frame: 10, durationMs: 200, cues: [{ kind: 'sound', asset: 'sound.test' }] },
            { frame: 11, durationMs: 300 },
          ],
          loopFrom: 0,
        },
      },
    }
    const staticUse: SpriteDef = {
      id: 'effect',
      label: '共享定格源帧',
      asset: 'sprite.shared',
      layout: { kind: 'static' },
      poses: {
        tailLoop: {
          label: '尾部循环',
          steps: [
            { frame: 4, durationMs: 100 },
            { frame: 9, durationMs: 250 },
          ],
          loopFrom: 1,
        },
      },
    }
    const plan = planWorldSpriteFrameDeletion([directional, staticUse], 9, 12)
    expect(plan.repairs.hero?.poses).toEqual({
      later: {
        label: '后续',
        steps: [
          { frame: 8, durationMs: 100 },
          { frame: 9, durationMs: 200, cues: [{ kind: 'sound', asset: 'sound.test' }] },
          { frame: 10, durationMs: 300 },
        ],
        loopFrom: 0,
      },
    })
    expect(plan.repairs.effect).toEqual({
      layout: { kind: 'static' },
      poses: {
        tailLoop: {
          label: '尾部循环',
          steps: [{ frame: 4, durationMs: 100 }],
        },
      },
    })
    expect(plan.consumerSnapshots.hero?.poses).toEqual(directional.poses)
  })

  test('无用途的源帧删除不生成修复记录', () => {
    expect(planWorldSpriteFrameDeletion([], 1, 3)).toEqual({
      repairs: {},
      consumerSnapshots: {},
      changes: [],
    })
  })
})
