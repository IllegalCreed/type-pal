/**
 * M5.6 W1.c:Confirm-key Search 完整 port — sdlpal `play.c:362-510`。
 *
 * 真值机制:
 *   1. PAL_GetSearchTriggerRange:计算 party 朝向前 13 个 grid cell(party 像素 → 13 偏移点);
 *      rgPos[0] = party 位置,后 12 个按 (xOffset, yOffset) 按 4 排扩散。
 *   2. PAL_Search:遍历 13 cell × scene 内 EventObject,对每 EventObject 检查:
 *      - sState > 0
 *      - triggerMode 1..3(SearchNear/Normal/Far)
 *      - triggerMode * 6 - 4 < i:远 trigger 只在远 cell(i 大)触发,
 *        即 mode 1 (i>=2 触发) / mode 2 (i>=8 触发) / mode 3 (i>=14 触发,实际全 13 cell 不触发,
 *        sdlpal 真值这里看起来是 mode 1 表示"近触发",mode 3 表示"远才触发"的反直觉)
 *      - 同 grid cell(转为 col=x/32, row=y/16, h=x%32?1:0)
 *      - 命中 → 跑 wTriggerScript + return(只触发第一个)
 *
 * 替换 M3.5 简版"facing 前 1 步 + npcAt 严格 ==" 的不足:
 *   - 步长 parity 让 party.x/y 经常无法精确等于 npc.x/y → npcAt 失效
 *   - 不区分 SearchNear/Normal/Far(全按 1 步处理)
 */

import type { NpcState } from './game-state.js'

export type Facing = 'up' | 'down' | 'left' | 'right'

/** sdlpal palcommon.h enum:kDirSouth=0, kDirWest=1, kDirNorth=2, kDirEast=3 */
const FACING_TO_DIR: Record<Facing, number> = { down: 0, left: 1, up: 2, right: 3 }

const DIR_SOUTH = 0
const _DIR_WEST = 1
const DIR_NORTH = 2
const DIR_EAST = 3

export interface SearchCell {
  x: number
  y: number
}

/**
 * sdlpal play.c:362-419 真值 — 返回 party 朝向前方 13 个 grid 检查点。
 */
export function getSearchTriggerRange(
  facing: Facing,
  partyX: number,
  partyY: number,
): SearchCell[] {
  const dir = FACING_TO_DIR[facing]
  // sdlpal play.c:390-406:xOffset/yOffset 由 partyDirection 决定
  const xOffset = dir === DIR_NORTH || dir === DIR_EAST ? 16 : -16
  const yOffset = dir === DIR_EAST || dir === DIR_SOUTH ? 8 : -8

  const cells: SearchCell[] = []
  cells.push({ x: partyX, y: partyY }) // rgPos[0]

  let x = partyX
  let y = partyY
  for (let i = 0; i < 4; i++) {
    // sdlpal play.c:412-414:每排 3 个 cell
    cells.push({ x: x + xOffset, y: y + yOffset })
    cells.push({ x, y: y + yOffset * 2 })
    cells.push({ x: x + 2 * xOffset, y })
    // 下一排基准
    x += xOffset
    y += yOffset
  }

  return cells
}

/**
 * sdlpal play.c:423-510 PAL_Search — 遍历 13 cell × scene EventObjects,返回第一个命中的 NPC。
 */
export function findSearchableNpc(
  npcs: NpcState[],
  facing: Facing,
  partyX: number,
  partyY: number,
): NpcState | undefined {
  const cells = getSearchTriggerRange(facing, partyX, partyY)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!
    const dx = Math.floor(cell.x / 32)
    const dy = Math.floor(cell.y / 16)
    const dh = cell.x % 32 ? 1 : 0
    for (const npc of npcs) {
      // sdlpal play.c:464-468 过滤
      if ((npc.sState ?? 1) <= 0) continue
      const mode = npc.triggerMode ?? 0
      if (mode === 0 || mode >= 4) continue // 0 = none;4-8 是 auto trigger zone(W1.b 处理)
      // sdlpal play.c:466:triggerMode * 6 - 4 < i  → mode 1 需 i>=3;mode 2 需 i>=9;mode 3 需 i>=15
      if (mode * 6 - 4 < i) continue
      const ex = Math.floor(npc.x / 32)
      const ey = Math.floor(npc.y / 16)
      const eh = npc.x % 32 ? 1 : 0
      if (dx !== ex || dy !== ey || dh !== eh) continue
      return npc
    }
  }
  return undefined
}
