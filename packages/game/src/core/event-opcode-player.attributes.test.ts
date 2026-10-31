/** Player opcode dispatch: role/stat growth, learned-spell capacity and family ownership. Hydrated fixtures; damaged tables explicitly labeled. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPlayerOpcode,
  OP_ADD_MAGIC,
  OP_INCREASE_PLAYER_ATTR,
  OP_INCREASE_PLAYER_LEVEL,
  OP_REMOVE_MAGIC,
  OP_SET_PLAYER_STAT,
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
describe('0x8d OP_INCREASE_PLAYER_LEVEL 守卫与封顶', () => {
  it('无 role 上下文(undefined 与 0xffff)→ 警告跳过,等级与经验零变异', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwLevel[0] = 5
    gs.Exp.rgPrimaryExp[0]!.wLevel = 5
    expect(apply(gs, OP_INCREASE_PLAYER_LEVEL, [1, 0, 0], undefined)).toBe(true)
    expect(apply(gs, OP_INCREASE_PLAYER_LEVEL, [1, 0, 0], 0xffff)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(5)
    expect(gs.Exp.rgPrimaryExp[0]!.wLevel).toBe(5)
    expect(warn.mock.calls).toEqual([
      ['event-system: increasePlayerLevel 无 role 上下文,跳过'],
      ['event-system: increasePlayerLevel 无 role 上下文,跳过'],
    ])
  })

  it('未知 role(数组外下标)→ 警告跳过不炸', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    const before = structuredClone(gs)
    expect(apply(gs, OP_INCREASE_PLAYER_LEVEL, [1, 0, 0], 9)).toBe(true)
    expect(gs).toEqual(before)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: playerLevelUp role=9 不在 PlayerRoles,跳过')
  })

  it('level 封顶 99;stat 封顶 999;Exp 主行 wExp 清 0 且 wLevel 同步新等级', () => {
    const gs = freshGs()
    gs.partyMembers = [1]
    const rt = gs.PlayerRolesRuntime
    rt.rgwLevel[1] = 98
    rt.rgwMaxHP[1] = 998
    rt.rgwMaxMP[1] = 999
    for (const values of [
      rt.rgwAttackStrength,
      rt.rgwMagicStrength,
      rt.rgwDefense,
      rt.rgwDexterity,
      rt.rgwFleeRate,
    ])
      values[1] = 998
    gs.Exp.rgPrimaryExp[1]!.wExp = 1234
    expect(apply(gs, OP_INCREASE_PLAYER_LEVEL, [5, 0, 0], 1)).toBe(true)
    expect(rt.rgwLevel[1]).toBe(99)
    expect(rt.rgwMaxHP[1]).toBe(999)
    expect(rt.rgwMaxMP[1]).toBe(999)
    expect([
      rt.rgwAttackStrength[1],
      rt.rgwMagicStrength[1],
      rt.rgwDefense[1],
      rt.rgwDexterity[1],
      rt.rgwFleeRate[1],
    ]).toEqual([999, 999, 999, 999, 999])
    expect(gs.Exp.rgPrimaryExp[1]!.wExp).toBe(0)
    expect(gs.Exp.rgPrimaryExp[1]!.wLevel).toBe(99)
  })
})
describe('0x19/0x1a 显式 role 操作数', () => {
  it('0x19 op2≠0 → 显式 role=op2-1,当前事件对象被忽略', () => {
    const gs = freshGs()
    const rt = gs.PlayerRolesRuntime
    rt.rgwMaxHP[0] = 100
    rt.rgwMaxHP[2] = 100
    expect(apply(gs, OP_INCREASE_PLAYER_ATTR, [7, 15, 3], 0)).toBe(true)
    expect(rt.rgwMaxHP[0]).toBe(100)
    expect(rt.rgwMaxHP[2]).toBe(115)
  })

  it('0x19 op2=0 且无上下文 → 警告跳过', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    const before = structuredClone(gs)
    expect(apply(gs, OP_INCREASE_PLAYER_ATTR, [7, 15, 0], undefined)).toBe(true)
    expect(gs).toEqual(before)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: increasePlayerAttr no role context')
  })

  it('0x1a op2≠0 → setPlayerStatRow 直写显式 role(非装备层)', () => {
    const gs = freshGs()
    expect(apply(gs, OP_SET_PLAYER_STAT, [6, 12, 4], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwLevel[3]).toBe(12)
  })

  it('0x1a 上下文 0xffff → 警告跳过', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwLevel[0] = 1
    expect(apply(gs, OP_SET_PLAYER_STAT, [6, 12, 0], 0xffff)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwLevel[0]).toBe(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('event-system: setPlayerStat no role context')
  })
})
describe('0x55/0x56 学/忘法术边界', () => {
  it('0x55:重复学术不占新槽;spellObjectId=0 no-op;满 32 槽 no-op', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const magic = gs.PlayerRolesRuntime.rgwMagic
    magic[0]![0] = 349
    expect(apply(gs, OP_ADD_MAGIC, [349, 0, 0], 0)).toBe(true)
    expect(magic[1]![0]).toBe(0)
    expect(apply(gs, OP_ADD_MAGIC, [0, 0, 0], 0)).toBe(true)
    expect(magic[1]![0]).toBe(0)
    for (let slot = 0; slot < 32; slot++) magic[slot]![0] = 300 + slot
    expect(apply(gs, OP_ADD_MAGIC, [999, 0, 0], 0)).toBe(true)
    expect(magic.map((row) => row[0])).toEqual(Array.from({ length: 32 }, (_, i) => 300 + i))
  })

  it('0x55:op1≠0 → 显式 role;role 越界 no-op', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    expect(apply(gs, OP_ADD_MAGIC, [349, 2, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwMagic[0]![1]).toBe(349)
    expect(gs.PlayerRolesRuntime.rgwMagic[0]![0]).toBe(0)
    expect(apply(gs, OP_ADD_MAGIC, [349, 9, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwMagic[1]![0]).toBe(0)
  })

  it('0x56:忘已学术清槽;未学/越界 no-op;op1≠0 显式 role', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const magic = gs.PlayerRolesRuntime.rgwMagic
    magic[3]![0] = 349
    expect(apply(gs, OP_REMOVE_MAGIC, [349, 0, 0], 0)).toBe(true)
    expect(magic[3]![0]).toBe(0)
    expect(apply(gs, OP_REMOVE_MAGIC, [999, 0, 0], 0)).toBe(true)
    expect(apply(gs, OP_REMOVE_MAGIC, [999, 9, 0], 0)).toBe(true)
    magic[2]![1] = 350
    expect(apply(gs, OP_REMOVE_MAGIC, [350, 2, 0], 0)).toBe(true)
    expect(magic[2]![1]).toBe(0)
  })
})
describe('家族归属', () => {
  it('非本族 opcode(0x01)→ false 交还调用方', () => {
    const gs = freshGs()
    expect(apply(gs, 0x01, [0, 0, 0], 0)).toBe(false)
  })
})
describe('角色域和数值边界', () => {
  it('0x19/0x1a op2=0 且有上下文 → 作用 currentEventObjectId', () => {
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwMaxHP[1] = 100
    expect(apply(gs, OP_INCREASE_PLAYER_ATTR, [7, 20, 0], 1)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwMaxHP[1]).toBe(120)
    gs.PlayerRolesRuntime.rgwLevel[2] = 3
    expect(apply(gs, OP_SET_PLAYER_STAT, [6, 8, 0], 2)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwLevel[2]).toBe(8)
  })

  it('0x55/0x56 显式 role 越界(op1-1 ≥ roleCount)→ no-op', () => {
    const gs = freshGs()
    expect(apply(gs, OP_ADD_MAGIC, [349, 0xff10, 0], 0)).toBe(true) // roleId=0xff0f 越界
    expect(gs.PlayerRolesRuntime.rgwMagic[0]![0]).toBe(0)
    expect(apply(gs, OP_REMOVE_MAGIC, [349, 0xff10, 0], 0)).toBe(true)
  })

  it('0x55 空 rgwMagic 表(roleCount=0)→ no-op 不炸', () => {
    const gs = freshGs()
    // 显式空表防御输入；正常hydrate会产生32个法术槽。
    gs.PlayerRolesRuntime.rgwMagic = []
    expect(apply(gs, OP_ADD_MAGIC, [349, 0, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwMagic).toEqual([])
  })

  it('0x8d 多级升级:保留六抽/级与精确成长;缺Exp行时仍能执行', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const rt = gs.PlayerRolesRuntime
    rt.rgwLevel[0] = 1
    rt.rgwFleeRate[0] = 5
    gs.Exp.rgPrimaryExp = [] // 显式损坏输入：只验证缺行防御，不冒称正常存档/剧情。
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(apply(gs, OP_INCREASE_PLAYER_LEVEL, [3, 0, 0], 0)).toBe(true)
    expect(rt.rgwLevel[0]).toBe(4)
    expect(rt.rgwFleeRate[0]).toBe(11) // +2/级,无随机
    expect([rt.rgwMaxHP[0], rt.rgwMaxMP[0]]).toEqual([130, 74])
    expect([
      rt.rgwAttackStrength[0],
      rt.rgwMagicStrength[0],
      rt.rgwDefense[0],
      rt.rgwDexterity[0],
    ]).toEqual([72, 52, 36, 36])
    expect(random).toHaveBeenCalledTimes(18)
  })
})
