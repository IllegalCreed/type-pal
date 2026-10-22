import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ANALYTICS_CONSENT_STORAGE_KEY } from './analytics-consent.js'
import { useGoogleAnalyticsTestHost } from './google-analytics.test-fixtures.js'
import {
  installTypePalAnalytics,
  TYPE_PAL_GA_MEASUREMENT_ID,
  type TypePalAnalyticsInstallation,
} from './install-analytics.js'

describe('Type Pal analytics installation boundary', () => {
  const host = useGoogleAnalyticsTestHost()
  let installation: TypePalAnalyticsInstallation | undefined
  let storedConsent: string | null

  beforeEach(() => {
    storedConsent = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY)
  })

  afterEach(() => {
    try {
      installation?.destroy()
    } finally {
      installation = undefined
      if (storedConsent === null) localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY)
      else localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, storedConsent)
    }
  })

  it('公开安装器：Measurement ID 合法，开发模式不注入SDK且偏好入口可重开UI', () => {
    expect(TYPE_PAL_GA_MEASUREMENT_ID).toMatch(/^G-[A-Z0-9]{6,20}$/)

    installation = installTypePalAnalytics({
      enabled: false,
      window,
      document: host.document,
      navigator: { doNotTrack: null, globalPrivacyControl: false },
    })

    expect(host.document.querySelector('[data-testid="analytics-consent-panel"]')).not.toBeNull()
    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    const panel = host.document.querySelector<HTMLElement>(
      '[data-testid="analytics-consent-panel"]',
    )
    const preferences = host.document.querySelector<HTMLElement>(
      '[data-testid="analytics-preferences"]',
    )
    expect(panel?.hidden).toBe(false)
    host.document.querySelector<HTMLButtonElement>('[data-choice="denied"]')?.click()
    expect(panel?.hidden).toBe(true)
    expect(preferences?.hidden).toBe(false)
    installation.openPreferences()
    expect(panel?.hidden).toBe(false)
    expect(preferences?.hidden).toBe(true)
    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('denied')
    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
  })

  it('G2: DNT/GPC 未有存储选择时默认关闭，但 UI 仍可见', () => {
    installation = installTypePalAnalytics({
      enabled: true,
      window,
      document: host.document,
      navigator: { doNotTrack: '1', globalPrivacyControl: true },
    })

    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    expect(host.document.body.textContent).toContain('隐私信号')
  })
})
