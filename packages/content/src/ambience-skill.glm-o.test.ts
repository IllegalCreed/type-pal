/** Pure value contracts: fractional tint rounding, skill execution layers and unbound identity.
 * Normal tint endpoints live in ambience.test.ts; actor-bound identities in author-dialogue.test.ts.
 * These independent cases share no lifecycle or mutable fixture state.
 */

import type { SkillAnimation, SkillData, SkillEffect } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { lerpTint } from './ambience.js'
import { resolveDialogueIdentity } from './author-dialogue.js'
import { authoredSkillExecutionLayers, resolveSkillExecution } from './skill.js'

describe('O09 lerpTint：分量四舍五入', () => {
  test('非整数结果按分量四舍五入（旧中点全整数的真实新轴）', () => {
    expect(lerpTint([0, 0, 0], [101, 103, 105], 0.5)).toEqual([51, 52, 53])
    expect(lerpTint([10, 10, 10], [15, 15, 15], 0.5)).toEqual([13, 13, 13])
  })
})

describe('O09 resolveSkillExecution / authoredSkillExecutionLayers', () => {
  const animation: SkillAnimation = { effectSprite: 1 }
  const skill = (execution?: SkillData['execution']): SkillData => ({
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
    const base = skill()
    for (const side of ['player', 'enemy'] as const) {
      const resolved = resolveSkillExecution(base, side)
      expect(resolved.effects).toBe(base.effects)
      expect(resolved.animation).toBe(base.animation)
      expect(resolved.prepare).toEqual([])
    }
  })

  test('单侧 override：覆盖侧用 override，另一侧回退公共', () => {
    const enemyEffects: SkillEffect[] = [{ kind: 'damage', power: 9, elemental: 0 }]
    const withEnemy = skill({ enemy: { effects: enemyEffects } })
    const enemySide = resolveSkillExecution(withEnemy, 'enemy')
    expect(enemySide.effects).toBe(enemyEffects)
    expect(enemySide.animation).toBe(withEnemy.animation)
    const playerSide = resolveSkillExecution(withEnemy, 'player')
    expect(playerSide.effects).toBe(withEnemy.effects)
  })

  test('authoredSkillExecutionLayers：base 恒在 + 两个显式 override 按序追加', () => {
    expect(authoredSkillExecutionLayers(skill())).toEqual([
      { side: 'base', effects: skill().effects, animation },
    ])
    const both = skill({
      player: { effects: [{ kind: 'damage', power: 2, elemental: 0 }] },
      enemy: { animation: { effectSprite: 7 } },
    })
    const layers = authoredSkillExecutionLayers(both)
    expect(layers.map(({ side }) => side)).toEqual(['base', 'player', 'enemy'])
    expect(layers[1]!.effects).toEqual([{ kind: 'damage', power: 2, elemental: 0 }])
    expect(layers[2]!.animation).toEqual({ effectSprite: 7 })
  })
})

describe('O09 resolveDialogueIdentity：合法 unbound 透传', () => {
  test('unbound：speaker/portrait 声明性透传（浅拷贝 portrait）', () => {
    expect(resolveDialogueIdentity({ kind: 'unbound', speaker: '旁白甲' }, {})).toEqual({
      speaker: '旁白甲',
    })
    const portrait = { asset: 'portrait.narrator', side: 'left' } as const
    const withPortrait = resolveDialogueIdentity({ kind: 'unbound', portrait }, {})
    expect(withPortrait.portrait).toEqual({ asset: 'portrait.narrator', side: 'left' })
    expect(withPortrait.portrait).not.toBe(portrait)
  })
})
