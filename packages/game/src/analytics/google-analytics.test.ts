import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsConsent } from './analytics-consent.js'
import { sanitizePageViewUrl, startGoogleAnalytics } from './google-analytics.js'

interface TestPage {
  path: string
  title: string
}

function createHarness(options?: {
  enabled?: boolean
  measurementId?: string
  consent?: AnalyticsConsent
  page?: TestPage
}) {
  let consent = options?.consent ?? 'unset'
  let page = options?.page ?? {
    path: '/?utm_source=DEV&scene=75&pos=1,2&facing=3&give=999#battle',
    title: '仙剑奇侠传 · type-pal',
  }
  let consentListener: ((next: AnalyticsConsent) => void) | undefined
  let pageListener: ((next: TestPage) => void) | undefined

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
    subscribePage: (listener) => {
      pageListener = listener
      return () => {
        pageListener = undefined
      }
    },
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
    navigate(next: TestPage) {
      page = next
      pageListener?.(page)
    },
  }
}

function pageViewEvents(): unknown[][] {
  return ((window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer ?? [])
    .map((entry) => Array.from(entry))
    .filter((entry) => entry[0] === 'event' && entry[1] === 'page_view')
}

describe('minimal Google Analytics page view', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete (window as unknown as { dataLayer?: unknown[][] }).dataLayer
    delete (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  })

  it('非生产或 Measurement ID 非法时零副作用', () => {
    createHarness({ enabled: false, consent: 'granted' })
    createHarness({ measurementId: 'invalid', consent: 'granted' })

    expect(document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    expect((window as unknown as { dataLayer?: unknown[][] }).dataLayer).toBeUndefined()
  })

  it('unset/denied 不加载；granted 只加载并记录当前页一次', () => {
    const harness = createHarness()
    harness.grant()
    harness.grant()

    expect(document.querySelectorAll('script[data-ga4-measurement-id]')).toHaveLength(1)
    expect(pageViewEvents()).toHaveLength(1)
    expect(pageViewEvents()[0]?.[2]).toMatchObject({
      page_path: '/',
      page_location: 'http://localhost:3000/?utm_source=dev',
    })
  })

  it('P1: 只保留 pathname 与合法 UTM，丢弃所有游戏参数和 hash', () => {
    expect(
      sanitizePageViewUrl(
        '/play?utm_source=DEV&utm_medium=Video&utm_campaign=PAL-Launch&utm_content=Intro&scene=75&pos=1,2&facing=3&give=999#battle',
        'https://pal.illegalscreed.cn',
      ),
    ).toBe(
      'https://pal.illegalscreed.cn/play?utm_source=dev&utm_medium=video&utm_campaign=pal-launch&utm_content=intro',
    )
  })

  it('G1/P3: 同 pathname 去重、场景事件不计页、撤回后停发', () => {
    const harness = createHarness({ consent: 'granted' })

    window.dispatchEvent(new CustomEvent('typepal:scene-change', { detail: 75 }))
    harness.navigate({ path: '/?scene=80', title: 'scene 80' })
    harness.navigate({ path: '/manual', title: 'manual' })
    harness.deny()
    harness.navigate({ path: '/privacy', title: 'privacy' })

    expect(pageViewEvents()).toHaveLength(2)
    expect(pageViewEvents()[1]?.[2]).toMatchObject({ page_path: '/manual' })
  })

  it('Google 或 URL 异常不影响游戏调用方', () => {
    const harness = createHarness({
      consent: 'granted',
      page: { path: 'https://[invalid', title: 'invalid' },
    })
    expect(() => harness.navigate({ path: '/manual', title: 'manual' })).not.toThrow()
    expect(pageViewEvents()).toHaveLength(1)
  })

  it('复用既有 gtag 与 script，不重复注入', () => {
    const script = document.createElement('script')
    script.dataset.ga4MeasurementId = 'G-TEST12345'
    document.head.append(script)
    const gtag = vi.fn()
    ;(window as unknown as { gtag?: (...args: unknown[]) => void }).gtag = gtag

    createHarness({ consent: 'granted' })
    expect(document.querySelectorAll('script[data-ga4-measurement-id]')).toHaveLength(1)
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/' }),
    )
  })

  it('标签加载失败后可重试且不重复排队当前页', () => {
    const harness = createHarness()
    harness.grant()
    const failedScript = document.querySelector<HTMLScriptElement>(
      'script[data-ga4-measurement-id]',
    )

    failedScript?.dispatchEvent(new Event('error'))
    harness.grant()

    const retryScript = document.querySelector<HTMLScriptElement>('script[data-ga4-measurement-id]')
    expect(retryScript).not.toBe(failedScript)
    expect(document.querySelectorAll('script[data-ga4-measurement-id]')).toHaveLength(1)
    expect(pageViewEvents()).toHaveLength(1)
  })

  it('内建 gtag 使用官方 arguments 命令形态', () => {
    createHarness({ consent: 'granted' })

    const commands = (window as unknown as { dataLayer?: Array<ArrayLike<unknown>> }).dataLayer
    expect(commands).toBeDefined()
    expect(Array.isArray(commands?.[0])).toBe(false)
    expect(Array.from(commands?.[1] ?? []).slice(0, 2)).toEqual(['config', 'G-TEST12345'])
  })
})
