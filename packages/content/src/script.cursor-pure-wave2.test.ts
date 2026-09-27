/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C1：stageIndexFor 下限钳 0。
 * guard-residual 已证缺省 0、越界钳末段、advance/数字 3。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import {
  applyStageNext,
  checkStages,
  emptyProjectedWorldScriptState,
  stageIndexFor,
} from './script.js'

describe('C1 script 剩余合同', () => {
  test('负 entityStage 经 checkStages 后钳到 0，越界对照仍是末段', () => {
    const stages = [{ body: [], next: -2 }, { body: [] }]
    const stageSnap = inputSnap(stages)
    checkStages(stages, 'stages')
    expect(stages).toEqual(stageSnap)
    const world = emptyProjectedWorldScriptState()
    applyStageNext(world, 'talker', 0, -2)
    expect(world.entityStage.talker).toBe(-2)
    expect(stageIndexFor(world, 'talker', stages)).toBe(0)
    const overflow = emptyProjectedWorldScriptState()
    overflow.entityStage.talker = 5
    expect(stageIndexFor(overflow, 'talker', stages)).toBe(1)
  })
})
