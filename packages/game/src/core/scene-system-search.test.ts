import { describe, expect, it } from 'vitest'
import type { NpcState } from './game-state.js'
import { findSearchableNpc, getSearchTriggerRange } from './scene-system-search.js'

function mkNpc(x: number, y: number, mode: number): NpcState {
  return { id: 1, x, y, spriteNum: 1, triggerLabel: 'L_X', triggerMode: mode, sState: 1 }
}

describe('M5.6 W1.c getSearchTriggerRange', () => {
  it('面朝 down(South,kDir=0)→ xOffset=-16, yOffset=+8;rgPos[0] = party 位置', () => {
    // 按 PAL_GetSearchTriggerRange 四排三点手算,检查完整顺序,不调用被测函数生成oracle。
    expect(getSearchTriggerRange('down', 160, 160)).toEqual([
      { x: 160, y: 160 },
      { x: 144, y: 168 },
      { x: 160, y: 176 },
      { x: 128, y: 160 },
      { x: 128, y: 176 },
      { x: 144, y: 184 },
      { x: 112, y: 168 },
      { x: 112, y: 184 },
      { x: 128, y: 192 },
      { x: 96, y: 176 },
      { x: 96, y: 192 },
      { x: 112, y: 200 },
      { x: 80, y: 184 },
    ])
  })

  it('面朝 right(East,kDir=3)→ xOffset=+16, yOffset=+8', () => {
    const cells = getSearchTriggerRange('right', 0, 0)
    expect(cells[1]).toEqual({ x: 16, y: 8 })
  })

  it('面朝 up(North,kDir=2)→ xOffset=+16, yOffset=-8', () => {
    const cells = getSearchTriggerRange('up', 0, 0)
    expect(cells[1]).toEqual({ x: 16, y: -8 })
  })
})

describe('M5.6 W1.c findSearchableNpc', () => {
  it('mode 1(SearchNear)包含最后允许的检查点i=2', () => {
    const npc = mkNpc(160, 176, 1)
    const found = findSearchableNpc([npc], 'right', 160, 160)
    expect(found).toBe(npc)
  })

  it('触碰触发mode 5不被Confirm搜索命中', () => {
    const npc = mkNpc(100, 100, 5)
    const found = findSearchableNpc([npc], 'down', 100, 100)
    expect(found).toBeUndefined()
  })

  it('mode 0(装饰)不被命中', () => {
    const npc = mkNpc(100, 100, 0)
    const found = findSearchableNpc([npc], 'down', 100, 100)
    expect(found).toBeUndefined()
  })

  it('sState <=0(Hidden)不被命中', () => {
    const npc: NpcState = { ...mkNpc(100, 100, 1), sState: 0 }
    const found = findSearchableNpc([npc], 'down', 100, 100)
    expect(found).toBeUndefined()
  })

  it('mode 3(SearchFar)包含最远检查点i=12', () => {
    // (240,184)的(col,row,h)=(7,11,1),与i=0..11均不同。
    const npc = mkNpc(240, 184, 3)
    const found = findSearchableNpc([npc], 'right', 160, 160)
    expect(found).toBe(npc)
  })

  it('mode 1(SearchNear)排除紧邻上限的检查点i=3', () => {
    const npc = mkNpc(192, 160, 1)
    const found = findSearchableNpc([npc], 'right', 160, 160)
    expect(found).toBeUndefined()
  })

  it('mode 2(SearchNormal)包含最后允许的检查点i=8', () => {
    const npc = mkNpc(192, 192, 2)
    const found = findSearchableNpc([npc], 'right', 160, 160)
    expect(found).toBe(npc)
  })

  it('mode 2(SearchNormal)排除紧邻上限的检查点i=9', () => {
    const npc = mkNpc(224, 176, 2)
    const found = findSearchableNpc([npc], 'right', 160, 160)
    expect(found).toBeUndefined()
  })

  it('优先命中靠前检查点,不因NPC数组先列远处对象而改变', () => {
    const farther = mkNpc(160, 176, 1) // i=2
    const closer: NpcState = { ...mkNpc(176, 168, 1), id: 2 } // i=1
    expect(findSearchableNpc([farther, closer], 'right', 160, 160)).toBe(closer)
  })
})
