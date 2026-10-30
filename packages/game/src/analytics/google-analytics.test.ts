import { describe, expect, it, vi } from 'vitest'
import { sanitizePageViewUrl } from './google-analytics.js'
import { useGoogleAnalyticsTestHost } from './google-analytics.test-fixtures.js'

const host = useGoogleAnalyticsTestHost()

describe('minimal Google Analytics page view', () => {
  it('非生产或 Measurement ID 非法时零副作用', () => {
    host.create({ enabled: false, consent: 'granted' })
    host.create({ measurementId: 'invalid', consent: 'granted' })
    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    expect(host.readProperty('dataLayer')).toBeUndefined()
    expect(host.readProperty('gtag')).toBeUndefined()
  })

  it('unset/denied 不加载；granted 只加载并记录当前页一次', () => {
    const harness = host.create()
    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    expect(host.entries()).toEqual([])
    harness.deny()
    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
    expect(host.entries()).toEqual([])
    harness.grant()
    harness.grant()
    expect(host.document.querySelectorAll('script[data-ga4-measurement-id]')).toHaveLength(1)
    expect(host.events()).toEqual([
      [
        'event',
        'page_view',
        {
          page_path: '/',
          page_location: 'http://localhost:3000/?utm_source=dev',
          page_title: '仙剑奇侠传 · type-pal',
        },
      ],
    ])
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
    const harness = host.create({ consent: 'granted' })
    expect(host.events()).toHaveLength(1)
    window.dispatchEvent(new CustomEvent('typepal:scene-change', { detail: 75 }))
    expect(host.events()).toHaveLength(1)
    harness.navigate({ path: '/?scene=80', title: 'scene 80' })
    expect(host.events()).toHaveLength(1)
    harness.navigate({ path: '/manual', title: 'manual' })
    expect(host.events()).toHaveLength(2)
    expect(host.events()[1]?.[2]).toEqual({
      page_path: '/manual',
      page_location: 'http://localhost:3000/manual',
      page_title: 'manual',
    })
    harness.deny()
    harness.navigate({ path: '/privacy', title: 'privacy' })
    expect(host.events()).toHaveLength(2)
  })

  it('URL解析失败后仍可处理后续合法页面', () => {
    const harness = host.create({
      consent: 'granted',
      page: { path: 'https://[invalid', title: 'invalid' },
    })
    expect(host.events()).toHaveLength(0)
    expect(() => harness.navigate({ path: '/manual', title: 'manual' })).not.toThrow()
    expect(host.events()).toHaveLength(1)
    // SDK初始化异常不由此例证明,另见失败安装ownership反例。
  })

  it('复用既有 gtag 与 script，不重复注入', () => {
    const script = host.document.createElement('script')
    script.dataset.ga4MeasurementId = 'G-TEST12345'
    host.document.head.append(script)
    const gtag = vi.fn()
    host.setGtag(gtag)
    host.create({ consent: 'granted' })
    expect(host.document.querySelectorAll('script[data-ga4-measurement-id]')).toHaveLength(1)
    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBe(script)
    expect(host.readProperty('gtag')).toBe(gtag)
    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/',
      page_location: 'http://localhost:3000/?utm_source=dev',
      page_title: '仙剑奇侠传 · type-pal',
    })
  })

  it('标签加载失败后可重试且不重复排队当前页', () => {
    const harness = host.create()
    harness.grant()
    const failedScript = host.document.querySelector<HTMLScriptElement>(
      'script[data-ga4-measurement-id]',
    )!
    expect(failedScript).not.toBeNull()
    failedScript.dispatchEvent(new Event('error'))
    expect(host.document.querySelectorAll('script[data-ga4-measurement-id]')).toHaveLength(0)
    harness.grant()
    const retryScript = host.document.querySelector<HTMLScriptElement>(
      'script[data-ga4-measurement-id]',
    )
    expect(retryScript).not.toBe(failedScript)
    expect(host.document.querySelectorAll('script[data-ga4-measurement-id]')).toHaveLength(1)
    expect(host.events()).toHaveLength(1)
    expect(host.commands().map((command) => command[0])).toEqual(['js', 'config', 'event'])
  })

  it('内建gtag采用arguments队列并关闭自动page_view', () => {
    host.create({ consent: 'granted' })
    const entries = host.entries()
    expect(entries).toHaveLength(3)
    for (const entry of entries)
      expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]')
    const commands = host.commands()
    expect(commands[0]?.[0]).toBe('js')
    expect(commands[0]?.[1]).toBeInstanceOf(Date)
    expect(commands[1]?.slice(0, 2)).toEqual(['config', 'G-TEST12345'])
    expect(commands[1]?.[2]).toEqual(expect.objectContaining({ send_page_view: false }))
  })

  it('stop后同意与页面两订阅均不再触发', () => {
    const harness = host.create({ consent: 'granted' })
    expect(host.events()).toHaveLength(1)
    harness.stop()
    harness.navigate({ path: '/after-stop', title: 'after' })
    expect(host.events()).toHaveLength(1)
    harness.deny()
    harness.grant()
    expect(host.events()).toHaveLength(1)
  })
})
