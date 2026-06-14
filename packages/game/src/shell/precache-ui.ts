/** 右上角固定进度小组件:显示后台资源预缓存进度,完成后淡出移除。canvas 之外的纯 DOM。 */
import type { PrecacheProgress } from './precache-client.js'

export interface PrecacheWidget {
  update: (p: PrecacheProgress) => void
  done: () => void
}

/**
 * 统一进度三态控制器(2026-06-14)。操作 index.html 内联的 #boot-loading 覆盖层(态1/2)与右上角
 * widget(态3)。数据源单一 = SW 已缓存字节 / manifest.totalBytes,从启动到 100% 一条线。
 */
export interface UnifiedProgressUi {
  /** 态1 大条 / 态3 小条通用:按已缓存字节 / 总字节更新(内部单调不回退)。 */
  setProgress: (cachedBytes: number, totalBytes: number) => void
  /** 态1→态2:必要资源就绪,显示「进入游戏」按钮(常驻);onEnter 在 click 同步栈调用。 */
  markPlayable: (onEnter: () => void) => void
  /** 态2→态3:用户已进入,覆盖层淡出 → 右上角半透明小条。 */
  enterGame: () => void
  /** 态3:预缓存到 100% 后淡出移除。 */
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
    'position:fixed', 'top:8px', 'right:8px', 'z-index:20',
    'background:rgba(17,17,17,0.82)', 'color:#9a8a6a', 'font:11px/1.4 monospace',
    'padding:6px 10px', 'border:1px solid #553322', 'border-radius:4px',
    'pointer-events:none', 'user-select:none', 'transition:opacity 0.6s ease',
  ].join(';')
  const text = document.createElement('div')
  const bar = document.createElement('div')
  bar.style.cssText = 'height:4px;margin-top:4px;background:#2a1515;border-radius:2px;overflow:hidden'
  const fill = document.createElement('div')
  fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#8a2a2a,#d8b365)'
  bar.appendChild(fill)
  el.append(text, bar)
  document.body.appendChild(el)

  const mb = (b: number): string => (b / 1024 / 1024).toFixed(0)
  return {
    update(p) {
      // 态3 只有字节进度(SW 统一数据源)→ 百分比按 bytes/totalBytes 算,与态1 大条同口径。
      const pct = p.totalBytes > 0 ? Math.floor((p.bytes / p.totalBytes) * 100) : 0
      text.textContent = `后台缓存资源 ${pct}% (${mb(p.bytes)}/${mb(p.totalBytes)}MB)`
      fill.style.width = `${pct}%`
    },
    done() {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 600)
    },
  }
}

/**
 * 三态统一进度控制器(见 UnifiedProgressUi）。无 #boot-loading 节点(测试/SSR/降级)各入口安全。
 */
export function createUnifiedProgressUi(opts?: { playableFraction?: number }): UnifiedProgressUi {
  const byId = (id: string): HTMLElement | null =>
    typeof document === 'undefined' ? null : document.getElementById(id)
  const mb = (b: number): string => (b / 1024 / 1024).toFixed(0)

  // 虚线位置 = 必要资源预估占比(默认 12%;真实可玩以 markPlayable 信号为准,虚线仅作预期提示)。
  const mark = byId('boot-loading-mark')
  if (mark) mark.style.left = `${Math.round((opts?.playableFraction ?? 0.12) * 100)}%`

  let shownPct = 0
  let entered = false
  let doneReceived = false // SW 已全缓存(done)或出错收尾;进入时据此决定右上角是否还显示进度
  let lastBytes = 0
  let lastTotal = 0
  let widget: PrecacheWidget | null = null

  function paintOverlay(cachedBytes: number, totalBytes: number): void {
    const pct = totalBytes > 0 ? (cachedBytes / totalBytes) * 100 : 0
    shownPct = Math.min(100, Math.max(shownPct, pct)) // 单调不回退 + 0..100 clamp
    const fill = byId('boot-loading-fill')
    if (fill) fill.style.width = `${shownPct}%`
    const status = byId('boot-loading-status')
    if (status) {
      status.textContent = `已缓存 ${mb(cachedBytes)}/${mb(totalBytes)}MB (${Math.floor(shownPct)}%)`
    }
  }

  return {
    setProgress(cachedBytes, totalBytes) {
      lastBytes = cachedBytes // 记最后进度:enterGame 据此初始化 widget,消除空白瞬间
      lastTotal = totalBytes
      if (entered) widget?.update({ done: 0, total: 0, bytes: cachedBytes, totalBytes })
      else paintOverlay(cachedBytes, totalBytes)
    },
    markPlayable(onEnter) {
      const box = byId('boot-loading-enter')
      const btn = byId('boot-loading-enter-btn')
      if (!box || !btn) {
        onEnter() // 无按钮容器(降级)→ 直接放行,绝不卡门
        return
      }
      box.removeAttribute('hidden')
      btn.addEventListener('click', () => onEnter(), { once: true })
    },
    enterGame() {
      if (entered) return
      entered = true
      const root = byId('boot-loading')
      if (root) {
        root.classList.add('boot-loading-done') // CSS opacity 过渡淡出
        setTimeout(() => root.remove(), 600)
      }
      // 竞速玩家等满 100% / SW 已收尾后才进入 → 全缓存完毕,右上角不留空白进度框。
      if (doneReceived) return
      widget = createPrecacheWidget() // 态3 复用现右上角视觉
      // 用最后已知进度初始化,消除"建好到首条 progress 之间"的空白瞬间。
      if (lastTotal > 0) widget.update({ done: 0, total: 0, bytes: lastBytes, totalBytes: lastTotal })
    },
    done() {
      doneReceived = true // 记下:进入若发生在此之后,enterGame 不再建 widget
      widget?.done()
    },
    fail(msg) {
      if (entered) return // 已进游戏 → 覆盖层已移除,错误另由 canvas 显示
      const root = byId('boot-loading')
      if (!root) return
      root.classList.add('boot-loading-error')
      const status = byId('boot-loading-status')
      if (status) status.textContent = `启动失败:${msg}`
    },
  }
}
