import { createHash } from 'node:crypto'
import type {
  CanonicalScriptOwnerV5,
  FlowCursor,
  LegacyBindingAliasV1,
  LegacyCursorAliasV1,
  LegacyCursorTargetV1,
  LegacyEntityAliasV1,
  ProjectMigrationSidecarV1,
  SceneDef,
  SceneDefV5,
  ScriptFlowV5,
} from '@type-pal/content'
import {
  canonicalLegacyBindingV4,
  canonicalScriptTransitionJson,
  validateProjectMigrationSidecarV1,
} from '@type-pal/content'
import { p7OwnerKey } from './p7-canonical.js'
import { stableJson, stableJsonSha256, stableStringCompare } from './stable-json.js'
import type { P4AuthorOwnerAllocation, ScriptMigrationIRP6 } from './types.js'

function clone<T>(value: T): T {
  return structuredClone(value)
}

/** Node-side twin of reforge legacyBindingDigest; chunks are loading hints, never identity. */
export function legacyBindingDigestP7(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalLegacyBindingV4(value)))
    .digest('hex')
}

function transitionDigest(value: unknown): string {
  return createHash('sha256').update(canonicalScriptTransitionJson(value)).digest('hex')
}

function canonicalOwner(owner: P4AuthorOwnerAllocation['identity']): CanonicalScriptOwnerV5 {
  return owner.kind === 'entity-behavior'
    ? clone(owner)
    : {
        kind: 'scene-hook',
        sceneId: owner.sceneId,
        hook: owner.slot,
        hookId: owner.hookId,
      }
}

function ownerKey(owner: CanonicalScriptOwnerV5): string {
  return owner.kind === 'entity-behavior'
    ? `entity:${owner.sceneId}:${owner.entityId}:${owner.channel}:${owner.behaviorId}`
    : `hook:${owner.sceneId}:${owner.hook}:${owner.hookId}`
}

function projectedFlow(
  scenes: ReadonlyMap<string, SceneDefV5>,
  owner: CanonicalScriptOwnerV5,
): ScriptFlowV5 {
  const scene = scenes.get(owner.sceneId)
  if (!scene) throw new Error(`P7 sidecar: scene 缺失 ${owner.sceneId}`)
  if (owner.kind === 'scene-hook') {
    const flow = scene.hooks?.[owner.hook]?.variants[owner.hookId]?.flow
    if (!flow) throw new Error(`P7 sidecar: hook owner 缺失 ${ownerKey(owner)}`)
    return flow
  }
  const entity = scene.entities.find((candidate) => candidate.id === owner.entityId)
  const flow = entity?.behaviors?.[owner.channel]?.[owner.behaviorId]?.flow
  if (!flow) throw new Error(`P7 sidecar: entity owner 缺失 ${ownerKey(owner)}`)
  return flow
}

function cursorForStage(flow: ScriptFlowV5, stageId: string): FlowCursor {
  if (flow.kind === 'stages') {
    if (!flow.stages.some((stage) => stage.id === stageId))
      throw new Error(`P7 sidecar: stage 缺失 ${stageId}`)
    return { kind: 'stage', stage: stageId }
  }
  if (!flow.machine.states[stageId])
    throw new Error(`P7 sidecar: machine state 缺失 ${flow.machine.id}/${stageId}`)
  return { kind: 'state', machine: flow.machine.id, state: stageId }
}

function cursorTarget(owner: P4AuthorOwnerAllocation, flow: ScriptFlowV5): LegacyCursorTargetV1 {
  const indices = [...owner.stages]
    .sort((left, right) => left.legacyStageIndex - right.legacyStageIndex)
    .map((stage) => ({
      index: stage.legacyStageIndex,
      cursor: cursorForStage(flow, stage.stageId),
    }))
  const legacyStageCount = owner.stages.length
  if (indices.length !== legacyStageCount || indices.some((entry, index) => entry.index !== index))
    throw new Error(`P7 sidecar: ${p7OwnerKey(owner.identity)} legacy stage index 不连续`)
  return {
    legacyStageCount,
    target: canonicalOwner(owner.identity),
    indices,
  }
}

function sourceEntityMap(
  scenes: readonly SceneDef[],
): Map<string, Array<{ scene: string; entity: string }>> {
  const result = new Map<string, Array<{ scene: string; entity: string }>>()
  for (const scene of scenes) {
    for (const entity of scene.entities) {
      const addresses = result.get(entity.id) ?? []
      addresses.push({ scene: scene.id, entity: entity.id })
      result.set(entity.id, addresses)
    }
  }
  for (const addresses of result.values())
    addresses.sort(
      (left, right) =>
        stableStringCompare(left.scene, right.scene) ||
        stableStringCompare(left.entity, right.entity),
    )
  return result
}

function legacyEntities(scenes: readonly SceneDef[]): LegacyEntityAliasV1[] {
  return [...sourceEntityMap(scenes)]
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([legacyId, targets]) =>
      targets.length === 1
        ? { legacyId, mode: 'single', target: targets[0]! }
        : { legacyId, mode: 'broadcast-v4', targets },
    )
}

function legacyCursorKey(owner: P4AuthorOwnerAllocation): string | undefined {
  if (owner.identity.kind === 'entity-behavior') {
    if (owner.origin !== 'static-page') return undefined
    return owner.identity.channel === 'trigger'
      ? owner.identity.entityId
      : `auto:${owner.identity.entityId}`
  }
  return owner.identity.slot === 'onEnter'
    ? `s:${owner.identity.sceneId}`
    : `teleport:${owner.identity.sceneId}`
}

function legacyCursors(
  ir: ScriptMigrationIRP6,
  scenes: ReadonlyMap<string, SceneDefV5>,
): LegacyCursorAliasV1[] {
  const grouped = new Map<string, LegacyCursorTargetV1[]>()
  for (const owner of ir.owners) {
    const key = legacyCursorKey(owner)
    if (!key) continue
    const target = cursorTarget(owner, projectedFlow(scenes, canonicalOwner(owner.identity)))
    const targets = grouped.get(key) ?? []
    targets.push(target)
    grouped.set(key, targets)
  }
  return [...grouped]
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([legacyKey, targets]) => {
      targets.sort((left, right) => {
        const leftOwner = ir.owners.find(
          (owner) => p7OwnerKey(owner.identity) === ownerKey(left.target),
        )
        const rightOwner = ir.owners.find(
          (owner) => p7OwnerKey(owner.identity) === ownerKey(right.target),
        )
        return (
          Number(rightOwner?.origin === 'static-scene') -
            Number(leftOwner?.origin === 'static-scene') ||
          stableStringCompare(ownerKey(left.target), ownerKey(right.target))
        )
      })
      return targets.length === 1
        ? { legacyKey, mode: 'single', target: targets[0]! }
        : { legacyKey, mode: 'broadcast-v4', targets }
    })
}

function selectionTarget(
  rewrite: ScriptMigrationIRP6['commandRewrites'][number],
): Extract<CanonicalScriptOwnerV5, { kind: 'scene-hook' }> | undefined {
  if (rewrite.legacyKind !== 'setSceneOnEnter' && rewrite.legacyKind !== 'setSceneOnTeleport')
    return undefined
  const after = rewrite.after
  if (after.kind !== 'selectSceneHooks') return undefined
  const hook = rewrite.legacyKind === 'setSceneOnEnter' ? 'onEnter' : 'onTeleport'
  const selection = after.selection[hook]
  if (selection?.kind !== 'use') throw new Error(`P7 sidecar: ${hook} rewrite 缺 use target`)
  return {
    kind: 'scene-hook',
    sceneId: after.scene,
    hook,
    hookId: selection.value,
  }
}

function legacyBindings(ir: ScriptMigrationIRP6): LegacyBindingAliasV1[] {
  const aliases = new Map<string, LegacyBindingAliasV1>()
  for (const rewrite of ir.commandRewrites) {
    const target = selectionTarget(rewrite)
    if (!target) continue
    const before = rewrite.before as { stages?: unknown }
    if (!Array.isArray(before.stages))
      throw new Error(`P7 sidecar: ${rewrite.legacyKind} 缺 legacy stages`)
    const digest = legacyBindingDigestP7(before.stages)
    const alias: LegacyBindingAliasV1 = {
      from: {
        kind: 'scene-hook-binding',
        sceneId: target.sceneId,
        hook: target.hook,
        digest,
      },
      target,
    }
    const key = `${target.sceneId}\u0000${target.hook}\u0000${digest}`
    const previous = aliases.get(key)
    if (previous && stableJson(previous.target) !== stableJson(target))
      throw new Error(`P7 sidecar: legacy binding ${key} 多义`)
    aliases.set(key, alias)
  }
  return [...aliases.values()].sort((left, right) =>
    stableStringCompare(stableJson(left.from), stableJson(right.from)),
  )
}

function lineagePlans(ir: ScriptMigrationIRP6): ProjectMigrationSidecarV1['lineagePlans'] {
  const pagePlans = new Map<string, ProjectMigrationSidecarV1['lineagePlans']['pages'][number]>()
  for (const page of ir.pages) {
    const key = `${page.identity.sceneId}\u0000${page.identity.entityId}`
    const plan = pagePlans.get(key) ?? {
      owner: { scene: page.identity.sceneId, entity: page.identity.entityId },
      entries: [],
    }
    plan.entries.push({
      oursPageIndex: page.legacyPageIndex,
      lineage: { kind: 'baseline', baselinePageIndex: page.legacyPageIndex },
    })
    pagePlans.set(key, plan)
  }
  const pages = [...pagePlans.values()]
  for (const page of pages)
    page.entries.sort((left, right) => left.oursPageIndex - right.oursPageIndex)
  pages.sort((left, right) =>
    stableStringCompare(
      `${left.owner.scene}\u0000${left.owner.entity}`,
      `${right.owner.scene}\u0000${right.owner.entity}`,
    ),
  )

  const stages: ProjectMigrationSidecarV1['lineagePlans']['stages'] = []
  for (const owner of ir.owners) {
    if (owner.origin !== 'static-page' && owner.origin !== 'static-scene') continue
    let flow: ProjectMigrationSidecarV1['lineagePlans']['stages'][number]['flow']
    if (owner.kind === 'entity-behavior-allocation') {
      const pageIndex =
        ir.pages.find(
          (page) =>
            page.identity.sceneId === owner.identity.sceneId &&
            page.identity.entityId === owner.identity.entityId &&
            page.identity.pageId === owner.pageId,
        )?.legacyPageIndex ?? -1
      flow = {
        kind: 'legacy',
        flow: {
          kind: 'legacy-entity-flow',
          sceneId: owner.identity.sceneId,
          entityId: owner.identity.entityId,
          pageIndex,
          channel: owner.identity.channel,
        },
      }
    } else {
      flow = {
        kind: 'legacy',
        flow: {
          kind: 'legacy-scene-hook',
          sceneId: owner.identity.sceneId,
          hook: owner.identity.slot,
        },
      }
    }
    if (flow.flow.kind === 'legacy-entity-flow' && flow.flow.pageIndex < 0)
      throw new Error(`P7 sidecar: ${p7OwnerKey(owner.identity)} lineage page 缺失`)
    stages.push({
      flow,
      entries: owner.stages.map((stage) => ({
        oursStageIndex: stage.legacyStageIndex,
        lineage: { kind: 'baseline', baselineStageIndex: stage.legacyStageIndex },
      })),
    })
  }
  stages.sort((left, right) => stableStringCompare(stableJson(left.flow), stableJson(right.flow)))
  return { pages, stages }
}

function targetClosures(
  scenes: ReadonlyMap<string, SceneDefV5>,
  cursors: readonly LegacyCursorAliasV1[],
  bindings: readonly LegacyBindingAliasV1[],
): ProjectMigrationSidecarV1['targetClosures'] {
  const referenced = new Map<string, { target: CanonicalScriptOwnerV5; cursors: Set<string> }>()
  for (const alias of cursors) {
    const targets = alias.mode === 'single' ? [alias.target] : alias.targets
    for (const entry of targets) {
      const key = ownerKey(entry.target)
      const record = referenced.get(key) ?? {
        target: clone(entry.target),
        cursors: new Set<string>(),
      }
      for (const index of entry.indices) record.cursors.add(stableJson(index.cursor))
      referenced.set(key, record)
    }
  }
  for (const alias of bindings) {
    const key = ownerKey(alias.target)
    referenced.set(
      key,
      referenced.get(key) ?? { target: clone(alias.target), cursors: new Set<string>() },
    )
  }
  return [...referenced]
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([, record]) => {
      const flow = projectedFlow(scenes, record.target)
      return {
        target: record.target,
        identityDigest: stableJsonSha256({
          target: record.target,
          flow:
            flow.kind === 'stages'
              ? { kind: 'stages', referenced: [...record.cursors].sort(stableStringCompare) }
              : {
                  kind: 'stateMachine',
                  machine: flow.machine.id,
                  referenced: [...record.cursors].sort(stableStringCompare),
                },
        }),
      }
    })
}

export interface P7CompatibilityReport {
  legacyEntities: number
  broadcastEntities: number
  legacyCursors: number
  broadcastCursors: number
  legacyBindings: number
  pageLineages: number
  stageLineages: number
  targetClosures: number
}

export function buildP7ProjectCompatibility(args: {
  projectId: string
  ir: ScriptMigrationIRP6
  sourceScenes: readonly SceneDef[]
  targetScenes: readonly SceneDefV5[]
  sourceAuditDigest: string
  fullLedgerDigest: string
}): { sidecar: ProjectMigrationSidecarV1; report: P7CompatibilityReport } {
  const scenes = new Map(args.targetScenes.map((scene) => [scene.id, scene]))
  if (scenes.size !== args.targetScenes.length)
    throw new Error('P7 sidecar: canonical scene id 重复')
  const entities = legacyEntities(args.sourceScenes)
  const cursors = legacyCursors(args.ir, scenes)
  const bindings = legacyBindings(args.ir)
  const lineage = lineagePlans(args.ir)
  const closures = targetClosures(scenes, cursors, bindings)
  const withoutDigest = {
    version: 1 as const,
    projectId: args.projectId,
    transitionId: 'script-v4-v5' as const,
    fromContentVersion: 4 as const,
    toContentVersion: 5 as const,
    sourceAuditDigest: args.sourceAuditDigest,
    provenance: {
      kind: 'pal-baseline' as const,
      fullLedgerDigest: args.fullLedgerDigest,
    },
    legacyBindings: bindings,
    legacyCursors: cursors,
    legacyEntities: entities,
    lineagePlans: lineage,
    localAllocations: [],
    targetClosures: closures,
  }
  const sidecar: ProjectMigrationSidecarV1 = {
    ...withoutDigest,
    digest: transitionDigest(withoutDigest),
  }
  validateProjectMigrationSidecarV1(sidecar, args.projectId)
  return {
    sidecar,
    report: {
      legacyEntities: entities.length,
      broadcastEntities: entities.filter((alias) => alias.mode === 'broadcast-v4').length,
      legacyCursors: cursors.length,
      broadcastCursors: cursors.filter((alias) => alias.mode === 'broadcast-v4').length,
      legacyBindings: bindings.length,
      pageLineages: lineage.pages.length,
      stageLineages: lineage.stages.length,
      targetClosures: closures.length,
    },
  }
}
