/**
 * Won-screen assembly and input/time boundaries through the real battle host.
 * TS ignores pressed keys on each screen's first tick; SDLPal clears keys when entering
 * PAL_WaitForAnyKey. These are distinct timing models, not a frame-for-frame equivalence claim.
 */
import { describe, expect, it } from 'vitest'
import { settlementScreenTimeoutMs } from './battle-settlement.js'
import {
  CONFIRM_INPUT,
  enterWonSettlement,
  HELD_CONFIRM_INPUT,
  IDLE_INPUT,
  MENU_INPUT,
  makeWonBattle,
} from './battle-settlement.test-fixtures.js'
import { tickBattle } from './battle-system.js'

describe('settlementScreenTimeoutMs(battle.c:1048/1218/1272/1324 PAL_WaitForAnyKey)', () => {
  it('exp 屏 boss 5500ms / 普通战 3000ms;升级/隐藏涨点/练成屏一律 3000ms', () => {
    const expBoss: Parameters<typeof settlementScreenTimeoutMs>[0] = {
      kind: 'exp-cash',
      expGained: 1,
      cashGained: 0,
      isBoss: true,
    }
    const expNormal: Parameters<typeof settlementScreenTimeoutMs>[0] = {
      kind: 'exp-cash',
      expGained: 1,
      cashGained: 0,
      isBoss: false,
    }
    expect(settlementScreenTimeoutMs(expBoss)).toBe(5500)
    expect(settlementScreenTimeoutMs(expNormal)).toBe(3000)
    expect(
      settlementScreenTimeoutMs({
        kind: 'level-up',
        data: {
          roleId: 0,
          name: '李逍遥',
          level: { old: 1, cur: 2 },
          hp: { old: 10, oldMax: 100, cur: 120, curMax: 120 },
          mp: { old: 5, oldMax: 20, cur: 25, curMax: 25 },
          attack: { old: 10, cur: 14 },
          magic: { old: 8, cur: 12 },
          defense: { old: 6, cur: 8 },
          dexterity: { old: 9, cur: 11 },
          flee: { old: 3, cur: 5 },
        },
      }),
    ).toBe(3000)
    expect(
      settlementScreenTimeoutMs({
        kind: 'hidden-exp-up',
        data: { roleId: 0, name: '李逍遥', statLabelWord: 49, delta: 1 },
      }),
    ).toBe(3000)
    expect(
      settlementScreenTimeoutMs({
        kind: 'learn-magic',
        data: { roleId: 0, name: '李逍遥', magicName: '天师符法' },
      }),
    ).toBe(3000)
  })
})

describe('won首tick的结算装配', () => {
  it('先回写战斗HP/MP再按存活角色入经验,未升级仅一屏且现金只入账一次', () => {
    const fixture = makeWonBattle({ partyMembers: [0, 1], expGained: 10 })
    fixture.playerRoles.roles[0]!.hp = 0
    fixture.playerRoles.roles[0]!.mp = 9
    fixture.playerRoles.roles[1]!.hp = 200
    fixture.playerRoles.roles[1]!.mp = 5
    const cashBefore = fixture.gs.dwCash
    const settlement = enterWonSettlement(fixture)
    expect(settlement).toEqual({
      screens: [{ kind: 'exp-cash', expGained: 10, cashGained: 50, isBoss: false }],
      index: 0,
      shownMs: 0,
    })
    expect(fixture.gs.PlayerRolesRuntime.rgwHP.slice(0, 2)).toEqual([0, 200])
    expect(fixture.gs.PlayerRolesRuntime.rgwMP.slice(0, 2)).toEqual([9, 5])
    expect(fixture.gs.PlayerRolesRuntime.rgwLevel.slice(0, 2)).toEqual([10, 10])
    expect([fixture.gs.Exp.rgPrimaryExp[0]!.wExp, fixture.gs.Exp.rgPrimaryExp[1]!.wExp]).toEqual([
      0, 10,
    ])
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.gs.dwCash).toBe(cashBefore + 50)
    expect(fixture.state.settlement).toBe(settlement)
  })

  it('按[1,0]队伍逐人排主升级/隐藏涨点/练成屏,名字与roleId匹配', () => {
    const fixture = makeWonBattle({
      partyMembers: [1, 0],
      expGained: 100,
      cashGained: 0,
      role: { level: 1, hp: 50, maxHP: 100, mp: 5, maxMP: 40 },
      levelUpMagic: [
        [
          { level: 2, magic: 349 },
          { level: 2, magic: 350 },
        ],
      ],
    })
    fixture.gs.Exp.rgPrimaryExp[0]!.wExp = 50
    fixture.gs.Exp.rgPrimaryExp[1]!.wExp = 50
    // battle.c:1238-1282:health权重2/3,100*2/3截断后再乘2=132;attack权重不足一次涨点。
    fixture.gs.Exp.rgHealthExp[1] = { wExp: 0, wLevel: 1, wCount: 2 }
    fixture.gs.Exp.rgAttackExp[1] = { wExp: 0, wLevel: 1, wCount: 1 }
    const screens = enterWonSettlement(fixture).screens
    expect(screens.map((screen) => screen.kind)).toEqual([
      'exp-cash',
      'level-up',
      'hidden-exp-up',
      'learn-magic',
      'level-up',
      'learn-magic',
    ])
    expect(screens[1]).toMatchObject({
      kind: 'level-up',
      data: {
        roleId: 1,
        name: 'Role1',
        level: { old: 1, cur: 2 },
        hp: { old: 50, oldMax: 100 },
      },
    })
    const levelUp = screens[1]
    if (levelUp?.kind !== 'level-up') expect.unreachable('missing role1 level-up')
    expect(levelUp.data.hp.curMax).toBeGreaterThan(100)
    expect(levelUp.data.hp.cur).toBe(levelUp.data.hp.curMax)
    expect(screens[2]).toEqual({
      kind: 'hidden-exp-up',
      data: {
        roleId: 1,
        name: 'Role1',
        statLabelWord: 49,
        delta: 1,
      },
    })
    expect(screens[3]).toEqual({
      kind: 'learn-magic',
      data: {
        roleId: 1,
        name: 'Role1',
        magicName: '五气朝元',
        magicId: 350,
      },
    })
    expect(screens[4]).toMatchObject({
      kind: 'level-up',
      data: { roleId: 0, name: 'Role0', level: { old: 1, cur: 2 } },
    })
    expect(screens[5]).toEqual({
      kind: 'learn-magic',
      data: { roleId: 0, name: 'Role0', magicName: '天师符法', magicId: 349 },
    })
  })
})

describe('逐屏输入与时间边界', () => {
  it('每屏首tick吞残键,长按不翻页,次tick可由非Confirm按键翻页', () => {
    const fixture = makeWonBattle({ levelUpMagic: [[{ level: 1, magic: 349 }]] })
    const settlement = enterWonSettlement(fixture)
    expect(settlement.screens.map((screen) => screen.kind)).toEqual(['exp-cash', 'learn-magic'])
    tickBattle(fixture.gs, CONFIRM_INPUT, fixture.bus)
    expect(settlement.index).toBe(0)
    tickBattle(fixture.gs, HELD_CONFIRM_INPUT, fixture.bus)
    expect(settlement.index).toBe(0)
    tickBattle(fixture.gs, MENU_INPUT, fixture.bus)
    expect([settlement.index, settlement.shownMs]).toEqual([1, 0])
    tickBattle(fixture.gs, CONFIRM_INPUT, fixture.bus)
    expect(settlement.index).toBe(1)
    tickBattle(fixture.gs, CONFIRM_INPUT, fixture.bus)
    expect([settlement.index, settlement.shownMs]).toEqual([2, 0])
  })

  it.each([
    { isBoss: false, beforeTicks: 74, shownMs: 2960 },
    { isBoss: true, beforeTicks: 137, shownMs: 5480 },
  ])('isBoss=$isBoss:超时前一tick不翻页,下一tick翻页并清stall', ({
    isBoss,
    beforeTicks,
    shownMs,
  }) => {
    const fixture = makeWonBattle({ isBoss })
    const settlement = enterWonSettlement(fixture)
    for (let i = 0; i < beforeTicks; i++) tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect([settlement.index, settlement.shownMs]).toEqual([0, shownMs])
    fixture.state.phaseStallTicks = 999
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect([settlement.index, settlement.shownMs, fixture.state.phaseStallTicks]).toEqual([1, 0, 0])
  })
})
