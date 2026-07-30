import {
  getBrowserConsentStorage,
  hasPrivacySignal,
  resolveInitialAnalyticsConsent,
  subscribeAnalyticsConsent,
} from './analytics-consent.js'
import { mountAnalyticsConsentUi } from './analytics-consent-ui.js'
import { startGoogleAnalytics } from './google-analytics.js'

export const TYPE_PAL_GA_MEASUREMENT_ID = 'G-9Q2XJV7NJ6'

interface AnalyticsNavigator {
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
}

export interface TypePalAnalyticsOptions {
  enabled: boolean
  window: Window
  document: Document
  navigator: AnalyticsNavigator
}

export interface TypePalAnalyticsInstallation {
  destroy(): void
}

export function installTypePalAnalytics(
  options: TypePalAnalyticsOptions,
): TypePalAnalyticsInstallation {
  const storage = getBrowserConsentStorage(options.window)
  const ui = mountAnalyticsConsentUi({
    document: options.document,
    storage,
    eventTarget: options.window,
    privacySignal: hasPrivacySignal(options.navigator),
  })
  const stopAnalytics = startGoogleAnalytics({
    enabled: options.enabled,
    measurementId: TYPE_PAL_GA_MEASUREMENT_ID,
    window: options.window,
    document: options.document,
    readConsent: () => resolveInitialAnalyticsConsent(storage, options.navigator),
    subscribeConsent: (listener) => subscribeAnalyticsConsent(listener, options.window),
    readPage: () => ({
      path: `${options.window.location.pathname}${options.window.location.search}${options.window.location.hash}`,
      title: options.document.title,
    }),
  })

  return {
    destroy(): void {
      stopAnalytics()
      ui.destroy()
    },
  }
}
