/**
 * TEST-GLM-NEW-H-1 / H01 — battle-system 当前公开合同补测。
 *
 * 只覆盖既有测试未证明、一手证据支撑的合同:
 *  - scriptOnTurnStart 每脚本起手/循环末重置 battleDialogPendingClear(防跨脚本泄漏;
 *    与 0x05/0x8E battle-opcodes.ts 标记配对)
 *  - DL23:turn-start 脚本置终态(battle.c:747-750 `BattleResult != kBattleResultPreBattle → break`)
 *    → 后续敌人 turn-start 不再跑(既有测试只证 0x69 terminated 变体,0x89 won 未证)
 */
import type { Command, Enemy, InputSnapshot, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeHEnemy, makeHField, makeHRole } from '../../__tests__/glm-next-wave/H/harness.js'
import { type CommandBus, createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import { startBattle, tickBattle } from './battle-system.js'

const NO_KEY: InputSnapshot = { held: new Set(), pressed: new Set(), frameNum: 0 }

/** bootstrap:公开 startBattle 入口;敌脚本走 commands 数组 + scriptOnTurnStart 指针。 */
function boot(opts: { commands: Command[]; enemyIds?: number[] }): {
  gs: GameState
  bus: CommandBus
} {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  const playerRoles: PlayerRoles = { roles: [makeHRole(0)] }
  const enemyIds = opts.enemyIds ?? [100, 101]
  const enemies: Enemy[] = enemyIds.map((id) => makeHEnemy({ id, health: 9000 }))
  const bus = createCommandBus()
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: false,
    enemies,
    enemyTeams: [
      {
        id: 0,
        enemies: [enemyIds[0] ?? 100, enemyIds[1] ?? 101, 0xffff, 0xffff, 0xffff],
      },
    ],
    battleFields: [makeHField()],
    playerRoles,
    items: [],
    spells: [],
    magics: [],
    objectMagics: [],
    objectPoisons: [],
    objectPlayers: [],
    commands: opts.commands,
    rngSeed: 42,
  })
  return { gs, bus }
}

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
    state.enemies[0]!.scriptOnTurnStart = 1
    tickBattle(gs, NO_KEY, bus) // selectAction 起手 → runEnemyTurnStartScripts
    const queue = state.battleDialogQueue ?? []
    expect(queue.length).toBe(1)
    expect(queue[0]).toMatchObject({ text: '嘲讽', clearBefore: true })
    expect(state.battleDialogPendingClear).toBe(false) // 循环末复位(battle-system.ts:2220)
  })

  it('敌 A 的 0x05(无对话)不泄漏到敌 B 的对话(每脚本起手重置,battle-system.ts:2187)', () => {
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
      ],
      enemyIds: [100, 101],
    })
    tickBattle(gs, NO_KEY, bus)
    const state = gs.battleState!
    state.enemies[0]!.scriptOnTurnStart = 1
    state.enemies[1]!.scriptOnTurnStart = 2
    tickBattle(gs, NO_KEY, bus)
    expect(state.terminatedByEnemyEscape ?? false).toBe(false) // 非 0x69 terminated 变体
    expect(state.phase).toBe('won')
    expect(state.battleDialogQueue ?? []).toEqual([]) // 敌 B 台词未入队(loop break)
  })
})
