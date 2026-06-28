import type { TextId } from './index.js'

/** 单语言文本表:textId → 富文本字符串(单色纯文本 / 多色带 <color> 标记)。 */
export type Locale = Record<TextId, string>

/** 查表;未命中回退返回 id 本身,便于开发期发现漏填。 */
export function lookupText(id: TextId, locale: Locale): string {
  return locale[id] ?? id
}

/** 中文文本表。鬼界民居切片(鬼话)台词。文案服务于剧情,长度由渲染层自动换行处理。 */
export const zhLocale: Locale = {
  'name.youhun': '游魂',
  'name.distant-ghost': '远处的鬼',
  'dlg.ghost-hearsay.0': '……<yellow>活人气味</yellow>……这地方，可不该有活人啊……',
  'dlg.ghost-hearsay.1': '南边……来过个<cyan>使剑的侠客</cyan>……听说，是个仗义的……',
  'dlg.ghost-hearsay.2':
    '（远处飘来幽幽的声音）那使剑的侠客……我生前也曾与他有一面之缘。他提着剑，从南边那片乱葬岗走来，衣襟上沾着未干的血。我们这些孤魂，远远望着他，竟都忘了恐惧，只觉得……那是一股久违的人间气。后来他走了，往北去了，再没回来过。我们却记住了他剑上的<red>寒光</red>。',
  'dlg.ghost-hearsay.3': '咳，名字？谁还记得名字。鬼啊，只记得自己怎么死的。',
  'dlg.ghost-hearsay.4': '（李逍遥心头一动：南边……使剑的侠客……）',
  // 菜单(D17)
  'name.li-xiaoyao': '李逍遥',
  'menu.status': '状态',
  'menu.item': '物品',
  'menu.magic': '仙术',
  'menu.system': '系统',
  'menu.not-implemented': '未实现',
  'menu.cash': '金钱',
  'stat.level': '等级',
  'stat.hp': '生命',
  'stat.mp': '灵力',
  'stat.attack': '攻击',
  'stat.defense': '防御',
  'stat.magicAttack': '灵力',
  'stat.speed': '身法',
  'equip.weapon': '武器',
  'equip.head': '头部',
  'equip.body': '护甲',
  'equip.feet': '足部',
  'equip.accessory': '饰品',
  'equip.amulet': '法宝',
  'equip.empty': '—',
}
