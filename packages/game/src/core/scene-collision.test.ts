import { describe, expect, it } from 'vitest'
import type { NpcState } from './game-state.js'
import { makeBlockedMap, makeFlatMap } from './scene.test-fixtures.js'
import { isWalkable } from './scene-collision.js'

// ── P0.a: 菱形 isometric 碰撞(port sdlpal scene.c:512 + map.c:298) ─────────
//
// sdlpal 真值:
//   obstacle bit = bit 13 (0x2000) of u16 tile word (map.c:298)。
//   h=0 → cell.lower;h=1 → cell.upper。
//   菱形四分法(scene.c:572-591)把像素坐标映射到 (col, row, h)。
//   NPC 菱形曼哈顿距离(scene.c:624):abs(dx)+abs(dy)*2 < 16。
describe('P0.a 菱形 isometric 碰撞', () => {
  // ── 1. tile 坐标映射:无残差直接 /32 /16 ─────────────────────────────────
  it('目标像素 /32 /16 取 tile col/row(无残差 → h=0)', () => {
    // pos (32, 16) → col=1, row=1, xr=0, yr=0, 0+0=0 < 16 → 不进 if → h=0
    const blockedMap = makeBlockedMap(4, 4, [[1, 1]])
    expect(isWalkable(blockedMap, 32, 16)).toBe(false)
    // pos (0, 0) → col=0, row=0 — 该 tile 不阻
    expect(isWalkable(blockedMap, 0, 0)).toBe(true)
    // pos (64, 32) → col=2, row=2 — 不阻
    expect(isWalkable(blockedMap, 64, 32)).toBe(true)
  })

  // ── 2. 残差四分:h=1 三角区域 ─────────────────────────────────────────────
  it('残差进 h=1 分支(32-xr+yr*2 ∈ [16,48))', () => {
    // pos (24, 8) → col=0, row=0, xr=24, yr=8
    //   xr+yr*2 = 24+16 = 40 ≥ 16 进 if
    //   40 < 48,32-24+8*2 = 24 ∈ [16,48) → h=1
    const blockedMapH1 = makeBlockedMap(4, 4, [], [[0, 0]])
    expect(isWalkable(blockedMapH1, 24, 8)).toBe(false)
    // 同坐标,h=0 阻 tile 不影响
    const blockedMapH0Only = makeBlockedMap(4, 4, [[0, 0]])
    expect(isWalkable(blockedMapH0Only, 24, 8)).toBe(true)
  })

  // ── 3. 残差四分:右下角 x++,y++ ──────────────────────────────────────────
  it('残差 xr+yr*2 ≥ 48 → col++,row++ (右下角)', () => {
    // pos (28, 14) → col=0, row=0, xr=28, yr=14, xr+yr*2=56 ≥ 48 → col=1, row=1, h=0
    const blockedMap = makeBlockedMap(4, 4, [[1, 1]])
    expect(isWalkable(blockedMap, 28, 14)).toBe(false)
  })

  // ── 4. 残差四分:右侧边 col++ ──────────────────────────────────────────────
  it('残差 32-xr+yr*2 < 16 → col++ (右侧边)', () => {
    // pos (30, 2) → col=0, row=0, xr=30, yr=2, xr+yr*2=34 ≥ 16 且 <48
    // 32-30+2*2 = 6 < 16 → col=1, h=0, row=0
    const blockedMap = makeBlockedMap(4, 4, [[1, 0]])
    expect(isWalkable(blockedMap, 30, 2)).toBe(false)
  })

  // ── 5. 残差四分:下侧边 row++ ──────────────────────────────────────────────
  it('残差 32-xr+yr*2 ≥ 48 → row++ (下侧边)', () => {
    // pos (2, 14) → col=0, row=0, xr=2, yr=14, xr+yr*2=30 ≥ 16 且 <48
    // 32-2+14*2 = 58 ≥ 48 → row=1, h=0, col=0
    const blockedMap = makeBlockedMap(4, 4, [[0, 1]])
    expect(isWalkable(blockedMap, 2, 14)).toBe(false)
  })

  // ── 6. 越界返回 false ─────────────────────────────────────────────────────
  it('越界坐标(col 或 row 超出 tilemap)→ false', () => {
    const map = makeBlockedMap(2, 2)
    // 超出边界 → tilemapIsBlocked 返回 true → isWalkable false
    expect(isWalkable(map, 64, 0)).toBe(false) // col=2 >= width=2
    expect(isWalkable(map, 0, 32)).toBe(false) // row=2 >= height=2
  })

  // ── 7. NPC 菱形曼哈顿距离 abs(dx)+abs(dy)*2 < 16 ─────────────────────────
  it('NPC 在目标像素菱形范围内(距离 < 16)→ 阻挡', () => {
    const map = makeFlatMap(20, 20)
    const npcs: NpcState[] = [{ id: 1, x: 100, y: 50, spriteNum: 0, triggerMode: 0, sState: 2 }]
    // pos (105, 53): dx=5, dy=3, 5+6=11 < 16 → 阻
    expect(isWalkable(map, 105, 53, npcs, 0)).toBe(false)
    // pos (108, 54): dx=8, dy=4, 8+8=16, 不 < 16 → 不阻
    expect(isWalkable(map, 108, 54, npcs, 0)).toBe(true)
  })

  // ── 8. selfNpcId 跳过自己 ─────────────────────────────────────────────────
  it('selfNpcId 跳过自身 NPC', () => {
    const map = makeFlatMap(20, 20)
    const npcs: NpcState[] = [{ id: 3, x: 100, y: 50, spriteNum: 0, triggerMode: 0 }]
    // 自身 id=3,pos 就在 npc 正上,不应被自己阻挡
    expect(isWalkable(map, 100, 50, npcs, 3)).toBe(true)
  })

  it('NPC阻挡只取决于sState，triggerMode为3/4/5都不构成豁免', () => {
    const map = makeFlatMap(20, 20)
    for (const triggerMode of [3, 4, 5]) {
      const npc = { id: 2, x: 100, y: 50, spriteNum: 0, triggerMode, sState: 1 }
      expect(isWalkable(map, 100, 50, [npc], 0)).toBe(true)
      npc.sState = 2
      expect(isWalkable(map, 100, 50, [npc], 0)).toBe(false)
    }
  })
})
