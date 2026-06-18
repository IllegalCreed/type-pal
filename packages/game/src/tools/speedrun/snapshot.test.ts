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
