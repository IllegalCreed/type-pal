import type { ItemDataMap, WorldItemUsePresentation } from '@type-pal/content'

export type ItemUseResultEntry =
  | { itemId: string; count: number; title: string; itemName: string }
  | { text: string }

/** presentation 顺序就是执行顺序；多产物逐个展示，不把结果压成不可追踪的一行。 */
export function buildItemUseResultEntries(
  presentations: readonly WorldItemUsePresentation[],
  items: ItemDataMap,
): ItemUseResultEntry[] {
  return presentations.flatMap<ItemUseResultEntry>((presentation) => {
    if (presentation.kind === 'item-message') return [{ text: presentation.text }]
    return presentation.items.map((item) => ({
      itemId: item.itemId,
      count: item.count,
      title: presentation.source === 'craftRecipe' ? '炼出' : '炼成',
      itemName: items[item.itemId]?.name ?? item.itemId,
    }))
  })
}

/** D14-3:物品使用结果 → reward-gain 单行文本(「炼成 净衣符 × 2」),逐条排队展示。 */
export function itemUseResultText(entry: ItemUseResultEntry): string {
  if ('text' in entry) return entry.text
  return `${entry.title} ${entry.itemName}${entry.count > 1 ? ` × ${entry.count}` : ''}`
}
