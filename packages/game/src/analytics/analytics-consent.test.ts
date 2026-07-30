import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  hasPrivacySignal,
  readAnalyticsConsent,
  resolveInitialAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
} from './analytics-consent.js'

describe('analytics consent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('缺失、损坏或异常存储一律失败关闭', () => {
    expect(readAnalyticsConsent(localStorage)).toBe('unset')
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'unexpected')
    expect(readAnalyticsConsent(localStorage)).toBe('unset')

    const brokenStorage = {
      getItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
      setItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
    }
    expect(readAnalyticsConsent(brokenStorage)).toBe('unset')
    expect(writeAnalyticsConsent('granted', brokenStorage, window)).toBe(false)
  })

  it('只保存合法选择、广播变更并支持销毁订阅', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeAnalyticsConsent(listener, window)

    expect(writeAnalyticsConsent('granted', localStorage, window)).toBe(true)
    expect(readAnalyticsConsent(localStorage)).toBe('granted')
    expect(listener).toHaveBeenCalledWith('granted')

    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: 'invalid' }))
    expect(listener).toHaveBeenLastCalledWith('unset')
    unsubscribe()
  })

  it('DNT/GPC 仅在访客尚未选择时提供默认 denied', () => {
    expect(hasPrivacySignal({ doNotTrack: '1' })).toBe(true)
    expect(hasPrivacySignal({ globalPrivacyControl: true })).toBe(true)
    expect(resolveInitialAnalyticsConsent(localStorage, { doNotTrack: '1' })).toBe('denied')

    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'granted')
    expect(resolveInitialAnalyticsConsent(localStorage, { globalPrivacyControl: true })).toBe(
      'granted',
    )
  })
})
