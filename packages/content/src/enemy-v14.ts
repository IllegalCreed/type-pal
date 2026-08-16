import type { EnemyDef } from './enemy.js'
import type { RewriteDialogueTreeV14 } from './script-v14.js'

/** 包含 ai.hooks、choreography 与 onDefeated 的完整 enemy 对话 identity successor。 */
export type EnemyDefV14 = RewriteDialogueTreeV14<EnemyDef>
