// 只渲染调用方提供的暂停恢复倒计时文案，不持有时钟；复用单条元素，null 即移除。
const ID = 'tp-speedrun-countdown'

export function showCountdown(text: string | null): void {
  if (typeof document === 'undefined') return
  let el = document.getElementById(ID)
  if (text == null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('div')
    el.id = ID
    el.style.cssText = [
      'position:fixed',
      'top:64px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:41',
      'pointer-events:none',
      'user-select:none',
      'font:700 64px/1 "Songti SC","SimSun",serif',
      'color:#f0e0b0',
      'text-shadow:0 0 18px rgba(160,30,30,0.7),0 2px 6px rgba(0,0,0,0.8)',
    ].join(';')
    document.body.appendChild(el)
  }
  // index 每 rAF 调用；相同文案不重建文本节点。
  if (el.textContent !== text) el.textContent = text
}
