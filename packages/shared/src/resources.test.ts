import { describe, it, expect, expectTypeOf } from 'vitest'
import type { Tilemap, TileCell, Palette, SceneObjects, SceneEventObject } from './resources.js'
import type {
  BattleField,
  Enemy,
  EnemyTeam,
  Item,
  ItemFlags,
  Magic,
  MagicType,
  Spell,
  SpellFlags,
} from './tables.js'

describe('resources types', () => {
  it('Tilemap 有必要字段', () => {
    expectTypeOf<Tilemap>().toMatchTypeOf<{ width: number; height: number; cells: TileCell[][]; tilesetImage: string }>()
  })
  it('TileCell 有 lower 和 upper 字段', () => {
    const cell: TileCell = { lower: 0x1234, upper: 0xabcd }
    expect(cell.lower).toBe(0x1234)
    expect(cell.upper).toBe(0xabcd)
  })
  it('Palette colors 是三元组', () => {
    const p: Palette = { colors: [[0, 0, 0]], cycles: [] }
    expect(p.colors[0]).toEqual([0, 0, 0])
  })
})

describe('SceneObjects', () => {
  it('单个 eventObject 字段', () => {
    const eo: SceneEventObject = {
      id: 5,
      x: 10,
      y: 20,
      spriteNum: 78,
      triggerLabel: 'L_59',
      autoLabel: 'L_71',
    }
    expect(eo.id).toBe(5)
  })

  it('SceneObjects 整体', () => {
    const so: SceneObjects = {
      sceneId: 1,
      mapNum: 12,
      onEnterLabel: 'L_0',
      eventObjects: [],
    }
    expect(so.eventObjects).toEqual([])
  })

  it('triggerLabel / autoLabel 可缺', () => {
    const eo: SceneEventObject = { id: 0, x: 0, y: 0, spriteNum: 0 }
    expect(eo.triggerLabel).toBeUndefined()
  })
})

describe('Enemy schema (M3 D28 扩)', () => {
  it('完整 Enemy 字段(30+)', () => {
    const e: Enemy = {
      id: 100,
      _name: '苗人拳',
      idleFrames: 4,
      magicFrames: 4,
      attackFrames: 4,
      idleAnimSpeed: 1,
      actWaitFrames: 0,
      yPosOffset: 0,
      attackSound: 50,
      actionSound: 0,
      magicSound: 0,
      deathSound: 51,
      callSound: 52,
      health: 100,
      exp: 10,
      cash: 30,
      level: 5,
      magic: 0,
      magicRate: 0,
      attackEquivItem: 0,
      attackEquivItemRate: 0,
      stealItem: 0,
      stealItemCount: 0,
      // signed modifier 字段
      attackStrength: -1,
      magicStrength: 0,
      defense: 0,
      dexterity: 10,
      fleeRate: 5,
      poisonResistance: 5,
      elemResistance: { wind: 5, thunder: 5, water: 5, fire: 5, earth: 5 },
      physicalResistance: 1,
      dualMove: 0,
      collectValue: 0,
    }
    expect(e.id).toBe(100)
    expect(e.elemResistance.wind).toBe(5)
    expect(e.attackStrength).toBe(-1)
  })

  it('Enemy 可 JSON 序列化(signed 字段保留负数)', () => {
    const e: Enemy = createMinimalEnemy()
    const json = JSON.stringify(e)
    const parsed = JSON.parse(json) as Enemy
    expect(parsed.attackStrength).toBe(-1)
  })
})

describe('Item schema (M3 T5)', () => {
  it('完整 Item 字段', () => {
    const item: Item = {
      id: 100,
      _name: '止血草',
      bitmap: 5,
      price: 30,
      scriptOnUse: 1234,
      scriptOnEquip: 0,
      scriptOnThrow: 0,
      scriptDesc: 5678,
      flags: {
        usable: true,
        equipable: false,
        throwable: false,
        consuming: true,
        applyToAll: false,
        sellable: true,
        equipableBy: [false, false, false, false, false, false],
      },
    }
    expect(item.flags.usable).toBe(true)
    expect(item.flags.equipableBy).toHaveLength(6)
  })

  it('ItemFlags 类型有 7 个具名字段', () => {
    expectTypeOf<ItemFlags>().toMatchTypeOf<{
      usable: boolean
      equipable: boolean
      throwable: boolean
      consuming: boolean
      applyToAll: boolean
      sellable: boolean
      equipableBy: readonly boolean[]
    }>()
  })

  it('Item 可 JSON 序列化(flags 拆位仍是 boolean)', () => {
    const item: Item = {
      id: 1,
      bitmap: 0,
      price: 0,
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
        sellable: false,
        equipableBy: [false, false, false, false, false, false],
      },
    }
    const parsed = JSON.parse(JSON.stringify(item)) as Item
    expect(parsed.id).toBe(1)
    expect(parsed.flags.equipableBy).toHaveLength(6)
    expect(typeof parsed.flags.usable).toBe('boolean')
  })
})

describe('Spell schema (M3 T6)', () => {
  it('完整 Spell 字段', () => {
    const spell: Spell = {
      id: 4,
      _name: '雷神咒',
      magicNumber: 12,
      scriptOnSuccess: 0,
      scriptOnUse: 9876,
      scriptDesc: 0,
      flags: {
        usableOutsideBattle: false,
        usableInBattle: true,
        usableToEnemy: true,
        applyToAll: false,
      },
    }
    expect(spell.flags.usableInBattle).toBe(true)
    expect(spell.flags.usableToEnemy).toBe(true)
  })

  it('SpellFlags 类型有 4 个具名字段', () => {
    expectTypeOf<SpellFlags>().toMatchTypeOf<{
      usableOutsideBattle: boolean
      usableInBattle: boolean
      usableToEnemy: boolean
      applyToAll: boolean
    }>()
  })

  it('Spell 可 JSON 序列化', () => {
    const spell: Spell = {
      id: 0,
      magicNumber: 33,
      scriptOnSuccess: 0,
      scriptOnUse: 0,
      scriptDesc: 0,
      flags: {
        usableOutsideBattle: false,
        usableInBattle: true,
        usableToEnemy: false,
        applyToAll: false,
      },
    }
    const parsed = JSON.parse(JSON.stringify(spell)) as Spell
    expect(parsed.magicNumber).toBe(33)
    expect(typeof parsed.flags.usableInBattle).toBe('boolean')
  })
})

describe('Magic schema (M3 T6)', () => {
  it('Magic detail stats', () => {
    const magic: Magic = {
      id: 12,
      effect: 100,
      type: 'normal',
      xOffset: 0,
      yOffset: 0,
      special: 0,
      speed: 4,
      keepEffect: 0,
      fireDelay: 0,
      effectTimes: 1,
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 10,
      baseDamage: 50,
      elemental: 2,
      sound: 50,
    }
    expect(magic.type).toBe('normal')
    expect(magic.costMP).toBe(10)
  })

  it('MagicType 联合值', () => {
    const types: MagicType[] = [
      'normal',
      'attackAll',
      'attackWhole',
      'attackField',
      'applyToPlayer',
      'applyToParty',
      'trance',
      'summon',
      'other',
    ]
    expect(types).toContain('normal')
    expect(types).toContain('summon')
    expect(types).toContain('other')
    expect(types).toHaveLength(9)
  })

  it('Magic signed 字段保留负数(speed / sound)', () => {
    const magic: Magic = {
      id: 0,
      effect: 0,
      type: 'normal',
      xOffset: 0,
      yOffset: 0,
      special: 0,
      speed: -1,
      keepEffect: 0,
      fireDelay: 0,
      effectTimes: 1,
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 0,
      baseDamage: 0,
      elemental: 0,
      sound: -1,
    }
    const parsed = JSON.parse(JSON.stringify(magic)) as Magic
    expect(parsed.speed).toBe(-1)
    expect(parsed.sound).toBe(-1)
  })
})

describe('EnemyTeam schema (M3 T7)', () => {
  it('EnemyTeam 5 个 enemy 槽位,0xFFFF = 空位', () => {
    const t: EnemyTeam = {
      id: 1,
      enemies: [421, 421, 0xffff, 0xffff, 0xffff],
      _names: ['苗人拳', '苗人拳'],
    }
    expect(t.enemies).toHaveLength(5)
    expect(t.enemies[2]).toBe(0xffff)
    expect(t.id).toBe(1)
  })

  it('EnemyTeam 可 JSON 序列化(enemies tuple 保留 5 位 + _names 可缺)', () => {
    const t: EnemyTeam = {
      id: 0,
      enemies: [0xffff, 0xffff, 0xffff, 0xffff, 0xffff],
    }
    const parsed = JSON.parse(JSON.stringify(t)) as EnemyTeam
    expect(parsed.enemies).toHaveLength(5)
    expect(parsed._names).toBeUndefined()
  })

  it('EnemyTeam._names 可选(without-name 路径)', () => {
    expectTypeOf<EnemyTeam>().toMatchTypeOf<{
      id: number
      enemies: readonly [number, number, number, number, number]
      _names?: string[]
    }>()
  })
})

describe('BattleField schema (M3 T7)', () => {
  it('BattleField 含 screenWave + 5 元素 effect(signed)', () => {
    const f: BattleField = {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    }
    expect(f.magicEffect.fire).toBe(0)
    expect(Object.keys(f.magicEffect)).toHaveLength(5)
  })

  it('BattleField.magicEffect 可负(signed,对照 sdlpal SHORT)', () => {
    const f: BattleField = {
      id: 3,
      screenWave: 10,
      magicEffect: { wind: -2, thunder: 0, water: 3, fire: -1, earth: 0 },
    }
    const parsed = JSON.parse(JSON.stringify(f)) as BattleField
    expect(parsed.magicEffect.wind).toBe(-2)
    expect(parsed.magicEffect.fire).toBe(-1)
  })

  it('BattleField 元素字段顺序与 Enemy.elemResistance 一致(wind/thunder/water/fire/earth)', () => {
    expectTypeOf<BattleField>().toMatchTypeOf<{
      id: number
      screenWave: number
      magicEffect: {
        wind: number
        thunder: number
        water: number
        fire: number
        earth: number
      }
    }>()
  })
})

function createMinimalEnemy(): Enemy {
  return {
    id: 1,
    _name: 'test',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 1,
    exp: 0,
    cash: 0,
    level: 1,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: -1,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
  }
}
