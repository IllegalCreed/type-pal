/**
 * WORD.DAT 身份查询与当前语言的显示覆盖。
 *
 * sdlpal 运行时按真 WORD id 从 WORD.DAT 取词(菜单文案、状态标签、物品/法术名前缀等全程用)。
 * ts 侧词表来自 extracted/lookup/words.json 的 `flat[]`(**index = 真 WORD id**,
 * 由 pal-extract io/word.ts 产出)。bootstrap 启动 loadAll 后 setWordTable(words.flat) 注入。
 *
 * 模块级只读借用表:bootstrap 启动时注入;菜单/UI 按真 id 查询,英文只覆盖显示文字。
 * fallback 入参 = resilience:words.json 加载失败 / 表未就绪时退化到调用方的默认串(同 bootstrap glyphs→tofu
 * 容错模式)。英文缺项或空串先回到原词表,原表也缺项或空串才用 fallback。
 */

import { getLanguage } from '../localization/language.js'

let _wordTable: readonly string[] = []
let englishWords: Readonly<Record<string, string>> = {}

/** A display overlay; the source table and numeric object identities stay unchanged. */
export function setEnglishWordTable(words: Readonly<Record<string, string>>): void {
  englishWords = words
}

/** 注入 WORD.DAT 词表(words.json 的 flat[]);bootstrap loadAll 后调一次。 */
export function setWordTable(flat: readonly string[]): void {
  _wordTable = flat
}

/**
 * 按当前语言先查非空英文覆盖,再查原词表;两者均缺项/空串才返回 fallback（缺省空串）。
 */
export function getWord(id: number, fallback = ''): string {
  if (getLanguage() === 'en') {
    const translated = englishWords[id]
    if (translated !== undefined && translated !== '') return translated
  }
  const w = _wordTable[id]
  return w !== undefined && w !== '' ? w : fallback
}
