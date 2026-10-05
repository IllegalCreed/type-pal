/**
 * TEST-GLM-GAME-PLAYER-OPCODE-RESIDUAL-1 — event-opcode-player.ts 残余玩家 opcode 合同。
 *
 * 公开 caller:applyPlayerOpcode(生产由 event-system applyRawOpcode 逐 case 调用);
 * 效果实观察走公开 getter getPlayerAttackStrength(equipment-state.ts)。
 * 全部输入由 createInitialGameState 公开字段构造,不 mock 业务核心、不强转、不 skip。
 *
 * 旧证去重(同 caller/同 oracle 只登记,不重复包装):
 * - 0x18 装备行/背包/wLastUnequippedItem/iCurEquipPart:event-opcode-player.test.ts +
 *   .cov85.test.ts + .glm-next-wave.test.ts + equip-effect.test.ts(runEquipScript 三测)+
 *   menu-driver.test.ts:340(菜单管线集成)——均未断言效果层;
 * - 0x23 全卸有物槽撤效果:event-system.test.ts:3008(管线级,slot0 有物);
 *   单槽卸下(slotPlusOne≠0)效果层:glm-next-wave 只证装备行+背包;
 *   空槽残留/全卸与单槽的不对称(sdlpal script.c:1104-1131 真值)零覆盖;
 * - 0x20 removeItem 装备槽补足撤效果(event-system.test.ts:3111、glm-event-contracts)
 *   是另一 opcode 的另一接线,不覆盖 0x18:96 / 0x23:221·227;
 * - e5-update-all-equipments(启动重建)、equip-effect.test.ts:195(直接调 helper)、
 *   e3-02(iCurEquipPart 路由在 setPlayerStatRow)均在 helper/其它 caller 层,非本文件接线;
 * - 0x1b applyAll 的 fScriptSuccess=anyChanged(cov85 r1)已证;0x1c/0x1d 的 applyAll 臂
 *   (sdlpal script.c:896-919/923-947:全队、死跳、不写 g_fScriptSuccess)零覆盖——
 *   旧测/magic-script.test.ts 全部是单体 [0,±n,0];
 * - 0x29 抗性 0/100 两端(cov85 r1/r3)已证;`roll <= resist` 的等值边界(:244)未证。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlayerAttackStrength, PLAYERROLES_ROW } from './equipment-state.js'
import {
  applyPlayerOpcode,
  OP_EQUIP_ITEM,
  OP_INCREASE_HP_MP,
  OP_INCREASE_MP,
  OP_POISON_PLAYER,
  OP_REMOVE_EQUIPMENT,
  OP_SET_PLAYER_EXTRA_ATTR,
  type PlayerOpcodeInput,
} from './event-opcode-player.js'
import { createInitialGameState } from './game-state.js'
import { isPlayerPoisoned, setObjectPoisons } from './player-poison-state.js'

const poisonRunner = vi.fn(() => 0)

function apply(
  gs: ReturnType<typeof createInitialGameState>,
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

describe('0x18/0x23 装备效果层撤除接线(event-opcode-player.ts:96/221/227)', () => {
  it('0x18 换装先撤旧部位效果层(script.c:768-775):0x17 种入的加成清 0,有效攻击回落 base', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const base = getPlayerAttackStrength(gs, 0)
    // 合法种入:0x17 正是 scriptOnEquip 写装备加成的生产路径(part3=Hand,row17=攻击)
    expect(
      apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0b + 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 12], 0),
    ).toBe(true)
    expect(getPlayerAttackStrength(gs, 0)).toBe(base + 12) // 种入生效
    gs.PlayerRolesRuntime.rgwEquipment[3]![0] = 100 // 旧武器
    gs.inventory = [{ itemId: 163, count: 1 }] // 新武器(唯一实例 → 原位换)

    expect(apply(gs, OP_EQUIP_ITEM, [0x0b + 3, 163, 0], 0)).toBe(true)

    expect(gs.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0) // 效果层撤
    expect(getPlayerAttackStrength(gs, 0)).toBe(base) // 有效值回落
    expect(gs.PlayerRolesRuntime.rgwEquipment[3]![0]).toBe(163) // 换上
    expect(gs.inventory).toEqual([{ itemId: 100, count: 1 }]) // 旧物原位顶替
  })

  it('0x23 单槽卸下:有物槽撤效果层;空槽残留不动(itemId!==0 守卫两侧,script.c:1122-1131)', () => {
    // 有物槽:效果层随卸下清 0
    const equipped = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(
      apply(equipped, OP_SET_PLAYER_EXTRA_ATTR, [0x0b + 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 9], 0),
    ).toBe(true)
    equipped.PlayerRolesRuntime.rgwEquipment[3]![0] = 163
    expect(apply(equipped, OP_REMOVE_EQUIPMENT, [0, 4, 0])).toBe(true) // slotPlusOne=4 → Hand
    expect(equipped.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(0) // 撤
    expect(equipped.PlayerRolesRuntime.rgwEquipment[3]![0]).toBe(0)
    expect(equipped.inventory).toEqual([{ itemId: 163, count: 1 }]) // 回包

    // 空槽:残留效果保留(与全卸臂不对称,sdlpal 单槽分支只在有物时撤)
    const empty = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(
      apply(empty, OP_SET_PLAYER_EXTRA_ATTR, [0x0b + 3, PLAYERROLES_ROW.ATTACK_STRENGTH, 9], 0),
    ).toBe(true)
    expect(apply(empty, OP_REMOVE_EQUIPMENT, [0, 4, 0])).toBe(true)
    expect(empty.rgEquipmentEffect[3]!.rgwAttackStrength[0]).toBe(9) // 残留不动
    expect(empty.inventory).toEqual([]) // 无物回包
  })

  it('0x23 全卸无条件清每个部位效果层,含无物槽残留(script.c:1112-1121 循环臂)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 无物槽(part2)残留 —— 变身/洗点脚本 0x17 直写效果层、不挂装备的真实形态
    expect(
      apply(gs, OP_SET_PLAYER_EXTRA_ATTR, [0x0b + 2, PLAYERROLES_ROW.ATTACK_STRENGTH, 30], 0),
    ).toBe(true)
    expect(gs.rgEquipmentEffect[2]!.rgwAttackStrength[0]).toBe(30)

    expect(apply(gs, OP_REMOVE_EQUIPMENT, [0, 0, 0])).toBe(true) // 全卸

    expect(gs.rgEquipmentEffect[2]!.rgwAttackStrength[0]).toBe(0) // 残留被清
    expect(gs.inventory).toEqual([]) // 全身无物,零回包
  })
})

describe('0x1c/0x1d applyAll 全队臂(script.c:896-919/923-947)', () => {
  it('0x1c 全队 MP:活人改动+钳制、死人跳过,fScriptSuccess 不被写(与 0x1b applyAll 相异)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
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
    gs.fScriptSuccess = true // 哨兵:applyAll 臂不写该标志

    expect(apply(gs, OP_INCREASE_MP, [1, 20, 0], 0)).toBe(true)

    expect([rt.rgwMP[0], rt.rgwMP[1], rt.rgwMP[2]]).toEqual([7, 45, 45]) // 死跳/钳顶/满不动
    expect([rt.rgwHP[0], rt.rgwHP[1], rt.rgwHP[2]]).toEqual([0, 10, 10]) // HP 不动
    expect(gs.fScriptSuccess).toBe(true) // role2 零改也不置 false

    // 再跑一次:活人全满 → 全队零改,applyAll 臂仍不写标志(script.c:896-919 无该写入)
    expect(apply(gs, OP_INCREASE_MP, [1, 20, 0], 0)).toBe(true)
    expect([rt.rgwMP[0], rt.rgwMP[1], rt.rgwMP[2]]).toEqual([7, 45, 45])
    expect(gs.fScriptSuccess).toBe(true)
  })

  it('0x1d 全队 HP+MP 双轨:死人两轨都跳,活人双加,fScriptSuccess 不被写', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
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
    gs.fScriptSuccess = true

    expect(apply(gs, OP_INCREASE_HP_MP, [1, 15, 0], 0)).toBe(true)

    expect([rt.rgwHP[0], rt.rgwMP[0]]).toEqual([0, 4]) // 死人两轨原样
    expect([rt.rgwHP[1], rt.rgwMP[1]]).toEqual([45, 25]) // 活人双加
    expect(gs.fScriptSuccess).toBe(true)

    // 活人顶满后再跑:全队零改,applyAll 臂仍不写标志(script.c:923-947 无该写入)
    rt.rgwHP[1] = 100
    rt.rgwMP[1] = 40
    expect(apply(gs, OP_INCREASE_HP_MP, [1, 15, 0], 0)).toBe(true)
    expect([rt.rgwHP[0], rt.rgwMP[0]]).toEqual([0, 4])
    expect(gs.fScriptSuccess).toBe(true)
  })
})

describe('0x29 抗性等值边界(event-opcode-player.ts:244)', () => {
  it('roll==resist → 抗性方胜(<=inclusive):50 掷对 50 抗被挡,51 掷命中', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    gs.PlayerRolesRuntime.rgwPoisonResistance[0] = 50
    setObjectPoisons([{ id: 77, level: 2, color: 0, playerScript: 11, enemyScript: 0 }])
    const random = vi.spyOn(Math, 'random')
    random.mockReturnValueOnce(0.49) // floor(49)+1 = 50;50<=50 → 挡
    expect(apply(gs, OP_POISON_PLAYER, [0, 77, 0], 0)).toBe(true)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(false)
    expect(poisonRunner).not.toHaveBeenCalled()

    random.mockReturnValueOnce(0.5) // floor(50)+1 = 51;51>50 → 中
    expect(apply(gs, OP_POISON_PLAYER, [0, 77, 0], 0)).toBe(true)
    expect(isPlayerPoisoned(gs, 0, 77)).toBe(true)
    expect(poisonRunner).toHaveBeenCalledWith(gs, 0, 11)
  })
})
