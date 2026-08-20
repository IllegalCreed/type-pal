import type { RuntimeSceneDef } from './runtime-scene.js'
import { checkRuntimeHostileBehavior } from './runtime-scene.js'
import type { CommandValidationOptions } from './author-script-core.js'
import {
  checkRuntimeEntityBehaviors,
  checkRuntimeEntityPages,
  checkRuntimeSceneHooks,
  runtimeCommandValidationOptions,
} from './runtime-script.js'
import { validateBaseScenes } from './validate.js'

/** 当前运行时场景 guard：空间与脚本字段在同一棵树上直接校验。 */
export function validateRuntimeScenes(
  json: unknown,
  options: CommandValidationOptions = {},
): RuntimeSceneDef[] {
  const validationOptions = runtimeCommandValidationOptions(options)
  const spatial = validateBaseScenes(json, validationOptions)
  if (!Array.isArray(json)) throw new Error('scenes: 期望数组')
  const scenes = json as Array<Record<string, unknown>>
  scenes.forEach((scene, sceneIndex) => {
    const scenePath = `scenes[${sceneIndex}]`
    if ('onEnter' in scene || 'onTeleport' in scene)
      throw new Error(`${scenePath}: 当前运行态场景脚本必须位于 hooks`)
    checkRuntimeSceneHooks(scene.hooks, `${scenePath}.hooks`, options)
    if (!Array.isArray(scene.entities)) throw new Error(`${scenePath}.entities: 期望数组`)
    scene.entities.forEach((rawEntity, entityIndex) => {
      if (!rawEntity || typeof rawEntity !== 'object' || Array.isArray(rawEntity))
        throw new Error(`${scenePath}.entities[${entityIndex}]: 期望对象`)
      const entity = rawEntity as Record<string, unknown>
      const entityPath = `${scenePath}.entities[${entityIndex}]`
      if (entity.pages !== undefined)
        checkRuntimeEntityPages(
          entity.pages,
          entity.behaviors,
          entity.initialPage,
          entityPath,
          options,
        )
      else if (entity.behaviors !== undefined)
        checkRuntimeEntityBehaviors(entity.behaviors, entityPath, options)
      if (entity.hostile !== undefined)
        checkRuntimeHostileBehavior(entity.hostile, `${entityPath}.hostile`, options)
    })
  })
  return spatial as unknown as RuntimeSceneDef[]
}
