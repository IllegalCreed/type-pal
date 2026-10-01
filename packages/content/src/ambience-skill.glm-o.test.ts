/** TEST-GLM-WAVE-O-1 O09：氛围乘色/技能执行层/对话身份残余合同。
 *  旧证：ambience.test / skill 邻域 / author-dialogue.contracts 覆盖主干；
 *  本卡按 gap-map 直击未覆盖臂：resolveAmbienceTint day/缺表兜底与自定义白天、
 *  lerpTint t 夹取与四舍五入、resolveSkillExecution 三层回退、
 *  authoredSkillExecutionLayers 公共+双 override、resolveDialogueIdentity
 *  unbound 透传/default 缺表/未知表情/speakerOverride。
 */

import type { ActorDef, AmbienceDef, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { AMBIENCE_IDENTITY, isIdentityTint, lerpTint, resolveAmbienceTint } from './ambience.js'
import { resolveDialogueIdentity } from './author-dialogue.js'
import { authoredSkillExecutionLayers, resolveSkillExecution } from './skill.js'

describe('O09 resolveAmbienceTint：day/缺表/自定义白天', () => {
  const ambiences: AmbienceDef[] = [
    { id: 'night', name: '夜', tint: [120, 130, 200] },
    { id: 'day', name: '昼', tint: [250, 244, 210] },
  ]

  test('缺 id / day 无自定义 / 未知 id → 恒等乘色', () => {
    expect(resolveAmbienceTint(undefined, ambiences)).toEqual(AMBIENCE_IDENTITY)
    // day 存在自定义定义 → 用它；day 不在表 → 恒等。
    expect(resolveAmbienceTint('day', ambiences)).toEqual([250, 244, 210])
    expect(resolveAmbienceTint('day', [])).toEqual(AMBIENCE_IDENTITY)
    expect(resolveAmbienceTint('ghost', ambiences)).toEqual(AMBIENCE_IDENTITY)
  })

  test('非 day id 命中表 → 表乘色', () => {
    expect(resolveAmbienceTint('night', ambiences)).toEqual([120, 130, 200])
  })

  test('isIdentityTint：≥254 三分量判恒等（含 255 恒等常量）', () => {
    expect(isIdentityTint([255, 255, 255])).toBe(true)
    expect(isIdentityTint([254, 255, 254])).toBe(true)
    expect(isIdentityTint([253, 255, 255])).toBe(false)
  })
})

describe('O09 lerpTint：t 夹取与分量四舍五入', () => {
  test('t<0 取 from、t>1 取 to、t∈[0,1] 线性', () => {
    expect(lerpTint([0, 0, 0], [100, 200, 50], -1)).toEqual([0, 0, 0])
    expect(lerpTint([0, 0, 0], [100, 200, 50], 2)).toEqual([100, 200, 50])
    expect(lerpTint([0, 0, 0], [100, 200, 50], 0.5)).toEqual([50, 100, 25])
  })

  test('非整数结果按分量四舍五入', () => {
    expect(lerpTint([0, 0, 0], [101, 103, 105], 0.5)).toEqual([51, 52, 53])
    expect(lerpTint([10, 10, 10], [15, 15, 15], 0.5)).toEqual([13, 13, 13])
  })
})

describe('O09 resolveSkillExecution / authoredSkillExecutionLayers', () => {
  const animation = { effectSprite: 1 } as SkillData['animation']
  const skill = (execution?: SkillData['execution']): SkillData =>
    ({
      id: 's1',
      name: 'skill.s1',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [{ kind: 'damage', power: 1, elemental: 0 }],
      animation,
      ...(execution ? { execution } : {}),
    }) as SkillData

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
    const enemyEffects = [{ kind: 'damage', power: 9, elemental: 0 }] as never
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
      player: { effects: [{ kind: 'damage', power: 2, elemental: 0 }] as never },
      enemy: { animation: { effectSprite: 7 } as never },
    })
    const layers = authoredSkillExecutionLayers(both)
    expect(layers.map(({ side }) => side)).toEqual(['base', 'player', 'enemy'])
    expect(layers[1]!.effects).toEqual([{ kind: 'damage', power: 2, elemental: 0 }])
    expect(layers[2]!.animation).toEqual({ effectSprite: 7 })
  })
})

describe('O09 resolveDialogueIdentity：身份残余轴', () => {
  const actors: Record<string, ActorDef> = {
    hero: {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'hero-sprite',
      portraits: { default: 'portrait.hero', expressions: { smile: 'portrait.hero-smile' } },
    },
    plain: { id: 'plain', name: 'name.plain', spriteId: 'p-sprite' },
  }

  test('unbound：speaker/portrait 声明性透传（浅拷贝 portrait）', () => {
    expect(resolveDialogueIdentity({ kind: 'unbound', speaker: '旁白甲' }, actors)).toEqual({
      speaker: '旁白甲',
    })
    const withPortrait = resolveDialogueIdentity(
      {
        kind: 'unbound',
        portrait: { asset: 'portrait.narrator', side: 'left' },
      },
      actors,
    )
    expect(withPortrait.portrait).toEqual({ asset: 'portrait.narrator', side: 'left' })
  })

  test('actor 绑定 default 缺 portraits.default → 精确诊断', () => {
    expect(() =>
      resolveDialogueIdentity(
        { kind: 'actor', actor: 'plain', portrait: { kind: 'default', side: 'left' } },
        actors,
      ),
    ).toThrow('dialogue.identity.portrait: Actor "plain" 缺 portraits.default')
  })

  test('actor 绑定未知表情 → 精确表情诊断；命中表情 → 资源+side', () => {
    expect(() =>
      resolveDialogueIdentity(
        {
          kind: 'actor',
          actor: 'hero',
          portrait: { kind: 'expression', expression: 'angry', side: 'left' },
        },
        actors,
      ),
    ).toThrow('缺表情 "angry"')
    expect(
      resolveDialogueIdentity(
        {
          kind: 'actor',
          actor: 'hero',
          portrait: { kind: 'expression', expression: 'smile', side: 'right' },
        },
        actors,
      ),
    ).toEqual({ speaker: 'name.hero', portrait: { asset: 'portrait.hero-smile', side: 'right' } })
  })

  test('speakerOverride 覆盖 actor.name；无声明时 speaker=actor.name', () => {
    expect(
      resolveDialogueIdentity(
        { kind: 'actor', actor: 'hero', speakerOverride: 'custom.line' },
        actors,
      ),
    ).toEqual({ speaker: 'custom.line' })
    expect(resolveDialogueIdentity({ kind: 'actor', actor: 'hero' }, actors)).toEqual({
      speaker: 'name.hero',
    })
  })
})
