/**
 * TEST-FOUNDATION-COVERAGE-1 B2：validateActors 边界（validate.ts:427-501）。
 * 既有 validate.test.ts 已覆盖 spriteId 缺席(:359)、name 非 string(:362)、battler
 * 必填/E18-1 三字段/initialMagic 重复/立绘 AssetId；本文件补 id/spriteId 非 string、
 * 旧 battleSprite 字段退役门与最小/带 battler 正控。结构校验与跨资源引用分层：
 * 本验证器不查 spriteId 是否存在（跨表引用由工程级校验承担）。
 */
import { describe, expect, test } from 'vitest'
import { minimalActor } from './__tests__/glm-foundation-fixtures.js'
import { heroActor } from './__tests__/glm-item-logic-fixtures.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { CasualtyLine } from './actor.js'
import { validateActors } from './validate.js'

describe('validateActors · 基础字段', () => {
  test('最小 actor（仅三必填）通过并原样返回', () => {
    const actors = [minimalActor()]
    expect(validateActors(actors)).toBe(actors)
  })
  test('id 非 string 拒绝（name 已有测试，此处补 id/spriteId）', () => {
    expect(() => validateActors([{ ...minimalActor(), id: 42 }])).toThrow(
      /actors\[0\]: id 非string/,
    )
    expect(() => validateActors([{ ...minimalActor(), spriteId: 7 }])).toThrow(
      /actors\[0\]: spriteId 非string/,
    )
  })
  test('非数组输入拒绝', () => {
    expect(() => validateActors({})).toThrow(/期望/)
  })
})

describe('validateActors · battler 边界', () => {
  const battler = (extra: Record<string, unknown> = {}) => ({
    baseStats: {},
    initialEquipment: {},
    initialMagic: [],
    battleSprite: 'battle.x',
    ...extra,
  })
  test('合法 battler 通过', () => {
    expect(() => validateActors([{ ...minimalActor(), battler: battler() }])).not.toThrow()
  })
  test('旧 battleSpriteNum/battleSpritePath 已退役拒绝', () => {
    expect(() =>
      validateActors([{ ...minimalActor(), battler: battler({ battleSpriteNum: 5 }) }]),
    ).toThrow(/旧 battleSpriteNum\/battleSpritePath 已退役/)
    expect(() =>
      validateActors([{ ...minimalActor(), battler: battler({ battleSpritePath: 'x' }) }]),
    ).toThrow(/旧 battleSpriteNum\/battleSpritePath 已退役/)
  })
  test('battleSprite 空串拒绝', () => {
    expect(() =>
      validateActors([{ ...minimalActor(), battler: battler({ battleSprite: '' }) }]),
    ).toThrow(/battler\.battleSprite: 期望非空/)
  })
})

describe('validateActors · 战斗伤亡对白', () => {
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
    const actor = heroActor()
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
