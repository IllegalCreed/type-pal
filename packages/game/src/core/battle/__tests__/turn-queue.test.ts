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
        { idx: 1, dex: 60, dualMove: true, dex2: 59 },
      ],
    })
    // 期望顺序:p0(100) > e0(80) > e1(60) > e1-second(59) > p1(50)
    expect(queue).toHaveLength(5)
    expect(queue[0]?.idx).toBe(0)
    expect(queue[0]?.isEnemy).toBe(false)
    expect(queue[3]?.fIsSecond).toBe(true)
  })

  // ── D7(2026-06-01 W1):dualMove fIsSecond = CLASSIC 独立二抽 dex 比较(fight.c:1483-1489)──
  it('dualMove 第二抽 dex <= 第一抽 → fIsSecond 标在**第二条**(小者当第二动)', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 200 }],
      enemies: [{ idx: 0, dex: 60, dualMove: true, dex2: 50 }], // 二抽 50 <= 一抽 60
    })
    const e = queue.filter(q => q.isEnemy)
    expect(e).toHaveLength(2)
    const first = e.find(q => q.dex === 60)
    const second = e.find(q => q.dex === 50)
    expect(first?.fIsSecond).toBe(false)
    expect(second?.fIsSecond).toBe(true)
  })

  it('dualMove 第二抽 dex > 第一抽 → fIsSecond 标在**第一条**(sdlpal fight.c:1488 else 支)', () => {
    const queue = buildActionQueue({
      players: [{ idx: 0, dex: 200 }],
      enemies: [{ idx: 0, dex: 50, dualMove: true, dex2: 70 }], // 二抽 70 > 一抽 50
    })
    const e = queue.filter(q => q.isEnemy)
    expect(e).toHaveLength(2)
    const lo = e.find(q => q.dex === 50) // 更小 → 当第二动
    const hi = e.find(q => q.dex === 70)
    expect(lo?.fIsSecond).toBe(true)
    expect(hi?.fIsSecond).toBe(false)
  })
})
