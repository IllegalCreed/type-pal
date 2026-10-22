/**
 * CODE79中毒门及GAME-BATTLE-ITEM-ROLE-CONTEXT-1的目标角色合同。
 * 物品/脚本来自WIN95 SSS.MKF；原四例见raw79.json，新目标/全体/升级见物品上下文证据。
 * 保留原始全局脚本下标；只填本合同可达片段，其余 end 不代表完整原盘脚本执行。
 */
import type { Command, Item } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { makeBattle, makeRole } from '../../../__tests__/coverage85-glm-game/harness.js'
import { getPlayerPoisonResistance } from '../../equipment-state.js'
import { runScript } from '../../event-system.js'
import { setObjectPoisons } from '../../player-poison-state.js'
import { createBattleLifecycleFixture } from '../battle-lifecycle.test-fixtures.js'
import { performItem } from './item.js'

const flags: Item['flags'] = {
  usable: true,
  equipable: false,
  throwable: false,
  consuming: true,
  applyToAll: false,
  sellable: true,
  equipableBy: [false, false, false, false, false, false],
}
const items: Item[] = [
  {
    id: 62,
    bitmap: 221,
    price: 2000,
    scriptOnUse: 39554,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 40524,
    flags: { ...flags, applyToAll: true },
  },
  {
    id: 84,
    bitmap: 28,
    price: 12,
    scriptOnUse: 39536,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 40485,
    flags: { ...flags, throwable: true },
  },
  {
    id: 150,
    bitmap: 121,
    price: 9000,
    scriptOnUse: 39561,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 40537,
    flags,
  },
  {
    id: 136,
    bitmap: 174,
    price: 1100,
    scriptOnUse: 39502,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 40459,
    flags,
  },
  {
    id: 278,
    bitmap: 215,
    price: 2000,
    scriptOnUse: 39765,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 40611,
    flags,
  },
]
const commands: Command[] = Array.from({ length: 39768 }, () => ({ op: 'end' }))
commands[39536] = { op: 'raw', opcode: 0x17, operands: [17, 22, 30] }
commands[39554] = { op: 'raw', opcode: 0x1b, operands: [1, 300, 0] }
commands[39561] = { op: 'raw', opcode: 0x8d, operands: [1, 0, 0] }
commands[39502] = { op: 'raw', opcode: 0x61, operands: [39505, 0, 0] }
commands[39503] = { op: 'raw', opcode: 0x1b, operands: [0, 999, 0] }
commands[39505] = { op: 'raw', opcode: 0x5f, operands: [0, 0, 0] }
commands[39765] = { op: 'raw', opcode: 0x61, operands: [39505, 0, 0] }
commands[39766] = { op: 'raw', opcode: 0x2c, operands: [0, 3, 0] }

function fixture(itemId: number) {
  const fx = makeBattle({
    roles: Array.from({ length: 6 }, (_, id) => makeRole(id, { hp: id === 4 ? 100 : 200 })),
    party: [4, 0],
  })
  fx.gs.mode = 'battle'
  fx.gs.inventory = [{ itemId, count: 2 }]
  // 引用生产注入 Owner；所有用例结束后清表，不污染其它模块。
  setObjectPoisons([
    { id: 551, level: 0, color: 16, playerScript: 40862, enemyScript: 40864 },
    { id: 552, level: 1, color: 64, playerScript: 40866, enemyScript: 40868 },
    { id: 555, level: 3, color: 128, playerScript: 40878, enemyScript: 40889 },
    { id: 561, level: 4, color: 0, playerScript: 0, enemyScript: 40917 },
    { id: 563, level: 99, color: 0, playerScript: 40860, enemyScript: 0 },
    { id: 564, level: 99, color: 0, playerScript: 40858, enemyScript: 0 },
  ])
  fx.gs.rgPoisonStatus = {
    '0_0': { wPoisonID: 563, wPoisonScript: 40861 },
    '1_0': { wPoisonID: 564, wPoisonScript: 40859 },
    '0_1': { wPoisonID: 552, wPoisonScript: 40866 },
  }
  return fx
}
function use(fx: ReturnType<typeof fixture>, itemId: number) {
  performItem({
    ...fx,
    casterIsEnemy: false,
    casterIdx: 1,
    targetIsEnemy: false,
    targetIdx: 0,
    itemId,
    items,
    commands,
    runScript,
  })
}

afterEach(() => setObjectPoisons([]))

describe('风险道具的战斗中毒门（CODE79）', () => {
  it.each([
    136, 278,
  ])('只有装备伪毒时，物品 %i 杀死目标角色而非中毒的施用者，仍消费一次', (itemId) => {
    const fx = fixture(itemId)
    const poisons = structuredClone(fx.gs.rgPoisonStatus)
    use(fx, itemId)
    expect(fx.playerRoles.roles.map((r) => r.hp)).toEqual([200, 200, 200, 200, 0, 200])
    expect(fx.gs.rgPoisonStatus).toEqual(poisons)
    expect(fx.gs.inventory).toEqual([{ itemId, count: 1 }])
  })

  it('九阴散接受 level0 真毒并回血；不冒称其同时解毒', () => {
    const fx = fixture(136)
    fx.gs.rgPoisonStatus['2_0'] = { wPoisonID: 551, wPoisonScript: 40862 }
    const poisons = structuredClone(fx.gs.rgPoisonStatus)
    use(fx, 136)
    expect(fx.playerRoles.roles.map((r) => r.hp)).toEqual([200, 200, 200, 200, 500, 200])
    expect(fx.gs.rgPoisonStatus).toEqual(poisons)
    expect(fx.gs.inventory).toEqual([{ itemId: 136, count: 1 }])
  })

  it('毒龙胆只清目标 level<=3 真毒，保留 level4、装备效果和施用者毒；不回血', () => {
    const fx = fixture(278)
    fx.gs.rgPoisonStatus['2_0'] = { wPoisonID: 555, wPoisonScript: 40878 }
    fx.gs.rgPoisonStatus['3_0'] = { wPoisonID: 561, wPoisonScript: 0 }
    use(fx, 278)
    expect(fx.playerRoles.roles.map((r) => r.hp)).toEqual([200, 200, 200, 200, 100, 200])
    expect(fx.gs.rgPoisonStatus).toEqual({
      '0_0': { wPoisonID: 563, wPoisonScript: 40861 },
      '1_0': { wPoisonID: 564, wPoisonScript: 40859 },
      '2_0': { wPoisonID: 0, wPoisonScript: 0 },
      '3_0': { wPoisonID: 561, wPoisonScript: 0 },
      '0_1': { wPoisonID: 552, wPoisonScript: 40866 },
    })
    expect(fx.gs.inventory).toEqual([{ itemId: 278, count: 1 }])
  })
})

describe('物品通用脚本的目标角色上下文', () => {
  it.each([
    { partyMembers: [0, 4], targetRole: 4 },
    { partyMembers: [4, 0], targetRole: 0 },
  ])('大蒜给选中的role$targetRole加毒抗，不写施用者或队伍槽号', ({ partyMembers, targetRole }) => {
    const fx = createBattleLifecycleFixture({ partyMembers })
    fx.gs.inventory = [{ itemId: 84, count: 1 }]
    performItem({
      ...fx,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 84,
      targetIsEnemy: false,
      targetIdx: 1,
      items,
      commands,
      runScript,
    })
    expect(getPlayerPoisonResistance(fx.gs, targetRole)).toBe(30)
    expect(fx.gs.rgEquipmentEffect[6]!.rgwPoisonResistance).toEqual(
      targetRole === 4 ? [0, 0, 0, 0, 30, 0] : [30, 0, 0, 0, 0, 0],
    )
    expect(fx.gs.inventory).toEqual([{ itemId: 84, count: 0 }])
  })

  it('全体圣灵符传0xFFFF，真实解释器给两名队员恢复300HP并消费一次', () => {
    const fx = createBattleLifecycleFixture({ partyMembers: [4, 0], role: { hp: 100, maxHP: 500 } })
    fx.gs.inventory = [{ itemId: 62, count: 1 }]
    let scriptRole: number | undefined
    performItem({
      ...fx,
      casterIsEnemy: false,
      casterIdx: 0,
      itemId: 62,
      targetIsEnemy: false,
      targetIdx: 'all',
      items,
      commands,
      runScript: (options) => {
        scriptRole = options.eventObjectId
        return runScript(options)
      },
    })
    expect(fx.playerRoles.roles.map((role) => role.hp)).toEqual([400, 100, 100, 100, 400, 100])
    expect(fx.gs.inventory).toEqual([{ itemId: 62, count: 0 }])
    expect(scriptRole).toBe(0xffff)
  })

  it('金蚕王提升选中队员的等级并刷新战斗属性，保持战斗当前HP/MP', () => {
    const fx = createBattleLifecycleFixture({
      partyMembers: [4, 0],
      role: { level: 1, hp: 100, maxHP: 500, mp: 10, maxMP: 100 },
    })
    fx.gs.inventory = [{ itemId: 150, count: 1 }]
    performItem({
      ...fx,
      casterIsEnemy: false,
      casterIdx: 1,
      itemId: 150,
      targetIsEnemy: false,
      targetIdx: 0,
      items,
      commands,
      runScript,
    })
    const runtime = fx.gs.PlayerRolesRuntime
    expect(runtime.rgwLevel[4]).toBe(2)
    expect(runtime.rgwLevel[0]).toBe(1)
    expect(runtime.rgwMaxHP[4]).toBeGreaterThanOrEqual(510)
    expect(runtime.rgwMaxHP[4]).toBeLessThanOrEqual(517)
    expect(fx.playerRoles.roles[4]!.level).toBe(2)
    expect(fx.playerRoles.roles[4]!.maxHP).toBe(runtime.rgwMaxHP[4])
    expect(fx.playerRoles.roles[4]!.maxMP).toBe(runtime.rgwMaxMP[4])
    expect(fx.playerRoles.roles[4]!.hp).toBe(100)
    expect(fx.playerRoles.roles[4]!.mp).toBe(10)
    expect(fx.playerRoles.roles[0]!.level).toBe(1)
    expect(fx.gs.inventory).toEqual([{ itemId: 150, count: 0 }])
  })
})
