/** TEST-GLM-WAVE-O-1 O09：lerpTint 舍入/技能执行层/对话身份残余合同。
 *  旧证（existing-proof，O-R9 续审逐条件扣除，不计净新）：
 *  - ambience.test.ts:16-29 已覆盖 resolveAmbienceTint day/缺 id/未知 id/空表/day 覆写；
 *    :33-36 isIdentityTint；:38-44 lerp t=0/1/中点（全整数）/越界夹取 —— 原四轴行扣除；
 *  - author-dialogue.test.ts:17-52 已覆盖 actor 默认名/speakerOverride/expression 资产+side，
 *    :54-81 已覆盖缺 actor/缺 portraits.default/未知表情 fail-loud；contracts E2 同轴 ——
 *    原三条 actor 绑定行删除登记。
 *  本文件只保留旧证未覆盖的真实新轴：lerp 非整数四舍五入（旧中点全整数）、
 *  resolveSkillExecution/authoredSkillExecutionLayers（旧测试零覆盖）、
 *  合法 unbound cue 的 resolver 透传（旧证只做合法性 check 与空 unbound 拒绝，从未对
 *  合法 unbound 断言 resolver 结果）。
 */

import type { SkillAnimation, SkillData, SkillEffect } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { lerpTint } from './ambience.js'
import { resolveDialogueIdentity } from './author-dialogue.js'
import { authoredSkillExecutionLayers, resolveSkillExecution } from './skill.js'

describe('O09 lerpTint：t 夹取与分量四舍五入', () => {
  // 上下界夹取与整数中点已由旧 ambience.test.ts:38-45 覆盖（existing-proof 扣除）。

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
    const withPortrait = resolveDialogueIdentity(
      {
        kind: 'unbound',
        portrait: { asset: 'portrait.narrator', side: 'left' },
      },
      {},
    )
    expect(withPortrait.portrait).toEqual({ asset: 'portrait.narrator', side: 'left' })
  })
})
