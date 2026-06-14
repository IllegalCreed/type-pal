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

  it('集成(船划行):划船(ride)每步把 trail 刷成船行方向 → 跟随者朝向跟 trail(=队长),静止位置仍冻结', () => {
    // 船段:0x15 转队长 + 紧跟 ride 划船(每步 trail unshift 船行方向)。跟随者位置用冻结(防重叠)、
    //   朝向用当前 trail[2].dir = 船行方向 → 跟上队长。(旧 turnFollowersFrozen 硬同步朝向已移除。)
    const s = mkState({
      walking: false,
      frozenOffset: [null, { dx: 16, dy: -8, dir: 'up' }], // 上船时捕获的旧朝向(渲染不读)
      party: { x: 500, y: 500 },
      trail: [
        { x: 500, y: 500, dir: 'down' }, // ride 划船把 trail 全刷成船行方向 'down'
        { x: 500, y: 500, dir: 'down' },
        { x: 480, y: 500, dir: 'down' },
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false)
    expect(p!.dir).toBe('down') // 朝船行方向(=队长),靠 ride 更新的 trail,而非冻结朝向
  })

  it('回归(隐龙窟):站立对话时队长 0x15 回头不动 trail → 跟随者保持走来方向(不跟队长转)', () => {
    // 林月如(队长)0x15 转 East;李逍遥(跟随)站着没走,trail 仍是走来的 'left'(左上)。
    //   0x15 不改 trail → 跟随者保持 left,不被队长回头带转(user 2026-06-14 报李逍遥被转成右下)。
    const s = mkState({
      walking: false,
      frozenOffset: [null, { dx: 16, dy: -8, dir: 'left' }],
      party: { x: 500, y: 500 },
      trail: [
        { x: 500, y: 500, dir: 'left' }, // 队长 0x15 转 East 不改 trail
        { x: 500, y: 500, dir: 'left' },
        { x: 484, y: 508, dir: 'left' }, // trail[2].dir='left'(走来左上)
      ],
    })
    const p = computeFollowerWorldPos(s, 1, () => false)
    expect(p!.dir).toBe('left') // 保持走来左上,不跟林月如的 0x15 East
  })
})
