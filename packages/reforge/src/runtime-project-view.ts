import type {
  BaseSceneEntryPresentation,
  BaseSceneEntity,
  EntityDef,
  BaseSceneEntityDef,
  EntityPage,
  ItemData,
  ItemDataMap,
  AuthorItemCoreMap,
  SceneDef,
  BaseSceneDef,
  BaseScriptFlow,
  ScriptRef,
  ScriptStage,
  ProjectedWorldScriptState,
  WorldScriptState,
} from '@type-pal/content'
import type { LoadedCurrentProject } from './project-loader.js'
import {
  resolveEntityBehavior,
  resolveBaseEntityPage,
  resolveEntityTriggerActivation,
  resolveSceneHook,
} from './script-world.js'

const AUTHOR_RUNTIME_SCRIPT_CHUNK = '__author-script-runtime'

/** 当前 canonical 工程供尚未改写的渲染/菜单宿主消费的只读投影。 */
export interface RuntimeProjectView
  extends Omit<LoadedCurrentProject, 'entryScene' | 'items'> {
  entryScene: SceneDef
  items: ItemDataMap
  scriptStore?: undefined
}

function emptyProjectedStages(): ScriptStage[] {
  return [{ body: [] }]
}

function scriptRef(id: string): ScriptRef {
  return { chunk: AUTHOR_RUNTIME_SCRIPT_CHUNK, id }
}

export function runtimeScriptRef(id: string): ScriptRef {
  return scriptRef(id)
}

function projectRuntimeItem(item: AuthorItemCoreMap[string]): ItemData {
  const convertEffects = (
    effects: NonNullable<AuthorItemCoreMap[string]['use']>['effects'],
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
          throw: structuredClone(item.throw),
        }
      : {}),
  } as ItemData
}

export function projectItemsView(items: AuthorItemCoreMap): ItemDataMap {
  return Object.fromEntries(Object.entries(items).map(([id, item]) => [id, projectRuntimeItem(item)]))
}

function entryAtCursor(
  flow: BaseScriptFlow,
  cursor: ReturnType<typeof resolveSceneHook> extends infer _Resolved
    ? import('@type-pal/content').FlowCursor
    : never,
): BaseSceneEntryPresentation | undefined {
  if (flow.kind === 'stages') {
    if (cursor.kind !== 'stage') return
    return flow.stages.find((stage) => stage.id === cursor.stage)?.entry
  }
  if (cursor.kind !== 'state' || cursor.machine !== flow.machine.id) return
  return flow.machine.states[cursor.state]?.entry
}

function projectRuntimeHookBinding(
  scene: BaseSceneDef,
  world: WorldScriptState,
  slot: 'onEnter' | 'onTeleport',
): ScriptStage[] | undefined {
  const resolved = resolveSceneHook(scene, world, slot)
  if (!resolved) return
  const entry = entryAtCursor(resolved.hook.flow, resolved.cursor)
  return [
    {
      ...(entry ? { entry: { prepare: [], reveal: structuredClone(entry.reveal) } } : {}),
      body: [],
    },
  ]
}

function projectRuntimePage(
  sceneId: string,
  entity: BaseSceneEntity,
  world: WorldScriptState,
): EntityPage | undefined {
  const target = { scene: sceneId, entity: entity.id }
  const page = resolveBaseEntityPage(entity, world.behaviors.entities?.[sceneId]?.[entity.id])
  const trigger = resolveEntityBehavior(entity, world, target, 'trigger')
  const auto = resolveEntityBehavior(entity, world, target, 'auto')
  const activation = resolveEntityTriggerActivation(entity, world, target)
  if (!page && !trigger && !auto) return
  return {
    ...(trigger && activation
      ? {
          trigger: {
            ...structuredClone(activation),
            stages: emptyProjectedStages(),
          },
        }
      : {}),
    ...(auto ? { auto: { stages: emptyProjectedStages() } } : {}),
    ...(page?.animation ? { animation: structuredClone(page.animation) } : {}),
  }
}

function projectRuntimeEntity(sceneId: string, entity: BaseSceneEntityDef, world: WorldScriptState): EntityDef {
  const {
    behaviors: _behaviors,
    initialPage: _initialPage,
    pages: _pages,
    ...base
  } = structuredClone(entity)
  const page = projectRuntimePage(sceneId, entity, world)
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

export function baseSceneView(scene: BaseSceneDef, world: WorldScriptState): SceneDef {
  const { hooks: _hooks, entities: _entities, ...base } = structuredClone(scene)
  const onEnter = projectRuntimeHookBinding(scene, world, 'onEnter')
  const onTeleport = projectRuntimeHookBinding(scene, world, 'onTeleport')
  return {
    ...base,
    entities: scene.entities.map((entity) => projectRuntimeEntity(scene.id, entity, world)),
    ...(onEnter ? { onEnter } : {}),
    ...(onTeleport ? { onTeleport } : {}),
  }
}

/** 只刷新行为页投影，保留场景活体的走位、显隐、朝向和碰撞变化。 */
export function refreshSceneViewBindings(
  target: SceneDef,
  canonical: BaseSceneDef,
  world: WorldScriptState,
): void {
  const definitions = new Map(canonical.entities.map((entity) => [entity.id, entity]))
  for (const entity of target.entities) {
    const definition = definitions.get(entity.id)
    if (!definition) continue
    const page = projectRuntimePage(canonical.id, definition, world)
    if (page) entity.pages = [page]
    else delete entity.pages
  }
  const onEnter = projectRuntimeHookBinding(canonical, world, 'onEnter')
  const onTeleport = projectRuntimeHookBinding(canonical, world, 'onTeleport')
  if (onEnter) target.onEnter = onEnter as SceneDef['onEnter']
  else delete target.onEnter
  if (onTeleport) target.onTeleport = onTeleport as SceneDef['onTeleport']
  else delete target.onTeleport
}

/** 当前运行时 scene 到渲染 scene 的显式只读投影。 */
export function runtimeSceneView(
  scene: import('@type-pal/content').RuntimeSceneDef,
  world: WorldScriptState,
): SceneDef {
  return baseSceneView(
    scene as unknown as BaseSceneDef,
    world,
  )
}

export function runtimeProjectView(
  project: LoadedCurrentProject,
  world: WorldScriptState,
): RuntimeProjectView {
  return {
    ...project,
    entryScene: runtimeSceneView(project.entryScene, world),
    items: projectItemsView(project.items),
    scriptStore: undefined,
  }
}

/** 把 canonical 嵌套世界态投影成当前场景宿主可消费的平面 scratch；绝不用于保存。 */
export function projectedWorldScriptScratch(
  world: WorldScriptState,
  sceneId: string,
): ProjectedWorldScriptState {
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

export function isRuntimeScriptRef(ref: ScriptRef): boolean {
  return ref.chunk === AUTHOR_RUNTIME_SCRIPT_CHUNK
}
