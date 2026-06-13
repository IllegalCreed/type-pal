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
  it('walking:trail[1]+方向偏移(m=1 down → +16,-8)+ 朝向 trail[2].dir,并捕获 frozenOffset(含 dir)', () => {
    const s = mkState({ walking: true })
    const p = computeFollowerWorldPos(s, 1, () => true)
    expect(p).toEqual({ x: 1000, y: 492, dir: 'down' }) // trail[1](984,500)+(16,-8);朝向 trail[2].dir
    expect(s.frozenOffset[1]).toEqual({ dx: 0, dy: -8, dir: 'down' }) // 位置偏移 + 朝向一并捕获
  })

  it('walking + 偏移落水:回退 trail[1](scene.c:712 障碍回退,仅 fWalking 分支)', () => {
    const s = mkState({ walking: true })
    const p = computeFollowerWorldPos(s, 1, () => false) // 全不可走
    expect(p).toEqual({ x: 984, y: 500, dir: 'down' }) // = trail[1]
  })

  it('not walking + 有 frozenOffset:位置和朝向**双双冻结**(用 frozen 值,完全不读当前 trail)', () => {
    const s = mkState({
      walking: false,
      party: { x: 2000, y: 300 },
      frozenOffset: [null, { dx: 16, dy: -8, dir: 'up' }], // 冻结朝向 'up'
      // 当前 trail[2].dir = 'down'(若朝向没冻结会取到 'down' = bug)
      trail: [
        { x: 2000, y: 300, dir: 'down' },
        { x: 2000, y: 300, dir: 'down' },
        { x: 1900, y: 300, dir: 'down' },
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false)
    expect(p).toEqual({ x: 2016, y: 292, dir: 'up' }) // 位置=leader+offset;朝向=冻结的'up'(非当前'down')
  })

  it('回归:船上重叠场景(trail[1]==leader + 落水 + not walking)不再与李逍遥重叠', () => {
    const s = mkState({
      walking: false,
      party: { x: 500, y: 500 },
      frozenOffset: [null, { dx: 16, dy: -8, dir: 'down' }],
      trail: [
        { x: 500, y: 500, dir: 'down' },
        { x: 500, y: 500, dir: 'down' },
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false)
    expect(p).not.toMatchObject({ x: 500, y: 500 }) // 不得贴到队长身上
  })

  it('not walking + 无 frozenOffset:回退 trail[1]+偏移 + 当前 trail[2].dir(进场景/0x46 后未走过=现状)', () => {
    const s = mkState({ walking: false, frozenOffset: [] })
    const p = computeFollowerWorldPos(s, 1, () => true)
    expect(p).toEqual({ x: 1000, y: 492, dir: 'down' })
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
