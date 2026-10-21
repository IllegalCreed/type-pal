import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LAYOUT_CHANGE } from '../shell/presentation.js'
import { setupToolsPanel } from './tools-panel.js'
import { useToolsPanelTestHost } from './tools-panel.test-fixtures.js'

const makeDeps = useToolsPanelTestHost()
let previousLayout: string | undefined
beforeEach(() => {
  previousLayout = document.documentElement.dataset.tpLayout
  document.documentElement.dataset.tpLayout = 'mobile'
})
afterEach(() => {
  if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
  else document.documentElement.dataset.tpLayout = previousLayout
})

describe('mobile tools', () => {
  it('updates an open system panel across desktop and mobile layouts', () => {
    document.documentElement.dataset.tpLayout = 'desktop'
    setupToolsPanel(makeDeps())
    document.getElementById('tp-tools-launcher')?.click()
    document.querySelector<HTMLButtonElement>('.tp-tab[data-key="system"]')?.click()
    const body = document.querySelector('.tp-body')!
    expect(body.textContent).toMatch(/FPS/)

    document.documentElement.dataset.tpLayout = 'mobile'
    window.dispatchEvent(new Event(LAYOUT_CHANGE))
    expect(body.textContent).not.toMatch(/FPS|全屏|存档|缩放/)
    expect(document.querySelector<HTMLButtonElement>('.tp-tab[data-key="timer"]')?.hidden).toBe(
      true,
    )
    expect(document.querySelector<HTMLButtonElement>('.tp-tab[data-key="keys"]')?.hidden).toBe(true)

    document.documentElement.dataset.tpLayout = 'desktop'
    window.dispatchEvent(new Event(LAYOUT_CHANGE))
    expect(body.textContent).toMatch(/FPS/)
    expect(document.querySelector<HTMLButtonElement>('.tp-tab[data-key="timer"]')?.hidden).toBe(
      false,
    )
    expect(document.querySelector<HTMLButtonElement>('.tp-tab[data-key="keys"]')?.hidden).toBe(
      false,
    )
  })

  it('offers audio controls while omitting display, timer, keyboard and file transfer UI', () => {
    setupToolsPanel(makeDeps())
    document.getElementById('tp-tools-launcher')?.click()
    const body = document.querySelector('.tp-body')!
    expect(body.querySelector('#tp-music-source')).not.toBeNull()
    expect(body.querySelectorAll('input[type="range"]')).toHaveLength(3)
    expect(body.textContent).not.toMatch(/FPS|全屏|存档|缩放/)
    for (const key of ['timer', 'keys']) {
      const tab = document.querySelector<HTMLButtonElement>(`.tp-tab[data-key="${key}"]`)!
      expect(getComputedStyle(tab).display).toBe('none')
    }
    expect(document.querySelector<HTMLButtonElement>('.tp-tab[data-key="scene"]')?.hidden).toBe(
      false,
    )
  })

  it('opens privacy preferences from tools and closes the drawer before handing off', () => {
    const openPrivacySettings = vi.fn()
    const onOpenChange = vi.fn()
    setupToolsPanel(makeDeps({ openPrivacySettings, onOpenChange }))
    const launcher = document.getElementById('tp-tools-launcher')!
    launcher.focus()
    launcher.click()
    const privacy = [...document.querySelectorAll<HTMLButtonElement>('.tp-body button')].find(
      (button) => button.textContent === '隐私设置',
    )!
    privacy.click()
    expect(document.getElementById('tp-tools-panel')?.hidden).toBe(true)
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
    expect(openPrivacySettings).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(launcher)
  })
})
