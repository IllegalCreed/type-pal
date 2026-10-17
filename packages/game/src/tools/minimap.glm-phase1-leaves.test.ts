/**
 * L18 minimap:与minimap.test的纯几何/分类合同分层,本文件核真实canvas与控制器IO。
 * 像素坐标/颜色为独立手算;裁剪用自有图像。不借被测变换或DOT_COLORS生成oracle。
 * 六例保持:原重复worldToThumb例替换成底图裁剪。控制器只证开关读写与Image loading/failed ownership,
 * 不把getter当widget可见性或坏zoom的验收。每例释放自有rAF/监听/DOM/全局与偏好。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { getCurrentMapNum, setCurrentMapNum } from '../core/scene-system.js'
import {
  drawMinimap,
  type MinimapController,
  type MinimapData,
  type MinimapDeps,
  type MinimapToggles,
  setupMinimap,
} from './minimap.js'

const LS = ['tp-minimap-widget', 'tp-minimap-npc', 'tp-minimap-items', 'tp-minimap-zoom']
const controllers: MinimapController[] = []
let releaseHost = (): void => {}

beforeEach(() => {
  const saved = new Map<string, string | null>()
  for (const key of LS) {
    saved.set(key, localStorage.getItem(key))
    localStorage.removeItem(key)
  }
  const oldMap = getCurrentMapNum()
  setCurrentMapNum(0)
  const existing = new Set(Array.from(document.body.children))
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
  const listeners = vi.spyOn(window, 'addEventListener') // 默认穿透,不替换真实接线
  releaseHost = () => {
    try {
      for (const ctl of controllers) ctl.setWidgetEnabled(false)
      for (const child of Array.from(document.body.children)) {
        if (!existing.has(child)) child.remove()
      }
      vi.runOnlyPendingTimers()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      for (const [type, listener, options] of listeners.mock.calls) {
        window.removeEventListener(type, listener, options)
      }
      listeners.mockRestore()
      controllers.length = 0
      vi.clearAllTimers()
      vi.useRealTimers()
      vi.unstubAllGlobals()
      setCurrentMapNum(oldMap)
      for (const [key, value] of saved) {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
    }
  }
})
afterEach(() => releaseHost())

function createController(deps: MinimapDeps): MinimapController {
  const ctl = setupMinimap(deps)
  controllers.push(ctl)
  return ctl
}

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number): number[] {
  return Array.from(ctx.getImageData(x, y, 1, 1).data)
}

function mkData(): MinimapData {
  return {
    camera: { x: 1000, y: 1000 },
    player: { x: 1000, y: 1000 },
    items: [{ x: 1500, y: 500 }],
    npcs: [{ x: 500, y: 1500 }],
  }
}

describe('L18 drawMinimap 真实 canvas', () => {
  it('暗底占位 + 玩家白点落在 worldToThumb 手算坐标 + 宝物/NPC 点按 toggle 显隐', () => {
    const draw = (toggles: MinimapToggles): CanvasRenderingContext2D => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 320
      drawMinimap(canvas, null, mkData(), toggles, { sx: 0, sy: 0, sw: 640 })
      return canvas.getContext('2d')!
    }
    // (world+16)*320/2080:玩家(156.31,156.31),宝物(233.23,79.38),NPC(79.38,233.23)。
    // 320画布使这些采样格完全在填充圆内,无需抗锯齿容差/整图颜色扫描。
    const all = draw({ showNpc: true, showItems: true })
    expect(pixel(all, 0, 0)).toEqual([13, 11, 8, 255])
    expect(pixel(all, 156, 156)).toEqual([255, 255, 255, 255])
    expect(pixel(all, 233, 79)).toEqual([240, 192, 64, 255])
    expect(pixel(all, 79, 233)).toEqual([95, 208, 224, 255])
    const noItems = draw({ showNpc: true, showItems: false })
    expect(pixel(noItems, 233, 79)).toEqual([13, 11, 8, 255])
    expect(pixel(noItems, 79, 233)).toEqual([95, 208, 224, 255])
    const noNpc = draw({ showNpc: false, showItems: true })
    expect(pixel(noNpc, 79, 233)).toEqual([13, 11, 8, 255])
    expect(pixel(noNpc, 233, 79)).toEqual([240, 192, 64, 255])
  })

  it('非全图 view 使用指定底图裁剪区域', () => {
    const base = document.createElement('canvas')
    base.width = base.height = 640
    const source = base.getContext('2d')!
    source.fillStyle = '#102030'
    source.fillRect(0, 0, 640, 640)
    source.fillStyle = '#123abc'
    source.fillRect(100, 120, 320, 320)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const offscreen = { x: -1000, y: -1000 }
    drawMinimap(
      canvas,
      base,
      { player: offscreen, camera: offscreen, npcs: [], items: [] },
      { showNpc: false, showItems: false },
      { sx: 100, sy: 120, sw: 320 },
    )
    // 输出(5,5)采样源窗口内部蓝色;若误画整图,此处落在窗口外暗底。
    expect(pixel(canvas.getContext('2d')!, 5, 5)).toEqual([18, 58, 188, 255])
  })
})

describe('L18 setupMinimap 控制器持久化', () => {
  it('默认开关、setShowNpc写存储；按保存值重建控制器读回', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const deps = { getGs: () => gs, getMapThumbnail: async () => null }
    const ctl = createController(deps)
    expect(ctl.isShowNpc()).toBe(true)
    expect(ctl.isShowItems()).toBe(true)
    expect(ctl.isWidgetEnabled()).toBe(false)
    ctl.setShowNpc(false)
    expect(ctl.isShowNpc()).toBe(false)
    expect(localStorage.getItem('tp-minimap-npc')).toBe('0')
    ctl.setWidgetEnabled(true)
    expect(ctl.isWidgetEnabled()).toBe(true)
    expect(localStorage.getItem('tp-minimap-widget')).toBe('1')
    const savedWidget = localStorage.getItem('tp-minimap-widget')!
    ctl.setWidgetEnabled(false) // 旧宿主不再跑,再用实际保存值模拟下次启动
    localStorage.setItem('tp-minimap-widget', savedWidget)
    const ctl2 = createController(deps)
    expect(ctl2.isShowNpc()).toBe(false)
    expect(ctl2.isWidgetEnabled()).toBe(true)
  })

  it("持久值非 '0' 非法串 → 视为默认开；widget 非 '1' → 关", () => {
    localStorage.setItem('tp-minimap-npc', 'yes')
    localStorage.setItem('tp-minimap-widget', 'true')
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ctl = createController({ getGs: () => gs, getMapThumbnail: async () => null })
    expect(ctl.isShowNpc()).toBe(true)
    expect(ctl.isWidgetEnabled()).toBe(false)
  })

  it('底图 URL 已 resolve 但 Image 尚未 onload 时，不重复请求同一 map', async () => {
    class PendingImage {
      static last: PendingImage | undefined
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        PendingImage.last = this
      }
      set src(_value: string) {} // 本例只暂停宿主decode,不替换控制器缓存
    }
    vi.stubGlobal('Image', PendingImage)
    setCurrentMapNum(1)
    const url = document.createElement('canvas').toDataURL('image/png')
    const getMapThumbnail = vi.fn(async () => url)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ctl = createController({ getGs: () => gs, getMapThumbnail })
    ctl.mountSceneView(document.createElement('div'), 64)
    await vi.waitFor(() => expect(PendingImage.last).toBeDefined())
    ctl.mountSceneView(document.createElement('div'), 64)
    expect(getMapThumbnail).toHaveBeenCalledTimes(1)
  })

  it('Image 解码失败后标记 map failed，不在后续帧反复请求', async () => {
    class FailingImage {
      static last: FailingImage | undefined
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        FailingImage.last = this
      }
      set src(_value: string) {} // 坏URL由本例显式触发IO失败
    }
    vi.stubGlobal('Image', FailingImage)
    setCurrentMapNum(1)
    const getMapThumbnail = vi.fn(async () => 'data:image/png;base64,INVALID')
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ctl = createController({ getGs: () => gs, getMapThumbnail })
    ctl.mountSceneView(document.createElement('div'), 64)
    await vi.waitFor(() => expect(FailingImage.last).toBeDefined())
    FailingImage.last!.onerror!()
    ctl.mountSceneView(document.createElement('div'), 64)
    expect(getMapThumbnail).toHaveBeenCalledTimes(1)
  })
})
