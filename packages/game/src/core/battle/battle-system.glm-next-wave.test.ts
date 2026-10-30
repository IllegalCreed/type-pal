/**
 * TEST-GLM-NEW-H-1 / H01 — battle-system 当前公开合同补测。
 *
 * 只覆盖既有测试未证明、一手证据支撑的合同:
 *  - scriptOnTurnStart 每脚本起手/循环末重置 battleDialogPendingClear(防跨脚本泄漏;
 *    与 0x05/0x8E battle-opcodes.ts 标记配对)
 *  - DL23:turn-start 脚本置终态(battle.c:747-750 `BattleResult != kBattleResultPreBattle → break`)
 *    → 后续敌人turn-start不再跑,活敌也会经胜利结算。当前原盘0x89全为0;3仅C/typed合同域。
 */
import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { runScript } from '../event-system.js'
import { createBattleLifecycleFixture } from './battle-lifecycle.test-fixtures.js'
import { getBattleResources, setBattleRunScript } from './battle-runtime-context.js'
import { tickBattle } from './battle-system.js'

const NO_KEY: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }
const CONFIRM: InputSnapshot = { held: new Set(), pressed: new Set(['Confirm']), frameNum: 0 }

const boot = createBattleLifecycleFixture

describe('scriptOnTurnStart 与 battleDialogPendingClear(battle-opcodes 0x05/0x8E 消费链)', () => {
  it('turnStart 脚本内 0x05 → 首句对话带 clearBefore;脚本结束标记复位(不跨脚本泄漏)', () => {
    const { gs, bus } = boot({
      commands: [
        { op: 'end' }, // ip 0
        { op: 'raw', opcode: 0x05, operands: [0, 0, 0] }, // ip 1 ClearDialog
        { op: 'showDialog', messageIndex: 0, text: '嘲讽' }, // ip 2
        { op: 'end' }, // ip 3
      ],
      enemyIds: [100],
    })
    tickBattle(gs, NO_KEY, bus) // preBattle → selectAction
    const state = gs.battleState!
    expect(state.enemies.map((enemy) => enemy.e.id)).toEqual([100])
    state.enemies[0]!.scriptOnTurnStart = 1
    tickBattle(gs, NO_KEY, bus) // selectAction 起手 → runEnemyTurnStartScripts
    const queue = state.battleDialogQueue ?? []
    expect(queue.length).toBe(1)
    expect(queue[0]).toMatchObject({ text: '嘲讽', clearBefore: true })
    expect(state.battleDialogPendingClear).toBe(false) // runEnemyTurnStartScripts循环末复位
  })

  it('敌 A 的 0x05(无对话)不泄漏到敌 B 的对话(每脚本起手重置)', () => {
    const { gs, bus } = boot({
      commands: [
        { op: 'end' }, // ip 0
        { op: 'raw', opcode: 0x05, operands: [0, 0, 0] }, // ip 1(敌 A:只置标记,不出对话)
        { op: 'end' }, // ip 2 → 敌 B 脚本入口
        { op: 'showDialog', messageIndex: 0, text: 'B 的台词' }, // ip 3
        { op: 'end' }, // ip 4
      ],
      enemyIds: [100, 101],
    })
    tickBattle(gs, NO_KEY, bus)
    const state = gs.battleState!
    state.enemies[0]!.scriptOnTurnStart = 1
    state.enemies[1]!.scriptOnTurnStart = 3 // B 脚本入口 = showDialog 行
    tickBattle(gs, NO_KEY, bus)
    const queue = state.battleDialogQueue ?? []
    expect(queue.length).toBe(1)
    expect(queue[0]).toMatchObject({ text: 'B 的台词' })
    expect(queue[0]!.clearBefore).toBeUndefined() // A 置的标记在 B 脚本起手被重置
    expect(state.battleDialogPendingClear).toBe(false)
  })
})

describe('DL23:turn-start 置终态 → break(battle.c:747-750 BattleResult != PreBattle)', () => {
  it('敌 A turnStart 0x89 [3] won → 敌 B turnStart 不跑、无对话;phase 进 won', () => {
    const { gs, bus } = boot({
      commands: [
        { op: 'end' }, // ip 0
        { op: 'raw', opcode: 0x89, operands: [3, 0, 0] }, // ip 1 敌 A:SetBattleResult won
        { op: 'end' }, // ip 2 → 敌 B 脚本入口
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
    tickBattle(gs, NO_KEY, bus)
    const state = gs.battleState!
    tickBattle(gs, NO_KEY, bus)
    expect(state.terminatedByEnemyEscape ?? false).toBe(false) // 非 0x69 terminated 变体
    expect(state.phase).toBe('won')
    expect(state.battleDialogQueue ?? []).toEqual([]) // 敌 B 台词未入队(loop break)
    expect(state.enemies.map((e) => [e.e.health, !e.defeated])).toEqual([
      [9000, true],
      [9000, true],
    ])
    expect([state.expGained, state.cashGained]).toEqual([0, 0])
    tickBattle(gs, NO_KEY, bus) // won首tick,不是checkEnemyDeaths
    expect(state.settlement?.screens).toEqual([])
    expect(gs.dwCash).toBe(0)
    expect(gs.Exp.rgPrimaryExp[0]!.wExp).toBe(0)
    tickBattle(gs, NO_KEY, bus) // PhaseE:活敌也按原槽运行,先等第一敌的提示。
    expect(calls).toEqual([{ entry: 5, enemyIdx: 0 }])
    expect(gs.inventory.map((i) => [i.itemId, i.count])).toEqual([[104, 1]])
    tickBattle(gs, NO_KEY, bus)
    expect(gs.dialogBox).toMatchObject({ style: 'narration', currentLineText: '捡到一颗鼠儿果' })
    tickBattle(gs, CONFIRM, bus)
    expect(calls).toEqual([{ entry: 5, enemyIdx: 0 }]) // 关框按键仍由本次对话消费。
    tickBattle(gs, NO_KEY, bus)
    expect(calls).toEqual([
      { entry: 5, enemyIdx: 0 },
      { entry: 9, enemyIdx: 1 },
    ])
    expect(gs.inventory.map((i) => [i.itemId, i.count])).toEqual([
      [104, 1],
      [97, 1],
    ])
    tickBattle(gs, NO_KEY, bus)
    expect(gs.dialogBox).toMatchObject({ style: 'narration', currentLineText: '得到孟婆汤' })
    expect(gs.mode).toBe('battle')
    tickBattle(gs, CONFIRM, bus)
    tickBattle(gs, NO_KEY, bus)
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
