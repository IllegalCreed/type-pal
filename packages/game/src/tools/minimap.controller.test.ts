// Page-controller preferences, keyboard zoom and image-cache IO; drawing remains real.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { getCurrentMapNum, setCurrentMapNum } from '../core/scene-system.js'
import { type MinimapController, type MinimapDeps, setupMinimap } from './minimap.js'

const MINIMAP_KEYS = ['tp-minimap-widget', 'tp-minimap-npc', 'tp-minimap-items', 'tp-minimap-zoom']
const controllers: MinimapController[] = []
let releaseHost = (): void => {}

beforeEach(() => {
  const saved = new Map<string, string | null>()
  for (const key of MINIMAP_KEYS) {
    saved.set(key, localStorage.getItem(key))
    localStorage.removeItem(key)
  }
  const previousLayout = document.documentElement.dataset.tpLayout
  document.documentElement.dataset.tpLayout = 'desktop'
  vi.stubGlobal('devicePixelRatio', 1)
  const oldMap = getCurrentMapNum()
  setCurrentMapNum(0)
  const existing = new Set(Array.from(document.body.children))
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
  const listeners = vi.spyOn(window, 'addEventListener') // 默认穿透,不替换真实接线
  releaseHost = () => {
    try {
      for (const controller of controllers) controller.setWidgetEnabled(false)
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
      if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
      else document.documentElement.dataset.tpLayout = previousLayout
      for (const [key, value] of saved) {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      }
    }
  }
})
afterEach(() => releaseHost())

function createController(deps: MinimapDeps): MinimapController {
  const controller = setupMinimap(deps)
  controllers.push(controller)
  return controller
}

describe('Minimap controller preferences, zoom and images', () => {
  it('默认开关、setShowNpc写存储；按保存值重建控制器读回', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const deps = { getGs: () => gs, getMapThumbnail: async () => null }
    const controller = createController(deps)
    expect(controller.isShowNpc()).toBe(true)
    expect(controller.isShowItems()).toBe(true)
    expect(controller.isWidgetEnabled()).toBe(false)
    controller.setShowNpc(false)
    expect(controller.isShowNpc()).toBe(false)
    expect(localStorage.getItem('tp-minimap-npc')).toBe('0')
    controller.setWidgetEnabled(true)
    expect(controller.isWidgetEnabled()).toBe(true)
    expect(localStorage.getItem('tp-minimap-widget')).toBe('1')
    const savedWidget = localStorage.getItem('tp-minimap-widget')!
    controller.setWidgetEnabled(false) // 旧宿主不再跑,再用实际保存值模拟下次启动
    localStorage.setItem('tp-minimap-widget', savedWidget)
    const rebuiltController = createController(deps)
    expect(rebuiltController.isShowNpc()).toBe(false)
    expect(rebuiltController.isWidgetEnabled()).toBe(true)
  })

  it("持久值非 '0' 非法串 → 视为默认开；widget 非 '1' → 关", () => {
    localStorage.setItem('tp-minimap-npc', 'yes')
    localStorage.setItem('tp-minimap-widget', 'true')
    localStorage.setItem('tp-minimap-zoom', 'not-a-number')
    const gs = createInitialGameState({ x: 1024, y: 1024, facing: 'down' })
    const controller = createController({ getGs: () => gs, getMapThumbnail: async () => null })
    expect(controller.isShowNpc()).toBe(true)
    expect(controller.isWidgetEnabled()).toBe(false)
    setCurrentMapNum(1)
    controller.setWidgetEnabled(true)
    const canvas = document.querySelector<HTMLCanvasElement>('#tp-minimap-widget canvas')!
    const rect = vi.spyOn(canvas.getContext('2d')!, 'strokeRect')
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Minus' }))
      // 非数值持久项恢复默认档2，再缩小一次到档1；180px画布的白框宽为320*180/1280。
      expect(localStorage.getItem('tp-minimap-zoom')).toBe('1')
      expect(rect).toHaveBeenCalledTimes(1)
      expect(rect.mock.calls[0]![2]).toBeCloseTo(45, 6)
    } finally {
      rect.mockRestore()
    }
  })

  it('widget快捷键按四档裁剪真实canvas,两端钳制后仍保持边界档', () => {
    setCurrentMapNum(1)
    const gs = createInitialGameState({ x: 1024, y: 1024, facing: 'down' })
    const controller = createController({ getGs: () => gs, getMapThumbnail: async () => null })
    controller.setWidgetEnabled(true)
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
    const controller = createController({ getGs: () => gs, getMapThumbnail: async () => null })
    controller.setWidgetEnabled(true)
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
      controller.setWidgetEnabled(false)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Equal' }))
      expect(localStorage.getItem('tp-minimap-zoom')).toBeNull()
      expect(rect).not.toHaveBeenCalled()
    } finally {
      rect.mockRestore()
    }
  })

  it('底图 URL 已 resolve 但 Image 尚未 onload 时，不重复请求同一 map', async () => {
    let pendingSurface: HTMLCanvasElement | undefined
    const PendingImage = vi.fn(function decodeImage() {
      // Image解码是IO端口；返回真实CanvasImageSource，保留drawImage像素路径。
      const surface = document.createElement('canvas')
      surface.width = surface.height = 640
      const context = surface.getContext('2d')!
      context.fillStyle = '#123abc'
      context.fillRect(0, 0, 640, 640)
      pendingSurface = surface
      return surface
    })
    vi.stubGlobal('Image', PendingImage)
    setCurrentMapNum(1)
    const url = document.createElement('canvas').toDataURL('image/png')
    const getMapThumbnail = vi.fn(async () => url)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const controller = createController({ getGs: () => gs, getMapThumbnail })
    controller.mountSceneView(document.createElement('div'), 64)
    await vi.waitFor(() => expect(pendingSurface).toBeDefined())
    controller.mountSceneView(document.createElement('div'), 64)
    expect(getMapThumbnail).toHaveBeenCalledTimes(1)
    pendingSurface!.dispatchEvent(new Event('load'))
    const afterLoad = document.createElement('div')
    controller.mountSceneView(afterLoad, 64)
    expect(getMapThumbnail).toHaveBeenCalledTimes(1)
    const canvas = afterLoad.querySelector('canvas')!
    expect(Array.from(canvas.getContext('2d')!.getImageData(30, 30, 1, 1).data)).toEqual([
      18, 58, 188, 255,
    ])
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
    const controller = createController({ getGs: () => gs, getMapThumbnail })
    controller.mountSceneView(document.createElement('div'), 64)
    await vi.waitFor(() => expect(FailingImage.last).toBeDefined())
    FailingImage.last!.onerror!()
    controller.mountSceneView(document.createElement('div'), 64)
    expect(getMapThumbnail).toHaveBeenCalledTimes(1)
  })
})
