/** Direct idle-frame progression; tick admission/animation holds stay in battle-system specs. */
import { describe, expect, it } from 'vitest'
import { makeEnemyRecord as makeEnemy } from '../../__tests__/battle-records.js'
import { startTestBattle as boot } from './battle-start.test-fixtures.js'

import { tickEnemyIdleGestures } from './battle-system.js'

describe('enemy idle gestures', () => {
  it('defeated / health<=0 敌不推进;sleep/paralyzed 定格 idleFrame=0 且计数不动', () => {
    const { gs } = boot({
      enemies: [
        makeEnemy({ id: 100, health: 0 }),
        makeEnemy({ id: 101 }),
        makeEnemy({ id: 102 }),
        makeEnemy({ id: 103 }),
      ],
      teamSlots: [100, 101, 102, 103, 0xffff],
    })
    const st = gs.battleState!
    st.enemies[0]!.defeated = true
    st.enemies[0]!.idleFrame = 5
    st.enemies[1]!.e.health = 0
    st.enemies[1]!.idleFrame = 5
    st.enemies[2]!.status.sleep = 2
    st.enemies[2]!.idleFrame = 4
    st.enemies[2]!.idleTick = 1
    st.enemies[3]!.status.paralyzed = 2
    st.enemies[3]!.idleFrame = 4
    st.enemies[3]!.idleTick = 1
    tickEnemyIdleGestures(st)
    expect(st.enemies[0]!.idleFrame).toBe(5) // defeated 冻结
    expect(st.enemies[1]!.idleFrame).toBe(5) // 血 0 冻结
    expect(st.enemies[2]!.idleFrame).toBe(0) // sleep 归零定格
    expect(st.enemies[3]!.idleFrame).toBe(0)
    expect(st.enemies[3]!.idleTick).toBe(1)
    expect(st.enemies[2]!.idleTick).toBe(1) // 计数不动
  })
  it('idleAnimSpeed 倒数:到 0 → idleFrame++ 并恢复计数;帧数到顶回绕 0', () => {
    const { gs } = boot({ enemies: [makeEnemy({ id: 100, idleAnimSpeed: 2, idleFrames: 2 })] })
    const st = gs.battleState!
    const e = st.enemies[0]!
    e.idleTick = 1
    tickEnemyIdleGestures(st) // 1→0 → 步进 idleFrame 0→1,计数回 2
    expect(e.idleFrame).toBe(1)
    expect(e.idleTick).toBe(2)
    e.idleTick = 1
    tickEnemyIdleGestures(st) // idleFrame 1→2 → 回绕 0
    expect(e.idleFrame).toBe(0)
  })
  it('currentFrame 链帧敌:推 currentFrame 并按 idleFrames 回绕(不动 idleFrame)', () => {
    const { gs } = boot({ enemies: [makeEnemy({ id: 100, idleAnimSpeed: 1, idleFrames: 4 })] })
    const st = gs.battleState!
    const e = st.enemies[0]!
    e.currentFrame = 2
    e.idleFrame = 0
    tickEnemyIdleGestures(st)
    expect(e.currentFrame).toBe(3)
    tickEnemyIdleGestures(st) // >= idleFrames(4) → 回绕 0
    expect(e.currentFrame).toBe(0)
    expect(e.idleFrame).toBe(0)
  })
})
