import type { PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeRoleRecord as makeRole } from '../../__tests__/battle-records.js'
import { createInitialGameState } from '../game-state.js'
import {
  inspectionNames,
  inspectionPoisons,
  makeBattleReadoutState,
  makeInspectionBattle,
  makeInspectionRoles,
  makeInspectionState,
  POISON_ID,
  ZERO_STATUS,
} from './__tests__/readout-fixture.js'
import { collectPartyStatusReadouts } from './battle-inspect.js'

const roleDefinitions: PlayerRoles = { roles: [makeRole(0, { _name: '李逍遥' })] }

describe('Party identity, persistent and battle projections', () => {
  it('重复角色队伍的只读快照按显示槽读取毒，不复用首个同角色槽', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [4, 5, 4]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 552, wPoisonScript: 0 }
    const rows = collectPartyStatusReadouts(gs, {
      roles: Array.from({ length: 6 }, (_, id) => makeRole(id)),
    })
    expect(rows.map((row) => row.statuses)).toEqual([[{ name: '毒#552', kind: 'poison' }], [], []])
    expect(rows.map((row) => row.entries)).toEqual([['毒槽0:#552'], [], []])
  })

  it('collectPartyStatusReadouts:名/来源/HP/抗性 + 结构化状态(纯中文名+类型)', () => {
    const readouts = collectPartyStatusReadouts(makeBattleReadoutState(), roleDefinitions)
    expect(readouts[0]!.roleName).toBe('李逍遥')
    expect(readouts[0]!.source).toBe('battle')
    expect(readouts[0]!.hp).toBe(100)
    expect(readouts[0]!.maxHp).toBe(120)
    expect(readouts[0]!.resistances.find((x) => x.label === '风')?.value).toBe(5)
    // statuses:中文名 + 类型 + 剩余回合(双攻=buff 32760>999=永久,眠=debuff 3);工具面板 chip 据此显示持续时间
    expect(readouts[0]!.statuses).toContainEqual({ name: '双攻', kind: 'buff', rounds: 32760 })
    expect(readouts[0]!.statuses).toContainEqual({ name: '眠', kind: 'debuff', rounds: 3 })
    // entries(dev 详细)仍含中英 + 回合
    expect(readouts[0]!.entries.some((e) => e.includes('双攻/dual'))).toBe(true)
    // 5 有效属性(含装备加成,无装备 → = base)+ 经验
    expect(readouts[0]!.attack).toBe(30)
    expect(readouts[0]!.magicPower).toBe(40)
    expect(readouts[0]!.defense).toBe(12)
    expect(readouts[0]!.dexterity).toBe(18)
    expect(readouts[0]!.fleeRate).toBe(7)
    expect(readouts[0]!.curExp).toBe(250)
    expect(readouts[0]!.nextExp).toBe(0) // 未传 levelUpExp → 0
    // 传 levelUpExp:nextExp = levelUpExp[level=10]
    const levelUp = Array.from({ length: 11 }, (_, i) => (i === 10 ? 5000 : 0))
    expect(
      collectPartyStatusReadouts(makeBattleReadoutState(), roleDefinitions, [], [], levelUp)[0]!
        .nextExp,
    ).toBe(5000)
    // 五属性隐藏经验：各池已显式初始化到等级10；经验/本场计数为0，阈值为5000。
    const hiddenExperience = collectPartyStatusReadouts(
      makeBattleReadoutState(),
      roleDefinitions,
      [],
      [],
      levelUp,
    )[0]!.hiddenExp
    expect(hiddenExperience.map((h) => h.label)).toEqual(['武术', '灵力', '防御', '身法', '吉运'])
    expect(hiddenExperience.every((h) => h.cur === 0 && h.gained === 0 && h.next === 5000)).toBe(
      true,
    )
  })

  it('persistent 来源：explore 下 rgPlayerStatus[role][idx] 计数 → 状态标签；slow 无持久位不出现', () => {
    const gs = makeInspectionState()
    gs.rgPlayerStatus[0]![2] = 5 // persistentIndex 2 = sleep
    const readouts = collectPartyStatusReadouts(gs, makeInspectionRoles())
    expect(readouts).toHaveLength(2)
    expect(readouts[0]!.source).toBe('persistent')
    expect(readouts[0]!.roleId).toBe(0)
    expect(readouts[0]!.statuses).toContainEqual({ name: '眠', kind: 'debuff', rounds: 5 })
    expect(readouts[0]!.statuses.some((s) => s.name === '迟')).toBe(false)
    // 未设状态的 slot 1 无 debuff/buff 标签
    expect(readouts[1]!.statuses).toEqual([])
  })

  it('rgPoisonStatus 毒条：知名毒 → 名#id + L级 + script；未知毒 → #id；毒ID 0 跳过', () => {
    const gs = makeInspectionState()
    gs.rgPoisonStatus['0_0'] = { wPoisonID: POISON_ID, wPoisonScript: 4242 }
    gs.rgPoisonStatus['1_0'] = { wPoisonID: 600, wPoisonScript: 0 }
    gs.rgPoisonStatus['2_0'] = { wPoisonID: 0, wPoisonScript: 0 } // 空槽
    const readouts = collectPartyStatusReadouts(
      gs,
      makeInspectionRoles(),
      inspectionPoisons,
      inspectionNames,
    )
    expect(readouts[0]!.entries).toContain('毒槽0:毒蛇卵#551 L3 script:4242')
    expect(readouts[0]!.entries).toContain('毒槽1:#600')
    expect(readouts[0]!.statuses).toContainEqual({ name: '毒蛇卵', kind: 'poison' })
    expect(readouts[0]!.statuses).toContainEqual({ name: '毒#600', kind: 'poison' })
    expect(readouts[0]!.statuses).toHaveLength(2)
  })

  it('battle players[slot].roleId 投影：显示身份按战斗槽而非 party 顺序；缺槽回退 persistent', () => {
    const battle = makeInspectionBattle(
      [{ roleId: 1, prevHp: 88, prevMp: 70, defending: false, status: { ...ZERO_STATUS } }],
      [],
      false,
    )
    const gs = makeInspectionState(battle)
    const readouts = collectPartyStatusReadouts(gs, makeInspectionRoles())
    expect(readouts[0]!.source).toBe('battle')
    expect(readouts[0]!.roleId).toBe(1) // 战斗槽 0 是灵儿 → 显示身份 roleId 1
    expect(readouts[0]!.roleName).toBe('赵灵儿')
    expect(readouts[0]!.hp).toBe(88)
    expect(readouts[1]!.source).toBe('persistent') // players[1] 缺 → 回退 party slot 1
    expect(readouts[1]!.roleId).toBe(1)
  })

  it('hiddenExp：cur/next/gained 按各自池（next 用池 wLevel 阈值），与主经验 nextExp 区分', () => {
    const gs = makeInspectionState()
    const levelUpExp = Array.from({ length: 12 }, (_, i) => i * 100)
    const readout = collectPartyStatusReadouts(gs, makeInspectionRoles(), [], [], levelUpExp)[0]!
    expect(readout.nextExp).toBe(1000) // levelUpExp[level=10]
    const attack = readout.hiddenExp.find((h) => h.label === '武术')!
    expect(attack.cur).toBe(40)
    expect(attack.gained).toBe(12)
    expect(attack.next).toBe(300) // levelUpExp[池 wLevel=3]
  })
})
