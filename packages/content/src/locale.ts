import type { TextId } from './index.js'

/** 单语言文本表:textId → 富文本字符串(单色纯文本 / 多色带 <color> 标记)。 */
export type Locale = Record<TextId, string>

/** 查表;未命中回退返回 id 本身,便于开发期发现漏填。 */
export function lookupText(id: TextId, locale: Locale): string {
  return locale[id] ?? id
}

/** 中文文本表。鬼界民居切片(鬼话)台词。 */
export const zhLocale: Locale = {
  'name.youhun': '游魂',
  'dlg.ghost-hearsay.0': '……活人气味……这地方，可不该有活人啊……',
  'dlg.ghost-hearsay.1': '南边……来过个使刀的侠客……听说，是个仗义的……',
  'dlg.ghost-hearsay.2': '咳，名字？谁还记得名字。鬼啊，只记得自己怎么死的。',
  'dlg.ghost-hearsay.3': '你问那侠客？……我也是听旁的鬼念叨来的……做不得准……',
  'dlg.ghost-hearsay.4': '（李逍遥心头一动：南边……使刀的侠客……）',
}
