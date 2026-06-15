// 非阻塞 toast 提示(仙剑暗底金边,自动淡出,pointer-events:none 不挡操作)。
// 快存/快读结果、面板存档导入等复用。canvas 之外纯 DOM,与工具面板同色系。
export type ToastType = 'success' | 'error' | 'info'

const CONTAINER_ID = 'tp-toast-container'

/** 顶部居中堆叠容器(单例;空了自删)。pointer-events:none → 完全不挡游戏/面板交互。 */
function ensureContainer(): HTMLElement {
  const existing = document.getElementById(CONTAINER_ID)
  if (existing) return existing
  const c = document.createElement('div')
  c.id = CONTAINER_ID
  c.style.cssText = [
    'position:fixed', 'top:24px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:40', 'display:flex', 'flex-direction:column', 'gap:8px',
    'align-items:center', 'pointer-events:none',
  ].join(';')
  document.body.appendChild(c)
  return c
}

const ACCENT: Record<ToastType, string> = {
  success: '#d8b365', // 金
  error: '#e06c5a', // 错误红
  info: '#9a8a6a', // 柔金
}
const ICON: Record<ToastType, string> = { success: '✓', error: '✗', info: '·' }

/** 弹一条 toast:淡入 → durationMs 停留 → 淡出移除。非阻塞;多条向下堆叠。 */
export function showToast(message: string, opts: { type?: ToastType; durationMs?: number } = {}): void {
  if (typeof document === 'undefined') return
  const type = opts.type ?? 'success'
  const duration = opts.durationMs ?? 2000
  const accent = ACCENT[type]
  const container = ensureContainer()

  const el = document.createElement('div')
  el.className = `tp-toast tp-toast-${type}`
  el.style.cssText = [
    'font:14px/1.4 "Songti SC","SimSun",serif', 'color:#f0e0b0',
    'background:rgba(17,17,17,0.94)', `border:1px solid ${accent}`, 'border-radius:6px',
    'padding:9px 18px', 'letter-spacing:1px', 'max-width:80vw',
    'box-shadow:0 0 16px rgba(160,30,30,0.45),0 2px 8px rgba(0,0,0,0.5)',
    'opacity:0', 'transform:translateY(-8px)', 'transition:opacity .2s ease,transform .2s ease',
    'pointer-events:none', 'user-select:none',
  ].join(';')
  el.textContent = `${ICON[type]} ${message}`
  container.appendChild(el)

  // 强制 reflow 后改值 → 触发淡入过渡(jsdom 下过渡不生效但值已设,逻辑可测)。
  void el.offsetHeight
  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'

  window.setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(-8px)'
    window.setTimeout(() => {
      el.remove()
      if (container.childElementCount === 0) container.remove()
    }, 220)
  }, duration)
}
