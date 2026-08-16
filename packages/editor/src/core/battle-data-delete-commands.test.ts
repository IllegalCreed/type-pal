import { describe, expect, test } from 'vitest'
import {
  BattleDataInUseError,
  DeleteEnemyCommand,
  DeletePoisonCommand,
  DeleteSkillCommand,
} from './commands.js'
import type { EditorState } from './edit-session.js'

function state(): EditorState {
  return {
    actors: [],
    levelUp: {},
    skills: [
      { id: 'skill-a', name: '技能甲', desc: '', cost: {}, usableOutsideBattle: false, target: 'oneEnemy', effects: [{ kind: 'applyPoison', poisonId: '9' }], animation: { effectSprite: 0, placement: 'normal', xOffset: 0, yOffset: 0, speed: 0, fireDelay: 0, effectTimes: 0, shake: 0 } },
      { id: 'skill-b', name: '技能乙', desc: '', cost: {}, usableOutsideBattle: false, target: 'oneEnemy', effects: [], animation: { effectSprite: 0, placement: 'normal', xOffset: 0, yOffset: 0, speed: 0, fireDelay: 0, effectTimes: 0, shake: 0 } },
    ],
    items: [],
    enemies: [
      { id: 'enemy-a', name: 'name.enemy-a', battleSprite: 'battle.enemy', yPosOffset: 0, stats: { health: 1, level: 1, exp: 0, cash: 0, attackStrength: 1, magicStrength: 1, defense: 1, dexterity: 1, fleeRate: 1, physicalResistance: 0, poisonResistance: 0, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }, dualMove: false, collectValue: 0 }, ai: { resistanceToSorcery: 0 }, sounds: {} },
    ],
    enemyTeams: [{ id: 'team-a', slots: ['enemy-a'] }],
    poisons: [{ id: 9, name: '九号毒', curability: 'common', color: 0 }],
    manifest: { startWorld: { party: [], inventory: [], learnedSkills: {} } },
  } as unknown as EditorState
}

describe('battle data delete commands', () => {
  test('fail closed while references exist', () => {
    const current = state()
    expect(() => new DeletePoisonCommand(9).apply(current)).toThrow(BattleDataInUseError)
    expect(() => new DeleteEnemyCommand('enemy-a').apply(current)).toThrow(BattleDataInUseError)
  })

  test('delete and invert preserve exact index for unreferenced objects', () => {
    const current = state()
    const skill = new DeleteSkillCommand('skill-b')
    const withoutSkill = skill.apply(current)
    expect(withoutSkill.skills.map((entry) => entry.id)).toEqual(['skill-a'])
    expect(skill.invert(withoutSkill).skills.map((entry) => entry.id)).toEqual(['skill-a', 'skill-b'])

    const unreferenced = { ...current, enemyTeams: [], skills: [{ ...current.skills[0]!, effects: [] }] }
    const enemy = new DeleteEnemyCommand('enemy-a')
    const withoutEnemy = enemy.apply(unreferenced)
    expect(withoutEnemy.enemies).toEqual([])
    expect(enemy.invert(withoutEnemy).enemies?.[0]?.id).toBe('enemy-a')

    const poison = new DeletePoisonCommand(9)
    const withoutPoison = poison.apply(unreferenced)
    expect(withoutPoison.poisons).toEqual([])
    expect(poison.invert(withoutPoison).poisons?.[0]?.id).toBe(9)
  })
})
