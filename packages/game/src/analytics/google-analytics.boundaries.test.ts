/**
 * H05:项目ID格式与UTM边界、无page订阅的重授/stop、disable属性。
 * 大写UTM归一而非丢弃;不把fetch替身当script资源的网络拦截。
 * 使用共享自有Document/SDK属性/订阅宿主,真实SUT执行;不接真实Google端点。
 */
import { describe, expect, it } from 'vitest'
import { sanitizePageViewUrl } from './google-analytics.js'
import {
  type GoogleAnalyticsHarnessOptions,
  useGoogleAnalyticsTestHost,
} from './google-analytics.test-fixtures.js'

const host = useGoogleAnalyticsTestHost()
const create = (options: GoogleAnalyticsHarnessOptions = {}) =>
  host.create({
    page: { path: '/play?utm_source=alpha', title: 't' },
    ...options,
  })

describe('H05 边界', () => {
  it('项目ID格式归一化:小写、6/20字符接受,5/21字符拒绝', () => {
    const lower = create({ measurementId: 'g-test12345' })
    lower.grant()
    expect(host.events()).toHaveLength(1)
    lower.stop()
    lower.stop()
    for (const id of ['G-AAAAAA', `G-${'A'.repeat(20)}`]) {
      const before = host.events().length
      const harness = create({ measurementId: id })
      harness.grant()
      expect(host.events()).toHaveLength(before + 1)
      expect(
        host
          .commands()
          .filter((command) => command[0] === 'config')
          .at(-1)?.[1],
      ).toBe(id)
      harness.stop()
    }
    const before = host.events().length
    for (const id of ['G-AAAAA', `G-${'A'.repeat(21)}`]) {
      const harness = create({ measurementId: id })
      harness.grant()
      expect(host.events()).toHaveLength(before)
      expect(host.readProperty(`ga-disable-${id}`)).toBeUndefined()
      harness.stop()
    }
    expect(host.document.head.querySelectorAll('script')).toHaveLength(1)
  })

  it('UTM 64保留/65丢弃,前导减号拒绝,大写归一且不扩展白名单', () => {
    const ok64 = 'a'.repeat(64)
    const long65 = 'a'.repeat(65)
    const parsed = new URL(
      sanitizePageViewUrl(
        `/p?utm_source=${ok64}&utm_medium=${long65}&utm_campaign=-lead&utm_content=Up&utm_term=private&scene=9&pos=1,2`,
        'https://play.example.com',
      ),
    )
    expect(parsed.origin).toBe('https://play.example.com')
    expect(parsed.pathname).toBe('/p')
    expect(Object.fromEntries(parsed.searchParams)).toEqual({ utm_source: ok64, utm_content: 'up' })
  })

  it('不传 subscribePage：grant 发当前页一次；deny 停发且清 lastPath；regrant 同页可再发；stop 后零回调', () => {
    const harness = create({ subscribePage: false })
    harness.grant()
    expect(host.events()).toHaveLength(1)
    harness.deny()
    harness.grant()
    expect(host.events()).toHaveLength(2)
    harness.deny()
    harness.stop()
    harness.grant()
    expect(host.events()).toHaveLength(2)
  })

  it('disable 键随同意翻转：granted=false、denied=true', () => {
    const harness = create({ measurementId: 'G-TEST12345' })
    harness.grant()
    expect(host.readProperty('ga-disable-G-TEST12345')).toBe(false)
    harness.deny()
    expect(host.readProperty('ga-disable-G-TEST12345')).toBe(true)
    harness.stop()
  })
})
