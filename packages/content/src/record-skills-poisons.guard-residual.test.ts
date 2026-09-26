/**
 * TEST-GLM-CONTENT-GUARDS-3 G7：validateSkills / validatePoisons 残差。
 * 去重：validate-skills-poisons.boundaries（毒正控/16 条字段损坏矩阵/技能顶层形状）、
 * validate.test.ts（技能执行分支/敌方 execution/-cost items/lifetimeLimit/音效 AssetId
 * 拒旧数字）——本文件只补冻结池内：execution.player.animation 正控与音效负例、
 * prepare 未知 kind 与剩余 MP 语义、animation effectSprite/落点/数值字段/keepEffect、
 * summon 与 trance 效果新旧字段界、resourceDelta 资源域。validatePoisons 冻结零缺
 * （boundary 16 条已覆盖），仅作正控引用不新增。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { validatePoisons, validateSkills } from './validate.js'

const skill = (over: Record<string, unknown>) => ({
  id: '370',
  name: '技能370',
  cost: {},
  target: 'oneEnemy',
  effects: [],
  animation: { effectSprite: 1 },
  ...over,
})

const withPlayerExecution = (player: unknown) => skill({ execution: { player } })

describe('G7 validateSkills/validatePoisons 残差', () => {
  test('最小技能与毒正控通过；execution.player.animation 正控开放', () => {
    expectAcceptsUnchanged((value) => validateSkills(value), {
      skills: [
        {
          id: '370',
          name: '技能370',
          cost: {},
          target: 'oneEnemy',
          effects: [],
          animation: { effectSprite: 1 },
        },
      ],
      levelUp: {},
    })
    expectAcceptsUnchanged(
      (value) => validatePoisons(value),
      [{ id: 551, name: '毒551', curability: 'common', color: 16 }],
    )
    expectAcceptsUnchanged((value) => validateSkills(value), {
      skills: [withPlayerExecution({ animation: { effectSprite: 1 } })],
      levelUp: {},
    })
  })

  test('execution.player.animation 音效叶拒绝', () => {
    const bad = {
      skills: [withPlayerExecution({ animation: { effectSprite: 1, sound: 45 } })],
      levelUp: {},
    }
    const before = deepSnapshot(bad)
    expectExactError(
      () => validateSkills(bad),
      'skills.skills[0].execution.player.animation.sound: 期望非空 AssetId',
    )
    expect(bad).toEqual(before)
  })

  test.each([
    [
      'prepare 未知 kind',
      [{ kind: 'other', resource: 'mp', multiplier: 8, consume: 'all' }],
      'skills.skills[0].execution.player.prepare[0].kind: 未知前置效果',
    ],
    [
      'remainingResourceDamage 只支持清空剩余 MP',
      [{ kind: 'remainingResourceDamage', resource: 'hp', multiplier: 8, consume: 'all' }],
      'skills.skills[0].execution.player.prepare[0]: 只支持清空剩余 MP',
    ],
  ] as const)('%s拒绝', (_label, prepare, error) => {
    expectAcceptsUnchanged((value) => validateSkills(value), {
      skills: [
        withPlayerExecution({
          animation: { effectSprite: 1 },
          prepare: [
            { kind: 'remainingResourceDamage', resource: 'mp', multiplier: 8, consume: 'all' },
          ],
        }),
      ],
      levelUp: {},
    })
    const bad = {
      skills: [withPlayerExecution({ animation: { effectSprite: 1 }, prepare })],
      levelUp: {},
    }
    const before = deepSnapshot(bad)
    expectExactError(() => validateSkills(bad), error)
    expect(bad).toEqual(before)
  })

  test.each([
    [
      'effectSprite 负数',
      { effectSprite: -1 },
      'skills.skills[0].animation.effectSprite: 期望非负整数',
    ],
    [
      'placement 非法',
      { effectSprite: 1, placement: 'bogus' },
      'skills.skills[0].animation.placement: 非法落点模式',
    ],
    [
      'xOffset 非有限数',
      { effectSprite: 1, xOffset: 'x' },
      'skills.skills[0].animation.xOffset: 期望有限数',
    ],
    [
      'keepEffect 非布尔',
      { effectSprite: 1, keepEffect: 'yes' },
      'skills.skills[0].animation.keepEffect: 期望 boolean',
    ],
  ] as const)('animation %s拒绝', (_label, animationOver, error) => {
    expectAcceptsUnchanged((value) => validateSkills(value), {
      skills: [skill({})],
      levelUp: {},
    })
    const bad = { skills: [skill({ animation: animationOver })], levelUp: {} }
    const before = deepSnapshot(bad)
    expectExactError(() => validateSkills(bad), error)
    expect(bad).toEqual(before)
  })

  test('summon/trance 效果正控与新旧字段界', () => {
    const legal = {
      skills: [
        skill({ effects: [{ kind: 'summon', battleSprite: 'bs.x', sound: 's.x' }] }),
        { ...skill({ id: '371', effects: [{ kind: 'trance', battleSprite: 'bs.x' }] }) },
      ],
      levelUp: {},
    }
    expectAcceptsUnchanged((value) => validateSkills(value), legal)
    const badGodId = {
      skills: [skill({ effects: [{ kind: 'summon', godId: 'g.1', battleSprite: 'bs.x' }] })],
      levelUp: {},
    }
    const godBefore = deepSnapshot(badGodId)
    expectExactError(
      () => validateSkills(badGodId),
      'skills.skills[0].effects[0].godId: 已退役；请使用 battleSprite',
    )
    expect(badGodId).toEqual(godBefore)
    const badSprite = {
      skills: [skill({ effects: [{ kind: 'trance', sprite: 's.1', battleSprite: 'bs.x' }] })],
      levelUp: {},
    }
    const badSpriteBefore = deepSnapshot(badSprite)
    expectExactError(
      () => validateSkills(badSprite),
      'skills.skills[0].effects[0].sprite: 已退役；请使用 battleSprite',
    )
    expect(badSprite).toEqual(badSpriteBefore)
    const badBattleSprite = {
      skills: [skill({ effects: [{ kind: 'summon', battleSprite: '' }] })],
      levelUp: {},
    }
    const badBattleSpriteBefore = deepSnapshot(badBattleSprite)
    expectExactError(
      () => validateSkills(badBattleSprite),
      'skills.skills[0].effects[0].battleSprite: 期望非空 BattleSpriteDef.id',
    )
    expect(badBattleSprite).toEqual(badBattleSpriteBefore)
    const badResource = {
      skills: [skill({ effects: [{ kind: 'resourceDelta', resource: 'chi', delta: -1 }] })],
      levelUp: {},
    }
    const badResourceBefore = deepSnapshot(badResource)
    expectExactError(
      () => validateSkills(badResource),
      'skills.skills[0].effects[0].resource: 只支持 hp/mp',
    )
    expect(badResource).toEqual(badResourceBefore)
  })
})
