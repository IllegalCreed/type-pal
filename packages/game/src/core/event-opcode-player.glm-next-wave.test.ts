/** GLM Wave I / I02 — event-opcode-player.ts 事件侧玩家族 opcode 未证公开合同
 * (生产冻结 ced193f4)。menu-driver.ts 侧无新增缺口:全部 dispatch* 叶子与 hub
 * (tickMenu → dispatchMenuInput)已被 menu-driver.test.ts / shop-menu.test.ts /
 * scene-system.test.ts(大世界快捷键)覆盖,登记 existing-proof。
 *
 * 旧证去重:本文件不重复 event-opcode-player.test.ts 已证的
 * 0x18 原位换装 / 0x1d / 0x29 抗性 / 0x8d 升级 / 0x55·0x56 单占槽 /
 * 0x2e 战斗保留族(no-op 代表 0x2a)与 event-system.test.ts 已证的
 * 0x19 / 0x1a / 0x1b / 0x22 / 0x23(全卸)/ 0x2f / 0x41 管线行为。
 * 本文件补齐同族其余成员的直接证据:
 *  - 0x2b OP_CURE_PLAYER_POISON_KIND / 0x2c OP_CURE_PLAYER_POISON_LEVEL(全仓旧测零覆盖)
 *  - 0x23 卸指定单槽(slotPlusOne≠0 分支;旧测只证 slotPlusOne=0 全卸)
 *  - 0x21 / 0x28 / 0x2e 战斗保留族 no-op(旧测只证 0x2a)
 *  - 0x18 非法槽(operands[0]∉[0x0b,0x10])→ 警告 + 零变异
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyPlayerOpcode,
  OP_CURE_PLAYER_POISON_KIND,
  OP_CURE_PLAYER_POISON_LEVEL,
  OP_DAMAGE_ENEMY,
  OP_EQUIP_ITEM,
  OP_POISON_ENEMY,
  OP_REMOVE_EQUIPMENT,
  OP_SET_ENEMY_STATUS,
  type PlayerOpcodeInput,
} from './event-opcode-player.js'
import { createInitialGameState } from './game-state.js'
import { addPoisonForPlayer, setObjectPoisons } from './player-poison-state.js'

const poisonRunner = (): number => 0

function input(
  gs: ReturnType<typeof createInitialGameState>,
  opcode: number,
  operands: [number, number, number],
  currentEventObjectId?: number,
): PlayerOpcodeInput {
  return { gs, opcode, operands, currentEventObjectId, runPlayerPoisonEntry: poisonRunner }
}

afterEach(() => {
  vi.restoreAllMocks()
  setObjectPoisons([])
})

describe('0x2b OP_CURE_PLAYER_POISON_KIND(事件侧解指定种毒)', () => {
  it('单体:只清该 role 的该种毒(wPoisonID→0),同 role 异种毒与异 role 同种毒原样保留', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [1, 2]
    setObjectPoisons([
      { id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 88, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    addPoisonForPlayer(gs, 1, 77)
    addPoisonForPlayer(gs, 1, 88)
    addPoisonForPlayer(gs, 2, 77)

    expect(applyPlayerOpcode(input(gs, OP_CURE_PLAYER_POISON_KIND, [0, 77, 0], 1))).toBe(true)

    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['1_1']).toEqual({ wPoisonID: 88, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['0_2']).toEqual({ wPoisonID: 77, wPoisonScript: 0 })
  })

  it('applyAll=1:全队该种毒清除,异种毒保留', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1]
    setObjectPoisons([
      { id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 88, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    addPoisonForPlayer(gs, 0, 77)
    addPoisonForPlayer(gs, 0, 88)
    addPoisonForPlayer(gs, 1, 77)

    expect(applyPlayerOpcode(input(gs, OP_CURE_PLAYER_POISON_KIND, [1, 77, 0]))).toBe(true)

    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 88, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
  })
})

describe('0x2c OP_CURE_PLAYER_POISON_LEVEL(事件侧按等级解毒)', () => {
  it('level≤上限的毒清除;level 99 装备伪毒保留(sdlpal global.c:1669 同源真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    setObjectPoisons([
      { id: 77, level: 2, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 88, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    addPoisonForPlayer(gs, 0, 77) // slot 0
    addPoisonForPlayer(gs, 0, 88) // slot 1

    expect(applyPlayerOpcode(input(gs, OP_CURE_PLAYER_POISON_LEVEL, [0, 3, 0], 0))).toBe(true)

    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(gs.rgPoisonStatus['1_0']).toEqual({ wPoisonID: 88, wPoisonScript: 0 })
  })
})

describe('战斗保留族(0x21/0x28/0x2e):事件侧消费为 no-op、归战斗侧所有', () => {
  it.each([
    ['OP_DAMAGE_ENEMY 0x21', OP_DAMAGE_ENEMY],
    ['OP_POISON_ENEMY 0x28', OP_POISON_ENEMY],
    ['OP_SET_ENEMY_STATUS 0x2e', OP_SET_ENEMY_STATUS],
  ])('%s 返回 true 且 gs 零变异(与旧证 0x2a 合成完整家族)', (_name, opcode) => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const before = structuredClone(gs)
    expect(applyPlayerOpcode(input(gs, opcode, [1, 2, 3], 0))).toBe(true)
    expect(gs).toEqual(before)
  })
})

describe('0x23 OP_REMOVE_EQUIPMENT 卸指定单槽(slotPlusOne≠0 分支)', () => {
  it('只卸 roleId 指定槽:该槽归零 + 背包 +1,其余槽与异 role 槽不动', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwEquipment[0]![0] = 111 // 邻槽哨兵(role0 头部)
    gs.PlayerRolesRuntime.rgwEquipment[2]![0] = 150 // 目标槽(role0 身体)
    gs.PlayerRolesRuntime.rgwEquipment[2]![1] = 151 // 同槽异 role 哨兵
    gs.inventory = [{ itemId: 200, count: 2 }]

    expect(applyPlayerOpcode(input(gs, OP_REMOVE_EQUIPMENT, [0, 3, 0]))).toBe(true)

    expect(gs.PlayerRolesRuntime.rgwEquipment[0]?.[0]).toBe(111)
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]?.[0]).toBe(0)
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]?.[1]).toBe(151)
    expect(gs.inventory).toEqual([
      { itemId: 200, count: 2 },
      { itemId: 150, count: 1 },
    ])
  })
})

describe('0x18 OP_EQUIP_ITEM 非法槽边界', () => {
  it('operands[0] 越出 [0x0b,0x10] → 警告 + gs 零变异(不写 iCurEquipPart / 背包 / 装备)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const low = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const lowBefore = structuredClone(low)
    expect(applyPlayerOpcode(input(low, OP_EQUIP_ITEM, [0x08, 200, 0], 0))).toBe(true)
    expect(low).toEqual(lowBefore)

    const high = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const highBefore = structuredClone(high)
    expect(applyPlayerOpcode(input(high, OP_EQUIP_ITEM, [0x11, 200, 0], 0))).toBe(true)
    expect(high).toEqual(highBefore)

    expect(warn).toHaveBeenCalledTimes(2)
  })
})
