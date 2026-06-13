import { describe, expect, it } from 'vitest'
import { computeFollowerWorldPos, type FollowerPosState } from './follower-pos.js'

function mkState(over: Partial<FollowerPosState> = {}): FollowerPosState {
  return {
    party: { x: 1000, y: 500 },
    trail: [
      { x: 1000, y: 500, dir: 'down' },
      { x: 984, y: 500, dir: 'down' },
      { x: 968, y: 500, dir: 'down' },
    ],
    walking: false,
    frozenOffset: [],
    ...over,
  }
}

describe('computeFollowerWorldPos —— port PAL_UpdatePartyGestures 的 fWalking 闸门(scene.c:658 vs 745)', () => {
  it('walking:trail[1]+方向偏移(m=1 down → +16,-8),并捕获 frozenOffset(= follower − leader)', () => {
    const s = mkState({ walking: true })
    const p = computeFollowerWorldPos(s, 1, () => true)
    expect(p).toEqual({ x: 1000, y: 492 }) // trail[1](984,500)+(16,-8)
    expect(s.frozenOffset[1]).toEqual({ dx: 0, dy: -8 }) // (1000,492) − leader(1000,500)
  })

  it('walking + 偏移落水:回退 trail[1](sdlpal scene.c:712 障碍回退,仅 fWalking 分支)', () => {
    const s = mkState({ walking: true })
    const p = computeFollowerWorldPos(s, 1, () => false) // 全不可走
    expect(p).toEqual({ x: 984, y: 500 }) // = trail[1]
  })

  it('not walking + 有 frozenOffset:冻结 = leader + frozenOffset,完全不读 trail(scene.c:745 else 不动位置)', () => {
    const s = mkState({
      walking: false,
      party: { x: 2000, y: 300 },
      frozenOffset: [null, { dx: 16, dy: -8 }],
      // trail[1] 故意 == leader(=旧代码避障回退会贴成重叠的场景)
      trail: [
        { x: 2000, y: 300, dir: 'down' },
        { x: 2000, y: 300, dir: 'down' },
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false) // 偏移落水
    expect(p).toEqual({ x: 2016, y: 292 }) // leader + frozenOffset,≠ leader
  })

  it('回归:船上重叠场景(trail[1]==leader + 落水 + not walking)不再与李逍遥重叠', () => {
    const s = mkState({
      walking: false,
      party: { x: 500, y: 500 },
      frozenOffset: [null, { dx: 16, dy: -8 }],
      trail: [
        { x: 500, y: 500, dir: 'down' },
        { x: 500, y: 500, dir: 'down' },
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false)
    expect(p).not.toEqual({ x: 500, y: 500 }) // 不得贴到队长身上
  })

  it('not walking + 无 frozenOffset:回退 trail[1]+偏移(进场景/0x46 后未走过=现状,不回归)', () => {
    const s = mkState({ walking: false, frozenOffset: [] })
    const p = computeFollowerWorldPos(s, 1, () => true)
    expect(p).toEqual({ x: 1000, y: 492 }) // = trail[1]+offset(现状 fallback)
  })

  it('not walking 不捕获 frozenOffset(只在 walking 捕获,避免冻结值漂移)', () => {
    const s = mkState({ walking: false, frozenOffset: [] })
    computeFollowerWorldPos(s, 1, () => true)
    expect(s.frozenOffset[1]).toBeUndefined()
  })

  it('trail 不足(length<=1)→ null(不画跟随者)', () => {
    const s = mkState({ trail: [{ x: 1, y: 2, dir: 'down' }] })
    expect(computeFollowerWorldPos(s, 1, () => true)).toBeNull()
  })
})
