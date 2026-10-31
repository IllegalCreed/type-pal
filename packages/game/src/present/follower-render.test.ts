import { describe, expect, it } from 'vitest'
import type { TrailEntry } from '../core/game-state.js'
import { computeFollowerRenderItems } from './follower-render.js'

function trailFromPoints(...dirs: Array<[number, number, TrailEntry['dir']]>): TrailEntry[] {
  return dirs.map(([x, y, dir]) => ({ x, y, dir }))
}
function extraFollowerTrail(dir: TrailEntry['dir'], x = 100, y = 200): TrailEntry[] {
  return [
    { x: 0, y: 0, dir: 'down' },
    { x: 1, y: 0, dir: 'down' },
    { x: 2, y: 0, dir: 'down' },
    { x, y, dir },
  ]
}
describe('Extra follower sprite items', () => {
  it('无 follower → 空', () => {
    expect(computeFollowerRenderItems(trailFromPoints(), [], false, 0)).toEqual([])
    expect(computeFollowerRenderItems(trailFromPoints(), undefined, true, 1)).toEqual([])
  })

  it('trail 深度不足(< 4)→ 跳过(不报错)', () => {
    // 只有 trail[0..2],follower 需 trail[3] → 跳过
    const t = trailFromPoints([10, 10, 'down'], [11, 11, 'down'], [12, 12, 'down'])
    expect(computeFollowerRenderItems(t, [82], true, 1)).toEqual([])
  })

  it('follower 0 → trail[3] 位置(world,无偏移)+ MGO chunk', () => {
    const t = trailFromPoints(
      [0, 0, 'down'],
      [1, 0, 'down'],
      [2, 0, 'down'],
      [100, 200, 'left'], // trail[3] ← follower 0
    )
    const r = computeFollowerRenderItems(t, [82], false, 0)
    expect(r).toHaveLength(1)
    expect(r[0]!.worldX).toBe(100)
    expect(r[0]!.worldY).toBe(200)
    expect(r[0]!.spriteNum).toBe(82) // 0x98 operand = MGO chunk 直接(res.c:340)
    expect(r[0]!.followerIndex).toBe(0)
  })

  it('站立帧 = dir*3(无 step;left dir=1 → 3)', () => {
    const t = trailFromPoints([0, 0, 'down'], [1, 0, 'down'], [2, 0, 'down'], [100, 200, 'left'])
    const r = computeFollowerRenderItems(t, [82], false, 2 /*stepFrame 无关*/)
    expect(r[0]!.frameIdx).toBe(1 * 3 + 0) // left=1 → 3
  })

  it('行走帧 = dir*3 + iStepFrameFollower[step](序列 [0,2,0,1],区别于 leader [0,1,0,2])', () => {
    const t = trailFromPoints([0, 0, 'down'], [1, 0, 'down'], [2, 0, 'down'], [100, 200, 'right'])
    // right dir=3 → base 9;step 0/1/2/3 → +0/+2/+0/+1
    expect(computeFollowerRenderItems(t, [82], true, 0)[0]!.frameIdx).toBe(9)
    expect(computeFollowerRenderItems(t, [82], true, 1)[0]!.frameIdx).toBe(11)
    expect(computeFollowerRenderItems(t, [82], true, 2)[0]!.frameIdx).toBe(9)
    expect(computeFollowerRenderItems(t, [82], true, 3)[0]!.frameIdx).toBe(10)
  })

  it('两 follower → trail[3]/[4],各自 dir/chunk/index', () => {
    const t = trailFromPoints(
      [0, 0, 'down'],
      [1, 0, 'down'],
      [2, 0, 'down'],
      [100, 200, 'up'], // trail[3] ← follower 0(up dir=2)
      [90, 190, 'down'], // trail[4] ← follower 1(down dir=0)
    )
    const r = computeFollowerRenderItems(t, [82, 83], false, 0)
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({
      worldX: 100,
      worldY: 200,
      spriteNum: 82,
      followerIndex: 0,
      frameIdx: 2 * 3,
    })
    expect(r[1]).toMatchObject({
      worldX: 90,
      worldY: 190,
      spriteNum: 83,
      followerIndex: 1,
      frameIdx: 0 * 3,
    })
  })

  it('G03-D01 防御输入：行走且 stepFrame 为 4 时步帧回落到 0，朝右的帧是 9', () => {
    const items = computeFollowerRenderItems(extraFollowerTrail('right'), [82], true, 4)
    expect(items).toHaveLength(1)
    expect(items[0]?.frameIdx).toBe(9)
    expect(items[0]?.spriteNum).toBe(82)
  })

  it('G03-D03 朝左行走且 stepFrame 为 1 时帧是 5', () => {
    const items = computeFollowerRenderItems(extraFollowerTrail('left', 40, 50), [83], true, 1)
    expect(items[0]?.frameIdx).toBe(5)
    expect(items[0]?.worldX).toBe(40)
    expect(items[0]?.worldY).toBe(50)
  })

  it('G03-D04 第二个跟随者没有 trail[4] 时，第一个仍然留下', () => {
    const items = computeFollowerRenderItems(extraFollowerTrail('up'), [82, 83], true, 3)
    expect(items).toHaveLength(1)
    expect(items[0]?.followerIndex).toBe(0)
    expect(items[0]?.spriteNum).toBe(82)
    expect(items[0]?.frameIdx).toBe(7)
  })
})
