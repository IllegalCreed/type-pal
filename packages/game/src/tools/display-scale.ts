// canvas 显示缩放(纯 CSS,不碰 320×200 framebuffer)。百分比 10%-1000%,100%=960×600(index.html 现状)。
//   localStorage 持久。UI 滑块走对数刻度(正中=100%),见 tools-panel renderSystemTab。
const KEY = 'tp-display-scale'
const BASE_W = 320
const BASE_H = 200
const HUNDRED_SCALE = 3 // 100% = 3× framebuffer = 960×600(index.html 写死的现状)
export const MIN_PERCENT = 10
export const MAX_PERCENT = 1000

export interface DisplayScaleController {
  getPercent(): number
  setPercent(p: number): void
  toggleFullscreen(): void
}

function clampPct(p: number): number {
  return Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, Math.round(p)))
}

export function createDisplayScaleController(canvas: HTMLCanvasElement): DisplayScaleController {
  const ls = typeof localStorage !== 'undefined' ? localStorage : undefined
  const stored = Number(ls?.getItem(KEY))
  let percent = clampPct(Number.isFinite(stored) && stored > 0 ? stored : 100) // 默认 100%(=960×600 现状)

  const apply = (): void => {
    const f = (HUNDRED_SCALE * percent) / 100
    canvas.style.width = `${Math.round(BASE_W * f)}px`
    canvas.style.height = `${Math.round(BASE_H * f)}px`
    // canvas 中心锚定屏幕中心(超出屏幕也对称溢出,不顶左上;替代 body grid 对超大 item 的左上锚定)。
    canvas.style.position = 'fixed'
    canvas.style.left = '50%'
    canvas.style.top = '50%'
    canvas.style.transform = 'translate(-50%, -50%)'
  }
  apply()

  return {
    getPercent: () => percent,
    setPercent(p) {
      percent = clampPct(p)
      ls?.setItem(KEY, String(percent))
      apply()
    },
    toggleFullscreen() {
      if (typeof document === 'undefined') return
      if (document.fullscreenElement) void document.exitFullscreen()
      else void canvas.requestFullscreen?.()
    },
  }
}
