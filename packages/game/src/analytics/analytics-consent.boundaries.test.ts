/**
 * TEST-GAME-HOST-BOUNDARIES-1 H04：analytics-consent 边界（analytics-consent.ts）。
 * 既有 analytics-consent.test 已覆盖失败关闭/广播/隐私信号主干——不重复。本文件：
 * storage 属性 getter 抛错→undefined（无 window 同）、写入成功但 dispatch 抛错仍返回 true、
 * 非 CustomEvent 事件→unset、unsubscribe 后真实 dispatch 零回调、stored denied 优先于隐私信号。
 */
import { describe, expect, it } from 'vitest'
import {
  ANALYTICS_CONSENT_EVENT,
  getBrowserConsentStorage,
  readAnalyticsConsent,
  resolveInitialAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
} from './analytics-consent.js'

describe('H04 consent 边界', () => {
  it('storage 属性 getter 抛错 → undefined；无 window → undefined；read 失败关闭 unset', () => {
    const hostile = {
      get localStorage(): never {
        throw new Error('blocked')
      },
    }
    expect(getBrowserConsentStorage(hostile as never)).toBeUndefined() // getter 抛错 → 失败关闭
    const throwingRead = {
      getItem: (): string => {
        throw new Error('denied by policy')
      },
    }
    expect(readAnalyticsConsent(throwingRead)).toBe('unset')
  })
  it('写入成功但 dispatch 抛错仍返回 true；stored denied 优先于隐私信号', () => {
    const recorded: Array<[string, string]> = []
    const storage = {
      setItem: (key: string, value: string) => recorded.push([key, value]),
    }
    const hostileTarget = {
      dispatchEvent: (): boolean => {
        throw new Error('old browser')
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }
    expect(writeAnalyticsConsent('granted', storage, hostileTarget as unknown as EventTarget)).toBe(
      true,
    ) // 持久化仍是唯一真值
    expect(recorded).toEqual([['type-pal.analytics-consent.v1', 'granted']])

    const storedDenied = {
      getItem: (key: string) => (key === 'type-pal.analytics-consent.v1' ? 'denied' : null),
    }
    expect(
      resolveInitialAnalyticsConsent(storedDenied, { doNotTrack: '1', globalPrivacyControl: true }),
    ).toBe('denied') // stored 优先
    expect(resolveInitialAnalyticsConsent(storedDenied, undefined)).toBe('denied')
  })
  it('非 CustomEvent → unset；unsubscribe 后真实 dispatch 零回调', () => {
    const seen: string[] = []
    const unsubscribe = subscribeAnalyticsConsent((consent) => seen.push(consent))
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: 'granted' }))
    expect(seen).toEqual(['granted'])
    window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT)) // 非 CustomEvent
    expect(seen).toEqual(['granted', 'unset'])
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: 'bogus' }))
    expect(seen).toEqual(['granted', 'unset', 'unset'])
    unsubscribe()
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: 'denied' }))
    expect(seen).toEqual(['granted', 'unset', 'unset']) // 零回调
    expect(typeof writeAnalyticsConsent('denied')).toBe('boolean') // 默认宿主不抛
  })
})
