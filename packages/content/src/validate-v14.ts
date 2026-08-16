import type { ActorDef } from './actor.js'
import type { EnemyDefV14 } from './enemy-v14.js'
import type { ItemDataV14 } from './item-v14.js'
import type { SceneDefV14 } from './scene-v14.js'
import {
  assertDialogueIdentityReferencesV14,
  checkSharedScriptLibraryV14,
  sanitizeDialogueTreeV14ToV13Shape,
  type SharedScriptLibraryV14,
} from './script-v14.js'
import { validateScenesV13 } from './validate-v13.js'
import { validateEnemies, validateItemsV5 } from './validate.js'

export function validateScenesV14(json: unknown): SceneDefV14[] {
  validateScenesV13(sanitizeDialogueTreeV14ToV13Shape(json, 'scenes'))
  return json as SceneDefV14[]
}

export function validateItemsV14(json: unknown): ItemDataV14[] {
  validateItemsV5(sanitizeDialogueTreeV14ToV13Shape(json, 'items'))
  return json as ItemDataV14[]
}

export function validateEnemiesV14(json: unknown): EnemyDefV14[] {
  validateEnemies(sanitizeDialogueTreeV14ToV13Shape(json, 'enemies'))
  return json as EnemyDefV14[]
}

export function validateSharedScriptsV14(json: unknown): SharedScriptLibraryV14 {
  checkSharedScriptLibraryV14(json)
  return json
}

/** 所有 content14 command roots 的人物/表情引用闭包。 */
export function validateDialogueIdentityReferencesV14(args: {
  scenes: readonly SceneDefV14[]
  items: readonly ItemDataV14[]
  sharedScripts: SharedScriptLibraryV14
  enemies: readonly EnemyDefV14[]
  actors: readonly ActorDef[]
}): void {
  const actorsById = Object.fromEntries(args.actors.map((actor) => [actor.id, actor]))
  assertDialogueIdentityReferencesV14(args.scenes, actorsById, 'scenes')
  assertDialogueIdentityReferencesV14(args.items, actorsById, 'items')
  assertDialogueIdentityReferencesV14(args.sharedScripts, actorsById, 'sharedScripts')
  assertDialogueIdentityReferencesV14(args.enemies, actorsById, 'enemies')
}
