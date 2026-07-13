import type { Item, Magic, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createItemSelectMenu } from '../item-select.js'
import { createMagicSelectMenu } from '../magic-select.js'
import { getSelected } from '../primitives.js'

function makeItem(id: number, partial: Partial<Item> = {}): Item {
  return {
    id,
    _name: partial._name ?? `item${id}`,
    bitmap: 0,
    price: partial.price ?? 100,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: true,
      equipableBy: [false, false, false, false, false, false],
      ...(partial.flags ?? {}),
    } as Item['flags'],
  }
}

describe('M-w0.2 ItemSelectMenu', () => {
  const items: Item[] = [
    makeItem(1, { _name: '剑', flags: { equipable: true, sellable: true } as Item['flags'] }),
    makeItem(2, {
      _name: '草药',
      flags: { usable: true, consuming: true, sellable: true } as Item['flags'],
    }),
    makeItem(3, {
      _name: '飞镖',
      flags: { throwable: true, consuming: true, sellable: true } as Item['flags'],
    }),
    makeItem(4, { _name: '剧情玉', flags: { sellable: false, equipable: false } as Item['flags'] }),
  ]

  it('filter=equip:只显装备类', () => {
    const s = createItemSelectMenu({
      inventory: items.map((i) => ({ itemId: i.id, count: 1 })),
      items,
      filter: 'equip',
      mode: 'inventory',
    })
    expect(s.items.map((i) => i.id)).toEqual([1])
  })

  it('filter=potion:只显 usable 且非装备 / 投掷', () => {
    const s = createItemSelectMenu({
      inventory: items.map((i) => ({ itemId: i.id, count: 1 })),
      items,
      filter: 'potion',
      mode: 'inventory',
    })
    expect(s.items.map((i) => i.id)).toEqual([2])
  })

  it('filter=battle:throwable 类', () => {
    const s = createItemSelectMenu({
      inventory: items.map((i) => ({ itemId: i.id, count: 1 })),
      items,
      filter: 'battle',
      mode: 'inventory',
    })
    expect(s.items.map((i) => i.id)).toContain(3)
  })

  it('mode=buy:rightText 显价格', () => {
    const s = createItemSelectMenu({
      inventory: [{ itemId: 1, count: 5 }],
      items,
      filter: 'equip',
      mode: 'buy',
    })
    expect(s.items[0]?.rightText).toBe('$100')
  })

  it('mode=sell:rightText 显数量 + 卖价 (price/2)', () => {
    const s = createItemSelectMenu({
      inventory: [{ itemId: 1, count: 5 }],
      items,
      filter: 'equip',
      mode: 'sell',
    })
    expect(s.items[0]?.rightText).toBe('×5  $50')
  })

  it('inventory 数量 inline 显示', () => {
    const s = createItemSelectMenu({
      inventory: [{ itemId: 2, count: 3 }],
      items,
      filter: 'potion',
      mode: 'inventory',
    })
    expect(s.items[0]?.rightText).toBe('×3')
  })
})

describe('M-w0.2 MagicSelectionMenu', () => {
  const makeMagic = (id: number, costMP: number): Magic => ({
    id,
    effect: 0,
    type: 0 as unknown as Magic['type'],
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  })
  const makeSpell = (id: number, magicNumber: number, name: string): Spell => ({
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
    } as Spell['flags'],
    _name: name,
  })

  const magics: Magic[] = [makeMagic(1, 5), makeMagic(2, 30)]
  const spells: Spell[] = [makeSpell(1, 1, '小火球'), makeSpell(2, 2, '大火球')]
  const playerRoles: PlayerRoles = {
    roles: [
      {
        id: 0,
        _name: 'leader',
        avatar: 0,
        spriteNumInBattle: 0,
        spriteNum: 0,
        name: 0,
        attackAll: 0,
        level: 10,
        maxHP: 100,
        maxMP: 100,
        hp: 100,
        mp: 100,
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
        magic: [
          1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0,
        ],
      },
    ],
  }

  it('MP 足够 → 列出全部 + 显 MP cost,光标在第一个', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 100,
    })
    expect(s.items.map((i) => i.label)).toEqual(['小火球', '大火球'])
    expect(s.items[0]?.rightText).toBe('MP 5')
    expect(s.items[1]?.rightText).toBe('MP 30')
    expect(getSelected(s)?.id).toBe(1)
  })

  it('MP 不够 → disabled(灰色),初始 cursor 仍按默认项', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 10, // 大火球 30 不够
    })
    expect(s.items[0]?.disabled).toBe(false)
    expect(s.items[1]?.disabled).toBe(true)
    expect(s.cursor).toBe(0)
  })

  it('L38:第一个法术 MP 不足时 cursor 仍可落在灰项', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 3,
    })
    expect(s.items[0]?.disabled).toBe(true)
    expect(s.cursor).toBe(0)
  })

  it('role 未学法术槽位 = 0 → 不显示', () => {
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles,
      spells,
      magics,
      currentMp: 100,
    })
    expect(s.items.length).toBe(2) // 不含 0 槽位
  })

  it('L36:法术按 ObjectID 升序排列(无论习得顺序),对齐 magicmenu.c:377-397', () => {
    const rolesShuffled: PlayerRoles = {
      roles: [
        {
          ...playerRoles.roles[0]!,
          // 习得顺序 [2,1]:先学大火球(id2)后学小火球(id1) —— rgwMagic 按习得追加,乱序
          magic: [2, 1, ...Array<number>(30).fill(0)],
        },
      ],
    }
    const s = createMagicSelectMenu({
      roleId: 0,
      playerRoles: rolesShuffled,
      spells,
      magics,
      currentMp: 100,
    })
    // C 冒泡按 wMagic(spell ObjectID)升序 → 菜单恒 [小火球(1), 大火球(2)],不随习得序
    expect(s.items.map((i) => i.id)).toEqual([1, 2])
    expect(s.items.map((i) => i.label)).toEqual(['小火球', '大火球'])
  })
})
