/** 像素到菱形格的碰撞纯计算；不推进场景、脚本或游戏状态。 */
import type { Tilemap } from '@type-pal/shared'
import { type NpcState, PARTYOFFSET_X, PARTYOFFSET_Y } from './game-state.js'

const TILE_W = 32
const TILE_H = 16
// PAL_CheckObstacleWithRange：先用未作菱形调整的格坐标检查屏幕左上边缘。
const BLOCK_X = PARTYOFFSET_X / TILE_W
const BLOCK_Y = PARTYOFFSET_Y / TILE_H

/**
 * 读 TileCell obstacle bit。
 *
 * sdlpal map.c:298  `return (lpMap->Tiles[y][x][h] & 0x2000) >> 13;`
 * → bit 13 (0-indexed) of the tile value = obstacle flag。
 * h=0 → cell.lower;h=1 → cell.upper。
 */
function tilemapIsBlocked(tilemap: Tilemap, col: number, row: number, h: 0 | 1): boolean {
  if (col < 0 || col >= tilemap.width || row < 0 || row >= tilemap.height) return true
  const cell = tilemap.cells[row]?.[col]
  if (!cell) return true
  const tileWord = h === 0 ? cell.lower : cell.upper
  // obstacle bit = bit 13 of tile word (sdlpal map.c:298 `& 0x2000`)
  return (tileWord & 0x2000) !== 0
}

/**
 * 菱形 isometric 碰撞判定(P0.a,port sdlpal scene.c:512-633 PAL_CheckObstacleWithRange)。
 *
 * 1. 把像素坐标用菱形四分法映射到 (col, row, h=0/1) tile — 直接 port sdlpal scene.c:556-591。
 * 2. 查 tilemap obstacle bit(bit 13 of lower/upper word)。
 * 3. 查 NPC 菱形曼哈顿距离(sdlpal scene.c:624:abs(dx)+abs(dy)*2 < 16)。
 *    只有sState>=2的对象阻挡，触发模式不参与碰撞判断。
 *
 * @param tilemap  当前场景 tilemap
 * @param posX     目标像素 X
 * @param posY     目标像素 Y
 * @param npcs     当前场景 NPC 列表(可选,默认空数组)
 * @param selfNpcId 跳过自身(party=0,NPC 移动时传自己 id)
 */
export function isWalkable(
  tilemap: Tilemap,
  posX: number,
  posY: number,
  npcs: ReadonlyArray<NpcState> = [],
  selfNpcId: number = 0,
  /**
   * M5:sdlpal `fCheckRange`(scene.c:818 PAL_UpdateParty 走路 / 712-713 follower 避障传 TRUE;
   * scene.c:512 PAL_CheckObstacle 怪物追击默认 FALSE)。TRUE 时加 blockX/blockY 下边界。
   */
  fCheckRange: boolean = false,
): boolean {
  // ── Step 1: 菱形四分法 → (col, row, h) ──────────────────────────────────
  // 直接 port sdlpal scene.c:556-591
  let col = Math.floor(posX / TILE_W)
  let row = Math.floor(posY / TILE_H)
  let h: 0 | 1 = 0
  const xr = posX % TILE_W // 0..31
  const yr = posY % TILE_H // 0..15

  // M5:fCheckRange 下边界(sdlpal scene.c:563-567)—— 用菱形调整**前**的 col/row(C 在 569+ 菱形之前
  //   就 `if(x<blockX||y<blockY) return TRUE`)。队首走不进左上 5 列 / 上 7 行边缘带,镜头恒居中。
  if (fCheckRange && (col < BLOCK_X || row < BLOCK_Y)) return false

  if (xr + yr * 2 >= 16) {
    if (xr + yr * 2 >= 48) {
      col++
      row++
    } else if (32 - xr + yr * 2 < 16) {
      col++
    } else if (32 - xr + yr * 2 < 48) {
      h = 1
    } else {
      row++
    }
  }

  // ── Step 2: tilemap obstacle bit (sdlpal map.c:298 bit 13) ──────────────
  if (tilemapIsBlocked(tilemap, col, row, h)) return false

  // ── Step 3: NPC 菱形曼哈顿距离 (sdlpal scene.c:619-628) ────────────────
  // sState<2允许穿行；sprite和triggerMode都不构成blocker豁免。
  for (const npc of npcs) {
    if (npc.id === selfNpcId) continue
    if ((npc.sState ?? 1) < 2) continue
    if (Math.abs(npc.x - posX) + Math.abs(npc.y - posY) * 2 < 16) return false
  }

  return true
}
