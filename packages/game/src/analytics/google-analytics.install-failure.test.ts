import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
} from './analytics-consent.js'
import { type GoogleAnalyticsOptions, startGoogleAnalytics } from './google-analytics.js'
import { useGoogleAnalyticsTestHost } from './google-analytics.test-fixtures.js'
import { installTypePalAnalytics } from './install-analytics.js'

describe('failed analytics installation ownership', () => {
  const host = useGoogleAnalyticsTestHost()
  let storedConsent: string | null
  let releaseNativeListeners: () => void

  beforeEach(() => {
    storedConsent = localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    writeAnalyticsConsent('granted', localStorage, undefined)
    const added = vi.spyOn(window, 'addEventListener')
    releaseNativeListeners = () => {
      for (const [type, listener, options] of added.mock.calls) {
        if (type === ANALYTICS_CONSENT_EVENT && listener)
          window.removeEventListener(type, listener, options)
      }
      added.mockRestore()
    }
  })

  afterEach(() => {
    // Only after assertions: release native subscriptions leaked by the frozen red candidate.
    releaseNativeListeners()
    if (storedConsent === null) localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY)
    else localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, storedConsent)
  })

  function failureFrom(install: () => unknown): unknown {
    try {
      install()
    } catch (error) {
      return error
    }
    return undefined
  }

  function ports(overrides: Partial<GoogleAnalyticsOptions> = {}) {
    const pages = new EventTarget()
    const released = { consent: 0, page: 0 }
    const options: GoogleAnalyticsOptions = {
      enabled: true,
      measurementId: 'G-TEST12345',
      window,
      document: host.document,
      readConsent: () => readAnalyticsConsent(localStorage),
      subscribeConsent: (listener) => {
        const unsubscribe = subscribeAnalyticsConsent(listener, window)
        return () => {
          released.consent++
          unsubscribe()
        }
      },
      readPage: () => ({ path: '/failure-test', title: 'failure-test' }),
      subscribePage: (listener) => {
        const navigate = () => listener({ path: '/after-failure', title: 'after' })
        pages.addEventListener('navigate', navigate)
        return () => {
          released.page++
          pages.removeEventListener('navigate', navigate)
        }
      },
      ...overrides,
    }
    return { options, released, navigate: () => pages.dispatchEvent(new Event('navigate')) }
  }

  it.each(['js', 'config'])('SDK %s failure releases both acquired subscriptions', (command) => {
    const error = new Error(`SDK ${command} failed`)
    host.setGtag((kind) => {
      if (kind === command) throw error
    })
    const { options, released, navigate } = ports()

    expect(failureFrom(() => startGoogleAnalytics(options))).toBe(error)
    expect(released).toEqual({ consent: 1, page: 1 })
    const recoveredSdk = vi.fn()
    host.setGtag(recoveredSdk)
    writeAnalyticsConsent('denied', localStorage, window)
    writeAnalyticsConsent('granted', localStorage, window)
    navigate()
    expect(recoveredSdk).not.toHaveBeenCalled()
  })

  it('page subscription failure releases the earlier consent subscription', () => {
    const error = new Error('page subscription failed')
    const sdk = vi.fn()
    host.setGtag(sdk)
    const { options, released } = ports({
      subscribePage: () => {
        throw error
      },
    })

    expect(failureFrom(() => startGoogleAnalytics(options))).toBe(error)
    expect(released).toEqual({ consent: 1, page: 0 })
    writeAnalyticsConsent('denied', localStorage, window)
    writeAnalyticsConsent('granted', localStorage, window)
    expect(sdk).not.toHaveBeenCalled()
  })

  it('initial page-read failure releases subscriptions without deleting the shared SDK', () => {
    const error = new Error('page read failed')
    const sdk = vi.fn()
    host.setGtag(sdk)
    const { options, released, navigate } = ports({
      readPage: () => {
        throw error
      },
    })

    expect(failureFrom(() => startGoogleAnalytics(options))).toBe(error)
    expect(released).toEqual({ consent: 1, page: 1 })
    expect(host.readProperty('gtag')).toBe(sdk)
    expect(sdk.mock.calls.map((args) => args[0])).toEqual(['js', 'config'])
    sdk.mockClear()
    writeAnalyticsConsent('denied', localStorage, window)
    // The failed read callback must be unreachable after the installation failed.
    writeAnalyticsConsent('granted', localStorage, window)
    navigate()
    expect(sdk).not.toHaveBeenCalled()
  })

  it('installer rolls back its UI and listener while preserving the saved choice and game DOM', () => {
    const error = new Error('initialization failed')
    host.setGtag(() => {
      throw error
    })
    const enter = host.document.createElement('button')
    enter.textContent = '进入游戏'
    const entered = vi.fn()
    enter.addEventListener('click', entered)
    host.document.body.append(enter)

    expect(
      failureFrom(() =>
        installTypePalAnalytics({ enabled: true, window, document: host.document, navigator: {} }),
      ),
    ).toBe(error)
    expect(host.document.querySelector('[data-analytics-consent-root]')).toBeNull()
    expect(readAnalyticsConsent(localStorage)).toBe('granted')
    enter.click()
    expect(entered).toHaveBeenCalledOnce()
    const recoveredSdk = vi.fn()
    host.setGtag(recoveredSdk)
    writeAnalyticsConsent('denied', localStorage, window)
    writeAnalyticsConsent('granted', localStorage, window)
    expect(recoveredSdk).not.toHaveBeenCalled()
    expect(host.document.querySelector('script[data-ga4-measurement-id]')).toBeNull()
  })
})
