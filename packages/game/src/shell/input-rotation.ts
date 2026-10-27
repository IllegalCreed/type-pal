/** Input layout preference belongs to the browser, independently of saved games. */
export const INPUT_ROTATION_CHANGE = 'tp-input-rotation-change'
const STORAGE_KEY = 'tp-input-rotation'
let transientPreference: boolean | undefined

export function isInputRotated(): boolean {
  if (transientPreference !== undefined) return transientPreference
  try {
    return localStorage.getItem(STORAGE_KEY) === '45'
  } catch {
    return false
  }
}

export function setInputRotated(rotated: boolean): void {
  const previous = isInputRotated()
  try {
    localStorage.setItem(STORAGE_KEY, rotated ? '45' : '0')
    transientPreference = undefined
  } catch {
    transientPreference = rotated
  }
  if (previous !== rotated) window.dispatchEvent(new Event(INPUT_ROTATION_CHANGE))
}
