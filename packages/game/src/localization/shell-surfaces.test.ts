import { afterEach, beforeEach, expect, it } from 'vitest'
import { readAnalyticsConsent } from '../analytics/analytics-consent.js'
import { mountAnalyticsConsentUi } from '../analytics/analytics-consent-ui.js'
import { createUnifiedProgressUi } from '../shell/precache-ui.js'
import { getMapName, hasMapName } from '../tools/map-names.js'
import { setLanguage } from './language.js'
import { ENGLISH_MAP_NAMES } from './map-names-en.js'
import { localizeStaticShell } from './static-shell.js'

let savedStorage: Record<string, string>
let savedTitle: string
beforeEach(() => {
  savedStorage = { ...localStorage }
  savedTitle = document.title
  localStorage.clear()
  setLanguage('zh-CN')
})
afterEach(() => {
  document.body.replaceChildren()
  setLanguage('zh-CN')
  localStorage.clear()
  for (const [key, value] of Object.entries(savedStorage)) localStorage.setItem(key, value)
  document.title = savedTitle
})

it('updates loading language while preserving failure state against static copy and late progress', () => {
  document.body.innerHTML =
    '<div id="boot-loading"><div id="boot-loading-title"></div><div id="boot-loading-status" data-initial="true"></div><div id="boot-loading-fill"></div></div>'
  const stop = localizeStaticShell()
  try {
    setLanguage('en')
    expect(document.getElementById('boot-loading-title')?.textContent).toBe('Chinese Paladin')
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('Loading…')
    const progress = createUnifiedProgressUi()
    progress.setNecessaryProgress(0.5)
    progress.fail('network unavailable')
    expect(document.getElementById('boot-loading-status')?.textContent).toBe(
      'Startup failed: network unavailable',
    )
    const width = document.getElementById('boot-loading-fill')?.style.width
    setLanguage('zh-CN')
    progress.setNecessaryProgress(1)
    progress.setFullProgress(100, 100)
    expect(document.getElementById('boot-loading-status')?.textContent).toBe(
      '启动失败:network unavailable',
    )
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe(width)
  } finally {
    stop()
  }
})

it('changes consent copy without choosing consent, reopening the panel or breaking the policy link', () => {
  setLanguage('en')
  const ui = mountAnalyticsConsentUi({
    document,
    storage: localStorage,
    eventTarget: window,
    privacySignal: true,
  })
  try {
    const panel = document.querySelector<HTMLElement>('[data-testid="analytics-consent-panel"]')!
    expect(panel.textContent).toContain('browser privacy signal')
    document.querySelector<HTMLButtonElement>('[data-choice="denied"]')!.click()
    expect(readAnalyticsConsent(localStorage)).toBe('denied')
    setLanguage('zh-CN')
    expect(readAnalyticsConsent(localStorage)).toBe('denied')
    expect(panel.hidden).toBe(true)
    expect(panel.querySelector('a')?.textContent).toBe('隐私政策')
    setLanguage('en')
    ui.openPreferences()
    expect(panel.hidden).toBe(false)
    expect(panel.querySelector('a')?.textContent).toBe('Privacy policy')
    expect(panel.querySelector('a')?.href).toBe('https://illegalscreed.cn/zh/privacy')
  } finally {
    ui.destroy()
  }
})

it('covers authored map identities in English and preserves Chinese names when switching back', () => {
  setLanguage('en')
  // Original scene map identities are WORDs. Read authored membership through the phase1 boundary.
  for (let mapId = 0; mapId <= 0xffff; mapId++) {
    if (hasMapName(mapId)) expect(ENGLISH_MAP_NAMES[mapId]).toMatch(/^[\x20-\x7e]+$/)
  }
  expect(getMapName(23)).toBe('Suzhou')
  expect(getMapName(119)).toBe('Fairy Island Peach Forest')
  expect(getMapName(9999)).toBe('Map 9999')
  setLanguage('zh-CN')
  expect(getMapName(119)).toBe('仙灵岛桃花林')
  expect(getMapName(9999)).toBe('地图9999')
})
