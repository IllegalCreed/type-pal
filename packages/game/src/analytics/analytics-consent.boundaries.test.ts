/**
 * H04 consent宿主边界:存储getter/无window、写失败零广播、广播失败不回滚、未知事件与unsubscribe。
 * 读异常和stored-choice优先级归主测;不重复。真实EventTarget/默认window,仅模拟宿主IO异常。
 * 每例只恢复自有持久键;订阅、spy与无window模拟即使断言失败也精确finally清理。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_CONSENT_EVENT,
  getBrowserConsentStorage,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
} from './analytics-consent.js'

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

describe('H04 consent 边界', () => {
  it('拒绝访问localStorage或无window时返回undefined,默认读unset/写false', () => {
    const hostile = {
      get localStorage(): never {
        throw new Error('blocked')
      },
    }
    expect(getBrowserConsentStorage(hostile)).toBeUndefined()
    vi.stubGlobal('window', undefined)
    try {
      expect(getBrowserConsentStorage()).toBeUndefined()
      expect(readAnalyticsConsent()).toBe('unset')
      expect(writeAnalyticsConsent('granted')).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('持久化失败返回false且不广播,不把未提交的选择交给订阅者', () => {
    const setItem = vi.fn(() => {
      throw new Error('storage blocked')
    })
    const target = new EventTarget()
    const dispatch = vi.spyOn(target, 'dispatchEvent')
    try {
      expect(writeAnalyticsConsent('granted', { setItem }, target)).toBe(false)
      expect(setItem).toHaveBeenCalledTimes(1)
      expect(setItem).toHaveBeenCalledWith(KEY, 'granted')
      expect(dispatch).not.toHaveBeenCalled()
    } finally {
      dispatch.mockRestore()
    }
  })

  it('写入成功但广播抛错仍返回true,存储保持已提交值', () => {
    const recorded: Array<[string, string]> = []
    const storage = {
      setItem: (key: string, value: string): void => {
        recorded.push([key, value])
      },
    }
    const target = new EventTarget()
    const dispatch = vi.spyOn(target, 'dispatchEvent').mockImplementation(() => {
      throw new Error('host dispatch blocked')
    })
    try {
      expect(writeAnalyticsConsent('granted', storage, target)).toBe(true)
      expect(recorded).toEqual([[KEY, 'granted']])
      expect(dispatch).toHaveBeenCalledTimes(1)
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'type-pal:analytics-consent', detail: 'granted' }),
      )
    } finally {
      dispatch.mockRestore()
    }
  })

  it('未知外部事件按unset通知,unsubscribe后真实dispatch不再回调', () => {
    const seen: string[] = []
    const unsubscribe = subscribeAnalyticsConsent((consent) => seen.push(consent))
    try {
      window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: 'granted' }))
      window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT))
      window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: 'bogus' }))
      expect(seen).toEqual(['granted', 'unset', 'unset'])
      unsubscribe()
      window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: 'denied' }))
      expect(seen).toEqual(['granted', 'unset', 'unset'])
    } finally {
      unsubscribe()
    }
  })
})
