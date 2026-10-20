/**
 * G03-D。旧 follower-render 覆盖了空列表、trail 不够、站立左、行走右的 0..3 步，以及两人都在。
 * 本组补公开number参数越界时的防御回落、尾部深度不足和朝左行走。
 * 生产stepFrame为0..3，trail为稠密前缀；不再用稀疏数组伪装正式caller。
 */
import { describe, expect, it } from 'vitest'
import type { TrailEntry } from '../core/game-state.js'
import { computeFollowerRenderItems } from './follower-render.js'

function full(dir: TrailEntry['dir'], x = 100, y = 200): TrailEntry[] {
  return [
    { x: 0, y: 0, dir: 'down' },
    { x: 1, y: 0, dir: 'down' },
    { x: 2, y: 0, dir: 'down' },
    { x, y, dir },
  ]
}

describe('G03-D computeFollowerRenderItems 缺槽与越界步', () => {
  it('G03-D01 防御输入：行走且 stepFrame 为 4 时步帧回落到 0，朝右的帧是 9', () => {
    const items = computeFollowerRenderItems(full('right'), [82], true, 4)
    expect(items).toHaveLength(1)
    expect(items[0]?.frameIdx).toBe(9)
    expect(items[0]?.spriteNum).toBe(82)
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
