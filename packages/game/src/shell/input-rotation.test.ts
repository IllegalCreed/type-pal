import { afterEach, expect, it, vi } from 'vitest'

const key = 'tp-input-rotation'
afterEach(() => {
  localStorage.removeItem(key)
  vi.restoreAllMocks()
  vi.resetModules()
})

it('defaults to the original layout and reloads only an explicit clockwise preference', async () => {
  const preference = await import('./input-rotation.js')
  expect(preference.isInputRotated()).toBe(false)
  localStorage.setItem(key, 'invalid')
  expect(preference.isInputRotated()).toBe(false)
  const observed: boolean[] = []
  const listener = (): void => {
    observed.push(preference.isInputRotated())
  }
  window.addEventListener(preference.INPUT_ROTATION_CHANGE, listener)
  try {
    preference.setInputRotated(true)
    preference.setInputRotated(true)
    expect(localStorage.getItem(key)).toBe('45')
    vi.resetModules()
    const reloaded = await import('./input-rotation.js')
    expect(reloaded.isInputRotated()).toBe(true)
    preference.setInputRotated(false)
    expect(localStorage.getItem(key)).toBe('0')
    expect(observed).toEqual([true, false])
  } finally {
    window.removeEventListener(preference.INPUT_ROTATION_CHANGE, listener)
  }
})

it('keeps an effective in-memory choice when storage is inaccessible, then resumes persistence', async () => {
  const preference = await import('./input-rotation.js')
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage blocked', 'SecurityError')
  })
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage blocked', 'SecurityError')
  })
  expect(preference.isInputRotated()).toBe(false)
  preference.setInputRotated(true)
  expect(preference.isInputRotated()).toBe(true)
  preference.setInputRotated(false)
  expect(preference.isInputRotated()).toBe(false)
  read.mockRestore()
  write.mockRestore()
  preference.setInputRotated(true)
  expect(localStorage.getItem(key)).toBe('45')
})
