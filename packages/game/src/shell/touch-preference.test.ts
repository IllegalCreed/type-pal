import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  areTouchControlsVisible,
  setTouchControlsVisible,
  TOUCH_VISIBILITY_CHANGE,
} from './touch-preference.js'

let previous: string | null
beforeEach(() => {
  previous = localStorage.getItem('tp-touch-controls')
  localStorage.removeItem('tp-touch-controls')
})
afterEach(() => {
  if (previous === null) localStorage.removeItem('tp-touch-controls')
  else localStorage.setItem('tp-touch-controls', previous)
})

it('defaults visible and persists explicit hide/show choices, notifying the mounted shell', () => {
  const observed: boolean[] = []
  const listener = (): void => {
    observed.push(areTouchControlsVisible())
  }
  window.addEventListener(TOUCH_VISIBILITY_CHANGE, listener)
  try {
    expect(areTouchControlsVisible()).toBe(true)
    setTouchControlsVisible(false)
    expect(areTouchControlsVisible()).toBe(false)
    expect(localStorage.getItem('tp-touch-controls')).toBe('0')
    setTouchControlsVisible(true)
    expect(localStorage.getItem('tp-touch-controls')).toBe('1')
    expect(observed).toEqual([false, true])
  } finally {
    window.removeEventListener(TOUCH_VISIBILITY_CHANGE, listener)
  }
})

it('keeps the current choice in memory when browser storage is blocked', () => {
  const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Blocked', 'SecurityError')
  })
  try {
    expect(areTouchControlsVisible()).toBe(true)
    setTouchControlsVisible(false)
    expect(areTouchControlsVisible()).toBe(false)
    setTouchControlsVisible(true)
    expect(areTouchControlsVisible()).toBe(true)
  } finally {
    get.mockRestore()
    set.mockRestore()
    // Successful persistence releases the module-owned transient choice.
    setTouchControlsVisible(true)
  }
})
