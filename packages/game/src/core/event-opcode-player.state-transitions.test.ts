/**
 * 玩家指令的状态转换边界：装备与效果层、毒槽、恢复成功标志及战斗族归属。
 * 直接调用生产 owner；角色基线已 hydrate，poisonEntry 只观察入口，不替换毒算法。
 * 与主测的单体成功路径、相邻分支专测保留不同输入域；不声称整个家族已穷尽。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlayerAttackStrength, PLAYERROLES_ROW } from './equipment-state.js'
import {
  applyPlayerOpcode,
  OP_CURE_PLAYER_POISON_KIND,
  OP_CURE_PLAYER_POISON_LEVEL,
  OP_DAMAGE_ENEMY,
  OP_EQUIP_ITEM,
  OP_INCREASE_HP_MP,
  OP_INCREASE_MP,
  OP_POISON_ENEMY,
  OP_POISON_PLAYER,
  OP_REMOVE_EQUIPMENT,
  OP_SET_ENEMY_STATUS,
  OP_SET_PLAYER_EXTRA_ATTR,
  type PlayerOpcodeInput,
} from './event-opcode-player.js'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { addPoisonForPlayer, isPlayerPoisoned, setObjectPoisons } from './player-poison-state.js'

const poisonEntry = vi.fn(() => 0)

function applyOpcode(
  gs: ReturnType<typeof freshPlayerOpcodeState>,
  opcode: number,
  operands: [number, number, number],
  currentEventObjectId?: number,
): boolean {
  const input: PlayerOpcodeInput = {
    gs,
    opcode,
    operands,
    currentEventObjectId,
    runPlayerPoisonEntry: poisonEntry,
  }
  return applyPlayerOpcode(input)
}

afterEach(() => {
  vi.restoreAllMocks()
  poisonEntry.mockClear()
  setObjectPoisons([])
})

describe('0x23 OP_REMOVE_EQUIPMENT 卸指定单槽(slotPlusOne≠0 分支)', () => {
  it('只卸 roleId 指定槽:该槽归零 + 背包 +1,其余槽与异 role 槽不动', () => {
    const gs = freshPlayerOpcodeState()
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 111 // 邻槽哨兵(role0 头部)
    gs.PlayerRolesRuntime.rgwEquipment[2]![0] = 150 // 目标槽(role0 身体)
    gs.PlayerRolesRuntime.rgwEquipment[2]![1] = 151 // 同槽异 role 哨兵
    gs.inventory = [{ itemId: 200, count: 2 }]

    expect(applyOpcode(gs, OP_REMOVE_EQUIPMENT, [0, 3, 0])).toBe(true)

    expect(gs.PlayerRolesRuntime.rgwEquipment[0]?.[0]).toBe(111)
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]?.[0]).toBe(0)
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]?.[1]).toBe(151)
    expect(gs.inventory).toEqual([
      { itemId: 200, count: 2 },
      { itemId: 150, count: 1 },
    ])
  })
})

describe('0x18/0x23 装备效果层撤除接线', () => {
  it('0x18 换装先撤旧部位效果层(script.c:768-775):0x17 种入的加成清 0,有效攻击回落 base', () => {
    const gs = freshPlayerOpcodeState()
    const base = getPlayerAttackStrength(gs, 0)
    // 合法种入:0x17 正是 scriptOnEquip 写装备加成的生产路径(part3=Hand,row17=攻击)
    expect(
      applyOpcode(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0b + 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 12], 0),
    ).toBe(true)
    expect(getPlayerAttackStrength(gs, 0)).toBe(base + 12) // 种入生效
    gs.PlayerRolesRuntime.rgwEquipment[3]![0] = 100 // 旧武器
    gs.inventory = [{ itemId: 163, count: 1 }] // 新武器(唯一实例 → 原位换)

    expect(applyOpcode(gs, OP_EQUIP_ITEM, [0x0b + 3, 163, 0], 0)).toBe(true)

    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0) // 效果层撤
    expect(getPlayerAttackStrength(gs, 0)).toBe(base) // 有效值回落
    expect(gs.PlayerRolesRuntime.rgwEquipment[3]![0]).toBe(163) // 换上
    expect(gs.inventory).toEqual([{ itemId: 100, count: 1 }]) // 旧物原位顶替
  })

  it('0x23 单槽卸下:有物槽撤效果层;空槽残留不动(itemId!==0 守卫两侧,script.c:1122-1131)', () => {
    // 有物槽:效果层随卸下清 0
    const equipped = freshPlayerOpcodeState()
    expect(
      applyOpcode(
        equipped,
        OP_SET_PLAYER_EXTRA_ATTR,
        [0x0b + 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 9],
        0,
      ),
    ).toBe(true)
    equipped.PlayerRolesRuntime.rgwEquipment[3]![0] = 163
    expect(applyOpcode(equipped, OP_REMOVE_EQUIPMENT, [0, 4, 0])).toBe(true) // slotPlusOne=4 → Hand
    expect(equipped.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0) // 撤
    expect(equipped.PlayerRolesRuntime.rgwEquipment[3]![0]).toBe(0)
    expect(equipped.inventory).toEqual([{ itemId: 163, count: 1 }]) // 回包

    // 空槽:残留效果保留(与全卸臂不对称,sdlpal 单槽分支只在有物时撤)
    const empty = freshPlayerOpcodeState()
    expect(
      applyOpcode(
        empty,
        OP_SET_PLAYER_EXTRA_ATTR,
        [0x0b + 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 9],
        0,
      ),
    ).toBe(true)
    expect(applyOpcode(empty, OP_REMOVE_EQUIPMENT, [0, 4, 0])).toBe(true)
    expect(empty.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(9) // 残留不动
    expect(empty.inventory).toEqual([]) // 无物回包
  })

  it('0x23 全卸无条件清每个部位效果层,含无物槽残留(script.c:1112-1121 循环臂)', () => {
    const gs = freshPlayerOpcodeState()
    // 用公开0x17准备无装备的效果层，核全卸分支；不声称原盘剧情会产生此组合。
    expect(
      applyOpcode(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0b + 2, PLAYERROLES_ROW.ATTACK_STRENGTH, 30], 0),
    ).toBe(true)
    expect(gs.rgEquipmentEffect[2]!.rgwAttackStrength[0]).toBe(30)

    expect(applyOpcode(gs, OP_REMOVE_EQUIPMENT, [0, 0, 0])).toBe(true) // 全卸

    expect(gs.rgEquipmentEffect[2]!.rgwAttackStrength[0]).toBe(0) // 残留被清
    expect(gs.inventory).toEqual([]) // 全身无物,零回包
  })
})

describe('0x18 OP_EQUIP_ITEM 非法槽边界', () => {
  it('operands[0] 越出 [0x0b,0x10] → 警告 + gs 零变异(不写 iCurEquipPart / 背包 / 装备)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const low = freshPlayerOpcodeState()
    const lowBefore = structuredClone(low)
    expect(applyOpcode(low, OP_EQUIP_ITEM, [0x08, 200, 0], 0)).toBe(true)
    expect(low).toEqual(lowBefore)

    const high = freshPlayerOpcodeState()
    const highBefore = structuredClone(high)
    expect(applyOpcode(high, OP_EQUIP_ITEM, [0x11, 200, 0], 0)).toBe(true)
    expect(high).toEqual(highBefore)

    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls).toEqual([
      ['event-system: equipItem invalid slot=-3(op[0]=8)'],
      ['event-system: equipItem invalid slot=6(op[0]=17)'],
    ])
  })
})

describe('0x2b OP_CURE_PLAYER_POISON_KIND(事件侧解指定种毒)', () => {
  it('单体:只清该 role 的该种毒(wPoisonID→0),同 role 异种毒与异 role 同种毒原样保留', () => {
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [1, 2]
    setObjectPoisons([
      { id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 88, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    addPoisonForPlayer(gs, 1, 77)
    addPoisonForPlayer(gs, 1, 88)
    addPoisonForPlayer(gs, 2, 77)

    expect(applyOpcode(gs, OP_CURE_PLAYER_POISON_KIND, [0, 77, 0], 1)).toBe(true)

    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 88, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 77, wPoisonScript: 0 })
  })

  it('applyAll=1:全队该种毒清除,异种毒保留', () => {
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [0, 1]
    setObjectPoisons([
      { id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 88, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    addPoisonForPlayer(gs, 0, 77)
    addPoisonForPlayer(gs, 0, 88)
    addPoisonForPlayer(gs, 1, 77)

    expect(applyOpcode(gs, OP_CURE_PLAYER_POISON_KIND, [1, 77, 0])).toBe(true)

    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 88, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
  })
})

describe('0x2c OP_CURE_PLAYER_POISON_LEVEL(事件侧按等级解毒)', () => {
  it('清除level≤3的毒,保留level 99装备毒(PAL_CurePoisonByLevel)', () => {
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [0]
    setObjectPoisons([
      { id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 88, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    addPoisonForPlayer(gs, 0, 77) // slot 0
    addPoisonForPlayer(gs, 0, 88) // slot 1

    expect(applyOpcode(gs, OP_CURE_PLAYER_POISON_LEVEL, [0, 3, 0], 0)).toBe(true)

    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 88, wPoisonScript: 0 })
  })
})

describe('0x29 抗性等值边界', () => {
  it('roll==resist → 抗性方胜(<=inclusive):50 掷对 50 抗被挡,51 掷命中', () => {
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 50
    setObjectPoisons([{ id: 77, level: 2, color: 0, playerScript: 11, enemyScript: 0 }])
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValueOnce(0.49) // floor(49)+1 = 50;50<=50 → 挡
    expect(applyOpcode(gs, OP_POISON_PLAYER, [0, 77, 0], 0)).toBe(true)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(false)
    expect(poisonEntry).not.toHaveBeenCalled()

    random.mockReturnValueOnce(0.5) // floor(50)+1 = 51;51>50 → 中
    expect(applyOpcode(gs, OP_POISON_PLAYER, [0, 77, 0], 0)).toBe(true)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(true)
    expect(poisonEntry).toHaveBeenCalledWith(gs, 0, 11)
  })
})

describe('0x1c/0x1d applyAll 全队臂(script.c:896-919/923-947)', () => {
  it('0x1c 全队 MP:活人改动+钳制、死人跳过,fScriptSuccess 不被写(与 0x1b applyAll 相异)', () => {
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [0, 1, 2]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 0 // 死人(global.c:1282 PAL_IncreaseHPMP 只处理活人)
    rt.rgwMP[0] = 7
    rt.rgwMaxMP[0] = 50
    rt.rgwHP[1] = 10
    rt.rgwMP[1] = 30
    rt.rgwMaxMP[1] = 45
    rt.rgwHP[2] = 10
    rt.rgwMP[2] = 45
    rt.rgwMaxMP[2] = 45 // 已满 → 钳制零改
    gs.fScriptSuccess = false // 先用 false，不能让“无条件写 true”冒充保留标志。

    expect(applyOpcode(gs, OP_INCREASE_MP, [1, 20, 0], 0)).toBe(true)

    expect([rt.rgwMP[0], rt.rgwMP[1], rt.rgwMP[2]]).toEqual([7, 45, 45]) // 死跳/钳顶/满不动
    expect([rt.rgwHP[0], rt.rgwHP[1], rt.rgwHP[2]]).toEqual([0, 10, 10]) // HP 不动
    expect(gs.fScriptSuccess).toBe(false)

    // 再跑一次:活人全满 → 全队零改,applyAll 臂仍不写标志(script.c:896-919 无该写入)
    gs.fScriptSuccess = true
    expect(applyOpcode(gs, OP_INCREASE_MP, [1, 20, 0], 0)).toBe(true)
    expect([rt.rgwMP[0], rt.rgwMP[1], rt.rgwMP[2]]).toEqual([7, 45, 45])
    expect(gs.fScriptSuccess).toBe(true)
  })

  it('0x1d 全队 HP+MP 双轨:死人两轨都跳,活人双加,fScriptSuccess 不被写', () => {
    const gs = freshPlayerOpcodeState()
    gs.partyMembers = [0, 1]
    const rt = gs.PlayerRolesRuntime
    rt.rgwHP[0] = 0
    rt.rgwMP[0] = 4
    rt.rgwMaxHP[0] = 100
    rt.rgwMaxMP[0] = 60
    rt.rgwHP[1] = 30
    rt.rgwMP[1] = 10
    rt.rgwMaxHP[1] = 100
    rt.rgwMaxMP[1] = 40
    gs.fScriptSuccess = false

    expect(applyOpcode(gs, OP_INCREASE_HP_MP, [1, 15, 0], 0)).toBe(true)

    expect([rt.rgwHP[0], rt.rgwMP[0]]).toEqual([0, 4]) // 死人两轨原样
    expect([rt.rgwHP[1], rt.rgwMP[1]]).toEqual([45, 25]) // 活人双加
    expect(gs.fScriptSuccess).toBe(false)

    // 活人顶满后再跑:全队零改,applyAll 臂仍不写标志(script.c:923-947 无该写入)
    rt.rgwHP[1] = 100
    rt.rgwMP[1] = 40
    gs.fScriptSuccess = true
    expect(applyOpcode(gs, OP_INCREASE_HP_MP, [1, 15, 0], 0)).toBe(true)
    expect([rt.rgwHP[0], rt.rgwMP[0]]).toEqual([0, 4])
    expect(gs.fScriptSuccess).toBe(true)
  })
})

describe('战斗保留族(0x21/0x28/0x2e):事件侧消费为 no-op、归战斗侧所有', () => {
  it.each([
    ['OP_DAMAGE_ENEMY 0x21', OP_DAMAGE_ENEMY],
    ['OP_POISON_ENEMY 0x28', OP_POISON_ENEMY],
    ['OP_SET_ENEMY_STATUS 0x2e', OP_SET_ENEMY_STATUS],
  ])('%s 返回 true 且 gs 零变异(与旧证 0x2a 合成完整家族)', (_name, opcode) => {
    const gs = freshPlayerOpcodeState()
    const before = structuredClone(gs)
    expect(applyOpcode(gs, opcode, [1, 2, 3], 0)).toBe(true)
    expect(gs).toEqual(before)
  })
})
