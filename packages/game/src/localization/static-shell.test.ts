import { afterEach, beforeEach, expect, it } from 'vitest'
import { createUnifiedProgressUi } from '../shell/precache-ui.js'
import { useFallbackLanguage } from './language.js'
import { isolateLanguagePreference } from './language.test-fixtures.js'
import { localizeStaticShell } from './static-shell.js'

let restoreLanguage: () => void
let savedTitle: string
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference()
  savedTitle = document.title
})
afterEach(() => {
  document.getElementById('boot-loading')?.remove()
  restoreLanguage()
  document.title = savedTitle
})
it('updates loading language while preserving failure state against static copy and late progress', () => {
  const host = document.createElement('div')
  host.innerHTML =
    '<div id="boot-loading"><div id="boot-loading-title"></div><div id="boot-loading-status" data-initial="true"></div><div id="boot-loading-fill"></div></div>'
  document.body.append(...host.childNodes)
  const stop = localizeStaticShell()
  try {
    useFallbackLanguage('en')
    expect(document.getElementById('boot-loading-title')?.textContent).toBe('Chinese Paladin')
    expect(document.getElementById('boot-loading-status')?.textContent).toBe('Loading…')
    const progress = createUnifiedProgressUi()
    progress.setNecessaryProgress(0.5)
    progress.fail('network unavailable')
    expect(document.getElementById('boot-loading-status')?.textContent).toBe(
      'Startup failed: network unavailable',
    )
    const width = document.getElementById('boot-loading-fill')?.style.width
    expect(width).toBe('6%') // 50% of the 12% necessary-resource segment, before the failure.
    useFallbackLanguage('zh-CN')
    progress.setNecessaryProgress(1)
    progress.setFullProgress(100, 100)
    expect(document.getElementById('boot-loading-status')?.textContent).toBe(
      '启动失败:network unavailable',
    )
    expect(document.getElementById('boot-loading-fill')?.style.width).toBe(width)
  } finally {
    stop()
    document.getElementById('boot-loading')?.remove()
    // The progress controller unsubscribes when a language event observes its detached root.
    useFallbackLanguage('en')
    useFallbackLanguage('zh-CN')
  }
})

it('renders initial copy at mount and stops updating after its owner unsubscribes', () => {
  useFallbackLanguage('en')
  const root = document.createElement('div')
  root.id = 'boot-loading'
  root.innerHTML =
    '<h1 id="boot-loading-title"></h1><div id="boot-loading-sub"></div><button id="boot-loading-enter-btn"></button><p id="boot-loading-hint"></p>'
  document.body.append(root)
  const stop = localizeStaticShell()
  try {
    expect(document.title).toBe('Chinese Paladin · type-pal')
    expect(root.querySelector('#boot-loading-sub')?.textContent).toBe('type-pal · Browser remake')
    expect(root.querySelector('button')?.textContent).toBe('▶ Enter game')
    expect(root.querySelector('#boot-loading-hint')?.textContent).toBe(
      'Enter after the dashed line, or wait for 100% to cache all game resources.',
    )
    stop()
    useFallbackLanguage('zh-CN')
    expect(document.title).toBe('Chinese Paladin · type-pal')
    expect(root.querySelector('h1')?.textContent).toBe('Chinese Paladin')
  } finally {
    stop()
  }
})
