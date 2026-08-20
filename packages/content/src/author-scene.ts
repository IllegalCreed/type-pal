import type { RuntimeSceneDef } from './runtime-scene.js'
import type { RewriteAuthorDialogueTree } from './author-script.js'

/** 作者场景在当前运行时树上保留稳定对话身份。 */
export type AuthorSceneDef = RewriteAuthorDialogueTree<RuntimeSceneDef>
