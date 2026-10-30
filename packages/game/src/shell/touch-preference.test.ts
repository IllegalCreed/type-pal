import { afterEach, beforeEach, expect, it } from 'vitest'
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
