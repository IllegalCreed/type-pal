// 小地图(场景 tab 主视图 + 右下角常驻 widget)。canvas 外纯前端,生产保留。
//   底图复用 renderMapThumbnail(64×128 地图 → 96×96 缩略图,见 bootstrap);叠加主角/NPC/宝物
//   定位点 + 可视区白框。坐标:实体世界像素 → 缩略图像素,与缩略图同一 camera(-16,-16)/降采样变换。
import type { Command } from '@type-pal/shared'
import { getGlobalCommands, getGlobalLabelMap, OP_ADD_ITEM } from '../core/event-system.js'
import type { GameState, NpcState } from '../core/game-state.js'
import { getCurrentMapNum } from '../core/scene-system.js'

// ── 世界像素 → 96px 缩略图像素 变换(与 bootstrap.renderMapThumbnail 1:1) ──────────
//   地图恒 64×128 tile(map.c 硬编码),tile 32×16 → 世界 2048×2048;缩略图 framebuffer
//   bufW=(64+1)*32=2080,camera=(-16,-16),降采样到 96 宽 → 96×96。
const TILE_W = 32
const TILE_H = 16
const BUF_W = (64 + 1) * TILE_W // 2080
const THUMB_PX = 96 // THUMB_OUT_W
const SCALE = THUMB_PX / BUF_W // 缩略图像素 / 世界像素 ≈ 0.04615
const CAM_OFF_X = TILE_W / 2 // 16(缩略图 camera.x = -16)
const CAM_OFF_Y = TILE_H // 16(缩略图 camera.y = -16)
const VIEW_W = 320 // viewport 世界像素宽(framebuffer.ts SCREEN_W)
const VIEW_H = 200 // viewport 世界像素高(SCREEN_H)

/** 世界像素 → 96px 缩略图像素(0..96)。 */
export function worldToThumb(wx: number, wy: number): [number, number] {
  return [(wx + CAM_OFF_X) * SCALE, (wy + CAM_OFF_Y) * SCALE]
}

// ── 定位点配色(draw + 图例共用) ──────────────────────────────────────────────
export const DOT_COLORS = {
  player: { fill: '#ffffff', stroke: '#a01e1e' },
  npc: { fill: '#5fd0e0', stroke: '#13484f' },
  item: { fill: '#f0c040', stroke: '#6e5210' },
} as const

// ── 道具触发脚本扫描(宝物点) ─────────────────────────────────────────────────
/**
 * 从 label 入口线性扫 trigger 脚本到 'end',判是否给道具(count>0)。
 * 仅线性流(不跟 goto/call),~95% 覆盖地面/宝箱拾取;脚本含条件分支的少数遗漏可接受。
 * giveItem._item 自带物品名(disasm 内联,供 hover 显示)。
 */
export function scanTriggerGivesItem(
  commands: readonly Command[],
  labelMap: Readonly<Record<string, number>>,
  label: string | undefined,
): { gives: boolean; name?: string } {
  if (!label) return { gives: false }
  const start = labelMap[label]
  if (start === undefined) return { gives: false }
  const LIMIT = 400 // 安全上限:防异常脚本无 'end' 走飞
  for (let i = start; i < commands.length && i < start + LIMIT; i++) {
    const c = commands[i]
    if (!c) break
    if (c.op === 'giveItem' && c.count > 0) return { gives: true, name: c._item }
    if (c.op === 'raw' && c.opcode === OP_ADD_ITEM && (c.operands[1] ?? 0) > 0) return { gives: true }
    if (c.op === 'end') break
  }
  return { gives: false }
}

/** 扫当前 scene 全 event object,返回「给道具」的对象 id → 物品名。 */
export function collectItemEventIds(
  gs: GameState,
  commands: readonly Command[],
  labelMap: Readonly<Record<string, number>>,
): Map<number, string | undefined> {
  const out = new Map<number, string | undefined>()
  for (const npc of gs.npcs ?? []) {
    const r = scanTriggerGivesItem(commands, labelMap, npc.triggerLabel)
    if (r.gives) out.set(npc.id, r.name)
  }
  return out
}

// ── 数据采集 ───────────────────────────────────────────────────────────────
/** present.ts:456 绘制可见性:sState 隐藏(0/负)或 sVanishTime>0 → 不在图上。 */
function npcVisible(npc: NpcState): boolean {
  return (npc.sState === undefined || npc.sState > 0) && (npc.sVanishTime ?? 0) <= 0
}

export interface MinimapData {
  player: { x: number; y: number }
  camera: { x: number; y: number }
  npcs: { x: number; y: number }[]
  items: { x: number; y: number; name?: string }[]
}

/** 从 gs 抽小地图实体(世界像素)。itemIds = collectItemEventIds 结果(给道具的对象 id)。 */
export function collectMinimapData(gs: GameState, itemIds: Map<number, string | undefined>): MinimapData {
  const npcs: MinimapData['npcs'] = []
  const items: MinimapData['items'] = []
  for (const npc of gs.npcs ?? []) {
    if (!npcVisible(npc)) continue
    if (itemIds.has(npc.id)) items.push({ x: npc.x, y: npc.y, name: itemIds.get(npc.id) })
    else if (npc.spriteNum > 0) npcs.push({ x: npc.x, y: npc.y })
  }
  return {
    player: { x: gs.party?.x ?? 0, y: gs.party?.y ?? 0 },
    camera: { x: gs.camera?.x ?? 0, y: gs.camera?.y ?? 0 },
    npcs,
    items,
  }
}

// ── 绘制 ──────────────────────────────────────────────────────────────────
function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke: string,
  lw = 1,
): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = lw
  ctx.strokeStyle = stroke
  ctx.stroke()
}

/**
 * 画小地图到方形 canvas(W=H,display 像素)。base=底图(null→暗底占位);showDots 控制 NPC/宝物点;
 * 主角点 + 可视白框恒画。
 */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  base: CanvasImageSource | null,
  data: MinimapData,
  showDots: boolean,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const s = W / THUMB_PX // display 像素 / 缩略图像素
  ctx.clearRect(0, 0, W, W)
  ctx.fillStyle = '#0d0b08'
  ctx.fillRect(0, 0, W, W)
  if (base) {
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(base, 0, 0, W, W)
  }
  const toPx = (wx: number, wy: number): [number, number] => {
    const [tx, ty] = worldToThumb(wx, wy)
    return [tx * s, ty * s]
  }
  // 可视区白框
  const [bx, by] = toPx(data.camera.x, data.camera.y)
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = Math.max(1, s * 0.5)
  ctx.strokeRect(bx, by, VIEW_W * SCALE * s, VIEW_H * SCALE * s)
  if (showDots) {
    for (const it of data.items) {
      const [x, y] = toPx(it.x, it.y)
      dot(ctx, x, y, Math.max(1.6, s * 1.1), DOT_COLORS.item.fill, DOT_COLORS.item.stroke)
    }
    for (const n of data.npcs) {
      const [x, y] = toPx(n.x, n.y)
      dot(ctx, x, y, Math.max(1.3, s * 0.9), DOT_COLORS.npc.fill, DOT_COLORS.npc.stroke)
    }
  }
  const [px, py] = toPx(data.player.x, data.player.y)
  dot(ctx, px, py, Math.max(2.2, s * 1.6), DOT_COLORS.player.fill, DOT_COLORS.player.stroke, 2)
}

// ── 控制器(底图缓存 + 道具缓存 + rAF 自更新 + 右下 widget) ─────────────────────
const LS_WIDGET = 'tp-minimap-widget' // '1' = 右下角常驻显示(默认关)
const LS_DOTS = 'tp-minimap-dots' // '0' = 隐藏 NPC/宝物点(默认显)

export interface MinimapDeps {
  getGs: () => GameState
  /** bootstrap renderMapThumbnail 缓存包装:mapNum → 96×96 PNG dataURL。 */
  getMapThumbnail: (mapNum: number) => Promise<string | null>
}

export interface MinimapController {
  /** 把场景 tab 主视图 canvas 建进容器(随面板存活自更新,detach 后自停)。 */
  mountSceneView: (container: HTMLElement, sizePx: number) => void
  setWidgetEnabled: (on: boolean) => void
  isWidgetEnabled: () => boolean
  setShowDots: (on: boolean) => void
  isShowDots: () => boolean
}

export function setupMinimap(deps: MinimapDeps): MinimapController {
  let showDots = localStorage.getItem(LS_DOTS) !== '0'
  let widgetEnabled = localStorage.getItem(LS_WIDGET) === '1'

  // 底图缓存(mapNum → Image);未就绪时异步加载,先画占位。
  const baseCache = new Map<number, HTMLImageElement>()
  const baseLoading = new Set<number>()
  const getBase = (mapNum: number): HTMLImageElement | null => {
    const cached = baseCache.get(mapNum)
    if (cached) return cached
    if (!baseLoading.has(mapNum)) {
      baseLoading.add(mapNum)
      deps
        .getMapThumbnail(mapNum)
        .then((url) => {
          if (!url) return
          const img = new Image()
          img.onload = (): void => {
            baseCache.set(mapNum, img)
          }
          img.src = url
        })
        .catch(() => {})
        .finally(() => baseLoading.delete(mapNum))
    }
    return null
  }

  // 道具对象 id 缓存(per scene;event object 不移动,scene 内固定)。
  let itemScene = -1
  let itemIds = new Map<number, string | undefined>()
  const currentItemIds = (gs: GameState): Map<number, string | undefined> => {
    if (gs.wNumScene !== itemScene) {
      itemScene = gs.wNumScene
      itemIds = collectItemEventIds(gs, getGlobalCommands(), getGlobalLabelMap())
    }
    return itemIds
  }

  let sceneCanvas: HTMLCanvasElement | null = null
  let widget: HTMLDivElement | null = null
  let widgetCanvas: HTMLCanvasElement | null = null

  const drawTo = (canvas: HTMLCanvasElement): void => {
    const gs = deps.getGs()
    const base = getBase(getCurrentMapNum())
    drawMinimap(canvas, base, collectMinimapData(gs, currentItemIds(gs)), showDots)
  }

  // 右下 widget:仅 explore 模式显示(场景态);非场景态隐藏。
  const ensureWidget = (): void => {
    if (widget) return
    widget = document.createElement('div')
    widget.id = 'tp-minimap-widget'
    widgetCanvas = document.createElement('canvas')
    widgetCanvas.width = 168
    widgetCanvas.height = 168
    // 显式 inline 尺寸:覆盖 index.html 全局 `canvas{width:960px;height:600px}`(否则 widget 被撑爆)。
    widgetCanvas.style.width = '168px'
    widgetCanvas.style.height = '168px'
    widget.appendChild(widgetCanvas)
    document.body.appendChild(widget)
  }
  const syncWidget = (): void => {
    if (!widgetEnabled) {
      if (widget) widget.style.display = 'none'
      return
    }
    ensureWidget()
    const m = deps.getGs()?.mode
    const inScene = m === 'explore' || m === 'event' // 场景态(含剧情对话);battle/menu 隐藏
    widget!.style.display = inScene ? 'block' : 'none'
    if (inScene && widgetCanvas) drawTo(widgetCanvas)
  }

  // 单 rAF 循环(节流 ~10fps);无活动 surface 时自停,mount/启用 widget 时重启。
  let rafId = 0
  let lastT = 0
  const isActive = (): boolean => Boolean(sceneCanvas?.isConnected) || widgetEnabled
  const loop = (t: number): void => {
    rafId = 0
    if (t - lastT > 90) {
      lastT = t
      if (sceneCanvas) {
        if (sceneCanvas.isConnected) drawTo(sceneCanvas)
        else sceneCanvas = null
      }
      syncWidget()
    }
    if (isActive()) rafId = requestAnimationFrame(loop)
  }
  const ensureLoop = (): void => {
    if (!rafId && isActive() && typeof requestAnimationFrame === 'function') rafId = requestAnimationFrame(loop)
  }

  return {
    mountSceneView(container, sizePx) {
      const canvas = document.createElement('canvas')
      canvas.width = sizePx
      canvas.height = sizePx
      canvas.className = 'tp-minimap-canvas'
      // 显式 inline 尺寸:覆盖 index.html 全局 `canvas{width:960px;height:600px}`(否则被拉伸变形)。
      canvas.style.width = `${sizePx}px`
      canvas.style.height = `${sizePx}px`
      container.appendChild(canvas)
      sceneCanvas = canvas
      drawTo(canvas) // 立即画一帧(免空白闪)
      ensureLoop()
    },
    setWidgetEnabled(on) {
      widgetEnabled = on
      localStorage.setItem(LS_WIDGET, on ? '1' : '0')
      syncWidget()
      ensureLoop()
    },
    isWidgetEnabled: () => widgetEnabled,
    setShowDots(on) {
      showDots = on
      localStorage.setItem(LS_DOTS, on ? '1' : '0')
      if (sceneCanvas?.isConnected) drawTo(sceneCanvas)
      syncWidget()
    },
    isShowDots: () => showDots,
  }
}
