import { describe, expect, test } from 'vitest'
import { actorWithPortraitsAndBattler } from './__tests__/actor-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { ActorDef, CasualtyLine, CasualtyScript } from './actor.js'
import { validateActors } from './validate.js'

function minimalActor(): ActorDef {
  return { id: 'actor.villager', name: 'name.villager', spriteId: 'sprite.villager' }
}

describe('actor identity fields', () => {
  test('最小 actor（仅三必填）通过并原样返回', () => {
    const actors = [minimalActor()]
    expect(validateActors(actors)).toBe(actors)
  })
  test('id 非 string 拒绝（name 已有测试，此处补 id/spriteId）', () => {
    expect(() => validateActors([{ ...minimalActor(), id: 42 }])).toThrow(
      new Error('actors[0]: id 非string'),
    )
    expect(() => validateActors([{ ...minimalActor(), spriteId: 7 }])).toThrow(
      new Error('actors[0]: spriteId 非string'),
    )
  })
  test('非数组输入拒绝', () => {
    expect(() => validateActors({})).toThrow(new Error('actors: 期望数组'))
  })
})

describe('actor battle metadata', () => {
  const battler = (extra: Record<string, unknown> = {}) => ({
    ...actorWithPortraitsAndBattler('hero', 'name.hero').battler,
    ...extra,
  })
  test('合法 battler 通过', () => {
    expect(() => validateActors([{ ...minimalActor(), battler: battler() }])).not.toThrow()
  })
  test('旧 battleSpriteNum/battleSpritePath 已退役拒绝', () => {
    expect(() =>
      validateActors([{ ...minimalActor(), battler: battler({ battleSpriteNum: 5 }) }]),
    ).toThrow(new Error('actors[0].battler: 旧 battleSpriteNum/battleSpritePath 已退役'))
    expect(() =>
      validateActors([{ ...minimalActor(), battler: battler({ battleSpritePath: 'x' }) }]),
    ).toThrow(new Error('actors[0].battler: 旧 battleSpriteNum/battleSpritePath 已退役'))
  })
  test('battleSprite 空串拒绝', () => {
    expect(() =>
      validateActors([{ ...minimalActor(), battler: battler({ battleSprite: '' }) }]),
    ).toThrow(new Error('actors[0].battler.battleSprite: 期望非空 BattleSpriteDef.id'))
  })
})

describe('actor casualty dialogue', () => {
  const opening = {
    text: 'dlg.casualty.first',
    style: 'top',
    portrait: { asset: 'portrait.hero.concerned', side: 'left' },
  } satisfies CasualtyLine
  const continuation = {
    text: 'dlg.casualty.next',
    style: 'top',
    sameCue: true,
    autoAdvance: 685,
  } satisfies CasualtyLine
  const narration = { text: 'dlg.casualty.narration', style: 'narration' } satisfies CasualtyLine

  function withLines(lines: readonly unknown[]) {
    const actor = actorWithPortraitsAndBattler('hero', 'name.hero')
    return [
      {
        ...actor,
        battler: {
          ...actor.battler,
          casualty: { dying: { gates: [], fallback: { lines, effects: [] } } },
        },
      },
    ]
  }

  test('保留肖像、同段续行和全显后的等待时间', () => {
    const lines = [
      opening,
      continuation,
      {
        text: 'dlg.casualty.reply',
        style: 'bottom',
        portrait: { ...opening.portrait, side: 'right' },
      },
      { ...narration, autoAdvance: 0 },
    ] satisfies CasualtyLine[]
    const expected = deepSnapshot(lines)
    const [actor] = validateActors(withLines(lines))
    expect(actor?.battler?.casualty?.dying?.fallback.lines).toEqual(expected)
  })

  test.each([
    ['缺少资源', { ...opening, portrait: { side: 'left' } }],
    ['空资源', { ...opening, portrait: { ...opening.portrait, asset: '' } }],
    ['不支持的朝向', { ...opening, portrait: { ...opening.portrait, side: 'center' } }],
    ['旁白使用肖像', { ...narration, portrait: opening.portrait }],
  ])('拒绝无效肖像：%s', (_reason, line) => {
    expect(() => validateActors(withLines([line]))).toThrow(
      new Error(
        'actors[0].battler.casualty.dying.fallback.lines[0].portrait: 期望上方或下方对白的头像资源和朝向',
      ),
    )
  })

  test.each(['685', Number.POSITIVE_INFINITY, -1])('拒绝无效自动等待：%s', (autoAdvance) => {
    expect(() => validateActors(withLines([{ ...opening, autoAdvance }]))).toThrow(
      new Error('actors[0].battler.casualty.dying.fallback.lines[0].autoAdvance: 期望非负有限数'),
    )
  })

  test.each([
    ['首行没有上一段', [], continuation],
    ['续接标记为 false', [opening], { ...continuation, sameCue: false }],
    ['续行换到另一处对白槽', [opening], { ...continuation, style: 'bottom' }],
    ['上一行已经设定自动结束', [{ ...opening, autoAdvance: 685 }], continuation],
    ['续行重复声明肖像', [opening], { ...continuation, portrait: opening.portrait }],
    ['旁白声明续行', [narration], { ...narration, text: 'dlg.casualty.after', sameCue: true }],
  ])('拒绝无效同段续行：%s', (_reason, preceding, line) => {
    expect(() => validateActors(withLines([...preceding, line]))).toThrow(
      new Error(
        `actors[0].battler.casualty.dying.fallback.lines[${preceding.length}].sameCue: 期望续接同一对白页`,
      ),
    )
  })
})

const nonCombatActor = () => ({
  ...minimalActor(),
  face: 'face.villager',
  portraits: { default: 'portrait.villager', expressions: { smile: 'portrait.smile' } },
})

const battlerActor = (over: Record<string, unknown> = {}) => {
  const template = actorWithPortraitsAndBattler('hero', 'name.hero')
  return { ...template, battler: { ...template.battler, ...over } }
}

const validCasualty = (): { friendDeath: CasualtyScript } => ({
  friendDeath: {
    gates: [{ chance: 75, branch: { lines: [{ text: 'dlg.1', style: 'bottom' }], effects: [] } }],
    fallback: { lines: [], effects: [{ kind: 'heal', resource: 'hp' }] },
  },
})

describe('actor portraits and casualty effects', () => {
  test('非战斗人物的头像与战斗人物的可选字段通过且输入保真', () => {
    expectAcceptsUnchanged((value) => validateActors(value), [nonCombatActor()])
    expectAcceptsUnchanged(
      (value) => validateActors(value),
      [
        battlerActor({
          coveredBy: 'hero2',
          cooperativeMagicSkillId: '99',
          casualty: validCasualty(),
        }),
      ],
    )
  })

  test('portraits.expressions 空表情名拒绝', () => {
    const bad = [
      {
        ...nonCombatActor(),
        portraits: { default: 'portrait.villager', expressions: { '': 'portrait.x' } },
      },
    ]
    const before = deepSnapshot(bad)
    expectExactError(() => validateActors(bad), 'actors[0].portraits.expressions: 表情名不能为空')
    expect(bad).toEqual(before)
  })

  test.each([
    [
      'casualty fallback 空文本',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: { lines: [{ text: '', style: 'bottom' }], effects: [] },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.lines[0].text: 期望非空 TextId',
    ],
    [
      'casualty heal resource chi',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: { lines: [], effects: [{ kind: 'heal', resource: 'chi' }] },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.effects[0].resource: 期望 hp|mp',
    ],
    [
      'casualty tempStatBuff stat 域',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: { lines: [], effects: [{ kind: 'tempStatBuff', stat: 'hp', percent: 2 }] },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.effects[0].stat: 期望 attack|magic|speed|luck',
    ],
    [
      'casualty tempStatBuff percent 非整数',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: {
              lines: [],
              effects: [{ kind: 'tempStatBuff', stat: 'attack', percent: 1.5 }],
            },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.effects[0].percent: 期望整数 ≥1',
    ],
  ] as const)('%s拒绝且实际输入不变', (_label, over, error) => {
    expectAcceptsUnchanged(
      (value) => validateActors(value),
      [battlerActor({ casualty: validCasualty() })],
    )
    const bad = [battlerActor(over)]
    const before = deepSnapshot(bad)
    expectExactError(() => validateActors(bad), error)
    expect(bad).toEqual(before)
  })
})
