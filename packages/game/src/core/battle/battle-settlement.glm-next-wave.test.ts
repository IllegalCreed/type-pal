/**
 * 结算装配与逐tick生命周期。数值公式由progression专测负责,这里核实际caller接线。
 * SDLPal battle.c:991-1373定义屏序/脚本/恢复;play.c:603-639进入等键时清键。
 * TS首tick不收pressed是残键防护策略,不是C逐帧时序的直接等价。
 */
import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { runScript } from '../event-system.js'
import {
  type BattleLifecycleFixtureOptions,
  createBattleLifecycleFixture,
} from './battle-lifecycle.test-fixtures.js'
import { getBattleResources, setBattleRunScript } from './battle-runtime-context.js'
import { settlementScreenTimeoutMs, tickBattleSettlement } from './battle-settlement.js'
import { tickBattle } from './battle-system.js'

const NO_KEY: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
const CONFIRM: InputSnapshot = { held: new Set(), pressed: new Set(['Confirm']), frameNum: 0 }
const HELD: InputSnapshot = { held: new Set(['Confirm']), pressed: new Set(), frameNum: 0 }
const MENU: InputSnapshot = { held: new Set(), pressed: new Set(['Menu']), frameNum: 0 }

function wonFixture(options: BattleLifecycleFixtureOptions = {}) {
  const fixture = createBattleLifecycleFixture({ ...options, enemyIds: [100] })
  // 单敌全灭/淡出完成后的明确快照;奖励与该敌资源相同,不冒充实际打完整场。
  fixture.state.phase = 'won'
  fixture.state.enemies[0]!.e.health = 0
  fixture.state.enemies[0]!.defeated = true
  fixture.state.expGained = options.expGained ?? 1
  fixture.state.cashGained = options.cashGained ?? 50
  return fixture
}

function enterSettlement(fixture: ReturnType<typeof wonFixture>) {
  tickBattle(fixture.gs, NO_KEY, fixture.bus)
  const settlement = fixture.state.settlement
  if (!settlement) throw new Error('won host tick must build settlement')
  return settlement
}

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
    const f = wonFixture({ partyMembers: [0, 1], expGained: 10 })
    f.playerRoles.roles[0]!.hp = 0
    f.playerRoles.roles[0]!.mp = 9
    f.playerRoles.roles[1]!.hp = 200
    f.playerRoles.roles[1]!.mp = 5
    const cashBefore = f.gs.dwCash
    const s = enterSettlement(f)
    expect(s).toEqual({
      screens: [{ kind: 'exp-cash', expGained: 10, cashGained: 50, isBoss: false }],
      index: 0,
      shownMs: 0,
    })
    expect(f.gs.PlayerRolesRuntime.rgwHP.slice(0, 2)).toEqual([0, 200])
    expect(f.gs.PlayerRolesRuntime.rgwMP.slice(0, 2)).toEqual([9, 5])
    expect(f.gs.PlayerRolesRuntime.rgwLevel.slice(0, 2)).toEqual([10, 10])
    expect([f.gs.Exp.rgPrimaryExp[0]!.wExp, f.gs.Exp.rgPrimaryExp[1]!.wExp]).toEqual([0, 10])
    tickBattle(f.gs, NO_KEY, f.bus)
    expect(f.gs.dwCash).toBe(cashBefore + 50)
    expect(f.state.settlement).toBe(s)
  })

  it('按[1,0]队伍逐人排主升级/隐藏涨点/练成屏,名字与roleId匹配', () => {
    const f = wonFixture({
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
    f.gs.Exp.rgPrimaryExp[0]!.wExp = 50
    f.gs.Exp.rgPrimaryExp[1]!.wExp = 50
    // battle.c:1238-1282:health权重2/3,100*2/3截断后再乘2=132;attack权重不足一次涨点。
    f.gs.Exp.rgHealthExp[1] = { wExp: 0, wLevel: 1, wCount: 2 }
    f.gs.Exp.rgAttackExp[1] = { wExp: 0, wLevel: 1, wCount: 1 }
    const screens = enterSettlement(f).screens
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
      },
    })
    expect(screens[4]).toMatchObject({
      kind: 'level-up',
      data: { roleId: 0, name: 'Role0', level: { old: 1, cur: 2 } },
    })
    expect(screens[5]).toEqual({
      kind: 'learn-magic',
      data: { roleId: 0, name: 'Role0', magicName: '天师符法' },
    })
  })
})

describe('逐屏输入与时间边界', () => {
  it('每屏首tick吞残键,长按不翻页,次tick可由非Confirm按键翻页', () => {
    const f = wonFixture({ levelUpMagic: [[{ level: 1, magic: 349 }]] })
    const s = enterSettlement(f)
    expect(s.screens.map((screen) => screen.kind)).toEqual(['exp-cash', 'learn-magic'])
    tickBattle(f.gs, CONFIRM, f.bus)
    expect(s.index).toBe(0)
    tickBattle(f.gs, HELD, f.bus)
    expect(s.index).toBe(0)
    tickBattle(f.gs, MENU, f.bus)
    expect([s.index, s.shownMs]).toEqual([1, 0])
    tickBattle(f.gs, CONFIRM, f.bus)
    expect(s.index).toBe(1)
    tickBattle(f.gs, CONFIRM, f.bus)
    expect([s.index, s.shownMs]).toEqual([2, 0])
  })

  it.each([
    { isBoss: false, beforeTicks: 74, shownMs: 2960 },
    { isBoss: true, beforeTicks: 137, shownMs: 5480 },
  ])('isBoss=$isBoss:超时前一tick不翻页,下一tick翻页并清stall', ({
    isBoss,
    beforeTicks,
    shownMs,
  }) => {
    const f = wonFixture({ isBoss })
    const s = enterSettlement(f)
    for (let i = 0; i < beforeTicks; i++) tickBattle(f.gs, NO_KEY, f.bus)
    expect([s.index, s.shownMs]).toEqual([0, shownMs])
    f.state.phaseStallTicks = 999
    tickBattle(f.gs, NO_KEY, f.bus)
    expect([s.index, s.shownMs, f.state.phaseStallTicks]).toEqual([1, 0, 0])
  })
})

describe('Phase E→对话→恢复与释放', () => {
  it('真实战后脚本仅执行一次,队列转active box后仍hold,关框后才半恢复/释放', () => {
    const f = wonFixture({
      scriptOnBattleEnd: 1,
      expGained: 0,
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x33, operands: [0, 0, 0] },
        { op: 'showDialog', messageIndex: 0, text: '战利品到手' },
        { op: 'end', advance: true },
      ],
    })
    const s = enterSettlement(f)
    expect(s.screens).toEqual([])
    tickBattle(f.gs, NO_KEY, f.bus)
    expect([
      s.postBattleScriptsDone,
      f.gs.wCollectValue,
      f.state.enemies[0]!.scriptOnBattleEnd,
    ]).toEqual([true, 7, 1])
    expect(f.state.battleDialogQueue).toHaveLength(1)
    expect(f.gs.PlayerRolesRuntime.rgwHP[0]).toBe(300)
    // 直接调用公开hold核队列守卫;随后由真实宿主把队列转成active box。
    expect(tickBattleSettlement(f.state, f.gs, NO_KEY, f.resources, f.bus)).toBe(true)
    expect(f.state.battleDialogQueue).toHaveLength(1)
    tickBattle(f.gs, NO_KEY, f.bus)
    expect(f.state.battleDialogQueue).toHaveLength(0)
    expect(f.gs.dialogBox?.currentLineText).toBe('战利品到手')
    expect(tickBattleSettlement(f.state, f.gs, NO_KEY, f.resources, f.bus)).toBe(true)
    expect(f.gs.PlayerRolesRuntime.rgwHP[0]).toBe(300)
    expect(f.gs.battleState).toBe(f.state)
    expect(getBattleResources(f.gs)).toBe(f.resources)
    tickBattle(f.gs, CONFIRM, f.bus) // skip-typing
    tickBattle(f.gs, NO_KEY, f.bus) // line-done→waiting-end-key
    tickBattle(f.gs, CONFIRM, f.bus) // dialog-end消费按键,这一tick仍hold
    expect(f.gs.dialogBox).toBeUndefined()
    expect(f.gs.mode).toBe('battle')
    tickBattle(f.gs, NO_KEY, f.bus)
    expect(f.gs.wCollectValue).toBe(7)
    expect([f.gs.PlayerRolesRuntime.rgwHP[0], f.gs.PlayerRolesRuntime.rgwMP[0]]).toEqual([400, 25])
    expect(f.gs.mode).toBe('explore')
    expect(f.gs.battleState).toBeUndefined()
    expect(getBattleResources(f.gs)).toBeUndefined()
    expect(f.gs.fAutoBattle).toBe(false)
  })

  it('无对话时脚本观察到未恢复的HP/MP,返回后才恢复和释放', () => {
    const f = wonFixture({
      scriptOnBattleEnd: 1,
      expGained: 0,
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x33, operands: [0, 0, 0] }, { op: 'end' }],
    })
    const atScript: number[][] = []
    // 公开runner端口的透传观察器:业务仍执行真实runScript与opcode,不替换核心oracle。
    setBattleRunScript(f.gs, (options) => {
      atScript.push([f.gs.PlayerRolesRuntime.rgwHP[0]!, f.gs.PlayerRolesRuntime.rgwMP[0]!])
      return runScript(options)
    })
    enterSettlement(f)
    f.state.phaseStallTicks = 999
    tickBattle(f.gs, NO_KEY, f.bus)
    expect(atScript).toEqual([[300, 10]])
    expect(f.gs.wCollectValue).toBe(7)
    expect([
      f.gs.PlayerRolesRuntime.rgwHP[0],
      f.gs.PlayerRolesRuntime.rgwMP[0],
      f.state.phaseStallTicks,
    ]).toEqual([400, 25, 0])
    expect(f.gs.mode).toBe('explore')
    expect(f.gs.battleState).toBeUndefined()
    expect(f.gs.fAutoBattle).toBe(false)
  })
})

describe('原盘战后掉落分支与特殊非胜利接回', () => {
  it.each([
    { roll: 21, sample: 0.2, count: 1 },
    { roll: 22, sample: 0.21, count: 0 },
  ])('黑毛球战后0x06:roll=$roll,掉落$count棵止血草,分支只执行一次', ({ sample, count }) => {
    // SSS原盘41017–41021的同一leaf,仅搬到ip1;跳转0仍保留L_0。
    // C的RandomLong(1,100)>=22跳走;这里只控制其TS实际宿主Math.random,不mock解释器。
    const random = vi.spyOn(Math, 'random').mockReturnValue(sample)
    try {
      const f = wonFixture({
        expGained: 0,
        cashGained: 0,
        scriptOnBattleEnd: 1,
        commands: [
          { op: 'end', label: 'L_0' },
          { op: 'raw', opcode: 6, operands: [22, 0, 0] },
          { op: 'giveItem', itemId: 99, count: 0 },
          { op: 'setDialogStyleNarration' },
          { op: 'showDialog', messageIndex: 13117, text: '获得一棵止血草' },
          { op: 'end' },
        ],
      })
      enterSettlement(f)
      tickBattle(f.gs, NO_KEY, f.bus)
      expect(f.gs.inventory.find((i) => i.itemId === 99)?.count ?? 0).toBe(count)
      if (count === 1) {
        expect(f.gs.mode).toBe('battle')
        tickBattle(f.gs, NO_KEY, f.bus)
        expect(f.gs.dialogBox).toMatchObject({
          style: 'narration',
          currentLineText: '获得一棵止血草',
        })
        tickBattle(f.gs, CONFIRM, f.bus)
        tickBattle(f.gs, NO_KEY, f.bus)
      } else {
        expect(f.state.battleDialogQueue ?? []).toEqual([])
        expect(f.gs.dialogBox).toBeUndefined()
      }
      expect(random).toHaveBeenCalledTimes(1)
      expect(f.gs.inventory.find((i) => i.itemId === 99)?.count ?? 0).toBe(count)
      expect(f.gs.battleState).toBeUndefined()
      expect(f.gs.mode).toBe('explore')
    } finally {
      random.mockRestore()
    }
  })

  it.each([
    { result: 0, resumeIp: 5 },
    { result: 1, resumeIp: 6 },
    { result: 0xffff, resumeIp: 7 },
  ])('0x89 result=$result不跑战后掉落/半恢复,接回ip$resumeIp', ({ result, resumeIp }) => {
    // 当前原盘四处0x89只有result0;1/FFFF是C和typed opcode结果域,不声称剧情可达。
    const f = createBattleLifecycleFixture({
      scriptOnTurnStart: 1,
      scriptOnBattleEnd: 3,
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x89, operands: [result, 0, 0] },
        { op: 'end' },
        { op: 'giveItem', itemId: 104, count: 0 },
        { op: 'end' },
        { op: 'end' },
        { op: 'end' },
        { op: 'end' },
      ],
    })
    f.gs.postBattleResume = {
      wonIp: 5,
      lostIp: 6,
      fledIp: 7,
      commands: f.resources.commands,
      currentEventObjectId: 7,
      triggerOwnerId: 7,
    }
    tickBattle(f.gs, NO_KEY, f.bus) // preBattle→selectAction
    tickBattle(f.gs, NO_KEY, f.bus) // 真实turn-start runner执行0x89
    tickBattle(f.gs, NO_KEY, f.bus) // 实际终态route→cleanup→resume
    expect(f.gs.inventory).toEqual([])
    expect([f.gs.PlayerRolesRuntime.rgwHP[0], f.gs.PlayerRolesRuntime.rgwMP[0]]).toEqual([300, 10])
    expect(f.gs.eventCursor).toMatchObject({
      ip: resumeIp,
      currentEventObjectId: 7,
      triggerOwnerId: 7,
    })
    expect(f.gs.eventCursor?.commands).toBe(f.resources.commands)
    expect(f.gs.postBattleResume).toBeUndefined()
    expect(f.gs.mode).toBe('event')
    expect(f.gs.battleState).toBeUndefined()
    expect(getBattleResources(f.gs)).toBeUndefined()
  })
})
