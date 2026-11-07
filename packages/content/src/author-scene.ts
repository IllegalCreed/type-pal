import type {
  AuthorEntityBehaviors,
  AuthorSceneHooks,
  RewriteAuthorDialogueTree,
} from './author-script.js'
import type { RuntimeSceneDef } from './runtime-scene.js'

/** 作者场景在当前运行时树上保留稳定对话身份。 */
type AuthorEntity<T> = T extends unknown
  ? Omit<RewriteAuthorDialogueTree<T>, 'behaviors'> & {
      behaviors?: AuthorEntityBehaviors
    }
  : never

export type AuthorSceneDef = Omit<
  RewriteAuthorDialogueTree<RuntimeSceneDef>,
  'entities' | 'hooks'
> & {
  entities: AuthorEntity<RuntimeSceneDef['entities'][number]>[]
  hooks?: AuthorSceneHooks
}
