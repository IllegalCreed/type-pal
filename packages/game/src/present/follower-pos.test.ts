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

  it('not walking + 有 frozenOffset:**位置冻结**、**朝向用当前 trail[2].dir**(sdlpal scene.c:761,不跟队长 0x15)', () => {
    const s = mkState({
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
    expect(p).toEqual({ x: 516, y: 492, dir: 'down' })
  })

  it('not walking + 无 frozenOffset(0x46 摆位):跟随者落 trail[m]=队长+m×offset(只退一格,sdlpal script.c:1690),非 trail[1] 再叠偏移', () => {
    // sdlpal 0x46(script.c:1690-1700)把 rgParty[i]=rgTrail[i]=队长+i×offset,演出期不调
    //   PAL_UpdatePartyGestures → 位置冻结;member m 即 rgTrail[m]。dir=down 填 offset=(+16,-8)。
    //   旧码这里回退 trail[1]+offset=队长+2×offset → 多退一格(刘晋元叫醒黑屏后两人间隙)。
    const s = mkState({
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
    const s = mkState({ walking: false, frozenOffset: [] })
    computeFollowerWorldPos(s, 1, () => true)
    expect(s.frozenOffset[1]).toBeUndefined()
  })

  it('trail 不足(length<=1)→ null(不画跟随者)', () => {
    const s = mkState({ trail: [{ x: 1, y: 2, dir: 'down' }] })
    expect(computeFollowerWorldPos(s, 1, () => true)).toBeNull()
  })
})
