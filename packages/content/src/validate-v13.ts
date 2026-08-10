import type { SceneDefV13 } from './scene-v13.js'
import { checkHostileBehaviorV13 } from './scene-v13.js'
import {
  checkEntityBehaviorsV13,
  checkEntityPagesV13,
  checkSceneHooksV13,
  sanitizeV13ForV5Shape,
} from './script-v13.js'
import { validateScenesV5 } from './validate.js'

/** Canonical content13 scene guard：空间字段沿 v5，脚本与 hostile 全部走 v13 边界。 */
export function validateScenesV13(json: unknown): SceneDefV13[] {
  // v5 spatial validator still provides the established map/entry/entity-reference checks. Its
  // command checker sees a sanitized copy where the four new leaves are harmless wait leaves.
  const spatial = validateScenesV5(sanitizeV13ForV5Shape(json, 'scenes'))
  if (!Array.isArray(json)) throw new Error('scenes: 期望数组')
  const scenes = json as Array<Record<string, unknown>>
  scenes.forEach((scene, sceneIndex) => {
    const scenePath = `scenes[${sceneIndex}]`
    if ('onEnter' in scene || 'onTeleport' in scene)
      throw new Error(`${scenePath}: v13 场景脚本必须位于 hooks`)
    checkSceneHooksV13(scene.hooks, `${scenePath}.hooks`)
    if (!Array.isArray(scene.entities)) throw new Error(`${scenePath}.entities: 期望数组`)
    scene.entities.forEach((rawEntity, entityIndex) => {
      if (!rawEntity || typeof rawEntity !== 'object' || Array.isArray(rawEntity))
        throw new Error(`${scenePath}.entities[${entityIndex}]: 期望对象`)
      const entity = rawEntity as Record<string, unknown>
      const entityPath = `${scenePath}.entities[${entityIndex}]`
      if (entity.pages !== undefined)
        checkEntityPagesV13(entity.pages, entity.behaviors, entity.initialPage, entityPath)
      else if (entity.behaviors !== undefined) checkEntityBehaviorsV13(entity.behaviors, entityPath)
      if (entity.hostile !== undefined)
        checkHostileBehaviorV13(entity.hostile, `${entityPath}.hostile`)
    })
  })
  return spatial as unknown as SceneDefV13[]
}
