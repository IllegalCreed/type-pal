import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type AnalyticsConsent,
  hasPrivacySignal,
  readAnalyticsConsent,
  resolveInitialAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
} from './analytics-consent.js'

// 独立的产品持久键oracle;不跟随被测常量生成expected。
const KEY = 'type-pal.analytics-consent.v1'
let originalConsent: string | null
beforeEach(() => {
  originalConsent = localStorage.getItem(KEY)
  localStorage.removeItem(KEY)
})
afterEach(() => {
  if (originalConsent === null) localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, originalConsent)
})

describe('analytics consent', () => {
  it('缺失、损坏或异常存储一律失败关闭', () => {
    const values: Array<[string | null, AnalyticsConsent]> = [
      [null, 'unset'],
      ['unexpected', 'unset'],
      ['granted', 'granted'],
      ['denied', 'denied'],
    ]
    for (const [stored, expected] of values) {
      const getItem = vi.fn((key: string) => (key === KEY ? stored : null))
      expect(readAnalyticsConsent({ getItem })).toBe(expected)
      expect(getItem).toHaveBeenCalledTimes(1)
      expect(getItem).toHaveBeenCalledWith(KEY)
    }
    expect(
      readAnalyticsConsent({
        getItem: () => {
          throw new Error('storage blocked')
        },
      }),
    ).toBe('unset')
  })

  it('默认宿主先持久化选择,再同步广播已提交的值', () => {
    const seen: Array<[AnalyticsConsent, string | null]> = []
    const unsubscribe = subscribeAnalyticsConsent((consent) => {
      seen.push([consent, localStorage.getItem(KEY)])
    })
    try {
      expect(writeAnalyticsConsent('granted')).toBe(true)
      expect(writeAnalyticsConsent('denied')).toBe(true)
      expect(seen).toEqual([
        ['granted', 'granted'],
        ['denied', 'denied'],
      ])
      expect(readAnalyticsConsent()).toBe('denied')
    } finally {
      unsubscribe()
    }
  })

  it('DNT/GPC 仅在访客尚未选择时提供默认 denied', () => {
    expect(hasPrivacySignal({ doNotTrack: '1' })).toBe(true)
    expect(hasPrivacySignal({ globalPrivacyControl: true })).toBe(true)
    expect(hasPrivacySignal(undefined)).toBe(false)
    expect(hasPrivacySignal({ doNotTrack: '0', globalPrivacyControl: false })).toBe(false)
    expect(resolveInitialAnalyticsConsent(localStorage, undefined)).toBe('unset')
    expect(resolveInitialAnalyticsConsent(localStorage, { doNotTrack: '1' })).toBe('denied')
    expect(resolveInitialAnalyticsConsent(localStorage, { globalPrivacyControl: true })).toBe(
      'denied',
    )
    for (const choice of ['granted', 'denied']) {
      localStorage.setItem(KEY, choice)
      expect(
        resolveInitialAnalyticsConsent(localStorage, {
          doNotTrack: '1',
          globalPrivacyControl: true,
        }),
      ).toBe(choice)
      expect(resolveInitialAnalyticsConsent(localStorage, undefined)).toBe(choice)
    }
  })
})
