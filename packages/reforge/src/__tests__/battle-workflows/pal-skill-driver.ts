import { type SkillData, validateSkills } from '@type-pal/content'
import palSkills from '../../../../../projects/pal/content/skills.json' with { type: 'json' }
import { createBattleState, stepBattle } from '../../battle/battle-core.js'
import { expectDefined } from '../../defined.js'
import { wfEnemy, wfPlayer } from './catalog.js'
import { finishBattleTurn } from './core-driver.js'

const skills = new Map(validateSkills(palSkills).skills.map((skill) => [skill.id, skill]))
const rng = () => 0

export function palSkill(id: string): SkillData {
  return expectDefined(skills.get(id))
}

export function playerCast(skill: SkillData, mp: number, wine: number, uses?: number) {
  const target = wfEnemy(
    'target',
    { health: 999, attackStrength: 0, defense: 0, dexterity: 0 },
    {
      ai: { resistanceToSorcery: 0, rules: [{ at: 'act', do: { kind: 'pass' } }] },
    },
  )
  const state = createBattleState({
    players: [
      wfPlayer('hero', {
        mp,
        maxMp: 100,
        attackStrength: 30,
        defense: 0,
        magicStrength: 30,
        baseDexterity: 500,
        skills: [skill.id],
      }),
    ],
    enemySlots: [target],
    skills: { [skill.id]: skill },
    inventory: wine > 0 ? [{ itemId: '86', count: wine }] : [],
    ...(uses === undefined ? {} : { skillUseCounts: { hero: { [skill.id]: uses } } }),
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, {
    kind: 'cast',
    skillId: skill.id,
    ...(skill.target === 'oneEnemy' ? { targetEnemyIdx: 0 } : {}),
  })
  finishBattleTurn(state, rng)
  return state
}

export function enemyCast(skill: SkillData) {
  const caster = wfEnemy(
    'caster',
    { health: 999, attackStrength: 0, magicStrength: 50, dexterity: 999 },
    {
      ai: {
        resistanceToSorcery: 0,
        rules: [{ at: 'act', do: { kind: 'cast', skillId: skill.id } }],
      },
    },
  )
  const state = createBattleState({
    players: [wfPlayer('hero', { baseDexterity: 10 })],
    enemySlots: [caster],
    skills: { [skill.id]: skill },
    inventory: [{ itemId: '86', count: 1 }],
  })
  stepBattle(state, rng)
  state.pendingActions.set(0, { kind: 'defend' })
  finishBattleTurn(state, rng)
  return state
}
