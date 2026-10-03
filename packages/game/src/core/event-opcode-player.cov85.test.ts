/**
 * TEST-COVERAGE85-GLM-GAME-1 — event-opcode-player.ts 事件侧玩家族 opcode 分支合同。
 *
 * 公开 caller:applyPlayerOpcode(生产由 event-system applyRawOpcode 逐 case 调用)。
 * 全部输入由 createInitialGameState 公开字段构造,不 mock 业务核心、不强转。
 * 旧证去重:不重复 event-opcode-player.test.ts / .glm-next-wave.test.ts 已证的
 * 0x18 原位换装 / 0x18 非法槽 / 0x1b·0x1d 单体加血管线 / 0x23 单槽有物卸下 /
 * 0x2b·0x2c 解毒 / 0x29 单体抗性 / 0x8d 正常升级 / 0x55·0x56 单占槽。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { freshGs } from '../__tests__/coverage85-glm-game/harness.js'
import {
  applyPlayerOpcode,
  OP_ADD_MAGIC,
  OP_EQUIP_ITEM,
  OP_INCREASE_HP,
  OP_INCREASE_HP_MP,
  OP_INCREASE_MP,
  OP_INCREASE_PLAYER_ATTR,
  OP_INCREASE_PLAYER_LEVEL,
  OP_POISON_PLAYER,
  OP_REMOVE_EQUIPMENT,
  OP_REMOVE_MAGIC,
  OP_REMOVE_PLAYER_STATUS,
  OP_REVIVE_PLAYER,
  OP_SET_PLAYER_EXTRA_ATTR,
  OP_SET_PLAYER_STAT,
  OP_SET_PLAYER_STATUS,
  type PlayerOpcodeInput,
} from './event-opcode-player.js'
import { addPoisonForPlayer, isPlayerPoisoned, setObjectPoisons } from './player-poison-state.js'

const poisonRunner = vi.fn(() => 7)

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
    runPlayerPoisonEntry: poisonRunner,
  }
  return applyPlayerOpcode(input)
}

afterEach(() => {
  vi.restoreAllMocks()
  poisonRunner.mockClear()
  setObjectPoisons([])
})

describe('cov85 0x8d OP_INCREASE_PLAYER_LEVEL 守卫与封顶', () => {
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
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('未知 role(数组外下标)→ 警告跳过不炸', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    expect(apply(gs, OP_INCREASE_PLAYER_LEVEL, [1, 0, 0], 9)).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('level 封顶 99;stat 封顶 999;Exp 主行 wExp 清 0 且 wLevel 同步新等级', () => {
    const gs = freshGs()
    gs.partyMembers = [1]
    const rt = gs.PlayerRolesRuntime
    rt.rgwLevel[1] = 98
    rt.rgwMaxHP[1] = 998
    rt.rgwMaxMP[1] = 999
    gs.Exp.rgPrimaryExp[1]!.wExp = 1234
    expect(apply(gs, OP_INCREASE_PLAYER_LEVEL, [5, 0, 0], 1)).toBe(true)
    expect(rt.rgwLevel[1]).toBe(99)
    expect(rt.rgwMaxHP[1]).toBe(999)
    expect(rt.rgwMaxMP[1]).toBe(999)
    expect(gs.Exp.rgPrimaryExp[1]!.wExp).toBe(0)
    expect(gs.Exp.rgPrimaryExp[1]!.wLevel).toBe(99)
  })
})

describe('cov85 0x17 OP_SET_PLAYER_EXTRA_ATTR 装备效果层直写', () => {
  it('无 role 上下文 → 警告且装备效果层零变异', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    expect(apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0c, 6, 3], undefined)).toBe(true)
    expect(gs.rgEquipmentEffect.map((e) => e.rgwLevel[1])).toEqual(
      gs.rgEquipmentEffect.map(() => 0),
    )
    expect(warn).toHaveBeenCalledTimes(1)
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

describe('cov85 0x18 OP_EQUIP_ITEM 装备交换分支', () => {
  it('无 role 上下文 → 警告跳过,装备与背包零变异', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const gs = freshGs()
    gs.inventory = [{ itemId: 30, count: 2 }]
    expect(apply(gs, OP_EQUIP_ITEM, [0x0b, 30, 0], undefined)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(0)
    expect(gs.inventory).toEqual([{ itemId: 30, count: 2 }])
    expect(warn).toHaveBeenCalledTimes(1)
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

  it('同物重装(oldItem===newItem)→ 装备层与背包均不变', () => {
    const gs = freshGs()
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 30
    gs.inventory = [{ itemId: 30, count: 1 }]
    expect(apply(gs, OP_EQUIP_ITEM, [0x0b, 30, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[0]![0]).toBe(30)
    expect(gs.inventory).toEqual([{ itemId: 30, count: 1 }])
  })
})

describe('cov85 0x19/0x1a 显式 role 操作数', () => {
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
    expect(apply(gs, OP_INCREASE_PLAYER_ATTR, [7, 15, 0], undefined)).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
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
  })
})

describe('cov85 0x1b/0x1c/0x1d fScriptSuccess 语义', () => {
  it('0x1b applyAll:任一队员真改 → true;全员满血零改 → false', () => {
    const gs = freshGs()
    gs.partyMembers = [0, 1]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 50
    rt.rgwMaxHP[0] = 100
    rt.rgwHP[1] = 100
    rt.rgwMaxHP[1] = 100
    expect(apply(gs, OP_INCREASE_HP, [1, 20, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(true)
    expect([rt.rgwHP[0], rt.rgwHP[1]]).toEqual([70, 100])
    // 全满零改(role0 回满)
    rt.rgwHP[0] = 100
    expect(apply(gs, OP_INCREASE_HP, [1, 20, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(false)
    expect([rt.rgwHP[0], rt.rgwHP[1]]).toEqual([100, 100])
  })

  it('0x1c 单体无改动(已满 MP)→ fScriptSuccess=false;有改动保持 true', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 10 // 活人(死人不被治疗是 0x1d 组的合同)
    rt.rgwMP[0] = 40
    rt.rgwMaxMP[0] = 40
    expect(apply(gs, OP_INCREASE_MP, [0, 5, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(false)
    rt.rgwMP[0] = 10
    gs.fScriptSuccess = true // 该 opcode 只清不置:成功语义 = 不被清
    expect(apply(gs, OP_INCREASE_MP, [0, 5, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(true)
    expect(rt.rgwMP[0]).toBe(15)
  })

  it('0x1d 单体无改动 → false;死人(hp=0)不被治疗', () => {
    const gs = freshGs()
    gs.partyMembers = [0, 1]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 0
    rt.rgwMaxHP[0] = 100
    rt.rgwMP[0] = 0
    rt.rgwMaxMP[0] = 40
    expect(apply(gs, OP_INCREASE_HP_MP, [0, 30, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(false)
    expect([rt.rgwHP[0], rt.rgwMP[0]]).toEqual([0, 0])
  })
})

describe('cov85 0x22 OP_REVIVE_PLAYER 复活分支', () => {
  it('applyAll:只复活 hp=0 者(比例恢复+清≤3 级毒+清≤999 状态),活人不动,fScriptSuccess=revivedAny', () => {
    const gs = freshGs()
    gs.partyMembers = [0, 1]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 0
    rt.rgwMaxHP[0] = 100
    rt.rgwHP[1] = 80
    rt.rgwMaxHP[1] = 100
    gs.rgPlayerStatus[0]![5] = 9 // 好状态(bravery)复活时一并清(<=999)
    gs.rgPlayerStatus[0]![4] = 32760 // 装备态(>999)不清
    setObjectPoisons([
      { id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 88, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    addPoisonForPlayer(gs, 0, 77)
    addPoisonForPlayer(gs, 0, 88) // level 99 装备伪毒不清(curePlayerPoisonByLevel(3))
    gs.fScriptSuccess = true
    expect(apply(gs, OP_REVIVE_PLAYER, [1, 5, 0], 0)).toBe(true)
    expect(rt.rgwHP[0]).toBe(50)
    expect(rt.rgwHP[1]).toBe(80)
    expect(gs.rgPlayerStatus[0]![5]).toBe(0)
    expect(gs.rgPlayerStatus[0]![4]).toBe(32760)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(false)
    expect(isPlayerPoisoned(gs, 0, 88)).toBe(true)
    expect(gs.fScriptSuccess).toBe(true)
    // 再跑一次:全员活着 → revivedAny=false
    expect(apply(gs, OP_REVIVE_PLAYER, [1, 5, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(false)
  })

  it('单体复活活人 → fScriptSuccess=false;无上下文单体 → 空目标集零变异', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 10
    rt.rgwMaxHP[0] = 100
    expect(apply(gs, OP_REVIVE_PLAYER, [0, 5, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(false)
    expect(rt.rgwHP[0]).toBe(10)
    rt.rgwHP[0] = 0
    expect(apply(gs, OP_REVIVE_PLAYER, [0, 5, 0], undefined)).toBe(true)
    expect(gs.fScriptSuccess).toBe(false)
    expect(rt.rgwHP[0]).toBe(0)
  })
})

describe('cov85 0x23 OP_REMOVE_EQUIPMENT 空槽分支', () => {
  it('指定单槽为空 → 背包与装备层零变异', () => {
    const gs = freshGs()
    gs.inventory = [{ itemId: 30, count: 3 }]
    expect(apply(gs, OP_REMOVE_EQUIPMENT, [0, 2, 0], 0)).toBe(true)
    expect(gs.PlayerRolesRuntime.rgwEquipment[1]![0]).toBe(0)
    expect(gs.inventory).toEqual([{ itemId: 30, count: 3 }])
  })
})

describe('cov85 0x29 OP_POISON_PLAYER applyAll 与空目标', () => {
  it('op0≠0 全队:0 抗必中(入口脚本跑一次)、100 抗必不中', () => {
    const gs = freshGs()
    gs.partyMembers = [0, 1]
    const rt = gs.PlayerRolesRuntime
    rt.rgwPoisonResistance[0] = 0
    rt.rgwPoisonResistance[1] = 100
    setObjectPoisons([{ id: 77, level: 2, color: 0, playerScript: 11, enemyScript: 0 }])
    expect(apply(gs, OP_POISON_PLAYER, [1, 77, 0], 0)).toBe(true)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(true)
    expect(isPlayerPoisoned(gs, 1, 77)).toBe(false)
    expect(poisonRunner).toHaveBeenCalledTimes(1)
    expect(poisonRunner).toHaveBeenCalledWith(gs, 0, 11)
  })

  it('op0=0 且无上下文 → 空目标集,毒槽零变异', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    expect(apply(gs, OP_POISON_PLAYER, [0, 77, 0], undefined)).toBe(true)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(false)
    expect(poisonRunner).not.toHaveBeenCalled()
  })
})

describe('cov85 0x2d OP_SET_PLAYER_STATUS 状态分支', () => {
  it('statusId 越界(≥行宽)→ 跳过不炸;无上下文 → 全队为目标', () => {
    const gs = freshGs()
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwHP[0] = 10
    gs.PlayerRolesRuntime.rgwHP[1] = 10
    expect(apply(gs, OP_SET_PLAYER_STATUS, [9, 3, 0], undefined)).toBe(true)
    expect(apply(gs, OP_SET_PLAYER_STATUS, [5, 3, 0], undefined)).toBe(true)
    expect(gs.rgPlayerStatus[0]![5]).toBe(3)
    expect(gs.rgPlayerStatus[1]![5]).toBe(3)
  })

  it('坏状态(≤3)已有(≠0)不刷新,为 0 才写', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    gs.rgPlayerStatus[0]![2] = 5
    expect(apply(gs, OP_SET_PLAYER_STATUS, [2, 3, 0], 0)).toBe(true)
    expect(gs.rgPlayerStatus[0]![2]).toBe(5)
    gs.rgPlayerStatus[0]![3] = 0
    expect(apply(gs, OP_SET_PLAYER_STATUS, [3, 4, 0], 0)).toBe(true)
    expect(gs.rgPlayerStatus[0]![3]).toBe(4)
  })

  it('傀儡(4):死人取更大 rounds;活人 → fScriptSuccess=false', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 0
    gs.rgPlayerStatus[0]![4] = 2
    expect(apply(gs, OP_SET_PLAYER_STATUS, [4, 5, 0], 0)).toBe(true)
    expect(gs.rgPlayerStatus[0]![4]).toBe(5)
    rt.rgwHP[0] = 30
    gs.fScriptSuccess = true
    expect(apply(gs, OP_SET_PLAYER_STATUS, [4, 5, 0], 0)).toBe(true)
    expect(gs.fScriptSuccess).toBe(false)
    expect(gs.rgPlayerStatus[0]![4]).toBe(5)
  })

  it('好状态(>4):死人不动;活人 rounds 更大才覆盖,更小保持', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 0
    expect(apply(gs, OP_SET_PLAYER_STATUS, [7, 5, 0], 0)).toBe(true)
    expect(gs.rgPlayerStatus[0]![7]).toBe(0)
    rt.rgwHP[0] = 50
    gs.rgPlayerStatus[0]![7] = 4
    expect(apply(gs, OP_SET_PLAYER_STATUS, [7, 2, 0], 0)).toBe(true)
    expect(gs.rgPlayerStatus[0]![7]).toBe(4)
    expect(apply(gs, OP_SET_PLAYER_STATUS, [7, 9, 0], 0)).toBe(true)
    expect(gs.rgPlayerStatus[0]![7]).toBe(9)
  })
})

describe('cov85 0x2f OP_REMOVE_PLAYER_STATUS 边界', () => {
  it('>999 装备态不清;≤999 清 0;越界下标不炸', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    gs.rgPlayerStatus[0]![5] = 32760
    gs.rgPlayerStatus[0]![6] = 8
    expect(apply(gs, OP_REMOVE_PLAYER_STATUS, [5, 0, 0], 0)).toBe(true)
    expect(apply(gs, OP_REMOVE_PLAYER_STATUS, [6, 0, 0], 0)).toBe(true)
    expect(apply(gs, OP_REMOVE_PLAYER_STATUS, [11, 0, 0], 0)).toBe(true)
    expect(gs.rgPlayerStatus[0]![5]).toBe(32760)
    expect(gs.rgPlayerStatus[0]![6]).toBe(0)
  })
})

describe('cov85 0x55/0x56 学/忘法术边界', () => {
  it('0x55:重复学术不占新槽;spellObjectId=0 no-op;满 32 槽 no-op', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const magic = gs.PlayerRolesRuntime.rgwMagic
    magic[0]![0] = 349
    expect(apply(gs, OP_ADD_MAGIC, [349, 0, 0], 0)).toBe(true)
    expect(magic[1]![0]).toBe(0)
    expect(apply(gs, OP_ADD_MAGIC, [0, 0, 0], 0)).toBe(true)
    expect(magic[1]![0]).toBe(0)
    for (let slot = 0; slot < 32; slot++) magic[slot]![0] = 100 + slot
    expect(apply(gs, OP_ADD_MAGIC, [999, 0, 0], 0)).toBe(true)
    expect(magic.map((row) => row[0])).toEqual(Array.from({ length: 32 }, (_, i) => 100 + i))
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

describe('cov85 家族归属', () => {
  it('非本族 opcode(0x01)→ false 交还调用方', () => {
    const gs = freshGs()
    expect(apply(gs, 0x01, [0, 0, 0], 0)).toBe(false)
  })
})
