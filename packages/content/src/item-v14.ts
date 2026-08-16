import type { ItemDataV5 } from './item-v5.js'
import type { RewriteDialogueTreeV14 } from './script-v14.js'

/** item 私有脚本仍保留 v5 vocabulary，只把 dialog cue 晋升到 content14 identity。 */
export type ItemDataV14 = RewriteDialogueTreeV14<ItemDataV5>
export type ItemDataMapV14 = Record<string, ItemDataV14>
