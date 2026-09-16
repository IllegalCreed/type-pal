/**
 * TEST-FOUNDATION-COVERAGE-1 B2：validateActors 边界（validate.ts:427-501）。
 * 既有 validate.test.ts 已覆盖 spriteId 缺席(:359)、name 非 string(:362)、battler
 * 必填/E18-1 三字段/initialMagic 重复/立绘 AssetId；本文件补 id/spriteId 非 string、
 * 旧 battleSprite 字段退役门与最小/带 battler 正控。结构校验与跨资源引用分层：
 * 本验证器不查 spriteId 是否存在（跨表引用由工程级校验承担）。
 */
import { describe, expect, test } from 'vitest'
import { minimalActor } from './__tests__/glm-foundation-fixtures.js'
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
