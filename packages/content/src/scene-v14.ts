import type { SceneDefV13 } from './scene-v13.js'
import type { RewriteDialogueTreeV14 } from './script-v14.js'

/** content14 只替换对话身份；空间、控制流、生命周期与 hostile policy 保持 v13。 */
export type SceneDefV14 = RewriteDialogueTreeV14<SceneDefV13>
