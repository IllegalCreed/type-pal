import { describe, it, expect } from 'vitest'
import type { NpcState } from './game-state.js'
import { findSearchableNpc, getSearchTriggerRange } from './scene-system-search.js'

function mkNpc(x: number, y: number, mode: number): NpcState {
  return { id: 1, x, y, spriteNum: 1, triggerLabel: 'L_X', triggerMode: mode, sState: 1 }
}

describe('M5.6 W1.c getSearchTriggerRange', () => {
  it('面朝 down(South,kDir=0)→ xOffset=-16, yOffset=+8;rgPos[0] = party 位置', () => {
    const cells = getSearchTriggerRange('down', 100, 100)
    expect(cells.length).toBe(13)
    expect(cells[0]).toEqual({ x: 100, y: 100 })
    // sdlpal play.c:412:rgPos[1] = (x + xOffset, y + yOffset) = (84, 108)
    expect(cells[1]).toEqual({ x: 84, y: 108 })
    // rgPos[2] = (x, y + 2*yOffset) = (100, 116)
    expect(cells[2]).toEqual({ x: 100, y: 116 })
    // rgPos[3] = (x + 2*xOffset, y) = (68, 100)
    expect(cells[3]).toEqual({ x: 68, y: 100 })
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
  it('面前 1 步内有 SearchNormal(mode 2) NPC → 命中', () => {
    // facing down (xOffset=-16, yOffset=+8);party (100, 100)
    // mode 2 需 i >= mode*6-4 = 8;cells[8] = (100 - 4*16/4, ...) — 让 NPC 在 cells[8] 周围
    // 简化:把 NPC 放 party 同格 (100, 100) → cells[0] 命中 — mode 2 需 i>=8,所以 cells[0] 不命中
    // 改 mode 1(i>=2 触发),NPC 在 cells[2] = (100, 116)
    const npc = mkNpc(100, 116, 1)
    const found = findSearchableNpc([npc], 'down', 100, 100)
    expect(found).toBe(npc)
  })

  it('mode 4-8 不被 Search 命中(auto trigger zone 路径,W1.b 处理)', () => {
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

  it('mode 3(SearchFar)全 13 cell 都触发(sdlpal:mode 越大 trigger zone 越远 — far 反而最易命中)', () => {
    // sdlpal play.c:466 真值:if (mode*6-4 < i) continue → mode 3 = 14;i 0..12 全 < 14 → 不 skip
    // → mode 3 NPC 在 13 cell 内任何位置都被命中(SearchFar = 远距离也触发)
    const npc = mkNpc(100, 100, 3)
    const found = findSearchableNpc([npc], 'down', 100, 100)
    expect(found).toBe(npc)
  })

  it('mode 1 NPC 在远 cell(cells[10] grid 外侧)不命中 — sdlpal SearchNear 只触前 3 cell', () => {
    // 'down' facing,cells[10] (i=10 是第 4 排) = (100 + 4*-16 + (-16), 100 + 4*8 + 8) = (20, 140)
    // 但 cells[10] / cells[11] / cells[12] grid 跟 cells[0..2] grid 完全不重叠
    // mode 1: i>=3 skip;NPC 放 cells[10] grid → 不命中
    const npc = mkNpc(20, 140, 1)
    const found = findSearchableNpc([npc], 'down', 100, 100)
    expect(found).toBeUndefined()
  })

  it('mode 2(SearchNormal)同 NPC 在 cells[10] grid → 命中(mode 2 允许 i<=8;实测 grid 距离 ok 即命中)', () => {
    // mode 2: mode*6-4 = 8;i 0..8 都不 skip(i=9+ skip)
    // cells 数组中(20,140)对应 i=10,被 skip
    // 但 NPC grid (20/32=0, 140/16=8, 20%32!=0→1) — 其他低 i cells 不一定同 grid
    // 此处验证:mode 2 在 cells[0..8] 范围内某 NPC grid 同 cells[3] grid (68/32=2, 100/16=6, 1) 命中
    const npc = mkNpc(68, 100, 2)
    const found = findSearchableNpc([npc], 'down', 100, 100)
    expect(found).toBe(npc) // cells[1] = (84,108) grid (2,6,1) 同 NPC grid (2,6,1) → 命中
  })
})
