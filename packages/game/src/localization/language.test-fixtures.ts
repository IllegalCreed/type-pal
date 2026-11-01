import { type GameLanguage, getLanguage, useFallbackLanguage } from './language.js'

/** Preserve only the preference and DOM field owned by language.ts; never clear unrelated storage. */
export function isolateLanguagePreference(language: GameLanguage = 'zh-CN'): () => void {
  const previousLanguage = getLanguage()
  const previousPreference = localStorage.getItem('tp-language')
  const previousHtmlLanguage = document.documentElement.getAttribute('lang')
  useFallbackLanguage(language)
  return () => {
    useFallbackLanguage(previousLanguage)
    if (previousPreference === null) localStorage.removeItem('tp-language')
    else localStorage.setItem('tp-language', previousPreference)
    if (previousHtmlLanguage === null) document.documentElement.removeAttribute('lang')
    else document.documentElement.setAttribute('lang', previousHtmlLanguage)
  }
}
