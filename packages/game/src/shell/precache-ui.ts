/** 右上角固定进度小组件:显示后台资源预缓存进度,完成后淡出移除。canvas 之外的纯 DOM。 */

import { localize, subscribeLanguage } from '../localization/language.js'
import type { PrecacheProgress } from './precache-client.js'

export interface PrecacheWidget {
  update: (p: PrecacheProgress) => void
  done: () => void
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function formatMebibytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(0)
}

function normalizeByteProgress(
  bytes: number,
  totalBytes: number,
): { bytes: number; totalBytes: number } | undefined {
  if (!isFiniteNonNegative(bytes) || !isFiniteNonNegative(totalBytes)) return undefined
  return {
    bytes: totalBytes > 0 ? Math.min(bytes, totalBytes) : 0,
    totalBytes,
  }
}

/**
 * 统一进度控制器(2026-06-15 两段进度)。一条进度条视觉连续、语义两段:
 *   虚线前(0→虚线)= 必要资源加载进度(前台 fetch);虚线后(虚线→100%)= SW 全量预缓存进度。
 * 操作 index.html 内联的 #boot-loading 覆盖层,进入后转右上角 widget。
 */
export interface UnifiedProgressUi {
  /** 虚线前:必要资源加载进度(fraction 0→1)→ 映射到 0→虚线位置。 */
  setNecessaryProgress: (fraction: number) => void
  /** 虚线:必要资源就绪 → 进度到虚线 + 显示常驻「进入游戏」按钮;onEnter 在 click 同步栈调用。 */
  markPlayable: (onEnter: () => void) => void
  /** 虚线后:SW 全量预缓存进度(已缓存字节/总字节)→ 进度条后半段;竞速玩家等满 100%。 */
  setFullProgress: (cachedBytes: number, totalBytes: number) => void
  /** 用户进入:覆盖层淡出 → 右上角半透明小条。 */
  enterGame: () => void
  /** 预缓存到 100% / 出错收尾:淡出移除。 */
  done: () => void
  /** 错误态:覆盖层仍在(未进入)时改显启动错误。 */
  fail: (msg: string) => void
}

export function createPrecacheWidget(): PrecacheWidget {
  if (typeof document === 'undefined') {
    return { update: () => {}, done: () => {} } // SSR/无 DOM 安全
  }
  const el = document.createElement('div')
  el.id = 'precache-widget'
  el.style.cssText = [
    'position:fixed',
    'top:8px',
    'right:8px',
    'z-index:20',
    'background:rgba(17,17,17,0.82)',
    'color:#9a8a6a',
    'font:11px/1.4 monospace',
    'padding:6px 10px',
    'border:1px solid #553322',
    'border-radius:4px',
    'pointer-events:none',
    'user-select:none',
    'transition:opacity 0.6s ease',
  ].join(';')
  const text = document.createElement('div')
  text.textContent = localize('后台缓存中…', 'Caching in background…') // 初始占位:enterGame 到首条 SW progress 之间不显空白框
  const bar = document.createElement('div')
  bar.style.cssText =
    'height:4px;margin-top:4px;background:#2a1515;border-radius:2px;overflow:hidden'
  const fill = document.createElement('div')
  fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#8a2a2a,#d8b365)'
  bar.appendChild(fill)
  el.append(text, bar)
  document.body.appendChild(el)

  let currentProgress: { bytes: number; totalBytes: number } | undefined
  const renderText = (): void => {
    if (!currentProgress) {
      text.textContent = localize('后台缓存中…', 'Caching in background…')
      return
    }
    const { bytes, totalBytes } = currentProgress
    const pct = totalBytes > 0 ? Math.floor((bytes / totalBytes) * 100) : 0
    text.textContent = `${localize('后台缓存资源', 'Caching resources')} ${pct}% (${formatMebibytes(bytes)}/${formatMebibytes(totalBytes)}MB)`
  }
  const unsubscribeLanguage = subscribeLanguage(() => {
    if (el.isConnected) renderText()
    else unsubscribeLanguage()
  })
  return {
    update(p) {
      const progress = normalizeByteProgress(p.bytes, p.totalBytes)
      if (!progress) return
      // 态3 只有字节进度(SW 统一数据源)→ 百分比按 bytes/totalBytes 算,与态1 大条同口径。
      const pct =
        progress.totalBytes > 0 ? Math.floor((progress.bytes / progress.totalBytes) * 100) : 0
      currentProgress = progress
      renderText()
      fill.style.width = `${pct}%`
    },
    done() {
      unsubscribeLanguage()
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 600)
    },
  }
}

/**
 * 两段统一进度控制器(见 UnifiedProgressUi)。无 #boot-loading 节点(测试/SSR/降级)各入口安全。
 */
export function createUnifiedProgressUi(opts?: { playableFraction?: number }): UnifiedProgressUi {
  const byId = (id: string): HTMLElement | null =>
    typeof document === 'undefined' ? null : document.getElementById(id)
  // 虚线位置 = 必要资源占全量的预估比例(默认 12%)。虚线前段映射必要资源进度、虚线后段是 SW 全量
  // 真实进度(bytes/total);两段在虚线附近自然衔接(必要资源 ≈ playableFraction × total)。
  const requestedPlayableFraction = opts?.playableFraction ?? 0.12
  const playableFraction = isFiniteNonNegative(requestedPlayableFraction)
    ? Math.min(1, requestedPlayableFraction)
    : 0.12
  const mark = byId('boot-loading-mark')
  if (mark) mark.style.left = `${Math.round(playableFraction * 100)}%`

  let shownPct = 0 // 单调不回退,贯穿两段
  let phase: 'necessary' | 'full' | 'entered' | 'failed' = 'necessary'
  let doneReceived = false
  let lastBytes = 0
  let lastTotal = 0
  let widget: PrecacheWidget | null = null
  let statusMessage: (() => string) | undefined
  const unsubscribeLanguage = subscribeLanguage(() => {
    const status = byId('boot-loading-status')
    if (status && statusMessage) status.textContent = statusMessage()
    else if (!byId('boot-loading')) unsubscribeLanguage()
  })

  function paint(pct: number, text: () => string): void {
    statusMessage = text
    shownPct = Math.min(100, Math.max(shownPct, pct)) // 单调 + 0..100 clamp
    const fill = byId('boot-loading-fill')
    if (fill) fill.style.width = `${shownPct}%`
    const status = byId('boot-loading-status')
    if (status) {
      status.dataset.initial = 'false'
      status.textContent = text()
    }
  }

  return {
    setNecessaryProgress(fraction) {
      if (phase !== 'necessary') return // 已过虚线 → SW 全量接管
      if (!Number.isFinite(fraction)) return
      const frac = Math.max(0, Math.min(1, fraction))
      paint(
        frac * playableFraction * 100,
        () => `${localize('加载必要资源', 'Loading essentials')} ${Math.floor(frac * 100)}%`,
      )
    },
    markPlayable(onEnter) {
      if (phase !== 'necessary') return
      phase = 'full'
      paint(playableFraction * 100, () =>
        localize('必要资源就绪 — 可进入', 'Essential resources ready — you can enter'),
      ) // 到虚线
      const box = byId('boot-loading-enter')
      const btn = byId('boot-loading-enter-btn')
      if (!box || !btn) {
        onEnter() // 无按钮容器(降级)→ 直接放行,绝不卡门
        return
      }
      box.removeAttribute('hidden')
      btn.addEventListener('click', () => onEnter(), { once: true })
    },
    setFullProgress(cachedBytes, totalBytes) {
      if (phase === 'failed') return
      const progress = normalizeByteProgress(cachedBytes, totalBytes)
      if (!progress) return
      lastBytes = progress.bytes
      lastTotal = progress.totalBytes
      if (phase === 'entered') {
        widget?.update({ done: 0, total: 0, ...progress })
      } else if (phase === 'full') {
        // 虚线后 = SW 真实进度 bytes/total(单调不回退,起步 < 虚线时 clamp 在虚线不退)。
        const pct = progress.totalBytes > 0 ? (progress.bytes / progress.totalBytes) * 100 : 0
        paint(
          pct,
          () =>
            `${localize('已缓存', 'Cached')} ${formatMebibytes(progress.bytes)}/${formatMebibytes(progress.totalBytes)}MB`,
        )
      }
      // necessary 阶段只暂存字节供进入时初始化 widget，不改覆盖层。
    },
    enterGame() {
      if (phase === 'entered') return
      phase = 'entered'
      unsubscribeLanguage()
      const root = byId('boot-loading')
      if (root) {
        root.classList.add('boot-loading-done') // CSS opacity 过渡淡出
        setTimeout(() => root.remove(), 600)
      }
      // 竞速玩家等满 100% / SW 已收尾后才进入 → 全缓存完毕,右上角不留空白进度框。
      if (doneReceived) return
      widget = createPrecacheWidget() // 复用右上角视觉
      // 用最后已知进度初始化,消除"建好到首条 progress 之间"的空白瞬间。
      if (lastTotal > 0)
        widget.update({ done: 0, total: 0, bytes: lastBytes, totalBytes: lastTotal })
    },
    done() {
      doneReceived = true // 进入若发生在此之后,enterGame 不再建 widget
      widget?.done()
    },
    fail(msg) {
      if (phase === 'entered') return // 已进游戏 → 覆盖层已移除,错误另由 canvas 显示
      phase = 'failed' // 迟到的必要资源/SW 进度不能覆盖失败提示
      const root = byId('boot-loading')
      if (!root) return
      root.classList.add('boot-loading-error')
      const status = byId('boot-loading-status')
      statusMessage = () => `${localize('启动失败:', 'Startup failed: ')}${msg}`
      if (status) {
        status.dataset.initial = 'false'
        status.textContent = statusMessage()
      }
    },
  }
}
