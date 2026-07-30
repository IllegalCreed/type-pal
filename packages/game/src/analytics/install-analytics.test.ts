import { beforeEach, describe, expect, it } from 'vitest'
import { installTypePalAnalytics, TYPE_PAL_GA_MEASUREMENT_ID } from './install-analytics.js'

describe('Type Pal analytics installation boundary', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    localStorage.clear()
    delete (window as unknown as { dataLayer?: unknown[][] }).dataLayer
  })

  it('公开 Measurement ID 合法，开发环境只显示 UI 且无 Google 请求', () => {
    expect(TYPE_PAL_GA_MEASUREMENT_ID).toMatch(/^G-[A-Z0-9]{6,20}$/)

    const installation = installTypePalAnalytics({
      enabled: false,
      window,
      document,
      navigator: { doNotTrack: null, globalPrivacyControl: false },
    })

    expect(document.querySelector('[data-testid="analytics-consent-panel"]')).not.toBeNull()
    expect(document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    installation.destroy()
  })

  it('G2: DNT/GPC 未有存储选择时默认关闭，但 UI 仍可见', () => {
    installTypePalAnalytics({
      enabled: true,
      window,
      document,
      navigator: { doNotTrack: '1', globalPrivacyControl: true },
    })

    expect(document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    expect(document.body.textContent).toContain('隐私信号')
  })
})
