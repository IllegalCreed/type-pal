/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C2：死者仍可施加坏状态。
 * 旧测只证好状态对 hp=0 拒绝。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import {
  type ActorConditionCarrier,
  applyActorCondition,
  checkActorConditionCommandShape,
} from './actor-condition.js'
import { validatePoisons } from './validate.js'

describe('C2 actor-condition 剩余合同', () => {
  test('死者 apply confused 成功；好状态对照仍拒，毒表与命令不变', () => {
    const command = {
      kind: 'applyActorCondition' as const,
      actor: 'hero',
      condition: { kind: 'status' as const, status: 'confused' as const, turns: 3 },
    }
    const commandSnap = inputSnap(command)
    checkActorConditionCommandShape(command, 'cmd')
    expect(command).toEqual(commandSnap)
    const defs = Object.fromEntries(
      validatePoisons([{ id: 551, name: '赤毒', curability: 'common', color: 16 }]).map(
        (poison) => [poison.id, poison],
      ),
    )
    const dead: ActorConditionCarrier = { hp: 0 }
    const deadSnap = inputSnap(dead)
    expect(applyActorCondition(dead, command.condition, defs)).toBe(true)
    expect(dead.extraStatuses).toEqual([{ status: 'confused', turns: 3 }])
    expect(dead.hp).toBe(deadSnap.hp)
    expect(command).toEqual(commandSnap)
    const protect = {
      kind: 'applyActorCondition' as const,
      actor: 'hero',
      condition: { kind: 'status' as const, status: 'protect' as const, turns: 4 },
    }
    checkActorConditionCommandShape(protect, 'cmd')
    const stillDead: ActorConditionCarrier = { hp: 0 }
    expect(applyActorCondition(stillDead, protect.condition, defs)).toBe(false)
    expect(stillDead.extraStatuses).toBeUndefined()
  })
})
