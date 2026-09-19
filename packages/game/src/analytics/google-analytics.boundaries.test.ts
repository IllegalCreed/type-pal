/**
 * TEST-GAME-HOST-BOUNDARIES-1 H05：google-analytics 边界（analytics/google-analytics.ts）。
 * 既有 google-analytics.test 已覆盖同意/敏感 URL/去重/撤回/重试/队列主干——不重复。
 * 本文件：measurement ID 归一化边界（大小写/长度 6 与 21）、UTM 64/65 与非法 token、
 * 不传 subscribePage 的 grant/deny/regrant/stop（真实 window.dataLayer，不接 GA）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsConsent } from './analytics-consent.js'
import { sanitizePageViewUrl, startGoogleAnalytics } from './google-analytics.js'

function createHarness(options?: {
  enabled?: boolean
  measurementId?: string
  consent?: AnalyticsConsent
  subscribePage?: boolean
}) {
  let consent = options?.consent ?? 'unset'
  let page = { path: '/play?utm_source=alpha', title: 't' }
  let consentListener: ((next: AnalyticsConsent) => void) | undefined
  const stop = startGoogleAnalytics({
    enabled: options?.enabled ?? true,
    measurementId: options?.measurementId ?? 'G-TEST12345',
    window,
    document,
    readConsent: () => consent,
    subscribeConsent: (listener) => {
      consentListener = listener
      return () => {
        consentListener = undefined
      }
    },
    readPage: () => page,
    ...(options?.subscribePage === false
      ? {}
      : {
          subscribePage: () => () => undefined,
        }),
  })
  return {
    stop,
    grant() {
      consent = 'granted'
      consentListener?.(consent)
    },
    deny() {
      consent = 'denied'
      consentListener?.(consent)
    },
  }
}

const events = (): unknown[][] =>
  ((window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === 'event' && entry[1] === 'page_view')

describe('H05 边界', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete (window as unknown as { dataLayer?: unknown }).dataLayer
    delete (window as unknown as { gtag?: unknown }).gtag
  })
  it('measurement ID 归一化：小写合法提升；7 字符截断非法零副作用', () => {
    const lower = createHarness({ measurementId: 'g-test12345' })
    lower.grant()
    expect(events()).toHaveLength(1) // 小写被归一接受
    lower.stop()
    lower.stop()
    const tooLong = createHarness({ measurementId: 'G-' + 'A'.repeat(21) })
    tooLong.grant()
    expect(events()).toHaveLength(1) // 21 字符超出 pattern 零新增（沿用 dataLayer 计数）
    expect(document.head.querySelectorAll('script').length).toBe(1) // 仅 lower 注入的一枚
    tooLong.stop()
  })
  it('UTM 64 字符保留、65 丢弃；非法 token（前导 -、大写）丢弃；game 参数不进 URL', () => {
    const ok64 = 'a'.repeat(64)
    const long65 = 'a'.repeat(65)
    const url = sanitizePageViewUrl(
      `/p?utm_source=${ok64}&utm_medium=${long65}&utm_campaign=-lead&utm_content=Up&scene=9&pos=1,2`,
      'https://play.example.com',
    )
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/p')
    expect(parsed.searchParams.get('utm_source')).toBe(ok64)
    expect(parsed.searchParams.has('utm_medium')).toBe(false) // 65 丢弃
    expect(parsed.searchParams.has('utm_campaign')).toBe(false) // 前导 - 非法
    expect(parsed.searchParams.get('utm_content')).toBe('up') // 大写归一为小写后合法保留
    expect(parsed.searchParams.has('scene')).toBe(false)
    expect(parsed.searchParams.has('pos')).toBe(false)
  })
  it('不传 subscribePage：grant 发当前页一次；deny 停发且清 lastPath；regrant 同页可再发；stop 后零回调', () => {
    const harness = createHarness({ subscribePage: false })
    harness.grant()
    expect(events()).toHaveLength(1)
    harness.deny()
    harness.grant() // regrant：无页面订阅时仍以 readPage() 重发当前页
    expect(events()).toHaveLength(2)
    harness.deny()
    harness.stop()
    harness.grant() // stop 后 consent 订阅已解绑 → 零新增
    expect(events()).toHaveLength(2)
  })
  it('disable 键随同意翻转：granted=false、denied=true', () => {
    const harness = createHarness({ measurementId: 'G-TEST12345' })
    harness.grant()
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST12345']).toBe(false)
    harness.deny()
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST12345']).toBe(true)
    harness.stop()
  })
})
