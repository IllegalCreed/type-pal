/** The isolated test module owns the word table; cleanup clears it and restores language/HTML. */
import { setWordTable } from '../core/word-lookup.js'

import { getLanguage, useFallbackLanguage } from '../localization/language.js'

export function beginChineseMenuText(): () => void {
  const language = getLanguage()
  const htmlLanguage = document.documentElement.getAttribute('lang')
  setWordTable([])
  useFallbackLanguage('zh-CN')
  return () => {
    try {
      setWordTable([])
    } finally {
      try {
        useFallbackLanguage(language)
      } finally {
        if (htmlLanguage === null) document.documentElement.removeAttribute('lang')
        else document.documentElement.lang = htmlLanguage
      }
    }
  }
}
