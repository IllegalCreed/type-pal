// 小地图(场景 tab 主视图 + 右下角常驻 widget)。canvas 外纯前端,生产保留。
//   底图复用 renderMapThumbnail(64×128 地图 → 96×96 缩略图,见 bootstrap);叠加主角/NPC/宝物
//   定位点 + 可视区白框。坐标:实体世界像素 → 缩略图像素,与缩略图同一 camera(-16,-16)/降采样变换。
import type { Command } from '@type-pal/shared'
import { getGlobalCommands, getGlobalLabelMap, OP_ADD_CASH, OP_ADD_ITEM, OP_ADD_MAGIC } from '../core/event-system.js'
import type { GameState, NpcState } from '../core/game-state.js'
import { getCurrentMapNum } from '../core/scene-system.js'

// ── 世界像素 → 底图像素 变换(与 bootstrap.renderMapThumbnail 1:1) ──────────────
//   地图恒 64×128 tile(map.c 硬编码),tile 32×16 → 世界 2048×2048;缩略图 framebuffer
//   bufW=(64+1)*32=2080,camera=(-16,-16),降采样到 BASE_PX 宽。BASE_PX 用较高分辨率
//   (高于 dev 96)→ 场景 tab 近 1:1 不糊、widget 放大裁剪也清晰。
const TILE_W = 32
const TILE_H = 16
const BUF_W = (64 + 1) * TILE_W // 2080
export const BASE_PX = 640 // 底图渲染分辨率(px;= worldToThumb 值域 + bootstrap getMapThumbnail outW)。高→各缩放档皆降采样=清晰
const SCALE = BASE_PX / BUF_W // 底图像素 / 世界像素
const CAM_OFF_X = TILE_W / 2 // 16(缩略图 camera.x = -16)
const CAM_OFF_Y = TILE_H // 16(缩略图 camera.y = -16)
const VIEW_W = 320 // viewport 世界像素宽(framebuffer.ts SCREEN_W)
const VIEW_H = 200 // viewport 世界像素高(SCREEN_H)

/** 世界像素 → 底图像素(0..BASE_PX)。 */
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
const WHOLE_VIEW: MinimapView = { sx: 0, sy: 0, sw: BASE_PX }

/** 缩放视图(底图源方形):以世界点(cx,cy)为中心、targetWorldWidth 宽,clamp 到底图边界;>=全图→全图。 */
export function computeView(targetWorldWidth: number, cx: number, cy: number): MinimapView {
  const sw = Math.min(BASE_PX, targetWorldWidth * SCALE)
  if (sw >= BASE_PX) return WHOLE_VIEW
  const [pcx, pcy] = worldToThumb(cx, cy)
  const clamp = (c: number): number => Math.max(sw / 2, Math.min(BASE_PX - sw / 2, c))
  return { sx: clamp(pcx) - sw / 2, sy: clamp(pcy) - sw / 2, sw }
}

// ── 定位点配色(draw + 图例共用) ──────────────────────────────────────────────
export const DOT_COLORS = {
  player: { fill: '#ffffff', stroke: '#a01e1e' },
  npc: { fill: '#5fd0e0', stroke: '#13484f' },
  item: { fill: '#f0c040', stroke: '#6e5210' },
} as const

// ── 道具触发脚本扫描(宝物点) ─────────────────────────────────────────────────
export type EventKind = 'item' | 'teleport' | 'other'

/** triggerLabel → 全局命令下标:优先 labelMap,缺则按 `L_<n>` 直解(identity,n 即全局 ip)。 */
function resolveLabelIp(labelMap: Readonly<Record<string, number>>, label: string | undefined): number | undefined {
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
 * item 优先(先命中即返回)。仅线性流(不跟 goto/call),~95% 覆盖。
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
    // count >= 0 = 给道具(sdlpal count==0 → 给 1 个,global.c:1094;**绝大多数地图宝物就是 count=0**);负=扣除不算。
    if (c.op === 'giveItem' && c.count >= 0 && c.itemId > 0) return { kind: 'item', name: c._item }
    if (c.op === 'raw') {
      const op = c.opcode
      const a0 = c.operands[0] ?? 0
      if (op === OP_ADD_ITEM && a0 > 0) return { kind: 'item' } // 0x1F operand[0]=itemId(remove 是 0x20)
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
  for (const npc of gs.npcs ?? []) out.set(npc.id, classifyTrigger(commands, labelMap, npc.triggerLabel))
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
    if (k?.kind === 'item') items.push({ x: npc.x, y: npc.y, name: k.name }) // 宝物(含无 sprite 的走过即拾)
    else if (npc.spriteNum > 0) npcs.push({ x: npc.x, y: npc.y }) // NPC:可见且有 sprite
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

/** 显隐开关:NPC 点 / 宝物点 各自独立(可视白框 + 主角点恒画)。 */
export interface MinimapToggles {
  showNpc: boolean
  showItems: boolean
}

/**
 * 画小地图到方形 canvas(W=H,display 像素)。view=底图源方形(全图或主角居中缩放裁剪);
 * base=底图(null→暗底占位);toggles 控制 NPC/宝物点显隐;主角点 + 可视白框恒画。定位点用画布相对尺寸(不随缩放变形)。
 */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  base: CanvasImageSource | null,
  data: MinimapData,
  toggles: MinimapToggles,
  view: MinimapView = WHOLE_VIEW,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const { sx, sy, sw } = view
  const s = W / sw // display 像素 / 底图像素(缩放后)
  ctx.clearRect(0, 0, W, W)
  ctx.fillStyle = '#0d0b08'
  ctx.fillRect(0, 0, W, W)
  if (base) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(base, sx, sy, sw, sw, 0, 0, W, W)
  }
  const toPx = (wx: number, wy: number): [number, number] => {
    const [tx, ty] = worldToThumb(wx, wy)
    return [(tx - sx) * s, (ty - sy) * s]
  }
  // 可视区白框
  const [bx, by] = toPx(data.camera.x, data.camera.y)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.max(1, W * 0.008)
  ctx.strokeRect(bx, by, VIEW_W * SCALE * s, VIEW_H * SCALE * s)
  // 定位点半径:画布相对(全图视图房间小,点要小才不糊成一团)
  const rItem = Math.max(1.5, W * 0.01)
  const rNpc = Math.max(1.4, W * 0.009)
  const rPlayer = Math.max(2, W * 0.014)
  if (toggles.showItems) {
    for (const it of data.items) {
      const [x, y] = toPx(it.x, it.y)
      dot(ctx, x, y, rItem, DOT_COLORS.item.fill, DOT_COLORS.item.stroke)
    }
  }
  if (toggles.showNpc) {
    for (const n of data.npcs) {
      const [x, y] = toPx(n.x, n.y)
      dot(ctx, x, y, rNpc, DOT_COLORS.npc.fill, DOT_COLORS.npc.stroke)
    }
  }
  const [px, py] = toPx(data.player.x, data.player.y)
  dot(ctx, px, py, rPlayer, DOT_COLORS.player.fill, DOT_COLORS.player.stroke, 2)
}

// ── 控制器(底图缓存 + 类别缓存 + rAF 自更新 + 右下 widget 缩放) ─────────────────
const LS_WIDGET = 'tp-minimap-widget' // '1' = 右下角常驻显示(默认关)
const LS_NPC = 'tp-minimap-npc' // '0' = 隐藏 NPC 点(默认显)
const LS_ITEMS = 'tp-minimap-items' // '0' = 隐藏宝物点(默认显)
const LS_ZOOM = 'tp-minimap-zoom' // widget 缩放档 index(默认 DEFAULT_ZOOM_INDEX)
const WIDGET_PX = 180

export interface MinimapDeps {
  getGs: () => GameState
  /** bootstrap renderSceneThumbnail 包装:mapNum → BASE_PX×BASE_PX PNG dataURL。 */
  getMapThumbnail: (mapNum: number) => Promise<string | null>
}

export interface MinimapController {
  /** 把场景 tab 主视图 canvas 建进容器(随面板存活自更新,detach 后自停;恒全图)。onTick 每帧重绘后调(刷场景信息)。 */
  mountSceneView: (container: HTMLElement, sizePx: number, onTick?: () => void) => void
  setWidgetEnabled: (on: boolean) => void
  isWidgetEnabled: () => boolean
  setShowNpc: (on: boolean) => void
  isShowNpc: () => boolean
  setShowItems: (on: boolean) => void
  isShowItems: () => boolean
}

const clampZoom = (i: number): number =>
  Math.max(0, Math.min(ZOOM_WORLD_WIDTHS.length - 1, Number.isFinite(i) ? Math.round(i) : DEFAULT_ZOOM_INDEX))

export function setupMinimap(deps: MinimapDeps): MinimapController {
  let showNpc = localStorage.getItem(LS_NPC) !== '0'
  let showItems = localStorage.getItem(LS_ITEMS) !== '0'
  let widgetEnabled = localStorage.getItem(LS_WIDGET) === '1'
  const zStored = localStorage.getItem(LS_ZOOM)
  let widgetZoom = clampZoom(zStored === null ? DEFAULT_ZOOM_INDEX : Number(zStored))

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

  // event object 类别缓存。**按 gs.npcs 数组引用**判失效(非 wNumScene):切场景时 wNumScene 比 gs.npcs
  //   先更新,若按 wNumScene 重算会抓到旧场景的 npc → 标错位置(user 2026-06-15 报);loadScene 换新
  //   npcs 数组时引用变,正好在新 npcs 就绪时重算。scene 内 npc 移动不换数组引用 → kinds(按 triggerLabel)不变,不必重算。
  let kindsNpcs: readonly NpcState[] | null = null
  let kindsMap = new Map<number, { kind: EventKind; name?: string }>()
  const currentKinds = (gs: GameState): Map<number, { kind: EventKind; name?: string }> => {
    if (gs.npcs !== kindsNpcs) {
      kindsNpcs = gs.npcs
      kindsMap = collectEventKinds(gs, getGlobalCommands(), getGlobalLabelMap())
    }
    return kindsMap
  }

  let sceneCanvas: HTMLCanvasElement | null = null
  let sceneOnTick: (() => void) | null = null
  let widget: HTMLDivElement | null = null
  let widgetCanvas: HTMLCanvasElement | null = null

  const toggles = (): MinimapToggles => ({ showNpc, showItems })
  /** 场景 tab:全图视图。 */
  const drawScene = (canvas: HTMLCanvasElement): void => {
    const gs = deps.getGs()
    drawMinimap(canvas, getBase(getCurrentMapNum()), collectMinimapData(gs, currentKinds(gs)), toggles(), WHOLE_VIEW)
  }
  /** widget:以主角为中心、按缩放档裁剪的视图(固定世界px档位,全图皆 64×128)。 */
  const drawWidget = (canvas: HTMLCanvasElement): void => {
    const gs = deps.getGs()
    const data = collectMinimapData(gs, currentKinds(gs))
    const target = ZOOM_WORLD_WIDTHS[widgetZoom] ?? ZOOM_WORLD_WIDTHS[DEFAULT_ZOOM_INDEX]!
    drawMinimap(canvas, getBase(getCurrentMapNum()), data, toggles(), computeView(target, data.player.x, data.player.y))
  }
  const redrawScene = (): void => {
    if (sceneCanvas?.isConnected) drawScene(sceneCanvas)
  }

  const setZoom = (i: number): void => {
    widgetZoom = clampZoom(i)
    localStorage.setItem(LS_ZOOM, String(widgetZoom))
    if (widgetEnabled && widgetCanvas) drawWidget(widgetCanvas)
  }

  // 右下 widget:仅场景态(explore/event)显示;带 +/− 缩放按钮(pointer-events 仅按钮可点,不挡游戏)。
  const ensureWidget = (): void => {
    if (widget) return
    widget = document.createElement('div')
    widget.id = 'tp-minimap-widget'
    widgetCanvas = document.createElement('canvas')
    // backing 按 DPR 放大(retina 清晰),CSS 仍 WIDGET_PX。
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)
    widgetCanvas.width = Math.round(WIDGET_PX * dpr)
    widgetCanvas.height = Math.round(WIDGET_PX * dpr)
    // 显式 inline 尺寸:覆盖 index.html 全局 `canvas{width:960px;height:600px}`。
    widgetCanvas.style.width = `${WIDGET_PX}px`
    widgetCanvas.style.height = `${WIDGET_PX}px`
    const zoomBox = document.createElement('div')
    zoomBox.className = 'tp-mm-zoom'
    const mkBtn = (txt: string, title: string, onClick: () => void): void => {
      const b = document.createElement('button')
      b.textContent = txt
      b.title = title
      b.addEventListener('click', onClick)
      zoomBox.appendChild(b)
    }
    mkBtn('＋', '放大 (=)', () => setZoom(widgetZoom + 1))
    mkBtn('－', '缩小 (-),最小=全图', () => setZoom(widgetZoom - 1))
    widget.append(widgetCanvas, zoomBox) // zoomBox 绝对定位浮于 canvas 右上角(在小地图内)
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
    widget!.style.display = inScene ? 'block' : 'none' // block:zoomBox 绝对定位浮于右上角,widget 只裹 canvas
    if (inScene && widgetCanvas) drawWidget(widgetCanvas)
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
        if (sceneCanvas.isConnected) {
          drawScene(sceneCanvas)
          sceneOnTick?.() // 刷场景信息文本(地图/坐标/镜头 live)
        } else {
          sceneCanvas = null
          sceneOnTick = null
        }
      }
      syncWidget()
    }
    if (isActive()) rafId = requestAnimationFrame(loop)
  }
  const ensureLoop = (): void => {
    if (!rafId && isActive() && typeof requestAnimationFrame === 'function') rafId = requestAnimationFrame(loop)
  }

  // 快捷键 -/= 缩放 widget(仅 widget 启用 + 焦点不在输入框时;游戏不消费这俩键)。
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (!widgetEnabled) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Minus') setZoom(widgetZoom - 1)
      else if (e.code === 'Equal') setZoom(widgetZoom + 1)
    })
  }

  // 刷新后若 localStorage 记得已启用 widget,立即起循环显示(不必先开工具面板)。
  if (widgetEnabled) ensureLoop()

  return {
    mountSceneView(container, sizePx, onTick) {
      const canvas = document.createElement('canvas')
      // backing 按 DPR 放大(retina 清晰;640 底图够用),CSS 仍 sizePx;drawMinimap 用 canvas.width=backing。
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)
      canvas.width = Math.round(sizePx * dpr)
      canvas.height = Math.round(sizePx * dpr)
      canvas.className = 'tp-minimap-canvas'
      // 显式 inline 尺寸:覆盖 index.html 全局 `canvas{width:960px;height:600px}`(否则被拉伸变形)。
      canvas.style.width = `${sizePx}px`
      canvas.style.height = `${sizePx}px`
      container.appendChild(canvas)
      sceneCanvas = canvas
      sceneOnTick = onTick ?? null
      drawScene(canvas) // 立即画一帧(免空白闪)
      onTick?.()
      ensureLoop()
    },
    setWidgetEnabled(on) {
      widgetEnabled = on
      localStorage.setItem(LS_WIDGET, on ? '1' : '0')
      syncWidget()
      ensureLoop()
    },
    isWidgetEnabled: () => widgetEnabled,
    setShowNpc(on) {
      showNpc = on
      localStorage.setItem(LS_NPC, on ? '1' : '0')
      redrawScene()
      syncWidget()
    },
    isShowNpc: () => showNpc,
    setShowItems(on) {
      showItems = on
      localStorage.setItem(LS_ITEMS, on ? '1' : '0')
      redrawScene()
      syncWidget()
    },
    isShowItems: () => showItems,
  }
}
