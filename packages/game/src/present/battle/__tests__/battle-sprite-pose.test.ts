import { describe, expect, it } from 'vitest'
import type { BattleState } from '../../../core/battle/battle-state.js'
import {
  computePlayerBattleIdleFrame,
  confusedShakeDelta,
  enemyTargetHighlightShift,
} from '../draw-battle-sprites.js'
import { battleEnemy, spriteEnemy, spriteState } from './battle-sprite-state.js'

describe('enemy target highlighting', () => {
  const targetSelection = (
    uiState: BattleState['uiState'],
    uiCursor: number,
    healths: number[],
  ): BattleState => ({
    ...spriteState(
      [],
      healths.map((health, id) => battleEnemy(spriteEnemy(id, health))),
    ),
    uiState,
    uiCursor,
  })

  it('blinkOn=false → 恒 0(blink off 帧不高亮,sprite 正常)', () => {
    expect(
      enemyTargetHighlightShift(targetSelection('selectTargetEnemy', 0, [100]), 0, false),
    ).toBe(0)
  })

  it('selectTargetEnemy:选中敌人(idx===uiCursor)+ 活 + blinkOn → 7,非选中 → 0', () => {
    const s = targetSelection('selectTargetEnemy', 1, [100, 100])
    expect(enemyTargetHighlightShift(s, 1, true)).toBe(7)
    expect(enemyTargetHighlightShift(s, 0, true)).toBe(0)
  })

  // PAL_CLASSIC:selectTargetEnemyAll 立即提交、**无任何高亮**(uibattle.c:1611-1617 "Don't bother selecting")。
  //   全敌闪烁高亮是 #else WIN95 路径(uibattle.c:1628-1648),本项目 CLASSIC 基准不走 →
  //   全体普攻/全体法术不该有选敌闪烁(user 2026-06-05 报"都全体了选什么敌")。
  it('selectTargetEnemyAll(CLASSIC):无高亮 → 恒 0(立即提交,uibattle.c:1611-1617)', () => {
    const s = targetSelection('selectTargetEnemyAll', 0, [100, 100])
    expect(enemyTargetHighlightShift(s, 0, true)).toBe(0)
    expect(enemyTargetHighlightShift(s, 1, true)).toBe(0)
  })

  it('死敌(health<=0)→ 0(不高亮;单体选择 health guard)', () => {
    expect(
      enemyTargetHighlightShift(targetSelection('selectTargetEnemy', 0, [0, 100]), 0, true),
    ).toBe(0)
  })

  it('非 target 选择阶段(selectMove)→ 0', () => {
    expect(enemyTargetHighlightShift(targetSelection('selectMove', 0, [100]), 0, true)).toBe(0)
  })
})

describe('player idle pose precedence', () => {
  const idlePlayer = (s: Partial<{ sleep: number; puppet: number }>, defending = false) => ({
    status: { sleep: 0, puppet: 0, ...s },
    defending,
  })

  const roleVitals = (hp: number, maxHP = 200) => ({ hp, maxHP })

  // sdlpal fight.c:948-957:hp==0 非傀儡 → 帧2(倒下死姿);傀儡(死后仍可动)→ 帧0 站立。死帧优先于眠/濒死/防御。
  it('hp==0 非傀儡 → 帧2(倒下死姿)', () => {
    expect(computePlayerBattleIdleFrame(idlePlayer({}), roleVitals(0))).toBe(2)
  })

  it('hp==0 + 傀儡 → 帧0(站立)', () => {
    expect(computePlayerBattleIdleFrame(idlePlayer({ puppet: 5 }), roleVitals(0))).toBe(0)
  })

  it('hp==0 即使 sleep/defend 也优先死帧2(死帧最高优先,fight.c:948 先判)', () => {
    expect(computePlayerBattleIdleFrame(idlePlayer({ sleep: 3 }), roleVitals(0))).toBe(2)
    expect(computePlayerBattleIdleFrame(idlePlayer({}, true), roleVitals(0))).toBe(2)
  })

  it('sleep>0 → 帧1(濒死姿)', () => {
    expect(computePlayerBattleIdleFrame(idlePlayer({ sleep: 2 }), roleVitals(200))).toBe(1)
  })

  it('濒死(hp<min(100,maxHP/5))→ 帧1', () => {
    expect(computePlayerBattleIdleFrame(idlePlayer({}), roleVitals(30, 200))).toBe(1) // 30 < min(100,40)
  })

  it('防御 → 帧3', () => {
    expect(computePlayerBattleIdleFrame(idlePlayer({}, true), roleVitals(200))).toBe(3)
  })

  it('正常(非眠/非濒死/非防御)→ 帧0', () => {
    expect(computePlayerBattleIdleFrame(idlePlayer({}), roleVitals(200))).toBe(0)
  })
})

describe('confusion jitter quantization', () => {
  it('rand01 → {-1,0,1}(RandomLong(-1,1) 等价)', () => {
    expect(confusedShakeDelta(0)).toBe(-1) // [0,1/3)
    expect(confusedShakeDelta(0.5)).toBe(0) // [1/3,2/3)
    expect(confusedShakeDelta(0.99)).toBe(1) // [2/3,1)
  })
})
