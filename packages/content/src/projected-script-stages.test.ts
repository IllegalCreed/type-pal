import { describe, expect, test } from 'vitest'
import { expectAcceptsUnchanged } from './__tests__/validation-assertions.js'
import {
  applyStageNext,
  checkStages,
  emptyProjectedWorldScriptState,
  type ScriptStage,
  stageIndexFor,
} from './script.js'

const triggerKey = 'npc-guard:trigger'

function triggerStages(): [ScriptStage, ScriptStage] {
  return [
    { body: [{ kind: 'setFlag', flag: 'met-guard', value: true }], next: 'advance' },
    { body: [{ kind: 'dialog', cue: { rows: [{ text: 'Welcome back.' }] } }] },
  ]
}

describe('projected trigger stages', () => {
  test('a fresh projection starts empty and owns its script state', () => {
    const world = emptyProjectedWorldScriptState()
    const other = emptyProjectedWorldScriptState()
    expect(world).toEqual({ flags: {}, vars: {}, entityState: {}, entityStage: {} })
    world.flags['met-guard'] = true
    world.vars.score = 3
    world.entityState.guard = 2
    applyStageNext(world, triggerKey, 0, 'advance')
    expect(other).toEqual({ flags: {}, vars: {}, entityState: {}, entityStage: {} })
  })

  test('selects the first, current or last stage from the stored trigger cursor', () => {
    const world = emptyProjectedWorldScriptState()
    const stages = triggerStages()
    expect(stageIndexFor(world, triggerKey, stages)).toBe(0)
    world.entityStage[triggerKey] = 1
    expect(stageIndexFor(world, triggerKey, stages)).toBe(1)
    world.entityStage[triggerKey] = 99
    expect(stageIndexFor(world, triggerKey, stages)).toBe(1)
    expect(world.entityStage[triggerKey]).toBe(99)
  })

  test('advances, stays after an unspecified next, and can reset to an exact index', () => {
    const world = emptyProjectedWorldScriptState()
    const stages = triggerStages()
    world.entityStage['another-trigger'] = 7
    applyStageNext(world, triggerKey, 0, 'advance')
    expect(stageIndexFor(world, triggerKey, stages)).toBe(1)
    applyStageNext(world, triggerKey, 1, undefined)
    expect(world.entityStage[triggerKey]).toBe(1)
    applyStageNext(world, triggerKey, 1, 0)
    expect(stageIndexFor(world, triggerKey, stages)).toBe(0)
    applyStageNext(world, triggerKey, 0, 3)
    expect(world.entityStage).toEqual({ 'another-trigger': 7, [triggerKey]: 3 })
  })

  test('uses the first stage when the accepted projection contains a negative cursor', () => {
    const stages = triggerStages()
    stages[0].next = -2
    expectAcceptsUnchanged((value) => checkStages(value, 'entity.trigger.stages'), stages)
    const world = emptyProjectedWorldScriptState()
    applyStageNext(world, triggerKey, 0, stages[0].next)
    expect(world.entityStage[triggerKey]).toBe(-2)
    expect(stageIndexFor(world, triggerKey, stages)).toBe(0)
  })
})
