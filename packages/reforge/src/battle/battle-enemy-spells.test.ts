import type { SkillData } from '@type-pal/content'
import { expect, test } from 'vitest'
import { wfEnemy, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { expectDefined } from '../defined.js'
import { createBattleState, stepBattle } from './battle-core.js'

const highestRoll = () => 0.99

function actionAfterTakingHit(
  spell: SkillData,
  options: { casterHealth: number; playerHealth?: number; playerAttack: number },
) {
  const caster = wfEnemy(
    'caster',
    { health: options.casterHealth },
    {
      ai: {
        resistanceToSorcery: 5,
        rules: [{ at: 'act', do: { kind: 'cast', skillId: spell.id } }],
      },
    },
  )
  const state = createBattleState({
    players: [
      wfPlayer('hero', {
        ...(options.playerHealth === undefined ? {} : { hp: options.playerHealth }),
        attackStrength: options.playerAttack,
        baseDexterity: 500,
      }),
    ],
    enemySlots: [caster],
    skills: { [spell.id]: spell },
  })
  stepBattle(state, highestRoll)
  state.pendingActions.set(0, { kind: 'attack', targetEnemyIdx: 0 })
  stepBattle(state, highestRoll)
  stepBattle(state, highestRoll)
  expect(state.lastAction).toMatchObject({ side: 'player', idx: 0, kind: 'attack' })
  const enemy = expectDefined(state.enemies[0])
  const hpAfterHit = enemy.hp
  stepBattle(state, highestRoll)
  expect(state.lastAction).toMatchObject({ side: 'enemy', idx: 0, kind: 'cast', skillId: spell.id })
  return { state, hpAfterHit, enemy }
}

test('an enemy healing spell applies the full amount up to that enemy’s maximum', () => {
  const heal = (amount: number) =>
    actionAfterTakingHit(
      {
        ...wfSkill('heal', 0),
        target: 'self',
        effects: [{ kind: 'healHp', amount }],
      },
      { casterHealth: 100, playerAttack: 40 },
    )

  const small = heal(5)
  expect(small.hpAfterHit).toBeLessThan(95)
  expect(small.enemy.hp).toBe(small.hpAfterHit + 5)
  expect(small.state.players[0]?.hp).toBe(100)
  expect(small.state.log).toContain('caster 施展 name.heal 回复 5')

  const large = heal(50)
  expect(large.hpAfterHit).toBe(small.hpAfterHit)
  expect(large.hpAfterHit).toBeGreaterThan(50)
  expect(large.enemy.hp).toBe(100)
  expect(large.state.log).toContain('caster 施展 name.heal 回复 50')
})

test('an enemy execution spell works at the target’s HP threshold but fails above it', () => {
  const execution: SkillData = {
    ...wfSkill('execution', 0),
    effects: [{ kind: 'gate', hpAtMostPercent: 25 }, { kind: 'instantKill' }],
  }

  const above = actionAfterTakingHit(execution, {
    casterHealth: 9999,
    playerHealth: 26,
    playerAttack: 1,
  }).state
  expect(above.players[0]?.hp).toBe(26)
  expect(above.phase).toBe('performAction')
  expect(above.log).toContain('name.execution 无任何效果')
  expect(above.log.some((line) => line.includes('魂飞魄散'))).toBe(false)

  const atThreshold = actionAfterTakingHit(execution, {
    casterHealth: 9999,
    playerHealth: 25,
    playerAttack: 1,
  }).state
  expect(atThreshold.players[0]?.hp).toBe(0)
  expect(atThreshold.phase).toBe('lost')
  expect(atThreshold.log).toContain('caster 施展 name.execution,hero 魂飞魄散')
})

test('an enemy sleep spell applies a status without dealing HP damage', () => {
  const sleep: SkillData = {
    ...wfSkill('sleep', 0),
    effects: [{ kind: 'applyStatus', status: 'sleep', turns: 3 }],
  }
  const { state } = actionAfterTakingHit(sleep, { casterHealth: 9999, playerAttack: 1 })
  expect(state.players[0]).toMatchObject({ hp: 100, status: { sleep: 3 } })
  expect(state.log).toContain('caster 对 hero 施加 sleep 3 回合')
})
