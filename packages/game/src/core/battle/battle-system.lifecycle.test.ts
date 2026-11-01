/** Public battle tick admission, resource failures, phase ownership and action execution.
 * Direct field edits below are explicit phase/guard inputs; story reachability is not claimed. */
import { describe, expect, it, vi } from 'vitest'
import {
  makeEnemyRecord as makeEnemy,
  makeRoleRecord as makeRole,
} from '../../__tests__/battle-records.js'
import { seqRng } from '../../__tests__/coverage85-glm-game/harness.js'
import { createCommandBus } from '../command-bus.js'
import { createInitialGameState } from '../game-state.js'
import { startTestBattle as boot, battleInput as emptyInput } from './battle-start.test-fixtures.js'
import { tickBattle } from './battle-system.js'

describe('battle lifecycle', () => {
  it('hp=0 队员进战斗 → 复活到 1(roles+runtime)且傀儡态清 0', () => {
    const role = makeRole(0, { hp: 0 })
    const initial = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    initial.rgPlayerStatus[0]![4] = 9
    const { gs, playerRoles } = boot({ gs: initial, roles: [role] })
    expect(playerRoles.roles[0]!.hp).toBe(1)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(1)
    expect(gs.rgPlayerStatus[0]![4]).toBe(0)
    expect(gs.mode).toBe('battle')
    expect(gs.battleState).toBeDefined()
  })
  it('无 battleState → no-op;资源缺失 → 强制退出 explore + console.error', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const before = structuredClone(gs)
    const bus = createCommandBus()
    tickBattle(gs, emptyInput(), bus)
    expect(gs).toEqual(before)
    expect(bus.drain()).toEqual([])

    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { gs: gs2 } = boot()
      const st = gs2.battleState!
      // Explicit lifecycle-corruption input: transfer the state without its owning resources.
      // This is a defensive branch, not a normal production start.
      const gs3 = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs3.mode = 'battle'
      gs3.battleState = st
      tickBattle(gs3, emptyInput(), createCommandBus())
      expect(gs3.mode).toBe('explore')
      expect(gs3.battleState).toBeUndefined()
      expect(err).toHaveBeenCalledExactlyOnceWith(
        '[battle] tickBattle without resources — state lifecycle 错乱,强制退出',
      )
    } finally {
      err.mockRestore()
    }
  })
  it('phase stall 兜底:phaseStallTicks 超 1500 → 强制 finalize 回 explore(selectAction 不计)', () => {
    const { gs, bus } = boot()
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // preBattle → selectAction
    expect(st.phase).toBe('selectAction')
    st.phaseStallTicks = 1501
    tickBattle(gs, emptyInput(), bus)
    expect(st.phaseStallTicks).toBe(0) // User selection is an unbounded wait.
    st.phase = 'performAction'
    st.phaseStallTicks = 1500 // The next automatic tick crosses the guard boundary.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      tickBattle(gs, emptyInput(), bus)
      expect(err).toHaveBeenCalledExactlyOnceWith(
        '[battle] phase performAction stall > 1500 ticks (~60s),强制退出 explore',
      )
      expect(gs.mode).toBe('explore')
      expect(gs.battleState).toBeUndefined()
    } finally {
      err.mockRestore()
    }
  })
  it('roundEndDelayTicks>0 → 递减且不起菜单;归零后 selectionStartedForTurn 帧起菜单', () => {
    const { gs, bus } = boot()
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // → selectAction(turnStart 无脚本)
    expect(st.phase).toBe('selectAction')
    st.roundEndDelayTicks = 2
    st.selectionStartedForTurn = undefined // This turn has not opened its selection yet.
    tickBattle(gs, emptyInput(), bus)
    expect(st.roundEndDelayTicks).toBe(1)
    expect(st.selectionStartedForTurn).toBeUndefined() // 仍没起
    tickBattle(gs, emptyInput(), bus)
    expect(st.roundEndDelayTicks).toBe(0)
    tickBattle(gs, emptyInput(), bus) // 归零后起菜单
    expect(st.selectionStartedForTurn).toBe(st.turn)
    expect(st.uiState).toBe('selectMove')
  })
  it('全员失能(睡)→ 起手落空(无手动选择)+ 自动占位 action 填满进 perform', () => {
    const { gs, bus } = boot({ roles: [makeRole(0)] })
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // → selectAction
    st.players[0]!.status.sleep = 5
    st.selectionStartedForTurn = undefined
    tickBattle(gs, emptyInput(), bus)
    expect(st.selectionStartedForTurn).toBe(st.turn)
    // Selection reserves a default attack; perform-time status validation owns skipping it.
    expect(st.pendingActions.get(0)).toEqual({ type: 'attack', actionId: 0, target: 0 })
    expect(st.phase).toBe('performAction')
    expect(st.selectingPlayerIdx).toBeUndefined() // 手动选择未起(落空臂)
  })
  it('活队员全死 → selectAction 兜底转 lost', () => {
    const { gs, bus, playerRoles } = boot({ roles: [makeRole(0, { hp: 0 })] })
    const st = gs.battleState!
    tickBattle(gs, emptyInput(), bus) // → selectAction(startBattle 已复活到 1)
    expect(st.phase).toBe('selectAction')
    playerRoles.roles[0]!.hp = 0 // 复活后打死
    tickBattle(gs, emptyInput(), bus)
    expect(st.phase).toBe('lost')
  })
  it('won:无 settlement → 建;已有 → 不重建', () => {
    const { gs, bus } = boot()
    const st = gs.battleState!
    st.phase = 'won'
    tickBattle(gs, emptyInput(), bus)
    expect(st.settlement).toBeDefined()
    const first = st.settlement
    tickBattle(gs, emptyInput(), bus) // settlement hold 接管;不重建
    expect(st.settlement).toBe(first)
  })
  it('flee 拒绝:roll > str → 失败演出,不入 fleed,战斗继续', () => {
    const fx = boot({ enemies: [makeEnemy({ fleeRate: 50, level: 10 })] })
    tickBattle(fx.gs, emptyInput(), fx.bus)
    tickBattle(fx.gs, emptyInput(), fx.bus)
    const st = fx.gs.battleState!
    tickBattle(fx.gs, emptyInput(['Flee']), fx.bus)
    expect(st.pendingActions.get(0)?.type).toBe('flee')
    expect(st.phase).toBe('performAction')
    // Queue construction has finished; this RNG now belongs to action execution.
    const rng = seqRng([114]) // enemy fleeRate50 + (level10 + 6)*4 = 114; player rate5.
    st.rng = rng
    // Flee is slower than the enemy: isolate the player's already selected queue entry.
    const playerAction = st.actionQueue.find((entry) => !entry.isEnemy)
    expect(playerAction).toBeDefined()
    if (!playerAction) throw new Error('selected player action missing')
    st.actionQueue = [playerAction]
    st.currentActionIndex = 0
    tickBattle(fx.gs, emptyInput(), fx.bus)
    expect(st.battleAnim?.updateEnemyGesture).toBe(true)
    expect(fx.gs.Exp.rgFleeExp[0]?.wCount).toBe(2)
    expect(rng.calls).toEqual(['rangeInclusive(0,114)'])
    expect(st.fleeAnim).toBeUndefined()
    expect(st.phase).not.toBe('fleed')
    expect(fx.gs.battleState).toBeDefined()
  })
})
