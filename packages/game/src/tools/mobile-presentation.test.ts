import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isFpsEnabled, setFpsEnabled } from './fps-overlay.js'
import { loadBests, loadSettings, saveBests, saveSetting } from './speedrun/store.js'

describe('mobile presentation preferences', () => {
  let savedStorage: Record<string, string>
  let previousLayout: string | undefined
  beforeEach(() => {
    savedStorage = { ...localStorage }
    previousLayout = document.documentElement.dataset.tpLayout
    localStorage.clear()
    document.documentElement.dataset.tpLayout = 'desktop'
  })
  afterEach(() => {
    localStorage.clear()
    for (const [key, value] of Object.entries(savedStorage)) localStorage.setItem(key, value)
    if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
    else document.documentElement.dataset.tpLayout = previousLayout
  })

  it('switching to mobile suppresses overlays while retaining the stored desktop choices', () => {
    setFpsEnabled(true)
    saveSetting('enabled', true)
    saveSetting('show', false)
    document.documentElement.dataset.tpLayout = 'mobile'
    expect(isFpsEnabled()).toBe(false)
    expect(loadSettings().enabled).toBe(false)
    expect(loadSettings().show).toBe(false)
    document.documentElement.dataset.tpLayout = 'desktop'
    expect(isFpsEnabled()).toBe(true)
    expect(loadSettings()).toMatchObject({ enabled: true, show: false })
  })

  it('switching layouts retains shared speedrun best times and banana rule', () => {
    saveBests({ ending: 1000 })
    saveSetting('banana', true)
    document.documentElement.dataset.tpLayout = 'mobile'
    expect(loadBests({ ending: null })).toEqual({ ending: 1000 })
    expect(loadSettings().banana).toBe(true)
  })
})
