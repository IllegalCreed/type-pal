import { beforeEach, describe, expect, it } from 'vitest'
import { ANALYTICS_CONSENT_STORAGE_KEY, readAnalyticsConsent } from './analytics-consent.js'
import { mountAnalyticsConsentUi } from './analytics-consent-ui.js'

describe('analytics consent UI', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="boot-loading-enter-btn">进入游戏</button>'
    localStorage.clear()
  })

  it('P2: 底部居中且高于 loading，不 autofocus、不遮挡进入游戏按钮', () => {
    mountAnalyticsConsentUi({ document, storage: localStorage, eventTarget: window })

    const panel = document.querySelector<HTMLElement>('[data-testid="analytics-consent-panel"]')
    expect(panel).not.toBeNull()
    expect(panel?.style.position).toBe('fixed')
    expect(panel?.style.bottom).toBe('16px')
    expect(panel?.style.left).toBe('50%')
    expect(panel?.style.zIndex).toBe('19')
    expect(document.activeElement).toBe(document.body)
    expect(document.getElementById('boot-loading-enter-btn')).not.toBeNull()
  })

  it('DNT 默认关闭时仍显示说明，访客可明确拒绝或允许', () => {
    const ui = mountAnalyticsConsentUi({
      document,
      storage: localStorage,
      eventTarget: window,
      privacySignal: true,
    })

    expect(document.body.textContent).toContain('隐私信号')
    document.querySelector<HTMLButtonElement>('[data-choice="denied"]')?.click()
    expect(readAnalyticsConsent(localStorage)).toBe('denied')

    document.querySelector<HTMLButtonElement>('[data-testid="analytics-preferences"]')?.click()
    document.querySelector<HTMLButtonElement>('[data-choice="granted"]')?.click()
    expect(readAnalyticsConsent(localStorage)).toBe('granted')

    ui.destroy()
    expect(document.querySelector('[data-analytics-consent-root]')).toBeNull()
  })

  it('存储不可用时保持面板，不伪装成已保存', () => {
    const brokenStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked')
      },
    }
    mountAnalyticsConsentUi({ document, storage: brokenStorage, eventTarget: window })
    document.querySelector<HTMLButtonElement>('[data-choice="granted"]')?.click()

    expect(document.querySelector('[data-testid="analytics-consent-panel"]')).not.toBeNull()
    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBeNull()
  })
})
