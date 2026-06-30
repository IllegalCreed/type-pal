import type { TextId } from './index.js'

/** 单语言文本表:textId → 富文本字符串(单色纯文本 / 多色带 <color> 标记)。 */
export type Locale = Record<TextId, string>

/** 查表;未命中回退返回 id 本身,便于开发期发现漏填。 */
export function lookupText(id: TextId, locale: Locale): string {
  return locale[id] ?? id
}
