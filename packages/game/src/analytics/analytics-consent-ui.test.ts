import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ANALYTICS_CONSENT_STORAGE_KEY, readAnalyticsConsent } from './analytics-consent.js'
import { type AnalyticsConsentUi, mountAnalyticsConsentUi } from './analytics-consent-ui.js'

describe('analytics consent UI', () => {
  let ui: AnalyticsConsentUi | undefined
  let enter: HTMLButtonElement
  let previousFocus: Element | null
  let storedConsent: string | null
  beforeEach(() => {
    storedConsent = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY)
    previousFocus = document.activeElement
    enter = document.createElement('button')
    enter.id = 'boot-loading-enter-btn'
    enter.textContent = '进入游戏'
    document.body.append(enter)
  })
  afterEach(() => {
    try {
      ui?.destroy()
    } finally {
      ui = undefined
      enter.remove()
      if (storedConsent === null) localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY)
      else localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, storedConsent)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  })

  it('P2: 底部定位与层级样式，挂载保留进入按钮和原焦点', () => {
    enter.focus()
    ui = mountAnalyticsConsentUi({ document, storage: localStorage, eventTarget: window })

    const panel = document.querySelector<HTMLElement>('[data-testid="analytics-consent-panel"]')
    expect(panel).not.toBeNull()
    expect(panel?.style.position).toBe('fixed')
    expect(panel?.style.bottom).toBe('16px')
    expect(panel?.style.left).toBe('50%')
    expect(panel?.style.zIndex).toBe('19')
    expect(document.activeElement).toBe(enter)
    expect(enter.isConnected).toBe(true)
  })

  it('DNT 默认关闭时仍显示说明，访客可明确拒绝或允许', () => {
    ui = mountAnalyticsConsentUi({
      document,
      storage: localStorage,
      eventTarget: window,
      privacySignal: true,
    })

    expect(document.body.textContent).toContain('隐私信号')
    const panel = document.querySelector<HTMLElement>('[data-testid="analytics-consent-panel"]')
    const preferences = document.querySelector<HTMLButtonElement>(
      '[data-testid="analytics-preferences"]',
    )
    expect(panel?.hidden).toBe(false)
    document.querySelector<HTMLButtonElement>('[data-choice="denied"]')?.click()
    expect(readAnalyticsConsent(localStorage)).toBe('denied')
    expect(panel?.hidden).toBe(true)
    expect(preferences?.hidden).toBe(false)

    document.querySelector<HTMLButtonElement>('[data-testid="analytics-preferences"]')?.click()
    expect(panel?.hidden).toBe(false)
    expect(preferences?.hidden).toBe(true)
    document.querySelector<HTMLButtonElement>('[data-choice="granted"]')?.click()
    expect(readAnalyticsConsent(localStorage)).toBe('granted')
    expect(panel?.hidden).toBe(true)

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
    ui = mountAnalyticsConsentUi({ document, storage: brokenStorage, eventTarget: window })
    document.querySelector<HTMLButtonElement>('[data-choice="granted"]')?.click()

    expect(
      document.querySelector<HTMLElement>('[data-testid="analytics-consent-panel"]')?.hidden,
    ).toBe(false)
    expect(
      document.querySelector<HTMLButtonElement>('[data-testid="analytics-preferences"]')?.hidden,
    ).toBe(true)
    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBeNull()
  })
})
