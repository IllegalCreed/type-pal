import type { TextId } from './index.js'

/** 单语言文本表:textId → 富文本字符串(单色纯文本 / 多色带 <color> 标记)。 */
export type Locale = Record<TextId, string>

/** 查表;未命中回退返回 id 本身,便于开发期发现漏填。 */
export function lookupText(id: TextId, locale: Locale): string {
  return locale[id] ?? id
}

/** 中文文本表。鬼界民居切片(鬼话)台词。每句适配 bottom 框宽(320-44-边距≈16 全宽字/行)。 */
export const zhLocale: Locale = {
  'name.youhun': '游魂',
  'dlg.ghost-hearsay.0': '……活人气味……',
  'dlg.ghost-hearsay.1': '南边来过使刀的侠客……',
  'dlg.ghost-hearsay.2': '名字？鬼只记得自己怎么死的。',
  'dlg.ghost-hearsay.3': '我也是听旁的鬼念叨的……',
  'dlg.ghost-hearsay.4': '（南边……使刀的侠客……）',
}
