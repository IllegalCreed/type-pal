import { describe, expect, it } from 'vitest'
import { BANANA, CHECKPOINTS } from './checkpoints.js'

describe('checkpoints', () => {
  it('正好 21 个,id 唯一,时间单调递增', () => {
    expect(CHECKPOINTS.length).toBe(21)
    expect(new Set(CHECKPOINTS.map((c) => c.id)).size).toBe(21)
    for (let i = 1; i < CHECKPOINTS.length; i++) {
      expect(CHECKPOINTS[i]!.defaultBestMs).toBeGreaterThan(CHECKPOINTS[i - 1]!.defaultBestMs)
    }
  })
  it('首尾节点正确', () => {
    expect(CHECKPOINTS[0]?.name).toBe('见石碑')
    expect(CHECKPOINTS[20]?.name).toBe('通关')
  })
  it('香蕉配置(照抄 PalTimer 3 精确格 + PARTYOFFSET,零容差)', () => {
    expect(BANANA.scene).toBe(177)
    expect(BANANA.itemId).toBe(291)
    expect(BANANA.cells).toEqual([
      [1248, 720],
      [1280, 720],
      [1280, 704],
    ])
    expect(BANANA.tolX).toBe(0)
    expect(BANANA.tolY).toBe(0)
  })
})
