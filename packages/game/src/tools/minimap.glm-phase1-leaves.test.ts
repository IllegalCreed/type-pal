/**
 * L18 minimap:与minimap.test的纯几何/分类合同分层,本文件核真实canvas与控制器IO。
 * 像素坐标/颜色为独立手算;裁剪用自有图像。不借被测变换或DOT_COLORS生成oracle。
 * 原六例加两例真实widget快捷键:用实际canvas绘制调用核缩放/两端钳制与输入焦点/关闭守卫。
 * getter仍只证开关读写;不冒充完整可见性/坏持久zoom验收。每例释放自有rAF/监听/DOM/全局与偏好。
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

  it('widget快捷键按四档裁剪真实canvas,两端钳制后仍保持边界档', () => {
    setCurrentMapNum(1)
    const gs = createInitialGameState({ x: 1024, y: 1024, facing: 'down' })
    const ctl = createController({ getGs: () => gs, getMapThumbnail: async () => null })
    ctl.setWidgetEnabled(true)
    const canvas = document.querySelector<HTMLCanvasElement>('#tp-minimap-widget canvas')!
    expect(canvas.width).toBe(180)
    expect(canvas.height).toBe(180)
    const rect = vi.spyOn(canvas.getContext('2d')!, 'strokeRect') // 穿透真实canvas绘制
    try {
      const press = (code: string, index: number, expected: readonly number[]): void => {
        rect.mockClear()
        window.dispatchEvent(new KeyboardEvent('keydown', { code }))
        expect(localStorage.getItem('tp-minimap-zoom')).toBe(String(index))
        expect(rect).toHaveBeenCalledTimes(1)
        const actual = rect.mock.calls[0]!
        expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 6))
      }
      // 180px画布;默认960→640。相机=主角-(160,112),白框世界宽高320×200。
      press('Equal', 3, [45, 58.5, 90, 56.25])
      press('Equal', 3, [45, 58.5, 90, 56.25])
      press('Minus', 2, [60, 69, 60, 37.5])
      press('Minus', 1, [67.5, 74.25, 45, 28.125])
      press('Minus', 0, [990 / 13, 1044 / 13, 360 / 13, 225 / 13])
      press('Minus', 0, [990 / 13, 1044 / 13, 360 / 13, 225 / 13])
    } finally {
      rect.mockRestore()
    }
  })

  it('widget关闭或焦点在INPUT/TEXTAREA时,快捷键不改缩放也不重绘', () => {
    setCurrentMapNum(1)
    const gs = createInitialGameState({ x: 1024, y: 1024, facing: 'down' })
    const ctl = createController({ getGs: () => gs, getMapThumbnail: async () => null })
    ctl.setWidgetEnabled(true)
    const canvas = document.querySelector<HTMLCanvasElement>('#tp-minimap-widget canvas')!
    const rect = vi.spyOn(canvas.getContext('2d')!, 'strokeRect')
    try {
      for (const tag of ['input', 'textarea']) {
        const input = document.createElement(tag)
        document.body.appendChild(input)
        input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Equal', bubbles: true }))
        expect(localStorage.getItem('tp-minimap-zoom')).toBeNull()
        expect(rect).not.toHaveBeenCalled()
      }
      ctl.setWidgetEnabled(false)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Equal' }))
      expect(localStorage.getItem('tp-minimap-zoom')).toBeNull()
      expect(rect).not.toHaveBeenCalled()
    } finally {
      rect.mockRestore()
    }
  })

  it('底图 URL 已 resolve 但 Image 尚未 onload 时，不重复请求同一 map', async () => {
    class PendingImage {
      static last: HTMLCanvasElement | undefined
      constructor() {
        // 只替换Image解码IO：就绪后提供真实CanvasImageSource，保留drawImage像素路径。
        const surface = document.createElement('canvas')
        surface.width = surface.height = 640
        const context = surface.getContext('2d')!
        context.fillStyle = '#123abc'
        context.fillRect(0, 0, 640, 640)
        PendingImage.last = surface
        return surface
      }
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
    PendingImage.last!.dispatchEvent(new Event('load'))
    const afterLoad = document.createElement('div')
    ctl.mountSceneView(afterLoad, 64)
    expect(getMapThumbnail).toHaveBeenCalledTimes(1)
    const canvas = afterLoad.querySelector('canvas')!
    expect(pixel(canvas.getContext('2d')!, 30, 30)).toEqual([18, 58, 188, 255])
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
