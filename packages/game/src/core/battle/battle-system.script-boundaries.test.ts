// Public tickBattle script boundaries through the real lifecycle fixture.
// Terminal-result fixtures state their original-story reachability separately from the typed result domain.

import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { runScript } from '../event-system.js'
import { createBattleLifecycleFixture } from './battle-lifecycle.test-fixtures.js'
import { getBattleResources, setBattleRunScript } from './battle-runtime-context.js'
import { tickBattle } from './battle-system.js'

const IDLE_INPUT: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
const CONFIRM_INPUT: InputSnapshot = { held: new Set(), pressed: new Set(['Confirm']), frameNum: 0 }

describe('Turn-start dialogue clear boundaries', () => {
  it('turnStart 脚本内 0x05 → 首句对话带 clearBefore;脚本结束标记复位(不跨脚本泄漏)', () => {
    const { gs, bus } = createBattleLifecycleFixture({
      commands: [
        { op: 'end' }, // ip 0
        { op: 'raw', opcode: 0x05, operands: [0, 0, 0] }, // ip 1 ClearDialog
        { op: 'showDialog', messageIndex: 0, text: '嘲讽' }, // ip 2
        { op: 'end' }, // ip 3
      ],
      enemyIds: [100],
    })
    tickBattle(gs, IDLE_INPUT, bus) // preBattle → selectAction
    const state = gs.battleState!
    expect(state.enemies.map((enemy) => enemy.e.id)).toEqual([100])
    state.enemies[0]!.scriptOnTurnStart = 1
    tickBattle(gs, IDLE_INPUT, bus) // selectAction 起手 → runEnemyTurnStartScripts
    const queue = state.battleDialogQueue ?? []
    expect(queue.length).toBe(1)
    expect(queue[0]).toMatchObject({ text: '嘲讽', clearBefore: true })
    expect(state.battleDialogPendingClear).toBe(false) // runEnemyTurnStartScripts循环末复位
  })

  it('敌 A 的 0x05(无对话)不泄漏到敌 B 的对话(每脚本起手重置)', () => {
    const { gs, bus } = createBattleLifecycleFixture({
      commands: [
        { op: 'end' }, // ip 0
        { op: 'raw', opcode: 0x05, operands: [0, 0, 0] }, // ip 1(敌 A:只置标记,不出对话)
        { op: 'end' }, // ip 2:结束标记；敌 B 从 ip 3 开始
        { op: 'showDialog', messageIndex: 0, text: 'B 的台词' }, // ip 3
        { op: 'end' }, // ip 4
      ],
      enemyIds: [100, 101],
    })
    tickBattle(gs, IDLE_INPUT, bus)
    const state = gs.battleState!
    state.enemies[0]!.scriptOnTurnStart = 1
    state.enemies[1]!.scriptOnTurnStart = 3 // B 脚本入口 = showDialog 行
    tickBattle(gs, IDLE_INPUT, bus)
    const queue = state.battleDialogQueue ?? []
    expect(queue.length).toBe(1)
    expect(queue[0]).toMatchObject({ text: 'B 的台词' })
    expect(queue[0]!.clearBefore).toBeUndefined() // A 置的标记在 B 脚本起手被重置
    expect(state.battleDialogPendingClear).toBe(false)
  })
})

describe('Terminal turn-start script stops later enemies', () => {
  it('敌 A turnStart 0x89 [3] won → 敌 B turnStart 不跑、无对话;phase 进 won', () => {
    const { gs, bus } = createBattleLifecycleFixture({
      commands: [
        { op: 'end' }, // ip 0
        { op: 'raw', opcode: 0x89, operands: [3, 0, 0] }, // ip 1 敌 A:SetBattleResult won
        { op: 'end' }, // ip 2:结束标记；敌 B 从 ip 3 开始
        { op: 'showDialog', messageIndex: 0, text: '不该出现' }, // ip 3
        { op: 'end' }, // ip 4
        // 两个原盘战后leaf:41008–41011、41032–41035,搬到ip5/9。
        { op: 'giveItem', itemId: 104, count: 0 },
        { op: 'setDialogStyleNarration' },
        { op: 'showDialog', messageIndex: 13115, text: '捡到一颗鼠儿果' },
        { op: 'end' },
        { op: 'giveItem', itemId: 97, count: 0 },
        { op: 'setDialogStyleNarration' },
        { op: 'showDialog', messageIndex: 13120, text: '得到孟婆汤' },
        { op: 'end' },
      ],
      enemyIds: [100, 101],
      enemyObjects: [
        {
          objectIndex: 100,
          enemyId: 100,
          resistanceToSorcery: 0,
          scriptOnTurnStart: 1,
          scriptOnReady: 0,
          scriptOnBattleEnd: 5,
        },
        {
          objectIndex: 101,
          enemyId: 101,
          resistanceToSorcery: 0,
          scriptOnTurnStart: 3,
          scriptOnReady: 0,
          scriptOnBattleEnd: 9,
        },
      ],
    })
    const calls: Array<{ entry: number; enemyIdx: number | undefined }> = []
    setBattleRunScript(gs, (options) => {
      calls.push({ entry: options.ip, enemyIdx: options.battleCtx?.caster?.idx })
      return runScript(options) // 此注入端口观察PhaseE;turnStart直接调用真实runScript,不列入calls
    })
    tickBattle(gs, IDLE_INPUT, bus)
    const state = gs.battleState!
    tickBattle(gs, IDLE_INPUT, bus)
    expect(state.terminatedByEnemyEscape ?? false).toBe(false) // 非 0x69 terminated 变体
    expect(state.phase).toBe('won')
    expect(state.battleDialogQueue ?? []).toEqual([]) // 敌 B 台词未入队(loop break)
    expect(state.enemies.map((e) => [e.e.health, !e.defeated])).toEqual([
      [9000, true],
      [9000, true],
    ])
    expect([state.expGained, state.cashGained]).toEqual([0, 0])
    tickBattle(gs, IDLE_INPUT, bus) // won首tick,不是checkEnemyDeaths
    expect(state.settlement?.screens).toEqual([])
    expect(gs.dwCash).toBe(0)
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(0)
    tickBattle(gs, IDLE_INPUT, bus) // PhaseE:活敌也按原槽运行,先等第一敌的提示。
    expect(calls).toEqual([{ entry: 5, enemyIdx: 0 }])
    expect(gs.inventory.map((i) => [i.itemId, i.count])).toEqual([[104, 1]])
    tickBattle(gs, IDLE_INPUT, bus)
    expect(gs.dialogBox).toMatchObject({ style: 'narration', currentLineText: '捡到一颗鼠儿果' })
    tickBattle(gs, CONFIRM_INPUT, bus)
    expect(calls).toEqual([{ entry: 5, enemyIdx: 0 }]) // 关框按键仍由本次对话消费。
    tickBattle(gs, IDLE_INPUT, bus)
    expect(calls).toEqual([
      { entry: 5, enemyIdx: 0 },
      { entry: 9, enemyIdx: 1 },
    ])
    expect(gs.inventory.map((i) => [i.itemId, i.count])).toEqual([
      [104, 1],
      [97, 1],
    ])
    tickBattle(gs, IDLE_INPUT, bus)
    expect(gs.dialogBox).toMatchObject({ style: 'narration', currentLineText: '得到孟婆汤' })
    expect(gs.mode).toBe('battle')
    tickBattle(gs, CONFIRM_INPUT, bus)
    tickBattle(gs, IDLE_INPUT, bus)
    expect(calls).toHaveLength(2) // 展示期间不重跑PhaseE
    expect(gs.inventory.map((i) => [i.itemId, i.count])).toEqual([
      [104, 1],
      [97, 1],
    ])
    expect([gs.PlayerRolesRuntime.rgwHP[0], gs.PlayerRolesRuntime.rgwMP[0]]).toEqual([400, 25])
    expect(gs.mode).toBe('explore')
    expect(gs.battleState).toBeUndefined()
    expect(getBattleResources(gs)).toBeUndefined()
  })
})

describe('Terminal results bypass victory settlement', () => {
  it.each([
    { result: 0, resumeIp: 5 },
    { result: 1, resumeIp: 6 },
    { result: 0xffff, resumeIp: 7 },
  ])('0x89 result=$result不跑战后掉落/半恢复,接回ip$resumeIp', ({ result, resumeIp }) => {
    // 当前原盘四处0x89只有result0;1/FFFF是C和typed opcode结果域,不声称剧情可达。
    const fixture = createBattleLifecycleFixture({
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
    fixture.gs.postBattleResume = {
      wonIp: 5,
      lostIp: 6,
      fledIp: 7,
      commands: fixture.resources.commands,
      currentEventObjectId: 7,
      triggerOwnerId: 7,
    }
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus) // preBattle→selectAction
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus) // 真实turn-start runner执行0x89
    tickBattle(fixture.gs, IDLE_INPUT, fixture.bus) // 实际终态route→cleanup→resume
    expect(fixture.gs.inventory).toEqual([])
    expect([
      fixture.gs.PlayerRolesRuntime.rgwHP[0],
      fixture.gs.PlayerRolesRuntime.rgwMP[0],
    ]).toEqual([300, 10])
    expect(fixture.gs.eventCursor).toMatchObject({
      ip: resumeIp,
      currentEventObjectId: 7,
      triggerOwnerId: 7,
    })
    expect(fixture.gs.eventCursor?.commands).toBe(fixture.resources.commands)
    expect(fixture.gs.postBattleResume).toBeUndefined()
    expect(fixture.gs.mode).toBe('event')
    expect(fixture.gs.battleState).toBeUndefined()
    expect(getBattleResources(fixture.gs)).toBeUndefined()
  })
})
