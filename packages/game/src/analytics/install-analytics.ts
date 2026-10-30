import {
  type BrowserPrivacySignals,
  getBrowserConsentStorage,
  hasPrivacySignal,
  resolveInitialAnalyticsConsent,
  subscribeAnalyticsConsent,
} from './analytics-consent.js'
import { mountAnalyticsConsentUi } from './analytics-consent-ui.js'
import { startGoogleAnalytics } from './google-analytics.js'

export const TYPE_PAL_GA_MEASUREMENT_ID = 'G-9Q2XJV7NJ6'

export interface TypePalAnalyticsOptions {
  enabled: boolean
  window: Window
  document: Document
  navigator: BrowserPrivacySignals
}

export interface TypePalAnalyticsInstallation {
  openPreferences(): void
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
  let stopAnalytics: () => void
  try {
    stopAnalytics = startGoogleAnalytics({
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
  } catch (error) {
    // GA创建者回滚订阅；安装器回滚自己创建的UI，原错误交给main隔离。
    ui.destroy()
    throw error
  }

  return {
    openPreferences: () => ui.openPreferences(),
    destroy(): void {
      stopAnalytics()
      ui.destroy()
    },
  }
}
