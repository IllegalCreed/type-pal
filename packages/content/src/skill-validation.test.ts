import { describe, expect, test } from 'vitest'
import palSkills from '../../../projects/pal/content/skills.json' with { type: 'json' }
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { SkillData } from './skill.js'
import { validateSkills } from './validate.js'

function minimalSkill() {
  return {
    id: '370',
    name: '技能370',
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [],
    animation: { effectSprite: 1 },
  } satisfies SkillData
}

const skill = (over: Record<string, unknown>) => ({ ...minimalSkill(), ...over })

const withPlayerExecution = (player: unknown) => skill({ execution: { player } })

describe('skill execution, animation, and effects', () => {
  test('accepts a player-specific animation using the current execution wrapper', () => {
    expectAcceptsUnchanged((value) => validateSkills(value), {
      skills: [
        skill({
          animation: { effectSprite: 1, speed: -1, fireDelay: 0, effectTimes: 0, shake: 0 },
          execution: {
            player: {
              animation: { effectSprite: 2, speed: -4.5, fireDelay: 2, effectTimes: 3, shake: 1 },
            },
          },
        }),
      ],
      levelUp: {},
    })
  })

  test.each([
    ['base', 'fireDelay', 0.5, '期望整数'],
    ['player', 'effectTimes', -1, '期望非负整数'],
    ['enemy', 'shake', 0.5, '期望整数'],
    ['base', 'effectTimes', Number.MAX_SAFE_INTEGER + 1, '期望安全整数'],
    ['base', 'speed', -5, '帧时长必须为正的有限数'],
    ['enemy', 'speed', -6, '帧时长必须为正的有限数'],
    ['player', 'speed', Number.MAX_VALUE, '帧时长必须为正的有限数'],
  ] as const)('%s animation rejects %s=%s', (scope, field, value, reason) => {
    const animation = { effectSprite: 1, [field]: value }
    const override = scope === 'base' ? { animation } : { execution: { [scope]: { animation } } }
    const document = { skills: [skill(override)], levelUp: {} }
    const before = deepSnapshot(document)
    const path = scope === 'base' ? 'animation' : `execution.${scope}.animation`
    expectExactError(() => validateSkills(document), `skills.skills[0].${path}.${field}: ${reason}`)
    expect(document).toEqual(before)
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
        skill({ id: '371', effects: [{ kind: 'trance', battleSprite: 'bs.x' }] }),
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

  test('PAL 召唤本体坐标使用原盘有符号偏移，独立于后续 FIRE', () => {
    const offsets = Object.fromEntries(
      validateSkills(palSkills).skills.flatMap(({ id, effects }) =>
        effects.flatMap((effect) =>
          effect.kind === 'summon' ? [[id, [effect.xOffset, effect.yOffset]]] : [],
        ),
      ),
    )
    // DATA.MKF 第 4 块的 9 条 MAGIC type 9，按 SHORT 解码 wXOffset / wYOffset。
    expect(offsets).toEqual({
      315: [-16, 16],
      320: [0, 10],
      325: [0, 32],
      336: [-28, 13],
      348: [8, -5],
      351: [-8, 22],
      363: [0, 0],
      370: [0, 18],
      389: [0, 0],
    })
  })

  test.each([
    ['xOffset', 1.5, '期望整数'],
    ['yOffset', '-16', '期望有限数'],
  ] as const)('召唤本体 %s 拒绝非整数输入', (axis, invalid, error) => {
    const bad = {
      skills: [skill({ effects: [{ kind: 'summon', battleSprite: 'bs.x', [axis]: invalid }] })],
      levelUp: {},
    }
    expectExactError(() => validateSkills(bad), `skills.skills[0].effects[0].${axis}: ${error}`)
  })
})

describe('skill inventory document shape', () => {
  test('最小合法技能文件通过并返回结构', () => {
    const file = { skills: [minimalSkill()], levelUp: {} }
    const out = validateSkills(file)
    expect(out).toEqual(file)
  })
  test('缺 levelUp 拒绝（requireKeys）', () => {
    const file = { skills: [minimalSkill()] }
    expectExactError(() => validateSkills(file), 'skills: 缺键 "levelUp"')
  })
  test('技能缺 target/effects/animation 任一拒绝且 where 精确', () => {
    for (const key of ['target', 'effects', 'animation'] as const) {
      const { [key]: _missing, ...invalid } = minimalSkill()
      expectExactError(
        () => validateSkills({ skills: [invalid], levelUp: {} }),
        `skills.skills[0]: 缺键 "${key}"`,
      )
    }
  })
})
