/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C1：applyStageNext 数字 0 重置。
 * guard-residual 已证 advance / 数字 3 / undefined stay。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { applyStageNext } from './script.js'

describe('C1 script 剩余合同', () => {
  test('applyStageNext(0) 重置到首段，旁实体阶段不动', () => {
    const world = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: { talker: 2, other: 4 },
    }
    const snap = inputSnap(world)
    applyStageNext(world, 'talker', 2, 0)
    expect(world.entityStage).toEqual({ talker: 0, other: 4 })
    expect(world.flags).toEqual(snap.flags)
    expect(world.vars).toEqual(snap.vars)
    expect(world.entityState).toEqual(snap.entityState)
    expect(world.entityStage.other).toBe(4)
  })
})
