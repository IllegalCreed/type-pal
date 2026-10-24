/** Page-owned minimap controller: preferences, image/cache lifecycle, DOM and animation frames. */

import type { GameState, NpcState } from '../core/game-state.js'
import { getCurrentMapNum } from '../core/scene-identity.js'
import { getGlobalCommands, getGlobalLabelMap } from '../core/script-catalog.js'
import { localize } from '../localization/language.js'
import { LAYOUT_CHANGE, presentationKey } from '../shell/presentation.js'
import { drawMinimap, type MinimapToggles } from './minimap-draw.js'
import {
  collectEventKinds,
  collectMinimapData,
  computeView,
  DEFAULT_ZOOM_INDEX,
  type EventKind,
  WHOLE_VIEW,
  ZOOM_WORLD_WIDTHS,
} from './minimap-model.js'

export {
  DOT_COLORS,
  drawMinimap,
  type MinimapToggles,
} from './minimap-draw.js'
export {
  BASE_PX,
  classifyTrigger,
  collectEventKinds,
  collectMinimapData,
  computeView,
  DEFAULT_ZOOM_INDEX,
  type EventKind,
  type MinimapData,
  type MinimapView,
  worldToThumb,
  ZOOM_WORLD_WIDTHS,
} from './minimap-model.js'

// ── 控制器(底图缓存 + 类别缓存 + rAF 自更新 + 右下 widget 缩放) ─────────────────
const LS_WIDGET = 'tp-minimap-widget'

// '1' = 右下角常驻显示(默认关)
const LS_NPC = 'tp-minimap-npc'

// '0' = 隐藏 NPC 点(默认显)
const LS_ITEMS = 'tp-minimap-items'

// '0' = 隐藏宝物点(默认显)
const LS_ZOOM = 'tp-minimap-zoom'

// widget 缩放档 index(默认 DEFAULT_ZOOM_INDEX)
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
  Math.max(
    0,
    Math.min(ZOOM_WORLD_WIDTHS.length - 1, Number.isFinite(i) ? Math.round(i) : DEFAULT_ZOOM_INDEX),
  )

export function setupMinimap(deps: MinimapDeps): MinimapController {
  let showNpc = localStorage.getItem(LS_NPC) !== '0'
  let showItems = localStorage.getItem(LS_ITEMS) !== '0'
  let widgetEnabled = localStorage.getItem(presentationKey(LS_WIDGET)) === '1'
  const zStored = localStorage.getItem(LS_ZOOM)
  let widgetZoom = clampZoom(zStored === null ? DEFAULT_ZOOM_INDEX : Number(zStored))

  // 底图缓存(mapNum → Image);未就绪时异步加载,先画占位。
  const baseCache = new Map<number, HTMLImageElement>()
  const baseLoading = new Set<number>()
  const baseFailed = new Set<number>() // 取图失败的 map → 不再逐帧重试(防 404 洪水)
  const getBase = (mapNum: number): HTMLImageElement | null => {
    // mapNum<=0 = 无有效地图(boot 期 currentMapNum 默认 0,且 map 0 是空 chunk 无 tilemap)。
    // 不守这道:minimap 逐帧 getMapThumbnail(0) → fetch tilemap/0.json → 404 洪水(并污染启动进度计数)。
    if (mapNum <= 0 || baseFailed.has(mapNum)) return null
    const cached = baseCache.get(mapNum)
    if (cached) return cached
    if (!baseLoading.has(mapNum)) {
      baseLoading.add(mapNum)
      deps
        .getMapThumbnail(mapNum)
        .then((url) => {
          if (!url) {
            baseFailed.add(mapNum) // 无缩略图(如缺 tilemap)→ 标记失败,别逐帧重取
            baseLoading.delete(mapNum)
            return
          }
          const img = new Image()
          img.onload = (): void => {
            baseCache.set(mapNum, img)
            baseLoading.delete(mapNum)
          }
          img.onerror = (): void => {
            baseFailed.add(mapNum)
            baseLoading.delete(mapNum)
          }
          img.src = url
        })
        .catch(() => {
          baseFailed.add(mapNum)
          baseLoading.delete(mapNum)
        })
    }
    return null
  }

  // event object 类别缓存。**按 gs.npcs 数组引用**判失效(非 wNumScene):切场景时 wNumScene 比 gs.npcs
  //   先更新,若按 wNumScene 重算会抓到旧场景的 npc → 标错位置(user 2026-06-15 报);loadScene 换新
  //   npcs数组时引用变即重算;同数组内移动不重算。该缓存也不监听原地triggerLabel/脚本表变化,不是实时脚本解释器。
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
    drawMinimap(
      canvas,
      getBase(getCurrentMapNum()),
      collectMinimapData(gs, currentKinds(gs)),
      toggles(),
      WHOLE_VIEW,
    )
  }
  /** widget:以主角为中心、按缩放档裁剪的视图(固定世界px档位,全图皆 64×128)。 */
  const drawWidget = (canvas: HTMLCanvasElement): void => {
    const gs = deps.getGs()
    const data = collectMinimapData(gs, currentKinds(gs))
    const target = ZOOM_WORLD_WIDTHS[widgetZoom] ?? ZOOM_WORLD_WIDTHS[DEFAULT_ZOOM_INDEX]!
    drawMinimap(
      canvas,
      getBase(getCurrentMapNum()),
      data,
      toggles(),
      computeView(target, data.player.x, data.player.y),
    )
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
    widgetCanvas.style.width = `var(--tp-minimap-size, ${WIDGET_PX}px)`
    widgetCanvas.style.height = `var(--tp-minimap-size, ${WIDGET_PX}px)`
    const zoomBox = document.createElement('div')
    zoomBox.className = 'tp-mm-zoom'
    const mkBtn = (txt: string, title: string, onClick: () => void): void => {
      const b = document.createElement('button')
      b.textContent = txt
      b.title = title
      b.addEventListener('click', onClick)
      zoomBox.appendChild(b)
    }
    mkBtn('＋', localize('放大 (=)', 'Zoom in (=)'), () => setZoom(widgetZoom + 1))
    mkBtn('－', localize('缩小 (-),最小=全图', 'Zoom out (-), minimum: full map'), () =>
      setZoom(widgetZoom - 1),
    )
    widget.append(widgetCanvas, zoomBox) // zoomBox 绝对定位浮于 canvas 右上角(在小地图内)
    document.body.appendChild(widget)
  }
  const syncWidget = (): void => {
    const inScene = ['explore', 'event'].includes(deps.getGs().mode) && getCurrentMapNum() > 0
    if (!widgetEnabled) {
      if (widget) widget.style.display = 'none'
      return
    }
    ensureWidget()
    const zoomButtons = widget!.querySelectorAll('button')
    if (zoomButtons[0]) zoomButtons[0].title = localize('放大 (=)', 'Zoom in (=)')
    if (zoomButtons[1])
      zoomButtons[1].title = localize('缩小 (-),最小=全图', 'Zoom out (-), minimum: full map')
    // 场景态(含剧情对话);battle/menu 隐藏。再加「有有效地图」门:boot 期 mode 默认 explore 但
    // currentMapNum=0(未进场景),不守这道会在标题/加载屏就显出空 widget(user 2026-06-22 报)。
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
    if (!rafId && isActive() && typeof requestAnimationFrame === 'function')
      rafId = requestAnimationFrame(loop)
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
  window.addEventListener(LAYOUT_CHANGE, () => {
    widgetEnabled = localStorage.getItem(presentationKey(LS_WIDGET)) === '1'
    syncWidget()
    ensureLoop()
  })

  return {
    mountSceneView(container, sizePx, onTick) {
      const canvas = document.createElement('canvas')
      // backing按DPR(上限2)配置,CSS仍sizePx;drawMinimap按backing绘制,不保证裁剪区只缩不放。
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
      localStorage.setItem(presentationKey(LS_WIDGET), on ? '1' : '0')
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
