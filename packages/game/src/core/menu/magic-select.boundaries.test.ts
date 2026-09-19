/**
 * TEST-GAME-MENU-BOUNDARIES-1 G04：magic-select 独立轴（magic-select.ts）。
 * 既有 __tests__/item-magic-select.test 已覆盖成本/灰/排序主干——不重复。本文件：
 * MP 恰等 cost 不禁用；排序不污染实际传入 playerRoles.roles[roleId].magic；非连续
 * wObjectID（如 295）返回 spell.id 而非 magicNumber；坏角色/缺 spell 静默空表。
 */
import type { Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createMagicSelectMenu } from './magic-select.js'

const magics: Magic[] = [
  { id: 1, costMP: 5 } as unknown as Magic,
  { id: 2, costMP: 12 } as unknown as Magic,
]
const spells: Spell[] = [
  { id: 300, magicNumber: 1, _name: '甲' } as unknown as Spell,
  { id: 295, magicNumber: 2, _name: '乙' } as unknown as Spell, // 非连续（梦蛇 295 在段外）
]

function roles(magic: number[]): PlayerRoles {
  return { roles: { 0: { id: 0, magic } } } as unknown as PlayerRoles
}

describe('G04 createMagicSelectMenu', () => {
  it('MP 恰等 cost 不禁用、差 1 禁用；排序后实际传入 roles.magic 不被污染', () => {
    // 习得序乱序 [300, 295] → 排序展示 [295, 300]
    const playerRoles = roles([300, 295])
    const snapshot = structuredClone(playerRoles)
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 5, // 甲(300,cost5) 恰等；乙(295,cost12) 差 7
    })
    expect(menu.items.map((item) => item.id)).toEqual([295, 300]) // 升序
    expect(menu.items[0]).toMatchObject({ id: 295, disabled: true, rightText: 'MP 12' })
    expect(menu.items[1]).toMatchObject({ id: 300, disabled: false, rightText: 'MP 5' })
    expect(structuredClone(playerRoles)).toEqual(snapshot) // 实际传入不被排序污染

    const oneLess = createMagicSelectMenu({
      roleId: 0,
      playerRoles: roles([300]),
      spells,
      magics,
      currentMp: 4, // 差 1
    })
    expect(oneLess.items[0]!.disabled).toBe(true)
  })
  it('非连续 wObjectID 295 返回 spell.id 而非 magicNumber；缺 spell/坏角色空表（防御分类：当前 caller 域内不应触达的退化输入）', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: roles([295, 999]), // 999 无 spell 定义
      spells,
      magics,
      currentMp: 99,
    })
    expect(menu.items).toHaveLength(1)
    expect(menu.items[0]!.id).toBe(295) // spell.id，不是 magicNumber 2
    expect(menu.items[0]!.label).toBe('乙')
    expect(
      createMagicSelectMenu({ roleId: 7, playerRoles: roles([300]), spells, magics, currentMp: 9 })
        .items,
    ).toEqual([])
  })
})
