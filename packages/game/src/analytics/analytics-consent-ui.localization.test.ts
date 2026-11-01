import { afterEach, beforeEach, expect, it } from 'vitest'
import { useFallbackLanguage } from '../localization/language.js'
import { isolateLanguagePreference } from '../localization/language.test-fixtures.js'
import { readAnalyticsConsent } from './analytics-consent.js'
import { mountAnalyticsConsentUi } from './analytics-consent-ui.js'

let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference()
})
afterEach(() => {
  restoreLanguage()
})

it('changes consent copy without choosing consent, reopening the panel or breaking the policy link', () => {
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
  useFallbackLanguage('en')
  const ui = mountAnalyticsConsentUi({
    document,
    storage,
    eventTarget: window,
    privacySignal: true,
  })
  try {
    const panel = document.querySelector<HTMLElement>('[data-testid="analytics-consent-panel"]')!
    expect(panel.textContent).toContain('browser privacy signal')
    document.querySelector<HTMLButtonElement>('[data-choice="denied"]')!.click()
    expect(readAnalyticsConsent(storage)).toBe('denied')
    useFallbackLanguage('zh-CN')
    expect(readAnalyticsConsent(storage)).toBe('denied')
    expect(panel.hidden).toBe(true)
    expect(panel.querySelector('a')?.textContent).toBe('隐私政策')
    useFallbackLanguage('en')
    ui.openPreferences()
    expect(panel.hidden).toBe(false)
    expect(panel.querySelector('a')?.textContent).toBe('Privacy policy')
    expect(panel.querySelector('a')?.href).toBe('https://illegalscreed.cn/zh/privacy')
  } finally {
    ui.destroy()
  }
})
