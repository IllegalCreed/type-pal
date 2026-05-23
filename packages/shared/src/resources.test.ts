import { describe, it, expect, expectTypeOf } from 'vitest'
import type { Tilemap, TileCell, Palette, SceneObjects, SceneEventObject } from './resources.js'
import type { Enemy } from './tables.js'

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
