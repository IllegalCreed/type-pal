import type { RewriteAuthorDialogueTree } from './author-script.js'
import type { EnemyDef } from './enemy.js'

/** 包含 ai.hooks、choreography 与 onDefeated 的完整作者敌人树。 */
export type AuthorEnemyDef = RewriteAuthorDialogueTree<EnemyDef>
