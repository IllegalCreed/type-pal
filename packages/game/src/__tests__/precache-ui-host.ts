/**
 * UI 专测共同拥有整个 jsdom body 和受控淡出时钟。
 * 移除挂载点后通过真实语言通知释放 UI 的脱离节点订阅，再结清本例的淡出回调。
 * 不替换进度状态、语言实现或 DOM，不提供产品 dispose 接口。
 */
import { afterEach, beforeEach, vi } from 'vitest'
import { getLanguage, useFallbackLanguage } from '../localization/language.js'

export function installPrecacheUiTestHooks(): void {
  let language = getLanguage()
  let documentLanguage: string | null = null
  beforeEach(() => {
    language = getLanguage()
    documentLanguage = document.documentElement.getAttribute('lang')
    vi.useFakeTimers()
    document.body.replaceChildren()
    useFallbackLanguage('zh-CN')
  })
  afterEach(async () => {
    try {
      document.body.replaceChildren()
      useFallbackLanguage(getLanguage() === 'en' ? 'zh-CN' : 'en')
      useFallbackLanguage(language)
      await vi.runOnlyPendingTimersAsync()
    } finally {
      vi.useRealTimers()
      if (documentLanguage === null) document.documentElement.removeAttribute('lang')
      else document.documentElement.lang = documentLanguage
    }
  })
}

export function mountBootLoading(): void {
  document.body.innerHTML = `
    <div id="boot-loading">
      <div id="boot-loading-bar"><div id="boot-loading-fill"></div><div id="boot-loading-mark"></div></div>
      <div id="boot-loading-status"></div>
      <div id="boot-loading-enter" hidden><button id="boot-loading-enter-btn"></button></div>
    </div>`
}
