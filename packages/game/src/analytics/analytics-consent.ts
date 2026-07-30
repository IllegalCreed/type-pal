export const ANALYTICS_CONSENT_STORAGE_KEY = 'type-pal.analytics-consent.v1'
export const ANALYTICS_CONSENT_EVENT = 'type-pal:analytics-consent'

export type AnalyticsConsent = 'unset' | 'granted' | 'denied'

export interface ConsentStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface BrowserPrivacySignals {
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
}

function isStoredConsent(value: unknown): value is Exclude<AnalyticsConsent, 'unset'> {
  return value === 'granted' || value === 'denied'
}

export function getBrowserConsentStorage(
  browserWindow: Pick<Window, 'localStorage'> | undefined = typeof window === 'undefined'
    ? undefined
    : window,
): ConsentStorage | undefined {
  if (!browserWindow) return undefined
  try {
    return browserWindow.localStorage
  } catch {
    return undefined
  }
}

export function readAnalyticsConsent(
  storage: Pick<ConsentStorage, 'getItem'> | undefined = getBrowserConsentStorage(),
): AnalyticsConsent {
  if (!storage) return 'unset'
  try {
    const value = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    return isStoredConsent(value) ? value : 'unset'
  } catch {
    return 'unset'
  }
}

export function hasPrivacySignal(navigatorLike: BrowserPrivacySignals | undefined): boolean {
  return navigatorLike?.doNotTrack === '1' || navigatorLike?.globalPrivacyControl === true
}

export function resolveInitialAnalyticsConsent(
  storage: Pick<ConsentStorage, 'getItem'> | undefined,
  navigatorLike: BrowserPrivacySignals | undefined,
): AnalyticsConsent {
  const storedConsent = readAnalyticsConsent(storage)
  if (storedConsent !== 'unset') return storedConsent
  return hasPrivacySignal(navigatorLike) ? 'denied' : 'unset'
}

export function writeAnalyticsConsent(
  consent: Exclude<AnalyticsConsent, 'unset'>,
  storage: Pick<ConsentStorage, 'setItem'> | undefined = getBrowserConsentStorage(),
  eventTarget: EventTarget | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  if (!storage) return false
  try {
    storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent)
  } catch {
    return false
  }

  try {
    eventTarget?.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }))
  } catch {
    // 持久化选择仍是唯一真值；旧浏览器无法广播时保持失败关闭。
  }
  return true
}

export function subscribeAnalyticsConsent(
  listener: (consent: AnalyticsConsent) => void,
  eventTarget: EventTarget | undefined = typeof window === 'undefined' ? undefined : window,
): () => void {
  if (!eventTarget) return () => undefined

  const handleConsent = (event: Event): void => {
    const detail = event instanceof CustomEvent ? event.detail : undefined
    listener(isStoredConsent(detail) ? detail : 'unset')
  }
  eventTarget.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsent)
  return () => eventTarget.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsent)
}
