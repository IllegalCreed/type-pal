import { afterEach, beforeEach } from 'vitest'
import type { AnalyticsConsent } from './analytics-consent.js'
import { type AnalyticsPage, startGoogleAnalytics } from './google-analytics.js'

export interface GoogleAnalyticsHarnessOptions {
  enabled?: boolean
  measurementId?: string
  consent?: AnalyticsConsent
  page?: AnalyticsPage
  subscribePage?: boolean
}

function sdkKeys(): string[] {
  return [
    'dataLayer',
    'gtag',
    ...Object.getOwnPropertyNames(window).filter((key) => key.startsWith('ga-disable-')),
  ]
}

function isCommand(value: unknown): value is ArrayLike<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'length' in value &&
    typeof value.length === 'number' &&
    Number.isInteger(value.length) &&
    value.length >= 0 &&
    value.length <= 16
  )
}

/**
 * Only the SDK globals, public event-source ports and an owned inert Document are fixture state.
 * The real controller runs; scripts are DOM artifacts, not downloaded SDK/network evidence.
 * Test-facing stop always calls the actual stop; host cleanup cannot hide a failed unsubscribe
 * from assertions made before afterEach. Finally releases remaining owned ports/descriptors.
 */
export function useGoogleAnalyticsTestHost() {
  let doc = document.implementation.createHTMLDocument('GA test host')
  const saved = new Map<string, PropertyDescriptor | undefined>()
  const stops = new Set<() => void>()
  const releases = new Set<() => void>()
  beforeEach(() => {
    saved.clear()
    for (const key of sdkKeys()) {
      saved.set(key, Object.getOwnPropertyDescriptor(window, key))
      Reflect.deleteProperty(window, key)
    }
    doc = document.implementation.createHTMLDocument('GA test host')
  })
  afterEach(() => {
    try {
      for (const stop of stops) stop()
    } finally {
      for (const release of releases) release()
      doc.head.replaceChildren()
      doc.body.replaceChildren()
      for (const key of sdkKeys()) Reflect.deleteProperty(window, key)
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(window, key, descriptor)
      }
      stops.clear()
      releases.clear()
      saved.clear()
    }
  })

  const entries = (): unknown[] => {
    const value: unknown = Reflect.get(window, 'dataLayer')
    return Array.isArray(value) ? value : []
  }
  const commands = (): unknown[][] =>
    entries().map((entry) => (isCommand(entry) ? Array.from(entry) : [entry]))

  return {
    get document(): Document {
      return doc
    },
    entries,
    commands,
    events: (): unknown[][] =>
      commands().filter((entry) => entry[0] === 'event' && entry[1] === 'page_view'),
    readProperty: (name: string): unknown => Reflect.get(window, name),
    setGtag(gtag: (...args: unknown[]) => void): void {
      Object.defineProperty(window, 'gtag', { configurable: true, writable: true, value: gtag })
    },
    create(options: GoogleAnalyticsHarnessOptions = {}) {
      let consent: AnalyticsConsent = options.consent ?? 'unset'
      let page: AnalyticsPage = options.page ?? {
        path: '/?utm_source=DEV&scene=75&pos=1,2&facing=3&give=999#battle',
        title: '仙剑奇侠传 · type-pal',
      }
      let onConsent: ((next: AnalyticsConsent) => void) | undefined
      let onPage: ((next: AnalyticsPage) => void) | undefined
      const releaseConsent = (): void => {
        onConsent = undefined
      }
      const releasePage = (): void => {
        onPage = undefined
      }
      releases.add(releaseConsent)
      releases.add(releasePage)
      const actualStop = startGoogleAnalytics({
        enabled: options.enabled ?? true,
        measurementId: options.measurementId ?? 'G-TEST12345',
        window,
        document: doc,
        readConsent: () => consent,
        subscribeConsent: (listener) => {
          onConsent = listener
          return releaseConsent
        },
        readPage: () => page,
        ...(options.subscribePage === false
          ? {}
          : {
              subscribePage: (listener: (next: AnalyticsPage) => void) => {
                onPage = listener
                return releasePage
              },
            }),
      })
      let stoppedByTest = false
      stops.add(() => {
        if (!stoppedByTest) actualStop()
      })
      return {
        stop(): void {
          actualStop()
          stoppedByTest = true
        },
        grant(): void {
          consent = 'granted'
          onConsent?.(consent)
        },
        deny(): void {
          consent = 'denied'
          onConsent?.(consent)
        },
        navigate(next: AnalyticsPage): void {
          page = next
          onPage?.(page)
        },
      }
    },
  }
}
