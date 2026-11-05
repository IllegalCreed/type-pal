import { afterEach, beforeEach, expect, it } from 'vitest'
import { sectionTitle } from '../tools/tools-panel-dom.js'
import { useFallbackLanguage } from './language.js'
import { isolateLanguagePreference } from './language.test-fixtures.js'

let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference()
})
afterEach(() => restoreLanguage())

it('localizes a defined tools label and preserves an unknown label even if it names an inherited property', () => {
  const parent = document.createElement('div')
  sectionTitle(parent, '战斗')
  expect(parent.lastChild?.textContent).toBe('战斗')
  useFallbackLanguage('en')
  sectionTitle(parent, '战斗')
  expect(parent.lastChild?.textContent).toBe('Battle')
  sectionTitle(parent, '未登记标题')
  expect(parent.lastChild?.textContent).toBe('未登记标题')
  sectionTitle(parent, 'constructor')
  expect(parent.lastChild?.textContent).toBe('constructor')
})
