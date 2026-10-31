import { describe, expect, test } from 'vitest'
import type { SkillAnimation, SkillData, SkillEffect } from './skill.js'
import { authoredSkillExecutionLayers, resolveSkillExecution } from './skill.js'

describe('skill execution layers', () => {
  const animation: SkillAnimation = { effectSprite: 1 }
  const makeSkill = (execution?: SkillData['execution']): SkillData => ({
    id: 's1',
    name: 'skill.s1',
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 1, elemental: 0 }],
    animation,
    ...(execution ? { execution } : {}),
  })

  test('无 override：两侧都回退公共 effects/animation，prepare 为空', () => {
    const base = makeSkill()
    for (const side of ['player', 'enemy'] as const) {
      const resolved = resolveSkillExecution(base, side)
      expect(resolved.effects).toBe(base.effects)
      expect(resolved.animation).toBe(base.animation)
      expect(resolved.prepare).toEqual([])
    }
  })

  test('单侧 override：覆盖侧用 override，另一侧回退公共', () => {
    const enemyEffects: SkillEffect[] = [{ kind: 'damage', power: 9, elemental: 0 }]
    const withEnemy = makeSkill({ enemy: { effects: enemyEffects } })
    const enemySide = resolveSkillExecution(withEnemy, 'enemy')
    expect(enemySide.effects).toBe(enemyEffects)
    expect(enemySide.animation).toBe(withEnemy.animation)
    const playerSide = resolveSkillExecution(withEnemy, 'player')
    expect(playerSide.effects).toBe(withEnemy.effects)
  })

  test('authoredSkillExecutionLayers：base 恒在 + 两个显式 override 按序追加', () => {
    expect(authoredSkillExecutionLayers(makeSkill())).toEqual([
      {
        side: 'base',
        effects: [{ kind: 'damage', power: 1, elemental: 0 }],
        animation: { effectSprite: 1 },
      },
    ])
    const both = makeSkill({
      player: { effects: [{ kind: 'damage', power: 2, elemental: 0 }] },
      enemy: { animation: { effectSprite: 7 } },
    })
    const layers = authoredSkillExecutionLayers(both)
    expect(layers.map(({ side }) => side)).toEqual(['base', 'player', 'enemy'])
    expect(layers[1]!.effects).toEqual([{ kind: 'damage', power: 2, elemental: 0 }])
    expect(layers[2]!.animation).toEqual({ effectSprite: 7 })
  })
})
