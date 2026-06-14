/** 右上角固定进度小组件:显示后台资源预缓存进度,完成后淡出移除。canvas 之外的纯 DOM。 */
import type { PrecacheProgress } from './precache-client.js'

export interface PrecacheWidget {
  update: (p: PrecacheProgress) => void
  done: () => void
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
      const pct = p.total > 0 ? Math.floor((p.done / p.total) * 100) : 0
      text.textContent = `后台缓存资源 ${pct}% (${mb(p.bytes)}/${mb(p.totalBytes)}MB)`
      fill.style.width = `${pct}%`
    },
    done() {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 600)
    },
  }
}
