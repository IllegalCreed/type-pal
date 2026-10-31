/** Spell-list data contracts; casting, outside-battle filtering and rendering have their own callers. */
import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeRoleRecord } from '../../__tests__/battle-records.js'
import { magicWithCost } from './__tests__/magic-cost-fixture.js'
import { createMagicSelectMenu } from './magic-select.js'
import { getSelected } from './primitives.js'

function createSpellCaster(id: number, mp: number, magic: number[], level = 10): PlayerRole {
  return {
    id,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level,
    maxHP: 100,
    maxMP: 100,
    hp: 100,
    mp,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
    magic,
  }
}
function rolesOf(role: PlayerRole): PlayerRoles {
  return { roles: [role] }
}
describe('MP cost and initial selection', () => {
  const battleSpell = (id: number, magicNumber: number, name: string): Spell => ({
    id,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    _name: name,
  })

  const magics: Magic[] = [magicWithCost(1, 5), magicWithCost(2, 30)]
  const spells: Spell[] = [battleSpell(300, 1, '小火球'), battleSpell(301, 2, '大火球')]
  const playerRoles: PlayerRoles = {
    roles: [
      makeRoleRecord(0, {
        _name: 'leader',
        maxHP: 100,
        maxMP: 100,
        hp: 100,
        mp: 100,
        attackStrength: 0,
        magicStrength: 0,
        defense: 0,
        dexterity: 0,
        fleeRate: 0,
        walkFrames: 3,
        magic: [300, 301, ...Array<number>(30).fill(0)],
      }),
    ],
  }

  it('MP 足够 → 列出全部 + 显 MP cost,光标在第一个', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 100,
    })
    expect(menu.items.map((i) => i.label)).toEqual(['小火球', '大火球'])
    expect(menu.items[0]?.rightText).toBe('MP 5')
    expect(menu.items[1]?.rightText).toBe('MP 30')
    expect(getSelected(menu)?.id).toBe(300)
  })

  it('MP 不够 → disabled(灰色),初始 cursor 仍按默认项', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 10, // 大火球 30 不够
    })
    expect(menu.items[0]?.disabled).toBe(false)
    expect(menu.items[1]?.disabled).toBe(true)
    expect(menu.cursor).toBe(0)
  })

  it('L38:第一个法术 MP 不足时 cursor 仍可落在灰项', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 3,
    })
    expect(menu.items[0]?.disabled).toBe(true)
    expect(menu.cursor).toBe(0)
  })

  it('L36:法术按 ObjectID 升序排列(无论习得顺序),对齐 magicmenu.c:377-397', () => {
    const rolesShuffled: PlayerRoles = {
      roles: [
        {
          ...playerRoles.roles[0]!,
          // 习得顺序 [301,300]；展示按 ObjectID 排序，不改角色槽位。
          magic: [301, 300, ...Array<number>(30).fill(0)],
        },
      ],
    }
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesShuffled,
      spells,
      magics,
      currentMp: 100,
    })
    // C 冒泡按 wMagic(spell ObjectID)升序 → 菜单恒 [小火球(300), 大火球(301)],不随习得序
    expect(menu.items.map((i) => i.id)).toEqual([300, 301])
    expect(menu.items.map((i) => i.label)).toEqual(['小火球', '大火球'])
  })
})

describe('Spell identity and input ownership', () => {
  const magics: Magic[] = [magicWithCost(1, 5), magicWithCost(2, 12)]

  const spells: Spell[] = [
    {
      id: 300,
      magicNumber: 1,
      scriptOnSuccess: 0,
      scriptOnUse: 0,
      scriptDesc: 0,
      flags: {
        usableOutsideBattle: true,
        usableInBattle: true,
        usableToEnemy: false,
        applyToAll: false,
      },
      _name: '甲',
    },
    {
      id: 295,
      magicNumber: 2,
      scriptOnSuccess: 0,
      scriptOnUse: 0,
      scriptDesc: 0,
      flags: {
        usableOutsideBattle: true,
        usableInBattle: false,
        usableToEnemy: false,
        applyToAll: false,
      },
      _name: '乙',
    }, // 非连续（梦蛇 295 在段外）
  ]
  function boundaryRoles(magic: number[]): PlayerRoles {
    return { roles: [createSpellCaster(0, 50, magic, 1)] }
  }

  it('MP 恰等 cost 不禁用、差 1 禁用；排序后实际传入 roles.magic 不被污染', () => {
    // 习得序乱序 [300, 295] → 排序展示 [295, 300]
    const playerRoles = boundaryRoles([300, 295])
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
    expect(playerRoles).toEqual(snapshot) // 实际传入不被排序污染

    const oneLess = createMagicSelectMenu({
      roleId: 0,
      playerRoles: boundaryRoles([300]),
      spells,
      magics,
      currentMp: 4, // 差 1
    })
    expect(oneLess.items[0]!.disabled).toBe(true)
  })
  it('非连续 wObjectID 295 返回 spell.id 而非 magicNumber；缺 spell/坏角色空表（防御分类：当前 caller 域内不应触达的退化输入）', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: boundaryRoles([295, 999]), // 999 无 spell 定义
      spells,
      magics,
      currentMp: 99,
    })
    expect(menu.items).toHaveLength(1)
    expect(menu.items[0]!.id).toBe(295) // spell.id，不是 magicNumber 2
    expect(menu.items[0]!.label).toBe('乙')
    expect(
      createMagicSelectMenu({
        roleId: 7,
        playerRoles: boundaryRoles([300]),
        spells,
        magics,
        currentMp: 9,
      }).items,
    ).toEqual([])
  })
})

describe('Learned slots and catalog fallbacks', () => {
  function catalogSpell(id: number, magicNumber: number, name: string | undefined): Spell {
    return {
      id,
      magicNumber,
      scriptOnSuccess: 0,
      scriptOnUse: 0,
      scriptDesc: 0,
      flags: {
        usableOutsideBattle: true,
        usableInBattle: true,
        usableToEnemy: false,
        applyToAll: false,
      },
      _name: name,
    }
  }

  const magics = [magicWithCost(1, 5), magicWithCost(2, 0)]
  const spells = [catalogSpell(300, 1, '甲'), catalogSpell(301, 2, undefined)]

  it('spell 存在但 magicNumber 无 magic 定义 → 该槽剔除（!magic 分支）', () => {
    const dangling = catalogSpell(302, 99, '悬空') // magicNumber 99 不在 magics
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(createSpellCaster(0, 50, [300, 302])),
      spells: [...spells, dangling],
      magics,
      currentMp: 50,
    })
    expect(menu.items.map((i) => i.id)).toEqual([300])
  })

  it('spell 缺 _name → label 回退 magic#<magic.id>（渲染文案缺名的合法降级）', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(createSpellCaster(0, 50, [301])),
      spells,
      magics,
      currentMp: 50,
    })
    expect(menu.items[0]?.label).toBe('magic#2')
  })

  it('costMP=0 的法术在 MP=0 时仍可选（0 < 0 不成立，不禁用）', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(createSpellCaster(0, 0, [301, 300])),
      spells,
      magics,
      currentMp: 0,
    })
    expect(menu.items.map((i) => i.id)).toEqual([300, 301]) // 升序
    expect(menu.items.map((i) => i.disabled)).toEqual([true, false]) // 甲(5) 禁；免费(0) 可选
  })

  it('全空法术槽（magic 全 0）→ 空表；pageSize 覆写进 state', () => {
    const menu = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesOf(createSpellCaster(0, 50, Array<number>(32).fill(0))),
      spells,
      magics,
      currentMp: 50,
      pageSize: 3,
    })
    expect(menu.items).toEqual([])
    expect(menu.cursor).toBe(0)
    expect(menu.pageSize).toBe(3)
  })
})
