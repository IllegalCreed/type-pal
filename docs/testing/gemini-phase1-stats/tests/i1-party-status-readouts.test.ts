/**
 * I1: collectPartyStatusReadouts 队伍状态投影检查器
 * 重点核验:
 * 1. 队伍槽位 slot 与 roleId 的区分 (partyMembers [2, 0] 时映射正确角色数据)
 * 2. source: 'persistent' 大世界模式下状态读取 (读取 gs.rgPlayerStatus，确认 slow 不在持久态)
 * 3. 真实结构化隐藏经验 (hiddenExp) 包含当前 exp、升级阈值 next 与战中累计 gained
 * 4. 结构化中毒状态与标签 (collectPoisonStatusEntries 与 collectPoisonTags)
 */
import type { Item, ObjectPoisonView } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { collectPartyStatusReadouts } from '../../../../packages/game/src/core/inspect/battle-inspect.js'
import {
  makeFreshGameState,
  makeItem,
  makeObjectPoison,
  makePlayerRoles,
} from '../fixtures/stats-test-fixtures.js'

describe('I1: 队伍状态投影 collectPartyStatusReadouts', () => {
  it('I1-01 槽位 slot 与 roleId 严格分离，映射各自独立的数据', () => {
    const gs = makeFreshGameState()
    // 槽位 0 是角色 2 (林月如)，槽位 1 是角色 0 (李逍遥)
    gs.partyMembers = [2, 0]
    gs.mode = 'explore'

    const roles = makePlayerRoles()
    const readouts = collectPartyStatusReadouts(gs, roles)

    expect(readouts).toHaveLength(2)

    // 检查 slot 0
    expect(readouts[0]!.slot).toBe(0)
    expect(readouts[0]!.roleId).toBe(2)
    expect(readouts[0]!.roleName).toBe('林月如')
    expect(readouts[0]!.hp).toBe(gs.PlayerRolesRuntime.rgwHP[2])

    // 检查 slot 1
    expect(readouts[1]!.slot).toBe(1)
    expect(readouts[1]!.roleId).toBe(0)
    expect(readouts[1]!.roleName).toBe('李逍遥')
    expect(readouts[1]!.hp).toBe(gs.PlayerRolesRuntime.rgwHP[0])
  })

  it('I1-02 persistent 来源正确读取大世界 rgPlayerStatus 状态', () => {
    const gs = makeFreshGameState()
    gs.partyMembers = [0]
    gs.mode = 'explore'

    // 设置李逍遥的定(1)、速(7)、双攻(8)
    gs.rgPlayerStatus[0]![1] = 4 // 定 4 回合
    gs.rgPlayerStatus[0]![7] = 5 // 速 5 回合
    gs.rgPlayerStatus[0]![8] = 32760 // 双攻 永久

    const readouts = collectPartyStatusReadouts(gs, makePlayerRoles())
    expect(readouts[0]!.source).toBe('persistent')

    const statuses = readouts[0]!.statuses
    expect(statuses).toContainEqual({ name: '定', kind: 'debuff', rounds: 4 })
    expect(statuses).toContainEqual({ name: '速', kind: 'buff', rounds: 5 })
    expect(statuses).toContainEqual({ name: '双攻', kind: 'buff', rounds: 32760 })

    // slow (迟) 在大世界没有 persistentIndex，不能出现
    expect(statuses.some((s) => s.name === '迟')).toBe(false)
  })

  it('I1-03 完整解析五属性隐藏经验池与对应等级阈值', () => {
    const gs = makeFreshGameState()
    gs.partyMembers = [0]
    const roleId = 0

    // 填充武术与灵力暗经验
    gs.Exp.rgAttackExp = [{ wExp: 150, wLevel: 4, wCount: 8 }]
    gs.Exp.rgMagicPowerExp = [{ wExp: 80, wLevel: 2, wCount: 3 }]

    const levelUpExp = [0, 50, 100, 200, 400, 800]
    const readouts = collectPartyStatusReadouts(gs, makePlayerRoles(), [], [], levelUpExp)

    const hidden = readouts[0]!.hiddenExp
    const atkExp = hidden.find((h) => h.label === '武术')
    expect(atkExp).toEqual({
      label: '武术',
      cur: 150,
      next: 400, // levelUpExp[4]
      gained: 8,
    })

    const magExp = hidden.find((h) => h.label === '灵力')
    expect(magExp).toEqual({
      label: '灵力',
      cur: 80,
      next: 100, // levelUpExp[2]
      gained: 3,
    })
  })

  it('I1-04 结构化中毒 entries 与 statuses 标签解析', () => {
    const gs = makeFreshGameState()
    const roleId = 0
    gs.partyMembers = [roleId]

    // 注入毒槽数据
    gs.rgPoisonStatus[`0_${roleId}`] = { wPoisonID: 555, wPoisonScript: 1001 }

    const poisons: ObjectPoisonView[] = [makeObjectPoison({ id: 555, level: 2 })]
    const items: Item[] = [makeItem({ id: 555, _name: '断肠草' })]

    const readouts = collectPartyStatusReadouts(gs, makePlayerRoles(), poisons, items)
    expect(readouts[0]!.statuses).toContainEqual({ name: '断肠草', kind: 'poison' })
    expect(readouts[0]!.entries.some((e) => e.includes('断肠草#555 L2 script:1001'))).toBe(true)
  })
})
