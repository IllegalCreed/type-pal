import { describe, expect, it } from 'vitest'
import {
  attachBattleState,
  makeEnemy,
  makePlayerRoles,
} from '../../core/__tests__/stats/stats-test-fixtures.js'
import { createInitialGameState, type GameState, loadDefaultGame } from '../../core/game-state.js'
import { blackColors, buildFadeIn } from '../../core/palette-fade.js'
import { buildSnapshot } from './snapshot.js'

function makeState(over: Partial<GameState>): GameState {
  return {
    ...createInitialGameState({ x: 100, y: 200, facing: 'down' }),
    wNumScene: 19,
    wNumMusic: 86,
    inventory: [
      { itemId: 265, count: 1 },
      { itemId: 9, count: 0 },
    ],
    ...over,
  }
}

describe('buildSnapshot', () => {
  it('抽取场景/坐标/音乐/物品(仅 count>0)', () => {
    const s = buildSnapshot(makeState({}))
    expect(s.scene).toBe(19)
    expect(s.partyX).toBe(100)
    expect(s.partyY).toBe(200)
    expect(s.music).toBe(86)
    expect(s.inventory.has(265)).toBe(true)
    expect(s.inventory.has(9)).toBe(false) // count 0 不计
    expect(s.battle).toBeNull()
  })
  it('有战斗时汇总敌人 id 与总血', () => {
    const gs = makeState({})
    loadDefaultGame(gs, makePlayerRoles())
    const battle = attachBattleState(gs, [
      makeEnemy({ id: 75, health: 100 }),
      makeEnemy({ id: 12, health: 30 }),
    ])
    battle.enemies[0]!.e.health = 0
    battle.enemies[0]!.defeated = true
    const s = buildSnapshot(gs)
    expect(s.battle?.enemyIds).toEqual(new Set([75, 12]))
    expect(s.battle?.totalEnemyHp).toBe(30)
  })
})

describe('buildSnapshot.canMove(计时起表门)', () => {
  it('explore + 无加载/淡入/挂起 → 可移动', () => {
    expect(buildSnapshot(makeState({ mode: 'explore' })).canMove).toBe(true)
  })
  it('开场菜单(mode!=explore)→ 不可移动', () => {
    expect(buildSnapshot(makeState({ mode: 'menu' })).canMove).toBe(false)
  })
  // 回归钉:boot 预载期/开场演出 mode='explore' 但 suspendRaf=true,漏判会在标题前误起表
  //(2026-06-22 真浏览器实测 + 用户手测确认)。
  it('explore 但 suspendRaf(boot 预载/开场 CG/梦境)→ 不可移动', () => {
    expect(buildSnapshot(makeState({ mode: 'explore', suspendRaf: true })).canMove).toBe(false)
  })
  it('explore 但场景加载中 → 不可移动', () => {
    expect(buildSnapshot(makeState({ mode: 'explore', sceneLoading: true })).canMove).toBe(false)
  })
  it('explore 但 palette 淡入中 → 不可移动', () => {
    expect(
      buildSnapshot(
        makeState({ mode: 'explore', paletteFadeState: buildFadeIn(blackColors(), 100, 0) }),
      ).canMove,
    ).toBe(false)
  })
})
