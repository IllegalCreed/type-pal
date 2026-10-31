/** Post-battle scripts, queued/active dialogue, runtime effects and final cleanup. */
import { describe, expect, it, vi } from 'vitest'
import { runScript } from '../event-system.js'
import { createBattleLifecycleFixture } from './battle-lifecycle.test-fixtures.js'
import { getBattleResources, setBattleRunScript } from './battle-runtime-context.js'
import { tickBattleSettlement } from './battle-settlement.js'
import {
  CONFIRM_INPUT,
  enterWonSettlement,
  IDLE_INPUT,
  makeWonBattle,
} from './battle-settlement.test-fixtures.js'
import { tickBattle } from './battle-system.js'

describe('Phase E→对话→恢复与释放', () => {
  it('逐敌提示结束后才入下一份掉落,跳过空槽,末条超时后才半恢复和释放', () => {
    const fixture = createBattleLifecycleFixture({
      enemyIds: [100, 0, 101],
      expGained: 0,
      cashGained: 0,
      scriptOnBattleEnd: 1,
      commands: [
        { op: 'end' },
        { op: 'giveItem', itemId: 104, count: 0 },
        { op: 'setDialogStyleNarration' },
        { op: 'showDialog', messageIndex: 13115, text: '捡到一颗鼠儿果' },
        { op: 'end' },
      ],
    })
    // 隔离双敌全灭边界,奖励与资源一致;脚本取原盘41008–41011的leaf,仅搬到ip1。
    // 中间0槽是startBattle保留的空占位,不能额外给物品或改变后敌的原槽顺序。
    fixture.state.phase = 'won'
    for (const enemy of fixture.state.enemies) {
      enemy.e.health = 0
      enemy.defeated = true
    }
    enterWonSettlement(fixture)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.gs.inventory).toEqual([{ itemId: 104, count: 1 }])
    expect(fixture.state.battleDialogQueue).toHaveLength(1)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.gs.dialogBox).toMatchObject({
      style: 'narration',
      currentLineText: '捡到一颗鼠儿果',
    })
    expect(fixture.state.battleDialogQueue).toHaveLength(0)
    expect(
      tickBattleSettlement(fixture.state, fixture.gs, IDLE_INPUT, fixture.resources, fixture.bus),
    ).toBe(true)
    expect(fixture.gs.inventory).toEqual([{ itemId: 104, count: 1 }])
    tickBattle(fixture.gs, CONFIRM_INPUT, fixture.bus)
    expect(fixture.gs.dialogBox).toBeUndefined()
    expect(fixture.gs.inventory).toEqual([{ itemId: 104, count: 1 }])
    expect(fixture.gs.mode).toBe('battle') // 关框按键由对话消费,本tick不执行下一敌。
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.gs.inventory).toEqual([{ itemId: 104, count: 2 }])
    expect(fixture.state.battleDialogQueue).toHaveLength(1)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    for (let i = 0; i < 34; i++) tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.gs.dialogBox?.currentLineText).toBe('捡到一颗鼠儿果')
    expect([
      fixture.gs.PlayerRolesRuntime.rgwHP[0],
      fixture.gs.PlayerRolesRuntime.rgwMP[0],
    ]).toEqual([300, 10])
    expect(getBattleResources(fixture.gs)).toBe(fixture.resources)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus) // 第35个40ms tick达1.4秒,无残键,可恢复和退出。
    expect(fixture.gs.inventory).toEqual([{ itemId: 104, count: 2 }])
    expect([
      fixture.gs.PlayerRolesRuntime.rgwHP[0],
      fixture.gs.PlayerRolesRuntime.rgwMP[0],
    ]).toEqual([400, 25])
    expect(fixture.gs.dialogBox).toBeUndefined()
    expect(fixture.gs.mode).toBe('explore')
    expect(fixture.gs.battleState).toBeUndefined()
    expect(getBattleResources(fixture.gs)).toBeUndefined()
    expect(fixture.gs.fAutoBattle).toBe(false)
  })

  it('战后脚本的HP/MP治疗保留到半恢复和退出', () => {
    const fixture = makeWonBattle({
      scriptOnBattleEnd: 1,
      expGained: 0,
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x1b, operands: [1, 300, 0] },
        { op: 'raw', opcode: 0x1c, operands: [1, 10, 0] },
        { op: 'end' },
      ],
    })
    // global.c:PAL_IncreaseHPMP与battle.c:PAL_BattleWon共用PlayerRoles。
    // 300HP补至500;10MP补至20后恢复缺口一半,得到30。fixture仅隔离合法战后边界。
    enterWonSettlement(fixture)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect([
      fixture.gs.PlayerRolesRuntime.rgwHP[0],
      fixture.gs.PlayerRolesRuntime.rgwMP[0],
    ]).toEqual([500, 30])
    expect(fixture.gs.mode).toBe('explore')
    expect(getBattleResources(fixture.gs)).toBeUndefined()
  })

  it('通用属性写入与战后治疗按指令顺序共用HP/MP,不以旧快照回填', () => {
    const fixture = makeWonBattle({
      scriptOnBattleEnd: 1,
      expGained: 0,
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x1a, operands: [9, 100, 1] },
        { op: 'raw', opcode: 0x1b, operands: [1, 50, 0] },
        { op: 'raw', opcode: 0x1c, operands: [1, 10, 0] },
        { op: 'raw', opcode: 0x1a, operands: [10, 6, 1] },
        { op: 'end' },
      ],
    })
    // script.c:0x1A的row9/10是HP/MP,op2=1明确选role0。
    // 同一状态应先100HP→150HP、10MP→20MP→6MP;半恢复后325HP/23MP。
    enterWonSettlement(fixture)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect([
      fixture.gs.PlayerRolesRuntime.rgwHP[0],
      fixture.gs.PlayerRolesRuntime.rgwMP[0],
    ]).toEqual([325, 23])
    expect(fixture.gs.mode).toBe('explore')
    expect(getBattleResources(fixture.gs)).toBeUndefined()
  })

  it('第二敌槽的通用HP/MP指令默认选role1,不按[1,0]队伍位置换人', () => {
    const fixture = createBattleLifecycleFixture({
      partyMembers: [1, 0],
      enemyIds: [100, 101],
      expGained: 0,
      cashGained: 0,
      scriptOnBattleEnd: 1,
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x1a, operands: [9, 100, 0] },
        { op: 'raw', opcode: 0x1a, operands: [10, 6, 0] },
        { op: 'end' },
      ],
    })
    // 明确的双敌全灭边界;只第二槽有战后脚本。C传敌槽1作为eventObjectID,
    // 0x1A的op2=0因此写role1,不是party[1]的role0。半恢复后各role常数见断言。
    fixture.state.phase = 'won'
    for (const enemy of fixture.state.enemies) {
      enemy.e.health = 0
      enemy.defeated = true
    }
    fixture.state.enemies[0]!.scriptOnBattleEnd = 0
    enterWonSettlement(fixture)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.gs.PlayerRolesRuntime.rgwHP.slice(0, 2)).toEqual([400, 300])
    expect(fixture.gs.PlayerRolesRuntime.rgwMP.slice(0, 2)).toEqual([25, 23])
    expect(fixture.gs.mode).toBe('explore')
    expect(getBattleResources(fixture.gs)).toBeUndefined()
  })

  it('真实战后脚本仅执行一次,队列转active box后仍hold,关框后才半恢复/释放', () => {
    const fixture = makeWonBattle({
      scriptOnBattleEnd: 1,
      expGained: 0,
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x33, operands: [0, 0, 0] },
        { op: 'showDialog', messageIndex: 0, text: '战利品到手' },
        { op: 'end', advance: true },
      ],
    })
    const settlement = enterWonSettlement(fixture)
    expect(settlement.screens).toEqual([])
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect([
      settlement.postBattleScriptsDone,
      fixture.gs.wCollectValue,
      fixture.state.enemies[0]!.scriptOnBattleEnd,
    ]).toEqual([true, 7, 1])
    expect(fixture.state.battleDialogQueue).toHaveLength(1)
    expect(fixture.gs.PlayerRolesRuntime.rgwHP[0]).toBe(300)
    // 直接调用公开hold核队列守卫;随后由真实宿主把队列转成active box。
    expect(
      tickBattleSettlement(fixture.state, fixture.gs, IDLE_INPUT, fixture.resources, fixture.bus),
    ).toBe(true)
    expect(fixture.state.battleDialogQueue).toHaveLength(1)
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.state.battleDialogQueue).toHaveLength(0)
    expect(fixture.gs.dialogBox?.currentLineText).toBe('战利品到手')
    expect(
      tickBattleSettlement(fixture.state, fixture.gs, IDLE_INPUT, fixture.resources, fixture.bus),
    ).toBe(true)
    expect(fixture.gs.PlayerRolesRuntime.rgwHP[0]).toBe(300)
    expect(fixture.gs.battleState).toBe(fixture.state)
    expect(getBattleResources(fixture.gs)).toBe(fixture.resources)
    tickBattle(fixture.gs, CONFIRM_INPUT, fixture.bus) // skip-typing
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus) // line-done→waiting-end-key
    tickBattle(fixture.gs, CONFIRM_INPUT, fixture.bus) // dialog-end消费按键,这一tick仍hold
    expect(fixture.gs.dialogBox).toBeUndefined()
    expect(fixture.gs.mode).toBe('battle')
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(fixture.gs.wCollectValue).toBe(7)
    expect([
      fixture.gs.PlayerRolesRuntime.rgwHP[0],
      fixture.gs.PlayerRolesRuntime.rgwMP[0],
    ]).toEqual([400, 25])
    expect(fixture.gs.mode).toBe('explore')
    expect(fixture.gs.battleState).toBeUndefined()
    expect(getBattleResources(fixture.gs)).toBeUndefined()
    expect(fixture.gs.fAutoBattle).toBe(false)
  })

  it('无对话时脚本观察到未恢复的HP/MP,返回后才恢复和释放', () => {
    const fixture = makeWonBattle({
      scriptOnBattleEnd: 1,
      expGained: 0,
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x33, operands: [0, 0, 0] }, { op: 'end' }],
    })
    const atScript: number[][] = []
    // 公开runner端口的透传观察器:业务仍执行真实runScript与opcode,不替换核心oracle。
    setBattleRunScript(fixture.gs, (options) => {
      atScript.push([
        fixture.gs.PlayerRolesRuntime.rgwHP[0]!,
        fixture.gs.PlayerRolesRuntime.rgwMP[0]!,
      ])
      return runScript(options)
    })
    enterWonSettlement(fixture)
    fixture.state.phaseStallTicks = 999
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
    expect(atScript).toEqual([[300, 10]])
    expect(fixture.gs.wCollectValue).toBe(7)
    expect([
      fixture.gs.PlayerRolesRuntime.rgwHP[0],
      fixture.gs.PlayerRolesRuntime.rgwMP[0],
      fixture.state.phaseStallTicks,
    ]).toEqual([400, 25, 0])
    expect(fixture.gs.mode).toBe('explore')
    expect(fixture.gs.battleState).toBeUndefined()
    expect(fixture.gs.fAutoBattle).toBe(false)
  })
})

describe('Post-battle drop branching', () => {
  it.each([
    { roll: 21, sample: 0.2, count: 1 },
    { roll: 22, sample: 0.21, count: 0 },
  ])('黑毛球战后0x06:roll=$roll,掉落$count棵止血草,分支只执行一次', ({ sample, count }) => {
    // SSS原盘41017–41021的同一leaf,仅搬到ip1;跳转0仍保留L_0。
    // C的RandomLong(1,100)>=22跳走;这里只控制其TS实际宿主Math.random,不mock解释器。
    const random = vi.spyOn(Math, 'random').mockReturnValue(sample)
    try {
      const fixture = makeWonBattle({
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
      enterWonSettlement(fixture)
      tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
      expect(fixture.gs.inventory.find((i) => i.itemId === 99)?.count ?? 0).toBe(count)
      if (count === 1) {
        expect(fixture.gs.mode).toBe('battle')
        tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
        expect(fixture.gs.dialogBox).toMatchObject({
          style: 'narration',
          currentLineText: '获得一棵止血草',
        })
        tickBattle(fixture.gs, CONFIRM_INPUT, fixture.bus)
        tickBattle(fixture.gs, IDLE_INPUT, fixture.bus)
      } else {
        expect(fixture.state.battleDialogQueue ?? []).toEqual([])
        expect(fixture.gs.dialogBox).toBeUndefined()
      }
      expect(random).toHaveBeenCalledTimes(1)
      expect(fixture.gs.inventory.find((i) => i.itemId === 99)?.count ?? 0).toBe(count)
      expect(fixture.gs.battleState).toBeUndefined()
      expect(fixture.gs.mode).toBe('explore')
    } finally {
      random.mockRestore()
    }
  })
})
