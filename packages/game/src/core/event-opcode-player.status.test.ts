/** Player opcode dispatch: HP/MP success, revival, poison and status duration rules. Entry callback is a port; poison owner remains real. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPlayerOpcode,
  OP_INCREASE_HP,
  OP_INCREASE_HP_MP,
  OP_INCREASE_MP,
  OP_POISON_PLAYER,
  OP_REMOVE_PLAYER_STATUS,
  OP_REVIVE_PLAYER,
  OP_SET_PLAYER_STATUS,
  type PlayerOpcodeInput,
} from './event-opcode-player.js'
import { freshPlayerOpcodeState as freshGs } from './event-opcode-player.test-fixtures.js'
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
describe('0x1b/0x1c/0x1d fScriptSuccess 语义', () => {
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
describe('0x22 OP_REVIVE_PLAYER 复活分支', () => {
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
describe('0x29 OP_POISON_PLAYER applyAll 与空目标', () => {
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
describe('0x2d OP_SET_PLAYER_STATUS 状态分支', () => {
  it('statusId 越界(≥行宽)→ 跳过不炸;无上下文 → 全队为目标', () => {
    const gs = freshGs()
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwHP[0] = 10
    gs.PlayerRolesRuntime.rgwHP[1] = 10
    const before = structuredClone(gs.rgPlayerStatus)
    expect(apply(gs, OP_SET_PLAYER_STATUS, [9, 3, 0], undefined)).toBe(true)
    expect(gs.rgPlayerStatus).toEqual(before)
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

  it('傀儡:死人取更大 rounds;活人 → fScriptSuccess=false', () => {
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
describe('0x2f OP_REMOVE_PLAYER_STATUS 边界', () => {
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
describe('恢复与状态边界', () => {
  it('0x22 单体 ctx=0xffff → 空目标集零变异', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 0
    rt.rgwMaxHP[0] = 100
    expect(apply(gs, OP_REVIVE_PLAYER, [0, 5, 0], 0xffff)).toBe(true)
    expect(rt.rgwHP[0]).toBe(0)
    expect(gs.fScriptSuccess).toBe(false)
  })

  it('0x29 单体 ctx 命中 + 100 抗必不中(236-247 单体臂)', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 100
    setObjectPoisons([{ id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 }])
    expect(apply(gs, OP_POISON_PLAYER, [0, 77, 0], 0)).toBe(true)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(false)
  })

  it('0x2d/0x2f ctx=0xffff → 全队为目标', () => {
    const gs = freshGs()
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwHP[0] = 10
    gs.PlayerRolesRuntime.rgwHP[1] = 10
    expect(apply(gs, OP_SET_PLAYER_STATUS, [5, 2, 0], 0xffff)).toBe(true)
    expect([gs.rgPlayerStatus[0]![5], gs.rgPlayerStatus[1]![5]]).toEqual([2, 2])
    expect(apply(gs, OP_REMOVE_PLAYER_STATUS, [5, 0, 0], 0xffff)).toBe(true)
    expect([gs.rgPlayerStatus[0]![5], gs.rgPlayerStatus[1]![5]]).toEqual([0, 0])
  })

  it('0x1d HP/MP 各自钳 max 双向', () => {
    const gs = freshGs()
    gs.partyMembers = [0]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 95
    rt.rgwMaxHP[0] = 100
    rt.rgwMP[0] = 38
    rt.rgwMaxMP[0] = 40
    expect(apply(gs, OP_INCREASE_HP_MP, [0, 20, 0], 0)).toBe(true)
    expect([rt.rgwHP[0], rt.rgwMP[0]]).toEqual([100, 40]) // 双双钳顶
    expect(apply(gs, OP_INCREASE_HP_MP, [0, 0xff38, 0], 0)).toBe(true) // -200
    expect([rt.rgwHP[0], rt.rgwMP[0]]).toEqual([0, 0]) // 双双钳底
  })
})
