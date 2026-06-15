// canvas 显示缩放(纯 CSS,不碰 320×200 framebuffer)。fit=等比适应窗口 | N×=320×200 整数倍。
//   localStorage 持久。工具面板「系统 · 显示」节 + bootstrap 接线用。
const KEY = 'tp-display-scale'

export type ScaleMode = 'fit' | number

export interface DisplayScaleController {
  getMode(): ScaleMode
  setMode(mode: ScaleMode): void
  toggleFullscreen(): void
}

function parseMode(raw: string | null): ScaleMode {
  if (raw === 'fit') return 'fit'
  const n = Number(raw)
  // 默认 3×(= index.html 写死的 960×600),不破坏现有显示;用户可在面板改 fit/其他。
  return Number.isFinite(n) && n >= 1 ? n : 3
}

export function createDisplayScaleController(canvas: HTMLCanvasElement): DisplayScaleController {
  const ls = typeof localStorage !== 'undefined' ? localStorage : undefined
  let mode: ScaleMode = parseMode(ls?.getItem(KEY) ?? null)

  const apply = (): void => {
    if (mode === 'fit') {
      // 等比(320:200 = 16:10)适应窗口:宽 min(100vw,160vh)、高 min(62.5vw,100vh)。
      canvas.style.width = 'min(100vw, 160vh)'
      canvas.style.height = 'min(62.5vw, 100vh)'
    } else {
      canvas.style.width = `${320 * mode}px`
      canvas.style.height = `${200 * mode}px`
    }
  }
  apply()

  return {
    getMode: () => mode,
    setMode(m) {
      mode = m
      ls?.setItem(KEY, m === 'fit' ? 'fit' : String(m))
      apply()
    },
    toggleFullscreen() {
      if (typeof document === 'undefined') return
      if (document.fullscreenElement) void document.exitFullscreen()
      else void canvas.requestFullscreen?.()
    },
  }
}
