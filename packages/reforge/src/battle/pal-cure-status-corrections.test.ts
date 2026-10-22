import { type EnemyDef, validateItems, validateSkills } from '@type-pal/content'
import { expect, test } from 'vitest'
import itemsJson from '../../../../projects/pal/content/items.json' with { type: 'json' }
import skillsJson from '../../../../projects/pal/content/skills.json' with { type: 'json' }
import { type CreatePlayerInput, createBattleState, stepBattle } from './battle-core.js'

const skills = Object.fromEntries(
  validateSkills(skillsJson).skills.map((skill) => [skill.id, skill]),
)
const items = Object.fromEntries(
  validateItems(itemsJson.filter((item) => item.id === '65')).map((item) => [item.id, item]),
)
const enemy: EnemyDef = {
  id: 'target',
  name: 'target',
  battleSprite: 'battle-sprite.target',
  yPosOffset: 0,
  stats: {
    health: 1000,
    level: 1,
    exp: 0,
    cash: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 10,
    dexterity: 1,
    fleeRate: 0,
    physicalResistance: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    dualMove: false,
    collectValue: 0,
  },
  ai: { resistanceToSorcery: 0 },
  sounds: {},
}
function player(roleId: string): CreatePlayerInput {
  return {
    roleId,
    actorTemplateId: roleId,
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    attackStrength: 10,
    defense: 100,
    magicStrength: 10,
    baseDexterity: 500,
    skills: ['307', '308'],
    fleeRate: 0,
  }
}

test.each([
  { name: '冰心诀', skillId: '307', mp: 93 },
  { name: '灵血咒', skillId: '308', mp: 90 },
  { name: '灵心符', skillId: null, mp: 100 },
])('$name cures the four promised ailments without removing protection, and pays its normal cost', ({
  skillId,
  mp,
}) => {
  const state = createBattleState({
    players: [
      player('caster'),
      {
        ...player('patient'),
        baseDexterity: 10,
        initialStatuses: { confused: 4, paralyzed: 4, sleep: 4, silence: 4, protect: 4 },
        grantedStatuses: ['dualAttack'],
      },
    ],
    enemySlots: [enemy],
    skills,
    items,
    inventory: [{ itemId: '65', count: 1 }],
  })
  stepBattle(state, () => 0)
  state.pendingActions.set(
    0,
    skillId
      ? { kind: 'cast', skillId, targetAllyIdx: 1 }
      : { kind: 'item', itemId: '65', targetAllyIdx: 1 },
  )
  state.pendingActions.set(1, { kind: 'defend' })
  let steps = 0
  do {
    stepBattle(state, () => 0)
  } while (state.phase === 'performAction' && ++steps < 20)
  expect(state.phase).toBe('selectAction')
  const patient = state.players[1]!
  expect({
    confused: patient.status.confused,
    paralyzed: patient.status.paralyzed,
    sleep: patient.status.sleep,
    silence: patient.status.silence,
  }).toEqual({
    confused: 0,
    paralyzed: 0,
    sleep: 0,
    silence: 0,
  })
  expect(patient.status.protect).toBe(3)
  expect(patient.grantedStatuses).toContain('dualAttack')
  expect(state.players[0]!.mp).toBe(mp)
  expect(state.inventory).toEqual([{ itemId: '65', count: skillId ? 1 : 0 }])
})
