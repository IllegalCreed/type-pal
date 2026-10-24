/** Coordinate and event-marker rules. Callers supply state snapshots and script tables; no DOM/clock/IO calls. */
import type { Command } from '@type-pal/shared'
import { OP_ADD_CASH, OP_ADD_ITEM, OP_ADD_MAGIC } from '../core/event-system.js'
import type { GameState, NpcState } from '../core/game-state.js'

// ── 世界像素 → 底图像素 变换(与 bootstrap.renderMapThumbnail 1:1) ──────────────
//   地图恒 64×128 tile(map.c 硬编码),tile 32×16 → 世界 2048×2048;缩略图 framebuffer
//   bufW=(64+1)*32=2080,camera=(-16,-16),输出 BASE_PX 宽;开发picker另用96px。
//   场景tab/widget的显示尺寸、DPR与视野裁剪共同决定最终缩放,不保证每档都是降采样。
const TILE_W = 32

const TILE_H = 16

const BUF_W = (64 + 1) * TILE_W

// 2080
export const BASE_PX = 640

// 底图坐标基准(px),与bootstrap getMapThumbnail的输出宽度一致
export const SCALE = BASE_PX / BUF_W

// 底图像素 / 世界像素
const CAM_OFF_X = TILE_W / 2

// 16(缩略图 camera.x = -16)
const CAM_OFF_Y = TILE_H

// viewport 世界像素高(SCREEN_H)

/** 世界像素按缩略图相机偏移/比例映射;出界输入不钳到图内。 */
export function worldToThumb(wx: number, wy: number): [number, number] {
  return [(wx + CAM_OFF_X) * SCALE, (wy + CAM_OFF_Y) * SCALE]
}

// ── 视图(底图源方形;缩放/居中) ─────────────────────────────────────────────
//   widget 缩放档(index 小→大 = 缩小→放大):视野世界宽度(px)。白框(320 世界px)占容器比例 = 320/视野宽:
//   2080→全图正好铺满 widget(最小缩放), 1280→1/4框, 960→1/3框(默认), 640→1/2框(最大放大)。
//   地图恒 64×128(2048²世界px)→ 档位对所有地图统一。场景 tab 恒全图(不受此影响)。
export const ZOOM_WORLD_WIDTHS = [2080, 1280, 960, 640] as const

export const DEFAULT_ZOOM_INDEX = 2

export interface MinimapView {
  sx: number
  sy: number
  sw: number
}

export const WHOLE_VIEW: MinimapView = { sx: 0, sy: 0, sw: BASE_PX }

/** 缩放视图(底图源方形):以世界点(cx,cy)为中心、targetWorldWidth 宽,clamp 到底图边界;>=全图→全图。 */
export function computeView(targetWorldWidth: number, cx: number, cy: number): MinimapView {
  const sw = Math.min(BASE_PX, targetWorldWidth * SCALE)
  if (sw >= BASE_PX) return WHOLE_VIEW
  const [pcx, pcy] = worldToThumb(cx, cy)
  const clamp = (c: number): number => Math.max(sw / 2, Math.min(BASE_PX - sw / 2, c))
  return { sx: clamp(pcx) - sw / 2, sy: clamp(pcy) - sw / 2, sw }
}

// ── 道具触发脚本扫描(宝物点) ─────────────────────────────────────────────────
export type EventKind = 'item' | 'teleport' | 'other'

/** triggerLabel → 全局命令下标:优先 labelMap,缺则按 `L_<n>` 直解(identity,n 即全局 ip)。 */
function resolveLabelIp(
  labelMap: Readonly<Record<string, number>>,
  label: string | undefined,
): number | undefined {
  if (!label) return undefined
  const mapped = labelMap[label]
  if (mapped !== undefined) return mapped
  const m = /^L_(\d+)$/.exec(label)
  return m ? Number(m[1]) : undefined
}

/**
 * 线性扫 label 起的 trigger 脚本到 'end' 判类别:
 *   含「给予」opcode → 'item'(宝物):giveItem/0x1F 道具、0x1E 加钱(正额)、0x55 学法术(都是地图可拾宝物,
 *   sdlpal script.c:952/970/1816);否则含 loadScene(0x59 传送) → 'teleport'(不标);否则 'other'。
 * item 优先(先命中即返回)。仅线性扫最多400条,不跟 goto/call;是工具标记启发式,没有覆盖率保证。
 */
export function classifyTrigger(
  commands: readonly Command[],
  labelMap: Readonly<Record<string, number>>,
  label: string | undefined,
): { kind: EventKind; name?: string } {
  const start = resolveLabelIp(labelMap, label)
  if (start === undefined) return { kind: 'other' }
  const LIMIT = 400 // 安全上限:防异常脚本无 'end' 走飞
  let teleport = false
  for (let i = start; i < commands.length && i < start + LIMIT; i++) {
    const c = commands[i]
    if (!c) break
    // 具名count>=0归作宝物,0按inventory helper给1(global.c:1094-1097);静态分类不执行脚本。
    if (c.op === 'giveItem' && c.count >= 0 && c.itemId > 0) return { kind: 'item', name: c._item }
    if (c.op === 'raw') {
      const op = c.opcode
      const a0 = c.operands[0] ?? 0
      if (op === OP_ADD_ITEM && a0 > 0) return { kind: 'item' } // raw 0x1F此处只看itemId,未检查signed数量;0x20另作移除
      if (op === OP_ADD_CASH && a0 > 0 && a0 < 0x8000) return { kind: 'item', name: '金钱' } // 正额=获得(负=花钱)
      if (op === OP_ADD_MAGIC && a0 > 0) return { kind: 'item', name: '法术' }
    }
    if (c.op === 'loadScene') teleport = true
    if (c.op === 'end') break
  }
  return { kind: teleport ? 'teleport' : 'other' }
}

/** 扫当前 scene 全 event object,返回 id → 类别(item/teleport/other,+ 宝物名)。 */
export function collectEventKinds(
  gs: GameState,
  commands: readonly Command[],
  labelMap: Readonly<Record<string, number>>,
): Map<number, { kind: EventKind; name?: string }> {
  const out = new Map<number, { kind: EventKind; name?: string }>()
  for (const npc of gs.npcs ?? [])
    out.set(npc.id, classifyTrigger(commands, labelMap, npc.triggerLabel))
  return out
}

// ── 数据采集 ───────────────────────────────────────────────────────────────
/** 本图可见性:sState为0/负或sVanishTime>0时过滤;缺省sState按可见处理。 */
function npcVisible(npc: NpcState): boolean {
  return (npc.sState === undefined || npc.sState > 0) && (npc.sVanishTime ?? 0) <= 0
}

export interface MinimapData {
  player: { x: number; y: number }
  camera: { x: number; y: number }
  npcs: { x: number; y: number }[]
  items: { x: number; y: number; name?: string }[]
}

/** 从 gs 抽小地图实体(世界像素)。kinds = collectEventKinds 结果。传送门(teleport)不标。 */
export function collectMinimapData(
  gs: GameState,
  kinds: Map<number, { kind: EventKind; name?: string }>,
): MinimapData {
  const npcs: MinimapData['npcs'] = []
  const items: MinimapData['items'] = []
  for (const npc of gs.npcs ?? []) {
    if (!npcVisible(npc)) continue
    const k = kinds.get(npc.id)
    if (k?.kind === 'teleport') continue // 传送门不标
    if (k?.kind === 'item')
      items.push({ x: npc.x, y: npc.y, name: k.name }) // 宝物(含无 sprite 的走过即拾)
    else if (npc.spriteNum > 0) npcs.push({ x: npc.x, y: npc.y }) // NPC:可见且有 sprite
  }
  return {
    player: { x: gs.party?.x ?? 0, y: gs.party?.y ?? 0 },
    camera: { x: gs.camera?.x ?? 0, y: gs.camera?.y ?? 0 },
    npcs,
    items,
  }
}
