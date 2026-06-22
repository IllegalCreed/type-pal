import { describe, expect, it } from 'vitest'
import type { GameState } from '../../core/game-state.js'
import { buildSnapshot } from './snapshot.js'

function fakeGs(over: Partial<GameState>): GameState {
  return {
    wNumScene: 19,
    party: { x: 100, y: 200, facing: 0 },
    wNumMusic: 86,
    inventory: [{ itemId: 265, count: 1 }, { itemId: 9, count: 0 }],
    battleState: undefined,
    ...over,
  } as unknown as GameState
}

describe('buildSnapshot', () => {
  it('抽取场景/坐标/音乐/物品(仅 count>0)', () => {
    const s = buildSnapshot(fakeGs({}))
    expect(s.scene).toBe(19)
    expect(s.partyX).toBe(100)
    expect(s.partyY).toBe(200)
    expect(s.music).toBe(86)
    expect(s.inventory.has(265)).toBe(true)
    expect(s.inventory.has(9)).toBe(false) // count 0 不计
    expect(s.battle).toBeNull()
  })
  it('有战斗时汇总敌人 id 与总血', () => {
    const battleState = {
      enemies: [
        { e: { id: 75, health: 0 } },
        { e: { id: 12, health: 30 } },
      ],
    }
    const s = buildSnapshot(fakeGs({ battleState } as unknown as Partial<GameState>))
    expect(s.battle?.enemyIds.has(75)).toBe(true)
    expect(s.battle?.totalEnemyHp).toBe(30)
  })
})

describe('buildSnapshot.canMove(计时起表门)', () => {
  it('explore + 无加载/淡入/挂起 → 可移动', () => {
    expect(buildSnapshot(fakeGs({ mode: 'explore' })).canMove).toBe(true)
  })
  it('开场菜单(mode!=explore)→ 不可移动', () => {
    expect(buildSnapshot(fakeGs({ mode: 'menu' })).canMove).toBe(false)
  })
  // 回归钉:boot 预载期/开场演出 mode='explore' 但 suspendRaf=true,漏判会在标题前误起表
  //(2026-06-22 真浏览器实测 + 用户手测确认)。
  it('explore 但 suspendRaf(boot 预载/开场 CG/梦境)→ 不可移动', () => {
    expect(buildSnapshot(fakeGs({ mode: 'explore', suspendRaf: true })).canMove).toBe(false)
  })
  it('explore 但场景加载中 → 不可移动', () => {
    expect(buildSnapshot(fakeGs({ mode: 'explore', sceneLoading: true })).canMove).toBe(false)
  })
  it('explore 但 palette 淡入中 → 不可移动', () => {
    expect(buildSnapshot(fakeGs({ mode: 'explore', paletteFadeState: {} } as unknown as Partial<GameState>)).canMove).toBe(false)
  })
})
