export const TOUCH_VISIBILITY_CHANGE = 'tp-touch-visibility-change'
const KEY = 'tp-touch-controls'
let transientPreference: boolean | undefined

export function areTouchControlsVisible(): boolean {
  if (transientPreference !== undefined) return transientPreference
  try {
    return localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

export function setTouchControlsVisible(visible: boolean): void {
  try {
    localStorage.setItem(KEY, visible ? '1' : '0')
    transientPreference = undefined
  } catch {
    transientPreference = visible
  }
  window.dispatchEvent(new Event(TOUCH_VISIBILITY_CHANGE))
}
