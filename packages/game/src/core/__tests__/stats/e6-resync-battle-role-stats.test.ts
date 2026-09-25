/**
 * E6: resyncBattleRoleStatsFromRuntime 战内快照同步
 * 重点核验:
 * 1. 战内实时生命与真气 (role.hp, role.mp) 绝对不被 runtime base 覆盖抹杀 (核心不变量)
 * 2. 等级与最大生命/真气从 runtime 同步
 * 3. 攻/防/灵/身/逃/毒抗按有效属性 (base + 装备层) 完整更新至战斗快照
 * 4. 与旧 event-system 仅断言 maxHP/attack 的 opcode 测试形成直接隔离
 */
import { describe, expect, it } from 'vitest'
import {
  PLAYERROLES_ROW,
  resyncBattleRoleStatsFromRuntime,
  writeEquipmentEffectField,
} from '../../equip-effect.js'
import { makeFreshGameState, makePlayerRole } from './stats-test-fixtures.js'

describe('E6: 战斗角色快照回灌 resyncBattleRoleStatsFromRuntime', () => {
  it('E6-01 战内 live 当前生命与真气绝不被覆盖', () => {
    const gs = makeFreshGameState()
    const roleId = 0
    gs.PlayerRolesRuntime.rgwHP[roleId] = 100
    gs.PlayerRolesRuntime.rgwMP[roleId] = 50

    // 战斗内扣血后的角色快照
    const battleRole = makePlayerRole({
      id: roleId,
      hp: 15, // 战内被敌人打残剩余 15 点血
      mp: 3, // 战内施法消耗后仅剩 3 点真气
      maxHP: 100,
      maxMP: 50,
    })

    resyncBattleRoleStatsFromRuntime(battleRole, gs, roleId)

    // 核心断言: live hp/mp 保持受损状态，不被回灌覆盖
    expect(battleRole.hp).toBe(15)
    expect(battleRole.mp).toBe(3)
  })

  it('E6-02 完整同步等级、最大生命/真气与经装备修正的有效属性', () => {
    const gs = makeFreshGameState()
    const roleId = 1 // 赵灵儿: base Atk 25, Mag 40, Def 12, Dex 16, Flee 8, PoisonRes 10

    // 假定剧情提升了 runtime 的最大生命与属性
    gs.PlayerRolesRuntime.rgwLevel[roleId] = 20
    gs.PlayerRolesRuntime.rgwMaxHP[roleId] = 300
    gs.PlayerRolesRuntime.rgwMaxMP[roleId] = 250
    gs.PlayerRolesRuntime.rgwAttackStrength[roleId] = 80

    // 叠加装备效果 (如手持武器 +30 攻，Extra 槽 +10 防)
    writeEquipmentEffectField(gs, 3, PLAYERROLES_ROW.ATTACK_STRENGTH, roleId, 30)
    writeEquipmentEffectField(gs, 6, PLAYERROLES_ROW.DEFENSE, roleId, 10)

    const battleRole = makePlayerRole({
      id: roleId,
      level: 12,
      maxHP: 120,
      maxMP: 60,
      attackStrength: 25,
      defense: 12,
    })

    resyncBattleRoleStatsFromRuntime(battleRole, gs, roleId)

    expect(battleRole.level).toBe(20)
    expect(battleRole.maxHP).toBe(300)
    expect(battleRole.maxMP).toBe(250)
    expect(battleRole.attackStrength).toBe(80 + 30) // base 80 + 装备 30
    expect(battleRole.defense).toBe(12 + 10) // base 12 + Extra 槽 10
    expect(battleRole.magicStrength).toBe(40)
    expect(battleRole.dexterity).toBe(16)
    expect(battleRole.fleeRate).toBe(8)
    expect(battleRole.poisonResistance).toBe(10)
  })
})
