import type { SceneDef } from './index.js'
import type { ItemData } from './item.js'
import type { ItemDataV5, ItemUseEffectV5 } from './item-v5.js'
import type { SceneDefV5 } from './scene-v5.js'
import type { Command, ScriptCondition, ScriptStage } from './script.js'
import type { ScriptChunkV1, ScriptIndexV1, ScriptRef } from './script-library.js'
import type {
  CanonicalScriptOwnerV5,
  LegacyBindingAliasV1,
  LegacyCursorAliasV1,
  LegacyCursorTargetV1,
  LegacyEntityAliasV1,
  LegacyPageLineagePlanV1,
  LegacyStageLineagePlanV1,
  ProjectLocalAllocationV1,
} from './script-transition-v5.js'
import type {
  AuthorCommandV5,
  AuthorConditionV5,
  EntityAddress,
  NamedEntityBehaviorV5,
  NamedSceneHookV5,
  ScriptFlowV5,
  SharedScriptLibraryV5,
} from './script-v5.js'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export type ProjectScriptV4V5ResolutionKind =
  | 'name-pages'
  | 'name-stages'
  | 'select-entity-address'
  | 'resolve-legacy-entity-alias'
  | 'resolve-legacy-cursor-alias'
  | 'structure-control-flow'
  | 'replace-dynamic-binding'

export interface ProjectScriptV4V5NamingSlot {
  index: number
  suggestedId: string
  hasTrigger?: boolean
  hasAuto?: boolean
}

export interface ProjectScriptV4V5Issue {
  path: string
  owner: string
  message: string
  resolution: ProjectScriptV4V5ResolutionKind
  candidates?: string[]
  slots?: ProjectScriptV4V5NamingSlot[]
}

export interface ProjectScriptV4V5MigrationReport {
  version: 1
  projectId: string
  /** open-local 在任何写入前补入的原始受管字节 inventory digest。 */
  inputDigest?: string
  issues: ProjectScriptV4V5Issue[]
}

export type ProjectScriptV4V5Resolution =
  | {
      kind: 'name-pages'
      path: string
      initialPageId: string
      pages: Array<{
        pageId: string
        label: string
        triggerBehaviorId?: string
        triggerLabel?: string
        autoBehaviorId?: string
        autoLabel?: string
      }>
    }
  | {
      kind: 'name-stages'
      path: string
      stages: Array<{ stageId: string }>
    }
  | {
      kind: 'select-entity-address'
      path: string
      target: EntityAddress
    }
  | {
      kind: 'resolve-legacy-entity-alias'
      path: string
      mode: 'broadcast-v4' | 'single'
      target?: EntityAddress
    }
  | {
      kind: 'resolve-legacy-cursor-alias'
      path: string
      mode: 'broadcast-v4' | 'single'
      targetKey?: string
    }
  | {
      kind: 'replace-dynamic-binding'
      path: string
      id: string
      label: string
    }

export interface ProjectScriptV4V5ResolutionPlan {
  inputDigest: string
  resolutions: ProjectScriptV4V5Resolution[]
}

export class ProjectScriptV4V5UpgradeError extends Error {
  constructor(readonly report: ProjectScriptV4V5MigrationReport) {
    const first = report.issues[0]
    super(
      first
        ? `contentVersion 4 -> 5 需要作者确认：${first.path}：${first.message}（${first.resolution}）`
        : 'contentVersion 4 -> 5 需要作者确认',
    )
    this.name = 'ProjectScriptV4V5UpgradeError'
  }
}

export interface ProjectScriptV4V5Projection {
  scenes: SceneDefV5[]
  items: ItemDataV5[]
  sharedScripts: SharedScriptLibraryV5
  legacyEntities: LegacyEntityAliasV1[]
  legacyCursors: LegacyCursorAliasV1[]
  lineagePlans: {
    pages: LegacyPageLineagePlanV1[]
    stages: LegacyStageLineagePlanV1[]
  }
  localAllocations: ProjectLocalAllocationV1[]
  legacyBindingSources: Array<{
    sceneId: string
    hook: 'onEnter' | 'onTeleport'
    binding: unknown
    target: LegacyBindingAliasV1['target']
  }>
}

interface ProjectionContext {
  projectId: string
  entityScenes: ReadonlyMap<string, readonly string[]>
  scriptBodies: ReadonlyMap<string, Command[]>
  sharedScriptIds: ReadonlySet<string>
  consumedBodies: Set<string>
  expansionStack: Set<string>
  owner: string
  ownerScene?: string
  resolutions: ReadonlyMap<string, ProjectScriptV4V5Resolution>
  consumedResolutions: Set<string>
  sceneIds: ReadonlySet<string>
  dynamicEntityBehaviors: Map<
    string,
    {
      target: EntityAddress
      channel: 'trigger' | 'auto'
      behaviorId: string
      behavior: NamedEntityBehaviorV5
    }
  >
  dynamicSceneHooks: Map<
    string,
    {
      sceneId: string
      hook: 'onEnter' | 'onTeleport'
      hookId: string
      hookValue: NamedSceneHookV5
      binding: unknown
      stageIds: string[]
    }
  >
}

const ENTITY_TARGET_KINDS = new Set([
  'animEntity',
  'mountParty',
  'moveEntity',
  'nudgeEntity',
  'playEntityAction',
  'ride',
  'setEntityFacing',
  'setEntityFrame',
  'setEntityLayer',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityState',
  'stepEntity',
  'stopEntityAction',
  'takeEntity',
])

function dynamicEntityBehaviorKey(
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  behaviorId: string,
): string {
  return `${target.scene}\u0000${target.entity}\u0000${channel}\u0000${behaviorId}`
}

function dynamicSceneHookKey(
  sceneId: string,
  hook: 'onEnter' | 'onTeleport',
  hookId: string,
): string {
  return `${sceneId}\u0000${hook}\u0000${hookId}`
}

function fail(
  context: ProjectionContext,
  path: string,
  message: string,
  resolution: ProjectScriptV4V5ResolutionKind,
  candidates?: string[],
  slots?: ProjectScriptV4V5NamingSlot[],
): never {
  throw new ProjectScriptV4V5UpgradeError({
    version: 1,
    projectId: context.projectId,
    issues: [
      {
        path,
        owner: context.owner,
        message,
        resolution,
        ...(candidates ? { candidates } : {}),
        ...(slots ? { slots } : {}),
      },
    ],
  })
}

function resolutionAt<K extends ProjectScriptV4V5Resolution['kind']>(
  context: ProjectionContext,
  path: string,
  kind: K,
): Extract<ProjectScriptV4V5Resolution, { kind: K }> | undefined {
  const resolution = context.resolutions.get(path)
  if (!resolution) return
  if (resolution.kind !== kind)
    fail(context, path, `resolution kind 期望 ${kind}，收到 ${resolution.kind}`, kind)
  context.consumedResolutions.add(path)
  return resolution as Extract<ProjectScriptV4V5Resolution, { kind: K }>
}

function nonEmptyUnique(values: readonly string[], path: string): void {
  const normalized = values.map((value) => value.trim())
  if (normalized.some((value) => value.length === 0)) throw new Error(`${path}: id/名称不得为空`)
  if (new Set(normalized).size !== normalized.length) throw new Error(`${path}: id 不得重复`)
}

function address(context: ProjectionContext, entity: unknown, path: string): EntityAddress {
  if (typeof entity !== 'string' || entity.length === 0)
    fail(context, path, '旧实体引用不是非空字符串', 'select-entity-address')
  const scenes = context.entityScenes.get(entity) ?? []
  if (context.ownerScene && scenes.includes(context.ownerScene))
    return { scene: context.ownerScene, entity }
  if (scenes.length === 1) {
    const scene = scenes[0]
    if (scene) return { scene, entity }
  }
  if (scenes.length === 0) fail(context, path, `实体 ${entity} 不存在`, 'select-entity-address')
  const selected = resolutionAt(context, path, 'select-entity-address')
  if (selected) {
    if (selected.target.entity !== entity || !scenes.includes(selected.target.scene))
      fail(
        context,
        path,
        `选择 ${selected.target.scene}/${selected.target.entity} 不在候选地址中`,
        'select-entity-address',
        scenes.map((scene) => `${scene}/${entity}`),
      )
    return clone(selected.target)
  }
  fail(
    context,
    path,
    `实体 ${entity} 同时存在于多个场景，无法猜测目标`,
    'select-entity-address',
    scenes.map((scene) => `${scene}/${entity}`),
  )
}

function projectCondition(
  condition: ScriptCondition,
  context: ProjectionContext,
  path: string,
): AuthorConditionV5 {
  if (condition.kind === 'entityState')
    return {
      kind: 'entityState',
      target: address(context, condition.entity, `${path}.entity`),
      is: condition.is,
    }
  if (condition.kind === 'entityInScene')
    return {
      kind: 'entityInScene',
      target: address(context, condition.entity, `${path}.entity`),
    }
  if (condition.kind === 'facingEntity')
    return {
      kind: 'facingEntity',
      target: address(context, condition.entity, `${path}.entity`),
      ...(condition.range === undefined ? {} : { range: condition.range }),
    }
  if (condition.kind === 'all' || condition.kind === 'any')
    return {
      kind: condition.kind,
      of: condition.of.map((child, index) =>
        projectCondition(child, context, `${path}.of[${index}]`),
      ),
    }
  if (condition.kind === 'not')
    return { kind: 'not', cond: projectCondition(condition.cond, context, `${path}.cond`) }
  return clone(condition)
}

function projectScriptRef(
  ref: ScriptRef,
  context: ProjectionContext,
  path: string,
  tailTransfer: boolean,
): AuthorCommandV5[] {
  const body = context.scriptBodies.get(ref.id)
  if (!body) fail(context, path, `脚本 ${ref.id} 不存在`, 'structure-control-flow')
  context.consumedBodies.add(ref.id)
  if (!tailTransfer && context.sharedScriptIds.has(ref.id))
    return [{ kind: 'callScript', script: ref.id }]
  if (context.expansionStack.has(ref.id))
    fail(context, path, `脚本 ${ref.id} 形成递归/循环`, 'structure-control-flow')
  context.expansionStack.add(ref.id)
  try {
    const projected = projectCommands(body, context, `${path}<${ref.id}>`)
    return tailTransfer ? [...projected, { kind: 'stopScript' }] : projected
  } finally {
    context.expansionStack.delete(ref.id)
  }
}

function projectRuntimeBinding(
  binding: { stages: ScriptStage[]; script?: never } | { script: ScriptRef; stages?: never },
  context: ProjectionContext,
  path: string,
): { flow: ScriptFlowV5; stageIds: string[]; legacyBinding: unknown } {
  if (binding.stages) {
    const projected = projectStages(binding.stages, context, `${path}.stages`)
    return {
      ...projected,
      legacyBinding: clone(binding.stages),
    }
  }
  if (!binding.script)
    fail(context, path, '动态绑定既无 stages 也无 script', 'replace-dynamic-binding')
  return {
    flow: {
      kind: 'stages',
      initial: 'main',
      stages: [
        {
          id: 'main',
          body: projectScriptRef(binding.script, context, `${path}.script`, false),
        },
      ],
    },
    stageIds: ['main'],
    legacyBinding: clone(binding.script),
  }
}

function dynamicBindingResolution(
  context: ProjectionContext,
  path: string,
  description: string,
): Extract<ProjectScriptV4V5Resolution, { kind: 'replace-dynamic-binding' }> {
  const resolution = resolutionAt(context, path, 'replace-dynamic-binding')
  if (!resolution)
    fail(context, path, `${description} 需要作者命名 canonical 行为`, 'replace-dynamic-binding')
  if (!resolution.id.trim() || !resolution.label.trim())
    fail(context, path, `${description} 的 canonical id/名称不得为空`, 'replace-dynamic-binding')
  return { ...resolution, id: resolution.id.trim(), label: resolution.label.trim() }
}

function addDynamicEntityBehavior(
  context: ProjectionContext,
  path: string,
  target: EntityAddress,
  channel: 'trigger' | 'auto',
  binding: { stages: ScriptStage[]; script?: never } | { script: ScriptRef; stages?: never },
): string {
  const resolution = dynamicBindingResolution(
    context,
    path,
    `${target.scene}/${target.entity} 的 ${channel} 动态绑定`,
  )
  const projected = projectRuntimeBinding(
    binding,
    {
      ...context,
      owner: `entity:${target.scene}/${target.entity}:${channel}:${resolution.id}`,
      ownerScene: target.scene,
    },
    path,
  )
  const key = dynamicEntityBehaviorKey(target, channel, resolution.id)
  const previous = context.dynamicEntityBehaviors.get(key)
  const value = {
    target: clone(target),
    channel,
    behaviorId: resolution.id,
    behavior: {
      label: resolution.label,
      order: previous?.behavior.order ?? 1_000 + context.dynamicEntityBehaviors.size,
      flow: projected.flow,
    },
  }
  if (previous && JSON.stringify(previous) !== JSON.stringify(value))
    fail(context, path, `BehaviorId ${resolution.id} 已分配给不同正文`, 'replace-dynamic-binding')
  context.dynamicEntityBehaviors.set(key, previous ?? value)
  return resolution.id
}

function addDynamicSceneHook(
  context: ProjectionContext,
  path: string,
  sceneId: string,
  hook: 'onEnter' | 'onTeleport',
  binding: { stages: ScriptStage[]; script?: never } | { script: ScriptRef; stages?: never },
): string {
  if (!context.sceneIds.has(sceneId))
    fail(context, path, `场景 ${sceneId} 不存在`, 'replace-dynamic-binding')
  const resolution = dynamicBindingResolution(context, path, `${sceneId}.${hook} 动态绑定`)
  const projected = projectRuntimeBinding(
    binding,
    {
      ...context,
      owner: `scene:${sceneId}:${hook}:${resolution.id}`,
      ownerScene: sceneId,
    },
    path,
  )
  const key = dynamicSceneHookKey(sceneId, hook, resolution.id)
  const previous = context.dynamicSceneHooks.get(key)
  const value = {
    sceneId,
    hook,
    hookId: resolution.id,
    hookValue: {
      label: resolution.label,
      order: previous?.hookValue.order ?? 1_000 + context.dynamicSceneHooks.size,
      flow: projected.flow,
    },
    binding: projected.legacyBinding,
    stageIds: projected.stageIds,
  }
  if (previous && JSON.stringify(previous) !== JSON.stringify(value))
    fail(context, path, `HookId ${resolution.id} 已分配给不同正文`, 'replace-dynamic-binding')
  context.dynamicSceneHooks.set(key, previous ?? value)
  return resolution.id
}

function projectCommands(
  commands: readonly Command[],
  context: ProjectionContext,
  path: string,
): AuthorCommandV5[] {
  return commands.flatMap((source, index): AuthorCommandV5[] => {
    const commandPath = `${path}[${index}]`
    const command = source as Command & Record<string, unknown>
    if (source.kind === 'setEntityAuto' || source.kind === 'setEntityTrigger') {
      const channel = source.kind === 'setEntityAuto' ? 'auto' : 'trigger'
      const target = address(context, source.entity, `${commandPath}.entity`)
      const binding =
        source.stages === undefined ? { script: source.script } : { stages: source.stages }
      const behaviorId = addDynamicEntityBehavior(context, commandPath, target, channel, binding)
      return [
        {
          kind: 'selectEntityBehavior',
          target,
          channel,
          selection: { kind: 'use', value: behaviorId },
        },
      ]
    }
    if (source.kind === 'setEntityTriggerMode') {
      const target = address(context, source.entity, `${commandPath}.entity`)
      return [
        {
          kind: 'setEntityTriggerActivation',
          target,
          selection:
            source.on === undefined
              ? { kind: 'disabled' }
              : {
                  kind: 'use',
                  value: {
                    on: source.on,
                    ...(source.range === undefined ? {} : { range: source.range }),
                  },
                },
        },
      ]
    }
    if (source.kind === 'setSceneOnEnter' || source.kind === 'setSceneOnTeleport') {
      const hook = source.kind === 'setSceneOnEnter' ? 'onEnter' : 'onTeleport'
      const binding =
        source.stages === undefined ? { script: source.script } : { stages: source.stages }
      const hookId = addDynamicSceneHook(context, commandPath, source.scene, hook, binding)
      return [
        {
          kind: 'selectSceneHooks',
          scene: source.scene,
          selection: { [hook]: { kind: 'use', value: hookId } },
        },
      ]
    }
    if (source.kind === 'clearSceneScripts') {
      if (!context.sceneIds.has(source.scene))
        fail(context, commandPath, `场景 ${source.scene} 不存在`, 'replace-dynamic-binding')
      return [
        {
          kind: 'selectSceneHooks',
          scene: source.scene,
          selection: {
            onEnter: { kind: 'disabled' },
            onTeleport: { kind: 'disabled' },
          },
        },
      ]
    }
    if (command.kind === 'callScript') {
      if (command.self !== undefined && !context.sharedScriptIds.has(command.ref.id))
        fail(
          context,
          `${commandPath}.self`,
          '带 self 的内部脚本调用不能安全内联',
          'structure-control-flow',
        )
      if (context.sharedScriptIds.has(command.ref.id))
        return [
          {
            kind: 'callScript',
            script: command.ref.id,
            ...(command.self === undefined
              ? {}
              : { self: address(context, command.self, `${commandPath}.self`) }),
          },
        ]
      return projectScriptRef(command.ref, context, `${commandPath}.ref`, false)
    }
    if (command.kind === 'jumpScript') {
      if (command.self !== undefined)
        fail(
          context,
          `${commandPath}.self`,
          '带 self 的尾转移不能安全内联',
          'structure-control-flow',
        )
      return projectScriptRef(command.ref, context, `${commandPath}.ref`, true)
    }
    if (command.kind === 'branch')
      return [
        {
          kind: 'branch',
          cond: projectCondition(command.cond, context, `${commandPath}.cond`),
          then: projectCommands(command.then, context, `${commandPath}.then`),
          ...(command.else === undefined
            ? {}
            : { else: projectCommands(command.else, context, `${commandPath}.else`) }),
        },
      ]
    if (command.kind === 'startBattle')
      return [
        {
          ...clone(command),
          ...(command.onLose === undefined
            ? {}
            : { onLose: projectCommands(command.onLose, context, `${commandPath}.onLose`) }),
          ...(command.onFlee === undefined
            ? {}
            : { onFlee: projectCommands(command.onFlee, context, `${commandPath}.onFlee`) }),
        } as Extract<AuthorCommandV5, { kind: 'startBattle' }>,
      ]
    if (command.kind === 'teleportOut')
      return [
        {
          kind: 'teleportOut',
          ...(command.onFail === undefined
            ? {}
            : { onFail: projectCommands(command.onFail, context, `${commandPath}.onFail`) }),
        },
      ]
    if (command.kind === 'confirm')
      return [
        {
          kind: 'confirm',
          onNo: projectCommands(command.onNo, context, `${commandPath}.onNo`),
        },
      ]
    if (command.kind === 'setMultiEntityState')
      return [
        {
          kind: 'setMultiEntityState',
          targets: command.entities.map((entity, entityIndex) =>
            address(context, entity, `${commandPath}.entities[${entityIndex}]`),
          ),
          state: command.state,
        },
      ]
    if (command.kind === 'vanishEntity' || command.kind === 'releaseEntity') {
      const { entity, ...rest } = command
      return [
        {
          ...clone(rest),
          ...(entity === undefined
            ? {}
            : { target: address(context, entity, `${commandPath}.entity`) }),
        } as AuthorCommandV5,
      ]
    }
    if (ENTITY_TARGET_KINDS.has(command.kind)) {
      const entity = command.entity
      const { entity: _entity, ...rest } = command
      return [
        {
          ...clone(rest),
          target: address(context, entity, `${commandPath}.entity`),
        } as AuthorCommandV5,
      ]
    }
    return [clone(command) as AuthorCommandV5]
  })
}

function projectStages(
  stages: readonly ScriptStage[],
  context: ProjectionContext,
  path: string,
): { flow: ScriptFlowV5; stageIds: string[] } {
  if (stages.length === 0) fail(context, path, '旧 flow 不含 stage', 'name-stages')
  const resolution = stages.length === 1 ? undefined : resolutionAt(context, path, 'name-stages')
  if (stages.length > 1 && !resolution)
    fail(
      context,
      path,
      `旧 flow 含 ${stages.length} 个 stage；v5 稳定 StageId 需要作者命名`,
      'name-stages',
      undefined,
      stages.map((_, index) => ({ index, suggestedId: `stage-${index + 1}` })),
    )
  if (resolution && resolution.stages.length !== stages.length)
    fail(
      context,
      path,
      `stage 命名数量 ${resolution.stages.length} 与旧 stage 数量 ${stages.length} 不一致`,
      'name-stages',
      undefined,
      stages.map((_, index) => ({ index, suggestedId: `stage-${index + 1}` })),
    )
  const stageIds =
    resolution?.stages.map((entry) => entry.stageId.trim()) ??
    stages.map((_, index) => (index === 0 ? 'main' : `stage-${index + 1}`))
  try {
    nonEmptyUnique(stageIds, path)
  } catch (error) {
    fail(
      context,
      path,
      error instanceof Error ? error.message : String(error),
      'name-stages',
      undefined,
      stages.map((_, index) => ({ index, suggestedId: `stage-${index + 1}` })),
    )
  }
  const initial = stageIds[0]
  if (!initial) fail(context, path, '旧 flow 不含可用 StageId', 'name-stages')
  return {
    flow: {
      kind: 'stages',
      initial,
      stages: stages.map((stage, index) => {
        const stageId = stageIds[index]
        if (!stageId) fail(context, path, `Stage ${index + 1} 缺稳定 id`, 'name-stages')
        const entry = stage.entry
          ? {
              prepare: projectCommands(
                stage.entry.prepare,
                context,
                `${path}[${index}].entry.prepare`,
              ),
              reveal: clone(stage.entry.reveal),
            }
          : undefined
        const rawNext = stage.next
        const next =
          rawNext === undefined
            ? undefined
            : rawNext === 'advance'
              ? stageIds[Math.min(index + 1, stageIds.length - 1)]
              : stageIds[Math.max(0, Math.min(rawNext, stageIds.length - 1))]
        return {
          id: stageId,
          ...(entry === undefined ? {} : { entry }),
          body: projectCommands(stage.body, context, `${path}[${index}].body`),
          ...(next === undefined ? {} : { next }),
        }
      }),
    },
    stageIds,
  }
}

function scriptBodies(chunks: Readonly<Record<string, ScriptChunkV1>>): Map<string, Command[]> {
  const result = new Map<string, Command[]>()
  for (const chunk of Object.values(chunks))
    for (const [id, body] of Object.entries(chunk.scripts)) {
      if (result.has(id)) throw new Error(`contentVersion 4 脚本 id 重复：${id}`)
      result.set(id, body)
    }
  return result
}

function projectItemEffects(
  effects: ItemData['use'] extends infer _ ? NonNullable<ItemData['use']>['effects'] : never,
  itemId: string,
  slot: 'use',
  context: ProjectionContext,
): ItemUseEffectV5[] {
  const privateCount = effects.filter(
    (effect) => effect.kind === 'runScript' && !context.sharedScriptIds.has(effect.script.id),
  ).length
  if (privateCount > 1)
    fail(
      { ...context, owner: `item:${itemId}` },
      `content/items.json#/${itemId}/${slot}/effects`,
      '一个物品槽含多个内部脚本，无法都分配为唯一 item-private use 脚本',
      'structure-control-flow',
    )
  return effects.map((effect, index) => {
    if (effect.kind !== 'runScript') return clone(effect)
    if (context.sharedScriptIds.has(effect.script.id))
      return { kind: 'runScript', script: effect.script.id }
    const body = context.scriptBodies.get(effect.script.id)
    if (!body)
      fail(
        { ...context, owner: `item:${itemId}` },
        `content/items.json#/${itemId}/${slot}/effects/${index}`,
        `脚本 ${effect.script.id} 不存在`,
        'structure-control-flow',
      )
    context.consumedBodies.add(effect.script.id)
    return {
      kind: 'itemPrivateScript',
      script: {
        id: 'use',
        label: `${itemId} 私有脚本`,
        body: projectCommands(
          body,
          { ...context, owner: `item:${itemId}`, ownerScene: undefined },
          `content/items.json#/${itemId}/${slot}/effects/${index}/script`,
        ),
      },
    }
  })
}

/**
 * 任意作者工程的浏览器安全 v4 -> v5 纯投影核。
 *
 * 只自动处理能从旧内容唯一证明的单页/单段结构；需要作者命名或选择地址的输入以结构化
 * report fail-loud，调用方必须在零写状态下进入迁移工作台。
 */
export function projectLocalScriptV4ToV5(args: {
  projectId: string
  scenes: readonly SceneDef[]
  items: readonly ItemData[]
  scriptIndex?: ScriptIndexV1
  scriptChunks: Readonly<Record<string, ScriptChunkV1>>
  resolutions?: readonly ProjectScriptV4V5Resolution[]
}): ProjectScriptV4V5Projection {
  const bodies = scriptBodies(args.scriptChunks)
  const sharedIds = new Set(Object.keys(args.scriptIndex?.library ?? {}))
  const entityScenesMutable = new Map<string, string[]>()
  for (const scene of args.scenes)
    for (const entity of scene.entities) {
      const scenes = entityScenesMutable.get(entity.id) ?? []
      scenes.push(scene.id)
      entityScenesMutable.set(entity.id, scenes)
    }
  for (const scenes of entityScenesMutable.values()) scenes.sort()
  const entityScenes = new Map(
    [...entityScenesMutable].map(([id, scenes]) => [id, scenes as readonly string[]]),
  )
  const resolutions = new Map<string, ProjectScriptV4V5Resolution>()
  for (const resolution of args.resolutions ?? []) {
    if (!resolution.path.trim()) throw new Error('v4 -> v5 resolution.path 不得为空')
    if (resolutions.has(resolution.path))
      throw new Error(`v4 -> v5 resolution.path 重复：${resolution.path}`)
    resolutions.set(resolution.path, clone(resolution))
  }
  const baseContext: ProjectionContext = {
    projectId: args.projectId,
    entityScenes,
    scriptBodies: bodies,
    sharedScriptIds: sharedIds,
    consumedBodies: new Set(),
    expansionStack: new Set(),
    owner: 'project',
    resolutions,
    consumedResolutions: new Set(),
    sceneIds: new Set(args.scenes.map((scene) => scene.id)),
    dynamicEntityBehaviors: new Map(),
    dynamicSceneHooks: new Map(),
  }

  const legacyCursorsByKey = new Map<string, LegacyCursorTargetV1[]>()
  const pageLineages: LegacyPageLineagePlanV1[] = []
  const stageLineages: LegacyStageLineagePlanV1[] = []
  const localAllocations: ProjectLocalAllocationV1[] = []
  const legacyStageFlow = (
    flow:
      | {
          kind: 'legacy-entity-flow'
          sceneId: string
          entityId: string
          pageIndex: number
          channel: 'trigger' | 'auto'
        }
      | {
          kind: 'legacy-scene-hook'
          sceneId: string
          hook: 'onEnter' | 'onTeleport'
        },
    stageIds: readonly string[],
  ): void => {
    const source = { kind: 'legacy' as const, flow }
    stageLineages.push({
      flow: source,
      entries: stageIds.map((_, index) => ({
        oursStageIndex: index,
        lineage: { kind: 'baseline' as const, baselineStageIndex: index },
      })),
    })
    for (const [index, stageId] of stageIds.entries())
      localAllocations.push({
        kind: 'stage',
        flow: source,
        oursStageIndex: index,
        stageId,
      })
  }
  const addCursor = (
    legacyKey: string,
    target: CanonicalScriptOwnerV5,
    stageIds: readonly string[],
  ): void => {
    const values = legacyCursorsByKey.get(legacyKey) ?? []
    values.push({
      legacyStageCount: stageIds.length,
      target,
      indices: stageIds.map((stage, index) => ({
        index,
        cursor: { kind: 'stage', stage },
      })),
    })
    legacyCursorsByKey.set(legacyKey, values)
  }

  const scenes = args.scenes.map((scene): SceneDefV5 => {
    const sceneContext = { ...baseContext, owner: `scene:${scene.id}`, ownerScene: scene.id }
    const hooks: NonNullable<SceneDefV5['hooks']> = {}
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      const stages = scene[slot]
      if (!stages) continue
      const hook = slot === 'onEnter' ? 'onEnter' : 'onTeleport'
      const target: CanonicalScriptOwnerV5 = {
        kind: 'scene-hook',
        sceneId: scene.id,
        hook,
        hookId: 'default',
      }
      const projected = projectStages(
        stages,
        sceneContext,
        `content/scenes/${scene.id}.json#/${slot}`,
      )
      hooks[slot] = {
        initial: 'default',
        variants: {
          default: {
            label: slot === 'onEnter' ? '默认进场' : '默认传送出口',
            order: 0,
            flow: projected.flow,
          },
        },
      }
      addCursor(
        slot === 'onEnter' ? `s:${scene.id}` : `teleport:${scene.id}`,
        target,
        projected.stageIds,
      )
      legacyStageFlow({ kind: 'legacy-scene-hook', sceneId: scene.id, hook }, projected.stageIds)
    }
    const entities = scene.entities.map((entity) => {
      const pages = entity.pages ?? []
      const entityContext = {
        ...sceneContext,
        owner: `entity:${scene.id}/${entity.id}`,
      }
      const pagePath = `content/scenes/${scene.id}.json#/entities/${entity.id}/pages`
      const pageResolution =
        pages.length > 1 ? resolutionAt(entityContext, pagePath, 'name-pages') : undefined
      const pageSlots = pages.map((page, index) => ({
        index,
        suggestedId: `page-${index + 1}`,
        ...(page.trigger ? { hasTrigger: true } : {}),
        ...(page.auto ? { hasAuto: true } : {}),
      }))
      if (pages.length > 1 && !pageResolution)
        fail(
          entityContext,
          pagePath,
          `旧实体含 ${pages.length} 个 page；请命名 Page/Behavior 并明确初始 Page，旧 state/when 不会被数组位置猜测`,
          'name-pages',
          undefined,
          pageSlots,
        )
      if (pageResolution && pageResolution.pages.length !== pages.length)
        fail(
          entityContext,
          pagePath,
          `Page 命名数量 ${pageResolution.pages.length} 与旧 Page 数量 ${pages.length} 不一致`,
          'name-pages',
          undefined,
          pageSlots,
        )
      const pageNames =
        pageResolution?.pages.map((page) => ({
          ...page,
          pageId: page.pageId.trim(),
          label: page.label.trim(),
          ...(page.triggerBehaviorId === undefined
            ? {}
            : { triggerBehaviorId: page.triggerBehaviorId.trim() }),
          ...(page.triggerLabel === undefined ? {} : { triggerLabel: page.triggerLabel.trim() }),
          ...(page.autoBehaviorId === undefined
            ? {}
            : { autoBehaviorId: page.autoBehaviorId.trim() }),
          ...(page.autoLabel === undefined ? {} : { autoLabel: page.autoLabel.trim() }),
        })) ??
        pages.map((page) => ({
          pageId: 'default',
          label: '默认页面',
          ...(page.trigger ? { triggerBehaviorId: 'default', triggerLabel: '默认触发' } : {}),
          ...(page.auto ? { autoBehaviorId: 'default', autoLabel: '默认自动行为' } : {}),
        }))
      try {
        nonEmptyUnique(
          pageNames.map((page) => page.pageId),
          `${pagePath}.pageId`,
        )
        nonEmptyUnique(
          pageNames
            .filter((_, index) => pages[index]?.trigger)
            .map((page) => page.triggerBehaviorId ?? ''),
          `${pagePath}.triggerBehaviorId`,
        )
        nonEmptyUnique(
          pageNames
            .filter((_, index) => pages[index]?.auto)
            .map((page) => page.autoBehaviorId ?? ''),
          `${pagePath}.autoBehaviorId`,
        )
        if (pageNames.some((page) => page.label.length === 0))
          throw new Error(`${pagePath}.label: 名称不得为空`)
      } catch (error) {
        fail(
          entityContext,
          pagePath,
          error instanceof Error ? error.message : String(error),
          'name-pages',
          undefined,
          pageSlots,
        )
      }
      const initialPageId = pageResolution?.initialPageId.trim() ?? pageNames[0]?.pageId
      if (pages.length > 0 && !pageNames.some((page) => page.pageId === initialPageId))
        fail(
          entityContext,
          pagePath,
          `初始 Page ${String(initialPageId)} 不在已命名 Page 中`,
          'name-pages',
          pageNames.map((page) => page.pageId),
          pageSlots,
        )
      const behaviors: NonNullable<SceneDefV5['entities'][number]['behaviors']> = {}
      const projectedPages = pages.map((page, pageIndex) => {
        const names = pageNames[pageIndex]
        if (!names)
          fail(
            entityContext,
            pagePath,
            `Page ${pageIndex + 1} 缺命名`,
            'name-pages',
            undefined,
            pageSlots,
          )
        for (const channel of ['trigger', 'auto'] as const) {
          const binding = page[channel]
          if (!binding) continue
          const behaviorId = channel === 'trigger' ? names.triggerBehaviorId : names.autoBehaviorId
          const label = channel === 'trigger' ? names.triggerLabel : names.autoLabel
          if (!behaviorId || !label)
            fail(
              entityContext,
              pagePath,
              `Page ${pageIndex + 1} 的 ${channel} 缺 Behavior id/名称`,
              'name-pages',
              undefined,
              pageSlots,
            )
          const target: CanonicalScriptOwnerV5 = {
            kind: 'entity-behavior',
            sceneId: scene.id,
            entityId: entity.id,
            channel,
            behaviorId,
          }
          const stagePath = `${pagePath}/${pageIndex}/${channel}/stages`
          const projected = projectStages(
            binding.stages,
            { ...entityContext, owner: `${entityContext.owner}:${channel}:${behaviorId}` },
            stagePath,
          )
          const registry = behaviors[channel] ?? {}
          registry[behaviorId] = {
            label,
            order: pageIndex,
            flow: projected.flow,
          }
          behaviors[channel] = registry
          addCursor(
            channel === 'trigger' ? entity.id : `auto:${entity.id}`,
            target,
            projected.stageIds,
          )
          legacyStageFlow(
            {
              kind: 'legacy-entity-flow',
              sceneId: scene.id,
              entityId: entity.id,
              pageIndex,
              channel,
            },
            projected.stageIds,
          )
        }
        return {
          id: names.pageId,
          label: names.label,
          ...(page.trigger ? { trigger: names.triggerBehaviorId } : {}),
          ...(page.auto ? { auto: names.autoBehaviorId } : {}),
          ...(page.trigger
            ? {
                triggerActivation: {
                  on: page.trigger.on,
                  ...(page.trigger.range === undefined ? {} : { range: page.trigger.range }),
                },
              }
            : {}),
          ...(page.animation === undefined ? {} : { animation: clone(page.animation) }),
        }
      })
      if (pages.length > 0) {
        const owner = { scene: scene.id, entity: entity.id }
        pageLineages.push({
          owner,
          entries: pages.map((_, index) => ({
            oursPageIndex: index,
            lineage: { kind: 'baseline' as const, baselinePageIndex: index },
          })),
        })
        for (const [index, names] of pageNames.entries())
          localAllocations.push({
            kind: 'page',
            owner,
            oursPageIndex: index,
            pageId: names.pageId,
          })
      }
      const { pages: _pages, hostile, ...entityBase } = entity
      const projectedHostile =
        hostile?.onLose && hostile.onLose !== 'gameOver'
          ? {
              ...clone(hostile),
              onLose: projectCommands(
                hostile.onLose,
                { ...sceneContext, owner: `entity:${scene.id}/${entity.id}:hostile` },
                `content/scenes/${scene.id}.json#/entities/${entity.id}/hostile/onLose`,
              ),
            }
          : hostile === undefined
            ? undefined
            : clone(hostile)
      return {
        ...clone(entityBase),
        ...(projectedPages.length > 0
          ? {
              pages: projectedPages,
              initialPage: initialPageId,
            }
          : {}),
        ...(Object.keys(behaviors).length === 0 ? {} : { behaviors }),
        ...(projectedHostile === undefined ? {} : { hostile: projectedHostile }),
      } as SceneDefV5['entities'][number]
    })
    const { onEnter: _onEnter, onTeleport: _onTeleport, ...sceneBase } = scene
    return {
      ...clone(sceneBase),
      entities,
      ...(Object.keys(hooks).length === 0 ? {} : { hooks }),
    }
  })

  const sharedScripts: SharedScriptLibraryV5 = {}
  for (const [id, metadata] of Object.entries(args.scriptIndex?.library ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const body = bodies.get(id)
    if (!body)
      fail(
        baseContext,
        `content.scripts.library.${id}`,
        `作者共享脚本 ${id} 缺正文`,
        'structure-control-flow',
      )
    sharedScripts[id] = {
      name: metadata.name,
      ...(metadata.description === undefined ? {} : { description: metadata.description }),
      self: metadata.self,
      body: projectCommands(
        body,
        { ...baseContext, owner: `shared-script:${id}`, expansionStack: new Set([id]) },
        `shared-script:${id}`,
      ),
    }
    baseContext.consumedBodies.add(id)
  }

  const items = args.items.map((item): ItemDataV5 => {
    const { use, throw: thrown, ...base } = item
    return {
      ...clone(base),
      ...(use
        ? {
            use: {
              ...clone(use),
              effects: projectItemEffects(use.effects, item.id, 'use', baseContext),
            },
          }
        : {}),
      ...(thrown
        ? {
            throw: clone(thrown),
          }
        : {}),
    }
  })

  for (const entry of baseContext.dynamicEntityBehaviors.values()) {
    const scene = scenes.find((candidate) => candidate.id === entry.target.scene)
    const entity = scene?.entities.find((candidate) => candidate.id === entry.target.entity)
    if (!entity)
      fail(
        baseContext,
        `${entry.target.scene}/${entry.target.entity}`,
        '动态行为目标不存在',
        'replace-dynamic-binding',
      )
    if (!entity.behaviors) entity.behaviors = {}
    const registry = entity.behaviors[entry.channel] ?? {}
    const previous = registry[entry.behaviorId]
    if (previous && JSON.stringify(previous) !== JSON.stringify(entry.behavior))
      fail(
        baseContext,
        `${entry.target.scene}/${entry.target.entity}/${entry.channel}/${entry.behaviorId}`,
        '动态 BehaviorId 与静态行为正文冲突',
        'replace-dynamic-binding',
      )
    registry[entry.behaviorId] = previous ?? clone(entry.behavior)
    entity.behaviors[entry.channel] = registry
  }
  for (const entry of baseContext.dynamicSceneHooks.values()) {
    const scene = scenes.find((candidate) => candidate.id === entry.sceneId)
    if (!scene)
      fail(
        baseContext,
        `${entry.sceneId}/${entry.hook}/${entry.hookId}`,
        '动态 hook 目标场景不存在',
        'replace-dynamic-binding',
      )
    if (!scene.hooks) scene.hooks = {}
    const channel = scene.hooks[entry.hook] ?? { variants: {} }
    const previous = channel.variants[entry.hookId]
    if (previous && JSON.stringify(previous) !== JSON.stringify(entry.hookValue))
      fail(
        baseContext,
        `${entry.sceneId}/${entry.hook}/${entry.hookId}`,
        '动态 HookId 与静态 hook 正文冲突',
        'replace-dynamic-binding',
      )
    channel.variants[entry.hookId] = previous ?? clone(entry.hookValue)
    scene.hooks[entry.hook] = channel
    const target: CanonicalScriptOwnerV5 = {
      kind: 'scene-hook',
      sceneId: entry.sceneId,
      hook: entry.hook,
      hookId: entry.hookId,
    }
    addCursor(
      entry.hook === 'onEnter' ? `s:${entry.sceneId}` : `teleport:${entry.sceneId}`,
      target,
      entry.stageIds,
    )
    const flow = { kind: 'canonical' as const, flow: target }
    stageLineages.push({
      flow,
      entries: entry.stageIds.map((_, index) => ({
        oursStageIndex: index,
        lineage: { kind: 'baseline' as const, baselineStageIndex: index },
      })),
    })
    for (const [index, stageId] of entry.stageIds.entries())
      localAllocations.push({
        kind: 'stage',
        flow,
        oursStageIndex: index,
        stageId,
      })
  }
  const legacyBindingSources = [...baseContext.dynamicSceneHooks.values()]
    .sort((left, right) =>
      dynamicSceneHookKey(left.sceneId, left.hook, left.hookId).localeCompare(
        dynamicSceneHookKey(right.sceneId, right.hook, right.hookId),
      ),
    )
    .map((entry) => ({
      sceneId: entry.sceneId,
      hook: entry.hook,
      binding: clone(entry.binding),
      target: {
        kind: 'scene-hook' as const,
        sceneId: entry.sceneId,
        hook: entry.hook,
        hookId: entry.hookId,
      },
    }))

  const legacyEntities: LegacyEntityAliasV1[] = [...entityScenes]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([legacyId, sceneIds]) => {
      const targets = sceneIds.map((scene) => ({ scene, entity: legacyId }))
      const only = targets[0]
      if (targets.length === 1 && only) return { legacyId, mode: 'single', target: only }
      const path = `save-alias/entities/${legacyId}`
      const resolution = resolutionAt(baseContext, path, 'resolve-legacy-entity-alias')
      if (!resolution)
        fail(
          { ...baseContext, owner: `legacy-entity:${legacyId}` },
          path,
          `旧存档用裸 id ${legacyId} 同时指向 ${targets.length} 个实体；请确认忠实广播或显式单选（单选会改变行为）`,
          'resolve-legacy-entity-alias',
          targets.map((target) => `${target.scene}/${target.entity}`),
        )
      if (resolution.mode === 'broadcast-v4') return { legacyId, mode: 'broadcast-v4', targets }
      const target = resolution.target
      if (
        !target ||
        !targets.some(
          (candidate) => candidate.scene === target.scene && candidate.entity === target.entity,
        )
      )
        fail(
          { ...baseContext, owner: `legacy-entity:${legacyId}` },
          path,
          'single 目标不在候选实体中',
          'resolve-legacy-entity-alias',
          targets.map((candidate) => `${candidate.scene}/${candidate.entity}`),
        )
      return { legacyId, mode: 'single', target: clone(target) }
    })
  const cursorTargetKey = (target: LegacyCursorTargetV1): string => {
    const owner = target.target
    return owner.kind === 'entity-behavior'
      ? `${owner.sceneId}/${owner.entityId}/${owner.channel}/${owner.behaviorId}`
      : `${owner.sceneId}/${owner.hook}/${owner.hookId}`
  }
  const legacyCursors: LegacyCursorAliasV1[] = [...legacyCursorsByKey]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([legacyKey, rawTargets]) => {
      const targets = [...rawTargets].sort((left, right) =>
        cursorTargetKey(left).localeCompare(cursorTargetKey(right)),
      )
      const only = targets[0]
      if (targets.length === 1 && only) return { legacyKey, mode: 'single', target: only }
      const path = `save-alias/cursors/${legacyKey}`
      const candidates = targets.map(cursorTargetKey)
      const resolution = resolutionAt(baseContext, path, 'resolve-legacy-cursor-alias')
      if (!resolution)
        fail(
          { ...baseContext, owner: `legacy-cursor:${legacyKey}` },
          path,
          `旧存档 cursor ${legacyKey} 同时对应 ${targets.length} 个行为；请确认忠实广播或显式单选（单选会改变行为）`,
          'resolve-legacy-cursor-alias',
          candidates,
        )
      if (resolution.mode === 'broadcast-v4') return { legacyKey, mode: 'broadcast-v4', targets }
      const index = candidates.indexOf(resolution.targetKey ?? '')
      const target = targets[index]
      if (!target)
        fail(
          { ...baseContext, owner: `legacy-cursor:${legacyKey}` },
          path,
          'single 目标不在候选行为中',
          'resolve-legacy-cursor-alias',
          candidates,
        )
      return { legacyKey, mode: 'single', target }
    })
  const unclassified = [...bodies.keys()].filter((id) => !baseContext.consumedBodies.has(id)).sort()
  if (unclassified.length)
    fail(
      baseContext,
      `content.scripts.${unclassified[0]}`,
      `脚本 ${unclassified[0]} 没有 canonical owner；不能静默删除`,
      'structure-control-flow',
    )
  const unusedResolutions = [...resolutions.keys()].filter(
    (path) => !baseContext.consumedResolutions.has(path),
  )
  if (unusedResolutions.length)
    throw new Error(`v4 -> v5 resolution 未被当前输入消费：${unusedResolutions.join('、')}`)
  return {
    scenes,
    items,
    sharedScripts,
    legacyEntities,
    legacyCursors,
    lineagePlans: { pages: pageLineages, stages: stageLineages },
    localAllocations,
    legacyBindingSources,
  }
}
