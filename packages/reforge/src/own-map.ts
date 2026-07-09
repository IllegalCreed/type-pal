/**
 * 自有地图(W7)—— 作者绘制的地图,复用引擎 Tilemap 形(width/height/cells{lower,upper}/tileset),
 * 存工程内 content/maps/<id>.json,引擎渲染/碰撞与复用原版地图一套代码。
 * 本文件:地图构造/编辑纯逻辑(TDD);tileset 引用解析(蹭原版号 / 自有)= W7a-4 加载分流。
 *
 * 子格模型(W7c,与 render/collision 同源):cell.lower / cell.upper 不是图层,是同一格的
 * 两个**错排菱形子格**(h=0 整格位 / h=1 右下偏半格);每个子格 word 是完整 u32 ——
 * layer0 瓦片 = 位 0-7 + 位 12 作第 9 位,layer1 在高 16 位(0=无),高度位 8-11,障碍 bit13。
 */
import type { TileCell, Tilemap } from '@type-pal/shared'

/** 空白自有地图:cols×rows 全空格(lower/upper=0),引用给定 tileset。 */
export function buildBlankOwnMap(cols: number, rows: number, tileset: string): Tilemap {
  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ lower: 0, upper: 0 })),
  )
  return { width: cols, height: rows, cells, tileset }
}

/** layer0 可编码的最大瓦片索引(9 位:位 0-7 + 位 12)。面板超界瓦片禁选。 */
export const MAX_LAYER0_TILE = 0x1ff

/** layer1 存 tileId + 1,所以最大可画 tileId 少 1；高 16 位的 0 表示无瓦片。 */
export const MAX_LAYER1_TILE = 0x1fe

/** masked write 位域:画瓦只动瓦片位,碰撞只动 bit13。 */
export const LAYER0_TILE_MASK = 0x000010ff
export const LAYER1_TILE_MASK = 0x10ff0000
export const LAYER1_CLEAR_MASK = 0xffff0000
export const COLLISION_MASK = 0x00002000

const FULL_WORD_MASK = 0xffffffff

/**
 * 瓦片索引 → 子格 word(仅 layer0 位;layer1/高度/障碍 = 0 —— 笔刷画的新格是干净地板)。
 * 逆运算 = render.ts tileIdLayer0。0 = 空(tileset frame 0 惯例为透明/黑帧)。
 */
export function encodeTileLayer0(tileId: number): number {
  return (tileId & 0xff) | ((tileId & 0x100) << 4)
}

/**
 * 瓦片索引 → 子格 word 的 layer1 位。
 * render.ts tileIdLayer1 读高 16 位后 -1,所以写入时必须 +1；0 保留给「无上层瓦片」。
 */
export function encodeTileLayer1(tileId: number): number {
  return (encodeTileLayer0(tileId + 1) << 16) >>> 0
}

/** 一笔子格编辑:h=0 写 cell.lower,h=1 写 cell.upper;mask 缺省 = 整 word 覆盖。 */
export interface SubTileEdit {
  col: number
  row: number
  h: 0 | 1
  word: number
  mask?: number
}

/** 子格坐标(不带 word;矩形/填充枚举产物)。 */
export interface SubTilePos {
  col: number
  row: number
  h: 0 | 1
}

/**
 * 像素 AABB 内的所有菱形子格(W7c 矩形工具)。子格中心:h=0→(32c,16r) / h=1→(32c+16,16r+8),
 * 即 lattice (16a, 8b) 且 a+b 偶(a 偶⇒h=0,a 奇⇒h=1)。端点任意序;含界外(paintCells 会忽略)。
 */
export function subTilesInRect(x0: number, y0: number, x1: number, y1: number): SubTilePos[] {
  const [xa, xb] = x0 <= x1 ? [x0, x1] : [x1, x0]
  const [ya, yb] = y0 <= y1 ? [y0, y1] : [y1, y0]
  const out: SubTilePos[] = []
  for (let b = Math.ceil(ya / 8); b * 8 <= yb; b++) {
    for (let a = Math.ceil(xa / 16); a * 16 <= xb; a++) {
      if (((a + b) & 1) !== 0) continue
      if ((a & 1) === 0) out.push({ col: a >> 1, row: b >> 1, h: 0 })
      else out.push({ col: (a - 1) >> 1, row: (b - 1) >> 1, h: 1 })
    }
  }
  return out
}

/**
 * 填充(W7c):从起点子格 BFS 同 word 连通区,返回替换编辑集(不改图;喂 PaintTilesCommand)。
 * 邻接 = 错排菱形相切的 4 个对角子格(h=0 的邻居全是 h=1,反之亦然)。起点已是目标 word → []。
 */
export function floodFillSubTiles(
  map: Tilemap,
  start: SubTilePos,
  word: number,
  mask = FULL_WORD_MASK,
): SubTileEdit[] {
  const at = (c: number, r: number, h: 0 | 1): number | undefined => {
    const cell = r >= 0 && r < map.height && c >= 0 && c < map.width ? map.cells[r]?.[c] : undefined
    return cell === undefined ? undefined : h === 0 ? cell.lower : cell.upper
  }
  const target = at(start.col, start.row, start.h)
  const masked = (v: number): number => (v & mask) >>> 0
  const targetBits = target === undefined ? undefined : masked(target)
  if (targetBits === undefined || targetBits === masked(word)) return []
  const out: SubTileEdit[] = []
  const editMask = mask === FULL_WORD_MASK ? undefined : mask
  const seen = new Set<string>([`${start.col},${start.row},${start.h}`])
  const queue: SubTilePos[] = [start]
  while (queue.length > 0) {
    const cur = queue.pop()
    if (!cur) break
    const curWord = at(cur.col, cur.row, cur.h)
    if (curWord === undefined || masked(curWord) !== targetBits) continue
    out.push(editMask === undefined ? { ...cur, word } : { ...cur, word, mask: editMask })
    const { col: c, row: r, h } = cur
    const nbs: SubTilePos[] =
      h === 0
        ? [
            { col: c - 1, row: r - 1, h: 1 },
            { col: c, row: r - 1, h: 1 },
            { col: c - 1, row: r, h: 1 },
            { col: c, row: r, h: 1 },
          ]
        : [
            { col: c, row: r, h: 0 },
            { col: c + 1, row: r, h: 0 },
            { col: c, row: r + 1, h: 0 },
            { col: c + 1, row: r + 1, h: 0 },
          ]
    for (const nb of nbs) {
      const key = `${nb.col},${nb.row},${nb.h}`
      if (!seen.has(key)) {
        seen.add(key)
        queue.push(nb)
      }
    }
  }
  return out
}

function applyEditWord(oldWord: number, edit: SubTileEdit): number {
  const mask = edit.mask ?? FULL_WORD_MASK
  return ((oldWord & ~mask) | (edit.word & mask)) >>> 0
}

/**
 * 不可变 cell patch:按 edits 写子格 word(可带 mask),只克隆触及的行;界外/重复以后者为准。
 * 笔刷 stroke 预览(每帧临时图)与 PaintTilesCommand(入 undo)共用。
 */
export function paintCells(map: Tilemap, edits: readonly SubTileEdit[]): Tilemap {
  const touched = new Set<number>()
  for (const e of edits) {
    if (e.row >= 0 && e.row < map.height && e.col >= 0 && e.col < map.width) touched.add(e.row)
  }
  if (touched.size === 0) return map
  const cells = map.cells.map((row, ri) =>
    touched.has(ri) ? row.map((c): TileCell => ({ ...c })) : row,
  )
  for (const e of edits) {
    const cell = cells[e.row]?.[e.col]
    if (!cell) continue
    if (e.h === 0) cell.lower = applyEditWord(cell.lower, e)
    else cell.upper = applyEditWord(cell.upper, e)
  }
  return { ...map, cells }
}
