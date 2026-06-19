// fps-overlay.ts —— 左上角 FPS 显示(rAF 真实帧率;.tp-* 暗底金边,pointer-events:none 不挡操作)。
//   工具面板「系统」tab 开关切换,localStorage 持久化(全局,跨存档)。
//   诊断用:rAF 维持 ~60 = 浏览器无 CPU 卡顿(动画若仍顿挫则属逻辑 tick 量化,非性能);
//            rAF 掉到 <50 = 真 CPU 瓶颈。绿色 ≥50 / 红色 <50。

const K_FPS = 'tp-fps-show'
const ROOT_ID = 'tp-fps-overlay'
const STYLE_ID = 'tp-fps-style'

const ls = (): Storage | undefined =>
  typeof localStorage !== 'undefined' ? localStorage : undefined

export function isFpsEnabled(): boolean {
  return ls()?.getItem(K_FPS) === '1'
}

function injectStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#${ROOT_ID} {
  position:fixed; top:12px; left:12px; z-index:28; pointer-events:none; user-select:none;
  background:rgba(17,17,17,0.82); border:1px solid #d8b365; border-radius:6px; padding:4px 9px;
  font:700 15px/1.2 ui-monospace,Menlo,monospace; letter-spacing:0.5px;
  box-shadow:0 0 12px rgba(160,30,30,0.35),0 2px 8px rgba(0,0,0,0.5); }
#${ROOT_ID} .v { color:#6fcf97; } #${ROOT_ID} .v.lo { color:#e06c5a; }
#${ROOT_ID} .u { color:#9a8a6a; font-size:11px; font-weight:400; margin-left:3px; }
`
  document.head.appendChild(style)
}

function ensureRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID)
  if (!root) {
    injectStyles()
    root = document.createElement('div')
    root.id = ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

export function hideFpsOverlay(): void {
  if (typeof document === 'undefined') return
  document.getElementById(ROOT_ID)?.remove()
}

function renderFps(fps: number): void {
  if (typeof document === 'undefined') return
  const root = ensureRoot()
  root.replaceChildren()
  const v = document.createElement('span')
  v.className = fps >= 50 ? 'v' : 'v lo'
  v.textContent = String(fps)
  const u = document.createElement('span')
  u.className = 'u'
  u.textContent = 'FPS'
  root.append(v, u)
}

interface FpsState {
  frames: number
  /** 当前采样窗起点(performance.now 注入);undefined = 尚未起算。 */
  windowStartMs: number | undefined
  displayFps: number
}
const fpsState: FpsState = { frames: 0, windowStartMs: undefined, displayFps: 0 }

/** 采样窗口:每 ~500ms 重算一次显示值(平滑、不闪)。 */
const SAMPLE_WINDOW_MS = 500

/**
 * 每 rAF 调一次:累计帧数,满 SAMPLE_WINDOW_MS 重算 displayFps 并刷新 overlay。
 * 未启用时早退并(若残留)隐藏 overlay,纯 no-op。startRafLoop 每帧调,注入 rAF 时间戳。
 */
export function tickFps(nowMs: number): void {
  if (!isFpsEnabled()) {
    if (fpsState.windowStartMs !== undefined) {
      fpsState.windowStartMs = undefined
      fpsState.frames = 0
      hideFpsOverlay()
    }
    return
  }
  if (fpsState.windowStartMs === undefined) {
    fpsState.windowStartMs = nowMs
    fpsState.frames = 0
    renderFps(fpsState.displayFps) // 立即建框给即时反馈(显示上次值 / 0)
    return
  }
  fpsState.frames++
  const elapsed = nowMs - fpsState.windowStartMs
  if (elapsed >= SAMPLE_WINDOW_MS) {
    fpsState.displayFps = Math.round((fpsState.frames * 1000) / elapsed)
    fpsState.frames = 0
    fpsState.windowStartMs = nowMs
    renderFps(fpsState.displayFps)
  }
}

/** 工具面板开关:写持久化;关 → 立即隐藏 overlay。开 → 下一 rAF tickFps 自动建框。 */
export function setFpsEnabled(on: boolean): void {
  ls()?.setItem(K_FPS, on ? '1' : '0')
  if (!on) {
    hideFpsOverlay()
    fpsState.windowStartMs = undefined
    fpsState.frames = 0
  }
}
