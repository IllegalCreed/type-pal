import { describe, expect, it } from 'vitest'
import { buildActionQueue } from '../turn-queue.js'

/**
 * ActionQueue 测试 —— PAL_CLASSIC 路径,对照 sdlpal `fight.c:1451-1571`。
 */

describe('buildActionQueue (PAL_CLASSIC)', () => {
  it('按 dexterity 降序', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 30 }, { idx: 1, dex: 50 }],
      enemies: [{ idx: 0, dex: 40, dualMove: false }],
    })
    expect(queue.map(q => q.dex)).toEqual([50, 40, 30])
    expect(queue[0]).toMatchObject({ isEnemy: false, idx: 1, fIsSecond: false })
    expect(queue[1]).toMatchObject({ isEnemy: true, idx: 0, fIsSecond: false })
    expect(queue[2]).toMatchObject({ isEnemy: false, idx: 0, fIsSecond: false })
  })

  it('dualMove enemy 进队列两次(第二次 fIsSecond=true)', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 100 }],
      enemies: [{ idx: 0, dex: 50, dualMove: true }],
    })
    expect(queue).toHaveLength(3)
    const enemyEntries = queue.filter(q => q.isEnemy)
    expect(enemyEntries).toHaveLength(2)
    expect(enemyEntries[0]?.fIsSecond).toBe(false)
    expect(enemyEntries[1]?.fIsSecond).toBe(true)
  })

  it('同 dex 排序稳定(队员先于敌人)', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 30 }],
      enemies: [{ idx: 0, dex: 30, dualMove: false }],
    })
    expect(queue[0]?.isEnemy).toBe(false)
    expect(queue[1]?.isEnemy).toBe(true)
  })

  it('空队伍', () => {
    expect(buildActionQueue({ players: [], enemies: [{ idx: 0, dex: 20, dualMove: false }] })).toHaveLength(1)
  })

  it('空敌方', () => {
    expect(buildActionQueue({ players: [{ idx: 0, dex: 20 }], enemies: [] })).toHaveLength(1)
  })

  it('多队员 + 多敌方 + 多 dualMove 综合', () => {
    const queue = buildActionQueue({
      players: [
        { idx: 0, dex: 100 },
        { idx: 1, dex: 50 },
      ],
      enemies: [
        { idx: 0, dex: 80, dualMove: false },
        { idx: 1, dex: 60, dualMove: true },
      ],
    })
    // 期望顺序:p0(100) > e0(80) > e1(60) > e1-second(59) > p1(50)
    expect(queue).toHaveLength(5)
    expect(queue[0]?.idx).toBe(0)
    expect(queue[0]?.isEnemy).toBe(false)
    expect(queue[3]?.fIsSecond).toBe(true)
  })
})
