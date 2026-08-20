import type { AuthorItemCore } from './author-item-core.js'
import type { RewriteAuthorDialogueTree } from './author-script.js'

/** 作者物品私有脚本使用当前对话身份。 */
export type AuthorItemData = RewriteAuthorDialogueTree<AuthorItemCore>
export type AuthorItemDataMap = Record<string, AuthorItemData>
