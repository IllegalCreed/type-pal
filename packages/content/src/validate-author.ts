import type { ActorDef } from './actor.js'
import type { AuthorEnemyDef } from './author-enemy.js'
import type { AuthorItemData } from './author-item.js'
import type { AuthorSceneDef } from './author-scene.js'
import {
  type AuthorScriptLibrary,
  assertAuthorDialogueReferences,
  authorCommandValidationOptions,
  checkAuthorScriptLibrary,
} from './author-script.js'
import { checkBaseHostileBehavior } from './runtime-scene.js'
import { validateAuthorItemCore, validateBaseScenes, validateEnemies } from './validate.js'

export function validateAuthorScenes(json: unknown): AuthorSceneDef[] {
  const options = authorCommandValidationOptions()
  const scenes = validateBaseScenes(json, options)
  scenes.forEach((scene, sceneIndex) => {
    scene.entities.forEach((entity, entityIndex) => {
      if (entity.hostile !== undefined)
        checkBaseHostileBehavior(
          entity.hostile,
          `scenes[${sceneIndex}].entities[${entityIndex}].hostile`,
          options,
        )
    })
  })
  return json as AuthorSceneDef[]
}

export function validateAuthorItems(json: unknown): AuthorItemData[] {
  validateAuthorItemCore(json, authorCommandValidationOptions())
  return json as AuthorItemData[]
}

export function validateAuthorEnemies(json: unknown): AuthorEnemyDef[] {
  validateEnemies(json, authorCommandValidationOptions())
  return json as AuthorEnemyDef[]
}

export function validateAuthorSharedScripts(json: unknown): AuthorScriptLibrary {
  checkAuthorScriptLibrary(json)
  return json
}

/** 所有当前作者 command roots 的人物/表情引用闭包。 */
export function validateAuthorDialogueReferences(args: {
  scenes: readonly AuthorSceneDef[]
  items: readonly AuthorItemData[]
  sharedScripts: AuthorScriptLibrary
  enemies: readonly AuthorEnemyDef[]
  actors: readonly ActorDef[]
}): void {
  const actorsById = Object.fromEntries(args.actors.map((actor) => [actor.id, actor]))
  assertAuthorDialogueReferences(args.scenes, actorsById, 'scenes')
  assertAuthorDialogueReferences(args.items, actorsById, 'items')
  assertAuthorDialogueReferences(args.sharedScripts, actorsById, 'sharedScripts')
  assertAuthorDialogueReferences(args.enemies, actorsById, 'enemies')
}
