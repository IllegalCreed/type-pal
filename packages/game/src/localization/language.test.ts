import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  getLanguage,
  initializeLanguage,
  localize,
  setLanguage,
  subscribeLanguage,
} from './language.js'

beforeEach(() => {
  localStorage.removeItem('tp-language')
  initializeLanguage()
})
afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem('tp-language')
  initializeLanguage()
})

it('uses Chinese for missing or unknown preferences and restores a persisted English choice', () => {
  expect(getLanguage()).toBe('zh-CN')
  localStorage.setItem('tp-language', 'fr')
  initializeLanguage()
  expect(document.documentElement.lang).toBe('zh-CN')
  localStorage.setItem('tp-language', 'en')
  initializeLanguage()
  expect(getLanguage()).toBe('en')
  expect(document.documentElement.lang).toBe('en')
  expect(localize('确认', 'Confirm')).toBe('Confirm')
})

it('persists changes, notifies mounted UI once per change, and releases subscriptions', () => {
  const observed: string[] = []
  const unsubscribe = subscribeLanguage((language) => observed.push(language))
  try {
    setLanguage('en')
    setLanguage('en')
    expect(localStorage.getItem('tp-language')).toBe('en')
    expect(observed).toEqual(['en'])
    unsubscribe()
    setLanguage('zh-CN')
    expect(observed).toEqual(['en'])
    expect(localize('确认', 'Confirm')).toBe('确认')
  } finally {
    unsubscribe()
  }
})

it('keeps a usable in-memory selection when browser storage throws', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError')
  })
  setLanguage('en')
  expect(getLanguage()).toBe('en')
  expect(document.documentElement.lang).toBe('en')
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('blocked', 'SecurityError')
  })
  initializeLanguage()
  expect(getLanguage()).toBe('zh-CN')
})
