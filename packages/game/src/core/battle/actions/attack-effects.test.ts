/**
 * performAttack 将角色的战斗精灵编号映射为命中特效帧。
 * SDLPal PAL_BattleShowPlayerAttackAnim 读取 BattleEffectIndex 的第二列并乘以 3；
 * 此处验证真实动作入口的查表接线，时间线布局由 anim-timeline.test.ts 验证。
 * 表缺省回退到帧 0..2 是当前 TS 策略，不声称 SDLPal 有同样的缺表路径。
 */
import { describe, expect, it } from 'vitest'
import { makeBattleFixture } from '../../../__tests__/battle-fixture.js'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import type { BattleAnimFrame } from '../battle-state.js'
import type { ActionQueueItem } from '../turn-queue.js'
import { performAttack } from './attack.js'

function effectFrameIndices(frames: BattleAnimFrame[]): number[] {
  const out: number[] = []
  for (const frame of frames) {
    for (const overlay of frame.overlay ? [frame.overlay] : (frame.overlays ?? [])) {
      if (overlay.kind === 'effect') out.push(overlay.frameIdx)
    }
  }
  return out
}

/** 1 队员 + 1 敌(双方有 posOriginal)→ performAttack 建时间线路径。 */
function makeAttackScene(battleSpriteId: number) {
  const role = makeRoleRecord(0, { attackStrength: 500, spriteNumInBattle: battleSpriteId })
  const battle = makeBattleFixture({
    roles: [role],
    enemies: [makeEnemyRecord({ id: 100, health: 9000, defense: 0, level: 1 })],
    rng: recordingRng([1, 1, 1], [1]),
  })
  battle.state.players[0]!.posOriginal = { x: 240, y: 170 }
  battle.state.enemies[0]!.posOriginal = { x: 160, y: 80 }
  const actor: ActionQueueItem = { isEnemy: false, idx: 0, dex: 30, fIsSecond: false }
  return { state: battle.state, playerRoles: battle.playerRoles, bus: battle.bus, actor }
}

describe('Player attack effect lookup', () => {
  it('uses the selected sprite row and second column for effect frames', () => {
    const { state, playerRoles, bus, actor } = makeAttackScene(2)
    const before = state.enemies[0]!.e.health
    // 合成 10×2 表：前面各行和目标行两列均有不同值，避免错行／错列偶然命中。
    performAttack(
      state,
      actor,
      0,
      bus,
      playerRoles,
      [5, 2, 9, 3, 7, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    )
    expect(state.enemies[0]!.e.health).toBeLessThan(before) // 伤害已结算
    expect(state.battleAnim).toBeDefined()
    expect(effectFrameIndices(state.battleAnim!.frames)).toEqual([12, 13, 14])
  })

  it('uses frames 0/1/2 when the effect table is absent', () => {
    const { state, playerRoles, bus, actor } = makeAttackScene(0)
    performAttack(state, actor, 0, bus, playerRoles, undefined)
    expect(state.battleAnim).toBeDefined()
    expect(effectFrameIndices(state.battleAnim!.frames)).toEqual([0, 1, 2])
  })
})
