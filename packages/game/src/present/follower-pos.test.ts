import { describe, expect, it } from 'vitest'
import type { TrailEntry } from '../core/game-state.js'
import { computeFollowerWorldPos, type FollowerPosState } from './follower-pos.js'

function stationaryMemberState(overrides: Partial<FollowerPosState> = {}): FollowerPosState {
  return {
    party: { x: 1000, y: 500 },
    trail: [
      { x: 1000, y: 500, dir: 'down' },
      { x: 984, y: 500, dir: 'down' },
      { x: 968, y: 500, dir: 'down' },
    ],
    walking: false,
    frozenOffset: [],
    ...overrides,
  }
}
function walkingMemberState(
  trail: TrailEntry[],
  overrides: Partial<FollowerPosState> = {},
): FollowerPosState {
  return {
    party: { x: 1000, y: 500 },
    trail,
    walking: true,
    frozenOffset: [],
    ...overrides,
  }
}
const directionSourceTrail = (dir: TrailEntry['dir'], facing: TrailEntry['dir']): TrailEntry[] => [
  { x: 1000, y: 500, dir: 'down' },
  { x: 984, y: 500, dir },
  { x: 968, y: 500, dir: facing },
]
describe('Party member trail positions and frozen offsets', () => {
  it('walking:trail[1]+方向偏移(m=1 down → +16,-8)+ 朝向 trail[2].dir,并捕获 frozenOffset(含 dir)', () => {
    const s = stationaryMemberState({ walking: true })
    const p = computeFollowerWorldPos(s, 1, () => true)
    expect(p).toEqual({ x: 1000, y: 492, dir: 'down' }) // trail[1](984,500)+(16,-8);朝向 trail[2].dir
    expect(s.frozenOffset[1]).toEqual({ dx: 0, dy: -8, dir: 'down' }) // 位置偏移 + 朝向一并捕获
  })

  it('not walking + 有 frozenOffset:**位置冻结**、**朝向用当前 trail[2].dir**(sdlpal scene.c:761,不跟队长 0x15)', () => {
    const s = stationaryMemberState({
      walking: false,
      party: { x: 2000, y: 300 },
      frozenOffset: [null, { dx: 16, dy: -8, dir: 'up' }], // dir 仅捕获记录,渲染不读
      trail: [
        { x: 2000, y: 300, dir: 'down' },
        { x: 2000, y: 300, dir: 'down' },
        { x: 1900, y: 300, dir: 'down' }, // trail[2].dir='down' → 朝向取此
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false)
    expect(p).toEqual({ x: 2016, y: 292, dir: 'down' }) // 位置=leader+冻结offset;朝向=trail[2].dir('down'),非冻结'up'
  })

  it('静止有快照且 trail 只有两项：位置按偏移，朝向回退 trail[1]', () => {
    const s = stationaryMemberState({
      walking: false,
      party: { x: 500, y: 500 },
      frozenOffset: [null, { dx: 16, dy: -8, dir: 'down' }],
      trail: [
        { x: 500, y: 500, dir: 'down' },
        { x: 500, y: 500, dir: 'down' },
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false)
    expect(p).toEqual({ x: 516, y: 492, dir: 'down' })
  })

  it('not walking + 无 frozenOffset(0x46 摆位):跟随者落 trail[m]=队长+m×offset(只退一格,sdlpal script.c:1690),非 trail[1] 再叠偏移', () => {
    // sdlpal 0x46(script.c:1690-1700)把 rgParty[i]=rgTrail[i]=队长+i×offset,演出期不调
    //   PAL_UpdatePartyGestures → 位置冻结;member m 即 rgTrail[m]。dir=down 填 offset=(+16,-8)。
    //   旧码这里回退 trail[1]+offset=队长+2×offset → 多退一格(刘晋元叫醒黑屏后两人间隙)。
    const s = stationaryMemberState({
      walking: false,
      frozenOffset: [],
      party: { x: 1000, y: 500 },
      trail: [
        { x: 1000, y: 500, dir: 'down' }, // trail[0]=队长
        { x: 1016, y: 492, dir: 'down' }, // trail[1]=队长+1×offset(紧贴)
        { x: 1032, y: 484, dir: 'down' }, // trail[2]=队长+2×offset
      ],
    })
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 1016, y: 492, dir: 'down' }) // =trail[1],非 (1032,484)
    expect(computeFollowerWorldPos(s, 2, () => true)).toEqual({ x: 1032, y: 484, dir: 'down' }) // =trail[2]
  })

  it('not walking 不捕获 frozenOffset(只在 walking 捕获,避免冻结值漂移)', () => {
    const s = stationaryMemberState({ walking: false, frozenOffset: [] })
    computeFollowerWorldPos(s, 1, () => true)
    expect(s.frozenOffset[1]).toBeUndefined()
  })

  it('trail 不足(length<=1)→ null(不画跟随者)', () => {
    const s = stationaryMemberState({ trail: [{ x: 1, y: 2, dir: 'down' }] })
    expect(computeFollowerWorldPos(s, 1, () => true)).toBeNull()
  })

  it('G03-C01 m=1 且 trail[1] 朝右时偏移为 -16,-8，返回朝向仍是 trail[2]', () => {
    const s = walkingMemberState(directionSourceTrail('right', 'up'))
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 968, y: 492, dir: 'up' })
    expect(s.frozenOffset[1]).toEqual({ dx: -32, dy: -8, dir: 'up' })
  })

  it('G03-C02 m=1 且 trail[1] 朝左时偏移为 +16,+8', () => {
    const s = walkingMemberState(directionSourceTrail('left', 'right'))
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 1000, y: 508, dir: 'right' })
  })

  it('G03-C03 m=1 且 trail[1] 朝上时偏移为 -16,+8', () => {
    const s = walkingMemberState(directionSourceTrail('up', 'left'))
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 968, y: 508, dir: 'left' })
  })

  it('G03-C04 m=2 朝下时偏移是 +16,+8，不是 m=1 的 +16,-8', () => {
    const s = walkingMemberState(directionSourceTrail('down', 'left'))
    expect(computeFollowerWorldPos(s, 2, () => true)).toEqual({ x: 1000, y: 508, dir: 'left' })
  })

  it('G03-C05 m=2 朝右时水平偏移为 -16，垂直仍是 +8', () => {
    const s = walkingMemberState(directionSourceTrail('right', 'down'))
    expect(computeFollowerWorldPos(s, 2, () => true)).toEqual({ x: 968, y: 508, dir: 'down' })
  })

  it('G03-C06 偏移落在障碍上时，冻结的是退回 trail[1] 之后的位移', () => {
    const s = walkingMemberState(directionSourceTrail('down', 'down'))
    const pos = computeFollowerWorldPos(s, 1, () => false)
    expect(pos).toEqual({ x: 984, y: 500, dir: 'down' })
    expect(s.frozenOffset[1]).toEqual({ dx: -16, dy: 0, dir: 'down' })
  })

  it('G03-C07 走路时不沿用旧冻结，并把它改写成这次的位移', () => {
    const s = walkingMemberState(directionSourceTrail('down', 'down'), {
      frozenOffset: [null, { dx: 50, dy: 50, dir: 'up' }],
    })
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 1000, y: 492, dir: 'down' })
    expect(s.frozenOffset[1]).toEqual({ dx: 0, dy: -8, dir: 'down' })
  })

  it('G03-C08 trail 没有第 3 项时，朝向回退 trail[1].dir', () => {
    const s = walkingMemberState([
      { x: 1000, y: 500, dir: 'down' },
      { x: 984, y: 500, dir: 'left' },
    ])
    expect(computeFollowerWorldPos(s, 1, () => true)).toEqual({ x: 1000, y: 508, dir: 'left' })
  })

  it('G03-C09 静止且成员下标超出 trail 时，用最后一项的坐标', () => {
    const s = walkingMemberState(
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
    const s = walkingMemberState(
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
