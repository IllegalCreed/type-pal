/**
 * G03-D。旧 follower-render 覆盖了空列表、trail 不够、站立左、行走右的 0..3 步，以及两人都在。
 * 本组补越界步、缺槽继续，以及朝左行走的步帧。
 */
import { describe, expect, it } from 'vitest'
import type { TrailEntry } from '../core/game-state.js'
import { computeFollowerRenderItems } from './follower-render.js'

function trail(slots: Array<[number, number, TrailEntry['dir']] | null>): TrailEntry[] {
  const out: TrailEntry[] = []
  for (const slot of slots) {
    if (!slot) break
    out.push({ x: slot[0], y: slot[1], dir: slot[2] })
  }
  return out
}

function full(dir: TrailEntry['dir'], x = 100, y = 200): TrailEntry[] {
  return trail([
    [0, 0, 'down'],
    [1, 0, 'down'],
    [2, 0, 'down'],
    [x, y, dir],
  ])
}

describe('G03-D computeFollowerRenderItems 缺槽与越界步', () => {
  it('G03-D01 行走且 stepFrame 为 4 时步帧回落到 0，朝右的帧是 9', () => {
    const items = computeFollowerRenderItems(full('right'), [82], true, 4)
    expect(items).toHaveLength(1)
    expect(items[0]?.frameIdx).toBe(9)
    expect(items[0]?.spriteNum).toBe(82)
  })

  it('G03-D02 第一个跟随者缺 trail[3]、第二个有 trail[4] 时只留下 index 1', () => {
    const slots: TrailEntry[] = [
      { x: 0, y: 0, dir: 'down' },
      { x: 1, y: 0, dir: 'down' },
      { x: 2, y: 0, dir: 'down' },
    ]
    slots[4] = { x: 90, y: 190, dir: 'down' }
    const items = computeFollowerRenderItems(slots, [82, 83], false, 0)
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      worldX: 90,
      worldY: 190,
      frameIdx: 0,
      spriteNum: 83,
      followerIndex: 1,
    })
  })

  it('G03-D03 朝左行走且 stepFrame 为 1 时帧是 5', () => {
    const items = computeFollowerRenderItems(full('left', 40, 50), [83], true, 1)
    expect(items[0]?.frameIdx).toBe(5)
    expect(items[0]?.worldX).toBe(40)
    expect(items[0]?.worldY).toBe(50)
  })

  it('G03-D04 第二个跟随者没有 trail[4] 时，第一个仍然留下', () => {
    const items = computeFollowerRenderItems(full('up'), [82, 83], true, 3)
    expect(items).toHaveLength(1)
    expect(items[0]?.followerIndex).toBe(0)
    expect(items[0]?.spriteNum).toBe(82)
    expect(items[0]?.frameIdx).toBe(7)
  })
})
