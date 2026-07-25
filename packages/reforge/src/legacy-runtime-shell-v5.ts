import type {
  AuthorSceneEntryPresentationV5,
  EntityBaseV5,
  EntityDef,
  EntityDefV5,
  EntityPage,
  ItemData,
  ItemDataMap,
  ItemDataMapV5,
  SceneDef,
  SceneDefV5,
  ScriptFlowV5,
  ScriptRef,
  ScriptStage,
  WorldScriptState,
  WorldScriptStateV5,
} from '@type-pal/content'
import type { LoadedProject } from './loader.js'
import type { LoadedProjectV5 } from './loader-v5.js'
import {
  resolveEntityBehaviorV5,
  resolveEntityPageV5,
  resolveEntityTriggerActivationV5,
  resolveSceneHookV5,
} from './script-world-v5.js'

const V5_SCRIPT_CHUNK = '__script-v5-runtime'

function emptyLegacyStages(): ScriptStage[] {
  return [{ body: [] }]
}

function scriptRef(id: string): ScriptRef {
  return { chunk: V5_SCRIPT_CHUNK, id }
}

export function v5RuntimeScriptRef(id: string): ScriptRef {
  return scriptRef(id)
}

function legacyItem(item: ItemDataMapV5[string]): ItemData {
  const convertEffects = (
    effects: NonNullable<ItemDataMapV5[string]['use']>['effects'],
  ): NonNullable<ItemData['use']>['effects'] =>
    effects.map((effect) => {
      if (effect.kind === 'runScript')
        return { kind: 'runScript' as const, script: scriptRef(effect.script) }
      if (effect.kind === 'itemPrivateScript')
        return {
          kind: 'runScript' as const,
          script: scriptRef(`item:${item.id}:${effect.script.id}`),
        }
      return structuredClone(effect)
    })
  return {
    ...structuredClone(item),
    ...(item.use
      ? { use: { ...structuredClone(item.use), effects: convertEffects(item.use.effects) } }
      : {}),
    ...(item.throw
      ? {
          throw: {
            ...structuredClone(item.throw),
            effects: convertEffects(item.throw.effects),
          },
        }
      : {}),
  } as ItemData
}

export function legacyItemsFromV5(items: ItemDataMapV5): ItemDataMap {
  return Object.fromEntries(Object.entries(items).map(([id, item]) => [id, legacyItem(item)]))
}

function entryAtCursor(
  flow: ScriptFlowV5,
  cursor: ReturnType<typeof resolveSceneHookV5> extends infer _Resolved
    ? import('@type-pal/content').FlowCursor
    : never,
): AuthorSceneEntryPresentationV5 | undefined {
  if (flow.kind === 'stages') {
    if (cursor.kind !== 'stage') return
    return flow.stages.find((stage) => stage.id === cursor.stage)?.entry
  }
  if (cursor.kind !== 'state' || cursor.machine !== flow.machine.id) return
  return flow.machine.states[cursor.state]?.entry
}

function legacyHookBinding(
  scene: SceneDefV5,
  world: WorldScriptStateV5,
  slot: 'onEnter' | 'onTeleport',
): ScriptStage[] | undefined {
  const resolved = resolveSceneHookV5(scene, world, slot)
  if (!resolved) return
  const entry = entryAtCursor(resolved.hook.flow, resolved.cursor)
  return [
    {
      ...(entry ? { entry: { prepare: [], reveal: structuredClone(entry.reveal) } } : {}),
      body: [],
    },
  ]
}

function legacyPage(
  sceneId: string,
  entity: EntityBaseV5,
  world: WorldScriptStateV5,
): EntityPage | undefined {
  const target = { scene: sceneId, entity: entity.id }
  const page = resolveEntityPageV5(entity, world.behaviors.entities?.[sceneId]?.[entity.id])
  const trigger = resolveEntityBehaviorV5(entity, world, target, 'trigger')
  const auto = resolveEntityBehaviorV5(entity, world, target, 'auto')
  const activation = resolveEntityTriggerActivationV5(entity, world, target)
  if (!page && !trigger && !auto) return
  return {
    ...(trigger && activation
      ? {
          trigger: {
            ...structuredClone(activation),
            stages: emptyLegacyStages(),
          },
        }
      : {}),
    ...(auto ? { auto: { stages: emptyLegacyStages() } } : {}),
    ...(page?.animation ? { animation: structuredClone(page.animation) } : {}),
  }
}

function legacyEntity(sceneId: string, entity: EntityDefV5, world: WorldScriptStateV5): EntityDef {
  const {
    behaviors: _behaviors,
    initialPage: _initialPage,
    pages: _pages,
    ...base
  } = structuredClone(entity)
  const page = legacyPage(sceneId, entity, world)
  const hostile =
    entity.hostile?.onLose && entity.hostile.onLose !== 'gameOver'
      ? { ...structuredClone(entity.hostile), onLose: [] }
      : structuredClone(entity.hostile)
  return {
    ...base,
    ...(page ? { pages: [page] } : {}),
    ...(hostile ? { hostile } : {}),
  } as EntityDef
}

export function legacySceneFromV5(scene: SceneDefV5, world: WorldScriptStateV5): SceneDef {
  const { hooks: _hooks, entities: _entities, ...base } = structuredClone(scene)
  const onEnter = legacyHookBinding(scene, world, 'onEnter')
  const onTeleport = legacyHookBinding(scene, world, 'onTeleport')
  return {
    ...base,
    entities: scene.entities.map((entity) => legacyEntity(scene.id, entity, world)),
    ...(onEnter ? { onEnter } : {}),
    ...(onTeleport ? { onTeleport } : {}),
  }
}

/** 只刷新行为页投影，保留场景活体的走位、显隐、朝向和碰撞变化。 */
export function refreshLegacySceneBindingsV5(
  target: SceneDef,
  canonical: SceneDefV5,
  world: WorldScriptStateV5,
): void {
  const definitions = new Map(canonical.entities.map((entity) => [entity.id, entity]))
  for (const entity of target.entities) {
    const definition = definitions.get(entity.id)
    if (!definition) continue
    const page = legacyPage(canonical.id, definition, world)
    if (page) entity.pages = [page]
    else delete entity.pages
  }
  const onEnter = legacyHookBinding(canonical, world, 'onEnter')
  const onTeleport = legacyHookBinding(canonical, world, 'onTeleport')
  if (onEnter) target.onEnter = onEnter as SceneDef['onEnter']
  else delete target.onEnter
  if (onTeleport) target.onTeleport = onTeleport as SceneDef['onTeleport']
  else delete target.onTeleport
}

/**
 * 现有渲染/战斗/菜单宿主暂时消费的兼容壳。canonical project 由调用方单独持有；
 * 壳内不含 ScriptIndex/ScriptChunkStore，脚本只能走 ScriptProjectRuntimeV5。
 */
export function legacyProjectShellFromV5(
  project: LoadedProjectV5,
  world: WorldScriptStateV5,
): LoadedProject {
  return {
    ...project,
    manifest: project.manifest as unknown as LoadedProject['manifest'],
    entryScene: legacySceneFromV5(project.entryScene, world),
    items: legacyItemsFromV5(project.items),
    scriptIndex: undefined,
    scriptStore: undefined,
  } as LoadedProject
}

/** 把 canonical 嵌套世界态投影成当前场景宿主可消费的平面 scratch；绝不用于保存。 */
export function legacyWorldScriptScratchV5(
  world: WorldScriptStateV5,
  sceneId: string,
): WorldScriptState {
  return {
    flags: structuredClone(world.flags),
    vars: structuredClone(world.vars),
    entityState: structuredClone(world.entityState[sceneId] ?? {}),
    entityStage: {},
    ...(world.entityPos?.[sceneId] ? { entityPos: structuredClone(world.entityPos[sceneId]) } : {}),
    ...(world.entityLayer?.[sceneId]
      ? { entityLayer: structuredClone(world.entityLayer[sceneId]) }
      : {}),
    ...(world.followers ? { followers: [...world.followers] } : {}),
    ...(world.mapOverride ? { mapOverride: structuredClone(world.mapOverride) } : {}),
  }
}

export function isV5RuntimeScriptRef(ref: ScriptRef): boolean {
  return ref.chunk === V5_SCRIPT_CHUNK
}
