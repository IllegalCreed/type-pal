/** Player opcode dispatch: equipment exchange, effect-layer writes and missing-role guards. Distinct from effect-removal integration in state-transitions. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPlayerOpcode,
  OP_EQUIP_ITEM,
  OP_REMOVE_EQUIPMENT,
  OP_SET_PLAYER_EXTRA_ATTR,
  type PlayerOpcodeInput,
} from './event-opcode-player.js'
import { freshPlayerOpcodeState as freshGs } from './event-opcode-player.test-fixtures.js'

function apply(
  gs: ReturnType<typeof freshGs>,
  opcode: number,
  operands: [number, number, number],
  currentEventObjectId?: number,
): boolean {
  const input: PlayerOpcodeInput = {
    gs,
    opcode,
    operands,
    currentEventObjectId,
    runPlayerPoisonEntry: () => 0,
  }
  return applyPlayerOpcode(input)
}
afterEach(() => {
  vi.restoreAllMocks()
})
describe('0x17 OP_SET_PLAYER_EXTRA_ATTR 装备效果层直写', () => {
  it('无 role 上下文 → 警告且装备效果层零变异', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    const before = structuredClone(gs)
    expect(apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0c, 6, 3], undefined)).toBe(true)
    expect(gs).toEqual(before)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: setPlayerExtraAttr no role context')
  })

  it('合法写:partIdx=op0-0x0b 落 rgEquipmentEffect[part].rgwLevel[role];负值按 i16 符号扩展', () => {
    const gs = freshGs()
    expect(apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0b, 6, 3], 1)).toBe(true)
    expect(gs.rgEquipmentEffect[0]!.rgwLevel[1]).toBe(3)
    // 0x8000 → -32768(signExtendI16)
    expect(apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0b, 21, 0x8000], 1)).toBe(true)
    expect(gs.rgEquipmentEffect[0]!.rgwFleeRate[1]).toBe(-32768)
  })
})
describe('0x18 OP_EQUIP_ITEM 装备交换分支', () => {
  it('无 role 上下文 → 警告跳过,装备与背包零变异', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    gs.inventory = [{ itemId: 30, count: 2 }]
    expect(apply(gs, OP_EQUIP_ITEM, [0x0b, 30, 0], undefined)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(0)
    expect(gs.inventory).toEqual([{ itemId: 30, count: 2 }])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: equipItem no role context')
  })

  it('首次装备(旧槽空)→ 只消耗新物品,不回添任何旧物', () => {
    const gs = freshGs()
    gs.inventory = [{ itemId: 30, count: 1 }]
    expect(apply(gs, OP_EQUIP_ITEM, [0x0b, 30, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(30)
    expect(gs.inventory).toEqual([])
    expect(gs.wLastUnequippedItem).toBe(0)
  })

  it('换装且旧物已在包(非唯一实例)→ 全量交换:新物 -1、旧物 +1', () => {
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 20
    gs.inventory = [
      { itemId: 20, count: 1 },
      { itemId: 30, count: 2 },
    ]
    expect(apply(gs, OP_EQUIP_ITEM, [0x0b, 30, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(30)
    expect(gs.inventory).toEqual([
      { itemId: 20, count: 2 },
      { itemId: 30, count: 1 },
    ])
    expect(gs.wLastUnequippedItem).toBe(20)
  })

  it('同物重装(oldItem===newItem)不交换装备行与背包', () => {
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 30
    gs.inventory = [{ itemId: 30, count: 1 }]
    expect(apply(gs, OP_EQUIP_ITEM, [0x0b, 30, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(30)
    expect(gs.inventory).toEqual([{ itemId: 30, count: 1 }])
  })
})
describe('0x23 OP_REMOVE_EQUIPMENT 空槽分支', () => {
  it('指定单槽为空 → 背包与装备层零变异', () => {
    const gs = freshGs()
    gs.inventory = [{ itemId: 30, count: 3 }]
    expect(apply(gs, OP_REMOVE_EQUIPMENT, [0, 2, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[1]![0]).toBe(0)
    expect(gs.inventory).toEqual([{ itemId: 30, count: 3 }])
  })
})
describe('装备交换边界', () => {
  it('0x17 roleId=0xffff → 警告跳过;partIdx>0 落对应效果槽', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    expect(apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0b, 6, 3], 0xffff)).toBe(true)
    expect(gs.rgEquipmentEffect[0]!.rgwLevel[0]).toBe(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: setPlayerExtraAttr no role context')
    // partIdx=1(op0=0x0c)写第二槽;row 7=MAX_HP(PLAYERROLES_ROW 真值)
    expect(apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0c, 7, 9], 0)).toBe(true)
    expect(gs.rgEquipmentEffect[1]!.rgwMaxHP[0]).toBe(9)
  })

  it('0x18 roleId=0xffff → 警告跳过,装备层与背包零变异', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    gs.inventory = [{ itemId: 30, count: 1 }]
    expect(apply(gs, OP_EQUIP_ITEM, [0x0b, 30, 0], 0xffff)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(0)
    expect(gs.inventory).toEqual([{ itemId: 30, count: 1 }])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: equipItem no role context')
  })

  it('0x23 全卸槽位混合:有物槽回包、空槽跳过', () => {
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 30
    gs.PlayerRolesRuntime.rgwEquipment[2]![0] = 40
    expect(apply(gs, OP_REMOVE_EQUIPMENT, [0, 0, 0], 0)).toBe(true)
    expect(gs.inventory).toEqual([
      { itemId: 30, count: 1 },
      { itemId: 40, count: 1 },
    ])
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(0)
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]![0]).toBe(0)
  })
})
