/**
 * TEST-GLM-NEW-H-1 / H05 — actions/attack 当前公开合同补测。
 *
 * playerEffectFrameBase(fight.c:2055-2056 `index = rgwBattleEffectIndex[battleSprite][1]; index *= 3`)
 * 经 performAttack 的 battleEffectIndex flat 表注入,actions.test.ts 无此参数的直测
 * (anim-timeline.test 只直喂 effectFrameBase,magic 侧 castBase 另有测)。本文件钉:
 *  - sprite 查表走 flat [sprite*2+1](行 [1]),×3 起帧
 *  - 表缺省 → base 0(缺表防御语义,overlay 仍画 chunk10 frame 0..2)
 */
import { describe, expect, it } from 'vitest'
import {
  makeHBattle,
  makeHEnemy,
  makeHRole,
  recordingRng,
} from '../../../__tests__/glm-next-wave/H/harness.js'
import type { BattleAnimFrame } from '../battle-state.js'
import type { ActionQueueItem } from '../turn-queue.js'
import { performAttack } from './attack.js'

function playerActor(idx = 0): ActionQueueItem {
  return { isEnemy: false, idx, dex: 30, fIsSecond: false }
}

function effectFrameIdxs(frames: BattleAnimFrame[]): number[] {
  const out: number[] = []
  for (const frame of frames) {
    for (const overlay of frame.overlay ? [frame.overlay] : (frame.overlays ?? [])) {
      if (overlay.kind === 'effect') out.push(overlay.frameIdx)
    }
  }
  return out
}

/** 1 队员 + 1 敌(双方有 posOriginal)→ performAttack 建时间线路径。 */
function boot() {
  const role = makeHRole(0, { attackStrength: 500 })
  const battle = makeHBattle({
    roles: [role],
    enemies: [makeHEnemy({ id: 100, health: 9000, defense: 0, level: 1 })],
    rng: recordingRng([1, 1, 1], [1]),
  })
  battle.state.players[0]!.posOriginal = { x: 240, y: 170 }
  battle.state.enemies[0]!.posOriginal = { x: 160, y: 80 }
  return { ...battle, actor: playerActor() }
}

describe('performAttack × battleEffectIndex(fight.c:2055-2056 命中特效帧基号)', () => {
  it('sprite0 → flat[sprite*2+1]=2 → base=6,特效帧 frameIdx 6/7/8', () => {
    const { state, playerRoles, bus, actor } = boot()
    const before = state.enemies[0]!.e.health
    performAttack(state, actor, 0, bus, playerRoles, [5, 2, 9, 9])
    expect(state.enemies[0]!.e.health).toBeLessThan(before) // 伤害已结算
    expect(state.battleAnim).toBeDefined()
    expect(effectFrameIdxs(state.battleAnim!.frames)).toEqual([6, 7, 8])
  })

  it('表缺省(undefined)→ base=0,特效帧 frameIdx 0/1/2(缺表防御语义)', () => {
    const { state, playerRoles, bus, actor } = boot()
    performAttack(state, actor, 0, bus, playerRoles, undefined)
    expect(state.battleAnim).toBeDefined()
    expect(effectFrameIdxs(state.battleAnim!.frames)).toEqual([0, 1, 2])
  })
})
