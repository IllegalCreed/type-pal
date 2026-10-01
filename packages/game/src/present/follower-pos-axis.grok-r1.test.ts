/**
 * G03-C。旧 follower-pos 只钉了 m=1 朝下的偏移、落水和静止冻结。
 * 本组把朝向源拆开：偏移读 trail[1].dir，返回的 dir 读 trail[2]。
 */
import { describe, expect, it } from 'vitest'
import type { TrailEntry } from '../core/game-state.js'
import { computeFollowerWorldPos, type FollowerPosState } from './follower-pos.js'

function state(trail: TrailEntry[], over: Partial<FollowerPosState> = {}): FollowerPosState {
  return {
    party: { x: 1000, y: 500 },
    trail,
    walking: true,
    frozenOffset: [],
    ...over,
  }
}

const downTrail = (dir: TrailEntry['dir'], facing: TrailEntry['dir']): TrailEntry[] => [
  { x: 1000, y: 500, dir: 'down' },
  { x: 984, y: 500, dir },
  { x: 968, y: 500, dir: facing },
]

describe('G03-C computeFollowerWorldPos 方向与冻结', () => {
  it('G03-C01 m=1 且 trail[1] 朝右时偏移为 -16,-8，返回朝向仍是 trail[2]', () => {
    const s = state(downTrail('right', 'up'))
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 968, y: 492, dir: 'up' })
    expect(s.frozenOffset[1]).toEqual({ dx: -32, dy: -8, dir: 'up' })
  })

  it('G03-C02 m=1 且 trail[1] 朝左时偏移为 +16,+8', () => {
    const s = state(downTrail('left', 'right'))
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 1000, y: 508, dir: 'right' })
  })

  it('G03-C03 m=1 且 trail[1] 朝上时偏移为 -16,+8', () => {
    const s = state(downTrail('up', 'left'))
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 968, y: 508, dir: 'left' })
  })

  it('G03-C04 m=2 朝下时偏移是 +16,+8，不是 m=1 的 +16,-8', () => {
    const s = state(downTrail('down', 'left'))
    expect(computeFollowerWorldPos(s, 2, () => true)).toEqual({ x: 1000, y: 508, dir: 'left' })
  })

  it('G03-C05 m=2 朝右时水平偏移为 -16，垂直仍是 +8', () => {
    const s = state(downTrail('right', 'down'))
    expect(computeFollowerWorldPos(s, 2, () => true)).toEqual({ x: 968, y: 508, dir: 'down' })
  })

  it('G03-C06 偏移落在障碍上时，冻结的是退回 trail[1] 之后的位移', () => {
    const s = state(downTrail('down', 'down'))
    const pos = computeFollowerWorldPos(s, 1, () => false)
    expect(pos).toEqual({ x: 984, y: 500, dir: 'down' })
    expect(s.frozenOffset[1]).toEqual({ dx: -16, dy: 0, dir: 'down' })
  })

  it('G03-C07 走路时不沿用旧冻结，并把它改写成这次的位移', () => {
    const s = state(downTrail('down', 'down'), {
      frozenOffset: [null, { dx: 50, dy: 50, dir: 'up' }],
    })
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 1000, y: 492, dir: 'down' })
    expect(s.frozenOffset[1]).toEqual({ dx: 0, dy: -8, dir: 'down' })
  })

  it('G03-C08 trail 没有第 3 项时，朝向回退 trail[1].dir', () => {
    const s = state([
      { x: 1000, y: 500, dir: 'down' },
      { x: 984, y: 500, dir: 'left' },
    ])
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 1000, y: 508, dir: 'left' })
  })

  it('G03-C09 静止且成员下标超出 trail 时，用最后一项的坐标', () => {
    const s = state(
      [
        { x: 10, y: 10, dir: 'down' },
        { x: 20, y: 20, dir: 'down' },
        { x: 111, y: 222, dir: 'up' },
      ],
      { walking: false },
    )
    expect(computeFollowerWorldPos(s, 5, () => true)).toEqual({ x: 111, y: 222, dir: 'up' })
  })

  it('G03-C10 静止摆位不调用 isWalkable', () => {
    const s = state(
      [
        { x: 10, y: 10, dir: 'down' },
        { x: 30, y: 40, dir: 'right' },
        { x: 50, y: 60, dir: 'left' },
      ],
      { walking: false },
    )
    let calls = 0
    const pos = computeFollowerWorldPos(s, 1, () => {
      calls += 1
      return false
    })
    expect(calls).toBe(0)
    expect(pos).toEqual({ x: 30, y: 40, dir: 'left' })
  })
})
