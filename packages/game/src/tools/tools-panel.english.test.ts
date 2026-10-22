import type { EnemyObject } from '@type-pal/shared'
import { afterEach, beforeEach, expect, it } from 'vitest'
import {
  makeEnemy,
  makeObjectPoison,
  makePlayerRole,
  makePlayerRoles,
} from '../core/__tests__/stats/stats-test-fixtures.js'
import { createBattleState } from '../core/battle/battle-state.js'
import { hydratePlayerRolesRuntime } from '../core/game-state.js'
import { createSeedableRng } from '../core/rng.js'
import { setWordTable } from '../core/word-lookup.js'
import { getLanguage, setLanguage } from '../localization/language.js'
import { setupToolsPanel } from './tools-panel.js'
import { useToolsPanelTestHost } from './tools-panel.test-fixtures.js'

const makeDeps = useToolsPanelTestHost()
let previousLayout: string | undefined
beforeEach(() => {
  previousLayout = document.documentElement.dataset.tpLayout
  document.documentElement.dataset.tpLayout = 'desktop'
  setLanguage('zh-CN')
})
afterEach(() => {
  setWordTable([])
  setLanguage('zh-CN')
  if (previousLayout === undefined) delete document.documentElement.dataset.tpLayout
  else document.documentElement.dataset.tpLayout = previousLayout
})

function openTab(key: string): void {
  document.getElementById('tp-tools-launcher')?.click()
  document.querySelector<HTMLButtonElement>(`.tp-tab[data-key="${key}"]`)?.click()
}

it('changes the open system page and remembered preference without replacing gameplay or focus', () => {
  const deps = makeDeps({ languageAvailable: true })
  const gs = deps.getGs()
  gs.dwCash = 1234
  setupToolsPanel(deps)
  openTab('system')
  const select = document.querySelector<HTMLSelectElement>('#tp-language')!
  select.focus()
  select.value = 'en'
  select.dispatchEvent(new Event('change', { bubbles: true }))
  expect(getLanguage()).toBe('en')
  expect(localStorage.getItem('tp-language')).toBe('en')
  expect(document.querySelector('.tp-tab-active')?.getAttribute('data-key')).toBe('system')
  expect(document.querySelector('.tp-title')?.textContent).toBe('PAL · Tools')
  expect(document.querySelector('.tp-body')?.textContent).toContain('Music')
  expect(document.activeElement?.id).toBe('tp-language')
  expect(deps.getGs()).toBe(gs)
  expect(gs.dwCash).toBe(1234)
  const restoredSelect = document.querySelector<HTMLSelectElement>('#tp-language')!
  restoredSelect.value = 'zh-CN'
  restoredSelect.dispatchEvent(new Event('change', { bubbles: true }))
  expect(document.querySelector('.tp-title')?.textContent).toBe('仙剑 · 工具')
})

it('does not accept an unavailable English pack even when change is dispatched programmatically', () => {
  setupToolsPanel(makeDeps())
  openTab('system')
  const select = document.querySelector<HTMLSelectElement>('#tp-language')!
  expect(select.querySelector<HTMLOptionElement>('option[value="en"]')?.disabled).toBe(true)
  select.value = 'en'
  select.dispatchEvent(new Event('change', { bubbles: true }))
  expect(getLanguage()).toBe('zh-CN')
  expect(select.value).toBe('zh-CN')
  expect(document.querySelector('.tp-body')?.textContent).toContain('英文语言包未就绪')
})

it('keeps mobile feature exclusions while showing English settings and bilingual language choices', () => {
  document.documentElement.dataset.tpLayout = 'mobile'
  setLanguage('en')
  setupToolsPanel(makeDeps({ languageAvailable: true }))
  document.getElementById('tp-tools-launcher')?.click()
  const body = document.querySelector('.tp-body')!
  expect(body.textContent).toContain('Show touch controls')
  expect(body.textContent).toContain('简体中文')
  expect(body.textContent).not.toMatch(/Fullscreen|FPS|Import \/ export|Quick save|Scale/)
  expect(body.querySelectorAll('input[type="range"]')).toHaveLength(3)
  for (const key of ['timer', 'keys']) {
    expect(document.querySelector<HTMLButtonElement>(`.tp-tab[data-key="${key}"]`)?.hidden).toBe(
      true,
    )
  }
})

it('renders static help across all tools tabs in English, with only the language picker bilingual', () => {
  setLanguage('en')
  setupToolsPanel(makeDeps({ languageAvailable: true }))
  document.getElementById('tp-tools-launcher')?.click()
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.tp-tab')) {
    tab.click()
    const text = document.querySelector('.tp-body')?.textContent ?? ''
    expect(text.replaceAll('语言', '').replaceAll('简体中文', '')).not.toMatch(/[\u3400-\u9fff]/)
    expect(tab.textContent).not.toMatch(/[\u3400-\u9fff]/)
  }
})

it('uses role and enemy word identities while leaving inspector filtering and element colors intact', () => {
  setLanguage('en')
  const words: string[] = []
  words[40] = 'Queen'
  words[478] = 'First enemy object'
  words[479] = 'Second enemy object'
  words[61] = 'Wooden Sword'
  words[551] = 'Snake Venom'
  setWordTable(words)
  const roles = makePlayerRoles()
  roles.roles[3] = makePlayerRole({ id: 3, name: 40, _name: '巫后' })
  const enemyObjects: EnemyObject[] = [478, 479].map((objectIndex) => ({
    objectIndex,
    enemyId: 81,
    resistanceToSorcery: 0,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }))
  const deps = makeDeps({
    languageAvailable: true,
    getResources: () => ({
      playerRoles: roles,
      enemyObjects,
      objectPoisons: [makeObjectPoison({ id: 551 })],
      items: [],
    }),
  })
  const gs = deps.getGs()
  gs.partyMembers = [3]
  gs.rgPoisonStatus['0_0'] = { wPoisonID: 551, wPoisonScript: 0 }
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
  gs.battleState = createBattleState({
    gs,
    playerRoles: roles,
    enemies: [makeEnemy({ id: 81, stealItem: 61, stealItemCount: 2 })],
    enemyScripts: [{ objectId: 479, onTurnStart: 0, onReady: 0, onBattleEnd: 0 }],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    rng: createSeedableRng(7),
  })
  gs.mode = 'battle'
  setupToolsPanel(deps)
  openTab('battle')
  const body = document.querySelector('.tp-body')!
  expect(body.textContent).toContain('Queen')
  expect(body.textContent).toContain('Second enemy object')
  expect(body.textContent).not.toContain('First enemy object')
  expect(body.textContent).toContain('Wooden Sword ×2')
  expect(body.textContent).toContain('Snake Venom')
  expect(body.textContent).not.toContain('法术id')
  expect(body.querySelector('.e-wind')?.textContent).toContain('Wind')
  expect(body.textContent).toContain('Rewards')
  expect(body.textContent).toContain('EXP')
})
