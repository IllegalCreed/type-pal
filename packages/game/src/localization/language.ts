/** Player language is a browser preference, independent of gameplay and saved games. */
export type GameLanguage = 'zh-CN' | 'en'

const STORAGE_KEY = 'tp-language'
let currentLanguage: GameLanguage = 'zh-CN'
const listeners = new Set<(language: GameLanguage) => void>()

export function getLanguage(): GameLanguage {
  return currentLanguage
}

function publish(language: GameLanguage): void {
  if (typeof document !== 'undefined') document.documentElement.lang = language
  if (currentLanguage === language) return
  currentLanguage = language
  for (const listener of listeners) listener(language)
}

/** Called before mounting player UI. Unknown or unavailable preferences default to Chinese. */
export function initializeLanguage(): void {
  let language: GameLanguage = 'zh-CN'
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'en') language = 'en'
  } catch {
    // Private/restricted storage must not prevent startup.
  }
  publish(language)
}

/** The caller verifies language resources are ready before committing this preference. */
export function setLanguage(language: GameLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // The in-memory choice still applies when persistence is blocked.
  }
  publish(language)
}

/** Notifies only on changes; callers render their initial state when mounting. */
export function subscribeLanguage(listener: (language: GameLanguage) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function localize(chinese: string, english: string): string {
  return currentLanguage === 'en' ? english : chinese
}
