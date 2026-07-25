import type {
  ItemData,
  ItemDataV5,
  SceneDef,
  SceneDefV5,
  ScriptFlowV5,
  SharedScriptLibraryV5,
} from '@type-pal/content'
import { validateItemsV5, validateScenesV5 } from '@type-pal/content'
import { p7OwnerKey, projectP7AuthorCommands, projectP7SimpleOwnerFlow } from './p7-canonical.js'
import { type LegacyStageInput, projectP7StateMachineOwnerFlow } from './p7-owner-machine.js'
import type {
  P4AuthorOwnerAllocation,
  P4EntityPageAllocation,
  ScriptMigrationIRP6,
} from './types.js'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function pushMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key) ?? []
  values.push(value)
  map.set(key, values)
}

function sceneEntityKey(sceneId: string, entityId: string): string {
  return `${sceneId}\u0000${entityId}`
}

function comparePage(left: P4EntityPageAllocation, right: P4EntityPageAllocation): number {
  return (
    left.legacyPageIndex - right.legacyPageIndex ||
    left.identity.pageId.localeCompare(right.identity.pageId)
  )
}

function stateCount(flow: ScriptFlowV5): number {
  return flow.kind === 'stateMachine' ? Object.keys(flow.machine.states).length : flow.stages.length
}

function legacyEntityStages(
  source: SceneDef['entities'][number],
  page: P4EntityPageAllocation,
  owner: P4AuthorOwnerAllocation,
): LegacyStageInput[] | undefined {
  if (owner.origin !== 'static-page' || owner.identity.kind !== 'entity-behavior') return undefined
  const behavior = source.pages?.[page.legacyPageIndex]?.[owner.identity.channel]
  return behavior?.stages as LegacyStageInput[] | undefined
}

function legacyHookStages(
  source: SceneDef,
  owner: P4AuthorOwnerAllocation,
  ir: ScriptMigrationIRP6,
): LegacyStageInput[] | undefined {
  if (owner.identity.kind !== 'scene-hook') return undefined
  if (owner.origin === 'static-scene')
    return source[owner.identity.slot] as LegacyStageInput[] | undefined
  const candidates = ir.commandRewrites.flatMap((rewrite) => {
    if (rewrite.groupId !== owner.groupId || !rewrite.before || typeof rewrite.before !== 'object')
      return []
    const stages = (rewrite.before as { stages?: unknown }).stages
    return Array.isArray(stages) ? [stages as LegacyStageInput[]] : []
  })
  if (!candidates.length)
    throw new Error(`P7 project: dynamic hook ${p7OwnerKey(owner.identity)} 缺 legacy stages 证据`)
  const first = JSON.stringify(candidates[0])
  if (candidates.some((candidate) => JSON.stringify(candidate) !== first))
    throw new Error(`P7 project: dynamic hook ${p7OwnerKey(owner.identity)} 的 stages 证据不一致`)
  return candidates[0]
}

export interface P7ProjectReport {
  sceneCount: number
  itemCount: number
  pageCount: number
  ownerCount: number
  entityBehaviorCount: number
  sceneHookCount: number
  simpleOwnerCount: number
  stateMachineOwnerCount: number
  simpleStageCount: number
  stateMachineStateCount: number
  canonicalFlowNodeCount: number
  itemPrivateScriptCount: number
  sharedScriptCount: number
}

export interface P7CanonicalProject {
  scenes: SceneDefV5[]
  items: ItemDataV5[]
  scripts: SharedScriptLibraryV5
  report: P7ProjectReport
}

/**
 * P7 canonical assembly boundary. It consumes the complete P6 allocation IR and the
 * complete v4 project payload; partial scene/owner projection is deliberately rejected.
 */
export function projectP7CanonicalProject(args: {
  ir: ScriptMigrationIRP6
  scenes: readonly SceneDef[]
  items: readonly ItemData[]
}): P7CanonicalProject {
  if (args.ir.retainedBodies.length !== 0 || args.ir.pendingOwnerLinks.length !== 0)
    throw new Error('P7 project: P6 closure 尚未归零')
  if (args.ir.sharedAuthorScripts.length !== 0)
    throw new Error('P7 project: 当前 P6 shared author script 形状尚未定义')

  const scenesById = new Map<string, SceneDef>()
  const sceneEntityKeys = new Set<string>()
  const entityScenes = new Map<string, string[]>()
  for (const source of args.scenes) {
    if (scenesById.has(source.id)) throw new Error(`P7 project: 重复 scene ${source.id}`)
    scenesById.set(source.id, source)
    const entityIds = new Set<string>()
    for (const entity of source.entities) {
      if (entityIds.has(entity.id))
        throw new Error(`P7 project: ${source.id} 重复 entity ${entity.id}`)
      entityIds.add(entity.id)
      sceneEntityKeys.add(sceneEntityKey(source.id, entity.id))
      pushMap(entityScenes, entity.id, source.id)
    }
  }
  for (const scenes of entityScenes.values()) scenes.sort()

  const pagesByEntity = new Map<string, P4EntityPageAllocation[]>()
  const expectedPageKeys = new Set<string>()
  for (const page of args.ir.pages) {
    if (!scenesById.has(page.identity.sceneId))
      throw new Error(`P7 project: page 指向不存在 scene ${page.identity.sceneId}`)
    const entityKey = sceneEntityKey(page.identity.sceneId, page.identity.entityId)
    if (!sceneEntityKeys.has(entityKey))
      throw new Error(
        `P7 project: page 指向不存在 entity ${page.identity.sceneId}/${page.identity.entityId}`,
      )
    const pageKey = `${entityKey}\u0000${page.identity.pageId}`
    if (expectedPageKeys.has(pageKey)) throw new Error(`P7 project: 重复 page ${pageKey}`)
    expectedPageKeys.add(pageKey)
    pushMap(pagesByEntity, entityKey, page)
  }
  for (const pages of pagesByEntity.values()) pages.sort(comparePage)

  const entityOwners = new Map<string, P4AuthorOwnerAllocation[]>()
  const hookOwners = new Map<string, P4AuthorOwnerAllocation[]>()
  const expectedOwnerKeys = new Set<string>()
  for (const owner of args.ir.owners) {
    const key = p7OwnerKey(owner.identity)
    if (expectedOwnerKeys.has(key)) throw new Error(`P7 project: 重复 owner ${key}`)
    expectedOwnerKeys.add(key)
    if (!scenesById.has(owner.identity.sceneId))
      throw new Error(`P7 project: owner 指向不存在 scene ${key}`)
    if (owner.identity.kind === 'entity-behavior') {
      if (!sceneEntityKeys.has(sceneEntityKey(owner.identity.sceneId, owner.identity.entityId)))
        throw new Error(`P7 project: owner 指向不存在 entity ${key}`)
      pushMap(entityOwners, sceneEntityKey(owner.identity.sceneId, owner.identity.entityId), owner)
    } else pushMap(hookOwners, owner.identity.sceneId, owner)
  }

  const stateMachineOwnerKeys = new Set(
    args.ir.cycleStructures
      .filter((cycle) => cycle.authorProjection.kind === 'state-machine')
      .flatMap((cycle) => cycle.owners.map(p7OwnerKey)),
  )
  const consumedOwnerKeys = new Set<string>()
  const consumedPageKeys = new Set<string>()
  let simpleOwnerCount = 0
  let stateMachineOwnerCount = 0
  let simpleStageCount = 0
  let stateMachineStateCount = 0

  const projectOwner = (
    owner: P4AuthorOwnerAllocation,
    legacyStages: LegacyStageInput[] | undefined,
  ): ScriptFlowV5 => {
    const key = p7OwnerKey(owner.identity)
    if (!expectedOwnerKeys.has(key)) throw new Error(`P7 project: 未登记 owner ${key}`)
    if (consumedOwnerKeys.has(key)) throw new Error(`P7 project: owner 被重复消费 ${key}`)
    consumedOwnerKeys.add(key)
    const common = {
      ir: args.ir,
      owner,
      entityScenes,
      legacyStages,
    }
    const flow = stateMachineOwnerKeys.has(key)
      ? projectP7StateMachineOwnerFlow(common)
      : projectP7SimpleOwnerFlow(common)
    if (flow.kind === 'stateMachine') {
      stateMachineOwnerCount++
      stateMachineStateCount += stateCount(flow)
    } else {
      simpleOwnerCount++
      simpleStageCount += stateCount(flow)
    }
    return flow
  }

  const scenes = args.scenes.map((source): SceneDefV5 => {
    const sceneOwners = hookOwners.get(source.id) ?? []
    const hooks: NonNullable<SceneDefV5['hooks']> = {}
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      const owners = sceneOwners.filter(
        (owner) => owner.identity.kind === 'scene-hook' && owner.identity.slot === slot,
      )
      if (owners.length === 0) continue
      const initial = owners.filter((owner) => owner.origin === 'static-scene')
      if (initial.length > 1)
        throw new Error(`P7 project: ${source.id}.${slot} 有多个 static initial hook`)
      hooks[slot] = {
        ...(initial[0]?.identity.kind === 'scene-hook'
          ? { initial: initial[0].identity.hookId }
          : {}),
        variants: Object.fromEntries(
          owners.map((owner) => {
            if (owner.identity.kind !== 'scene-hook')
              throw new Error(`P7 project: ${source.id}.${slot} owner 类型错误`)
            return [
              owner.identity.hookId,
              {
                label: owner.label,
                order: owner.order,
                flow: projectOwner(owner, legacyHookStages(source, owner, args.ir)),
              },
            ]
          }),
        ),
      }
    }

    const entities = source.entities.map((entity): SceneDefV5['entities'][number] => {
      const key = sceneEntityKey(source.id, entity.id)
      const pageAllocations = pagesByEntity.get(key) ?? []
      const owners = entityOwners.get(key) ?? []
      if (pageAllocations.length !== (entity.pages?.length ?? 0))
        throw new Error(
          `P7 project: ${source.id}/${entity.id} page 分配 ${pageAllocations.length} != source ${entity.pages?.length ?? 0}`,
        )

      const initialPages = pageAllocations.filter((page) => page.initial)
      if (pageAllocations.length > 0 && initialPages.length !== 1)
        throw new Error(
          `P7 project: ${source.id}/${entity.id} 期望恰一 initial page，收到 ${initialPages.length}`,
        )

      const behaviors: NonNullable<SceneDefV5['entities'][number]['behaviors']> = {}
      for (const channel of ['trigger', 'auto'] as const) {
        const channelOwners = owners.filter(
          (owner) =>
            owner.identity.kind === 'entity-behavior' && owner.identity.channel === channel,
        )
        if (channelOwners.length === 0) continue
        behaviors[channel] = Object.fromEntries(
          channelOwners.map((owner) => {
            if (owner.identity.kind !== 'entity-behavior')
              throw new Error(`P7 project: ${key}/${channel} owner 类型错误`)
            const page =
              owner.origin === 'static-page'
                ? pageAllocations.find((candidate) => candidate.identity.pageId === owner.pageId)
                : undefined
            if (owner.origin === 'static-page' && !page)
              throw new Error(`P7 project: ${p7OwnerKey(owner.identity)} 缺 page allocation`)
            return [
              owner.identity.behaviorId,
              {
                label: owner.label,
                order: owner.order,
                flow: projectOwner(
                  owner,
                  page ? legacyEntityStages(entity, page, owner) : undefined,
                ),
              },
            ]
          }),
        )
      }

      const pages = pageAllocations.map((page) => ({
        id: page.identity.pageId,
        label: page.label,
        ...(page.triggerBehaviorId === undefined ? {} : { trigger: page.triggerBehaviorId }),
        ...(page.autoBehaviorId === undefined ? {} : { auto: page.autoBehaviorId }),
        ...(page.triggerActivation === undefined
          ? {}
          : { triggerActivation: clone(page.triggerActivation) }),
        ...(entity.pages?.[page.legacyPageIndex]?.animation === undefined
          ? {}
          : { animation: clone(entity.pages[page.legacyPageIndex]!.animation) }),
      }))
      for (const page of pageAllocations)
        consumedPageKeys.add(`${key}\u0000${page.identity.pageId}`)
      const { pages: _legacyPages, hostile, ...base } = entity
      let projectedHostile: SceneDefV5['entities'][number]['hostile']
      if (hostile !== undefined) {
        const { onLose, ...hostileBase } = hostile
        projectedHostile = {
          ...clone(hostileBase),
          ...(onLose === undefined
            ? {}
            : onLose === 'gameOver'
              ? { onLose }
              : {
                  onLose: projectP7AuthorCommands(
                    onLose,
                    {
                      ir: args.ir,
                      owner: {
                        kind: 'entity-behavior',
                        sceneId: source.id,
                        entityId: entity.id,
                        channel: 'trigger',
                        behaviorId: '__hostile-on-lose__',
                      },
                      entityScenes,
                    },
                    `${source.id}/${entity.id}.hostile.onLose`,
                  ),
                }),
        }
      }
      return {
        ...clone(base),
        ...(pageAllocations.length === 0
          ? {}
          : {
              pages,
              initialPage: initialPages[0]!.identity.pageId,
            }),
        ...(Object.keys(behaviors).length === 0 ? {} : { behaviors }),
        ...(projectedHostile === undefined ? {} : { hostile: projectedHostile }),
      }
    })

    const { onEnter: _onEnter, onTeleport: _onTeleport, ...base } = source
    return {
      ...clone(base),
      entities,
      ...(Object.keys(hooks).length === 0 ? {} : { hooks }),
    }
  })

  const privateScripts = new Map(
    args.ir.itemPrivateScripts.map((script) => [script.identity.itemId, script]),
  )
  if (privateScripts.size !== args.ir.itemPrivateScripts.length)
    throw new Error('P7 project: 重复 item-private script owner')
  const consumedPrivateScripts = new Set<string>()
  const items = args.items.map((source): ItemDataV5 => {
    const script = privateScripts.get(source.id)
    if (!script) return clone(source) as ItemDataV5
    if (
      !source.use ||
      source.use.effects.length !== 1 ||
      source.use.effects[0]?.kind !== 'runScript'
    )
      throw new Error(`P7 project: item ${source.id} 缺唯一 legacy runScript use effect`)
    consumedPrivateScripts.add(source.id)
    const base = clone(source) as unknown as ItemDataV5
    return {
      ...base,
      use: {
        ...clone(source.use),
        effects: [
          {
            kind: 'itemPrivateScript',
            script: {
              id: 'use',
              label: script.label,
              body: projectP7AuthorCommands(
                script.authorBody,
                {
                  ir: args.ir,
                  owner: {
                    kind: 'entity-behavior',
                    sceneId: '__item__',
                    entityId: `item:${source.id}`,
                    channel: 'trigger',
                    behaviorId: 'use',
                  },
                  entityScenes,
                },
                `item(${source.id}).use`,
              ),
            },
          },
        ],
      },
    }
  })

  const missingOwners = [...expectedOwnerKeys].filter((key) => !consumedOwnerKeys.has(key))
  if (missingOwners.length !== 0)
    throw new Error(`P7 project: ${missingOwners.length} owner 未消费: ${missingOwners[0]}`)
  const missingPages = [...expectedPageKeys].filter((key) => !consumedPageKeys.has(key))
  if (missingPages.length !== 0)
    throw new Error(`P7 project: ${missingPages.length} page 未消费: ${missingPages[0]}`)
  const missingPrivateScripts = [...privateScripts.keys()].filter(
    (itemId) => !consumedPrivateScripts.has(itemId),
  )
  if (missingPrivateScripts.length !== 0)
    throw new Error(`P7 project: item-private owner 未消费 ${missingPrivateScripts[0]}`)

  validateScenesV5(scenes)
  validateItemsV5(items)

  return {
    scenes,
    items,
    scripts: {},
    report: {
      sceneCount: scenes.length,
      itemCount: items.length,
      pageCount: args.ir.pages.length,
      ownerCount: consumedOwnerKeys.size,
      entityBehaviorCount: args.ir.owners.filter(
        (owner) => owner.identity.kind === 'entity-behavior',
      ).length,
      sceneHookCount: args.ir.owners.filter((owner) => owner.identity.kind === 'scene-hook').length,
      simpleOwnerCount,
      stateMachineOwnerCount,
      simpleStageCount,
      stateMachineStateCount,
      canonicalFlowNodeCount: simpleStageCount + stateMachineStateCount,
      itemPrivateScriptCount: consumedPrivateScripts.size,
      sharedScriptCount: 0,
    },
  }
}
