import { isDeepStrictEqual } from 'node:util'
import { isScriptRef } from '@type-pal/content'
import type { MigrationFileSet } from '../../pal-migration.js'
import type {
  ProductReferenceSite,
  ScriptControlFlowAuditV1,
} from '../../script-control-flow-audit.js'
import { commandAtPointer, legacyAuthorCellSha256, readV4ScriptCorpus } from './source-v4.js'
import { digestRecord, stableStringCompare } from './stable-json.js'
import type {
  EntityBehaviorIdentity,
  EntityPageIdentity,
  LegacyScriptIdentity,
  P2LegacyCommandKind,
  P3LegacyScriptCellIdentity,
  P4AuthorOwnerAllocation,
  P4AuthorOwnerIdentity,
  P4CommandRewrite,
  P4CommandTransitionSummary,
  P4EntityBehaviorAllocation,
  P4EntityPageAllocation,
  P4FutureWork,
  P4OwnerCensus,
  P4OwnerFragment,
  P4OwnerTransitionEvidence,
  P4OwnerTransitionGroup,
  P4PendingOwnerLink,
  P4PendingTransition,
  P4RetainedBody,
  P4SceneHookAllocation,
  P4SelectionCommand,
  P4SourceCell,
  P4TransitionEntry,
  SceneHookIdentity,
  ScriptMigrationIRP3,
  ScriptMigrationIRP4,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftP4,
  SourceCellIdentity,
} from './types.js'

const LEGACY_COMMAND_KINDS = new Set<P2LegacyCommandKind>([
  'setEntityAuto',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
])

interface SceneRecord {
  path: string
  value: Record<string, unknown>
  id: string
  entities: Record<string, unknown>[]
}

interface GroupDraft {
  kind: P4OwnerTransitionGroup['kind']
  transformId: P4OwnerTransitionGroup['transformId']
  sources: Map<string, P4OwnerTransitionGroup['sources'][number]>
  targets: P4OwnerTransitionGroup['targets']
  ownerKeys: Set<string>
  fragmentIds: Set<string>
  rewriteSources: Set<string>
}

interface DynamicBehaviorDraft {
  targetLegacyScriptId: string
  sceneId: string
  entityId: string
  channel: 'trigger' | 'auto'
  sites: ProductReferenceSite[]
}

interface DynamicHookDraft {
  key: string
  sceneId: string
  slot: 'onEnter' | 'onTeleport'
  targetIds: string[]
  sites: ScriptControlFlowAuditV1['product']['sceneHookBindings']['sites']
}

export interface P4TransformResult {
  ir: ScriptMigrationIRP4
  ledger: ScriptTransitionLedgerDraftP4
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P4 transform: ${message}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function sourceIdentityKey(
  identity: LegacyScriptIdentity | SourceCellIdentity | P3LegacyScriptCellIdentity,
): string {
  if (identity.kind === 'legacy-script') return `legacy-script:${identity.id}`
  if (identity.kind === 'source-cell') return `source-cell:${identity.source}#${identity.pointer}`
  return `legacy-script-cell:${identity.scriptId}#${identity.pointer}`
}

function ownerKey(identity: P4AuthorOwnerIdentity): string {
  return identity.kind === 'entity-behavior'
    ? `entity:${identity.sceneId}:${identity.entityId}:${identity.channel}:${identity.behaviorId}`
    : `hook:${identity.sceneId}:${identity.slot}:${identity.hookId}`
}

function targetKey(target: P4OwnerTransitionGroup['targets'][number]): string {
  if (target.kind === 'entity-page')
    return `page:${target.sceneId}:${target.entityId}:${target.pageId}`
  if (target.kind === 'entity-behavior' || target.kind === 'scene-hook') return ownerKey(target)
  return sourceIdentityKey(target)
}

export function allocateP4StageId(index: number): string {
  if (!Number.isInteger(index) || index < 0)
    throw new Error(`P4 stage allocation: invalid legacy index ${index}`)
  return index === 0 ? 'initial' : `legacy-${String(index + 1).padStart(3, '0')}`
}

export function classifyP4OwnerCardinality(
  ownerCount: number,
): 'resolved-owner' | 'deferred-cross-owner' {
  if (!Number.isInteger(ownerCount) || ownerCount < 1)
    throw new Error(`P4 owner allocation: invalid owner count ${ownerCount}`)
  return ownerCount === 1 ? 'resolved-owner' : 'deferred-cross-owner'
}

function sourceCell(
  identity: SourceCellIdentity | P3LegacyScriptCellIdentity,
  value: unknown,
): P4SourceCell {
  return { identity, baseCellSha256: legacyAuthorCellSha256(value) }
}

function sceneRecords(migration: MigrationFileSet): SceneRecord[] {
  return [...migration.files]
    .filter(([path]) => /^content\/scenes\/s\d+\.json$/.test(path))
    .map(([path, value]) => {
      assert(isRecord(value), `scene is not an object ${path}`)
      assert(typeof value.id === 'string', `scene id missing ${path}`)
      assert(Array.isArray(value.entities), `scene entities missing ${path}`)
      return {
        path,
        value,
        id: value.id,
        entities: value.entities.map((entity, index) => {
          assert(isRecord(entity), `scene entity invalid ${path}#${index}`)
          return entity
        }),
      }
    })
    .sort((left, right) => stableStringCompare(left.id, right.id))
}

function stageEntry(
  stage: unknown,
  where: string,
  bodyHandleById: ReadonlyMap<string, `ir-body-${string}`>,
): {
  stageId: string
  legacyStageIndex: number
  entryLegacyScriptId: string
  entryHandle: `ir-body-${string}`
} {
  const match = /\/(\d+)$/.exec(where)
  const index = match ? Number(match[1]) : Number.NaN
  assert(Number.isInteger(index), `stage index missing ${where}`)
  assert(isRecord(stage) && Array.isArray(stage.body), `stage invalid ${where}`)
  assert(stage.body.length === 1, `stage is not a single root call ${where}`)
  const command = stage.body[0]
  assert(
    isRecord(command) && command.kind === 'callScript' && isScriptRef(command.ref),
    `stage root call missing ${where}`,
  )
  const handle = bodyHandleById.get(command.ref.id)
  assert(handle, `stage target body missing ${where}:${command.ref.id}`)
  return {
    stageId: allocateP4StageId(index),
    legacyStageIndex: index,
    entryLegacyScriptId: command.ref.id,
    entryHandle: handle,
  }
}

function ownerCensus(args: {
  pages: readonly P4EntityPageAllocation[]
  owners: readonly P4AuthorOwnerAllocation[]
  rewrites: readonly P4CommandRewrite[]
  fragments: readonly P4OwnerFragment[]
  crossOwner: number
}): P4OwnerCensus {
  const entity = args.owners.filter(
    (owner): owner is P4EntityBehaviorAllocation => owner.kind === 'entity-behavior-allocation',
  )
  const hooks = args.owners.filter(
    (owner): owner is P4SceneHookAllocation => owner.kind === 'scene-hook-allocation',
  )
  const countEntity = (origin: P4EntityBehaviorAllocation['origin'], channel: 'trigger' | 'auto') =>
    entity.filter((owner) => owner.origin === origin && owner.identity.channel === channel).length
  const countHook = (origin: P4SceneHookAllocation['origin'], slot: 'onEnter' | 'onTeleport') =>
    hooks.filter((owner) => owner.origin === origin && owner.identity.slot === slot).length
  const stageCount = (owners: readonly P4AuthorOwnerAllocation[]) =>
    owners.reduce((total, owner) => total + owner.stages.length, 0)
  const actual = {
    pages: args.pages.length,
    entityBehaviors: {
      staticTrigger: countEntity('static-page', 'trigger'),
      staticAuto: countEntity('static-page', 'auto'),
      dynamicTrigger:
        countEntity('dynamic-binding', 'trigger') + countEntity('p2-special', 'trigger'),
      dynamicAuto: countEntity('dynamic-binding', 'auto'),
      total: entity.length,
    },
    sceneHooks: {
      staticOnEnter: countHook('static-scene', 'onEnter'),
      staticOnTeleport: countHook('static-scene', 'onTeleport'),
      dynamicOnEnter: countHook('dynamic-binding', 'onEnter'),
      dynamicOnTeleport: countHook('dynamic-binding', 'onTeleport'),
      total: hooks.length,
    },
    stages: {
      staticEntity: stageCount(entity.filter((owner) => owner.origin === 'static-page')),
      dynamicEntity: stageCount(entity.filter((owner) => owner.origin !== 'static-page')),
      staticSceneHook: stageCount(hooks.filter((owner) => owner.origin === 'static-scene')),
      dynamicSceneHook: stageCount(hooks.filter((owner) => owner.origin === 'dynamic-binding')),
      total: stageCount(args.owners),
    },
    commandRewrites: args.rewrites.length,
    resolvedFragments: args.fragments.length,
    deferredCrossOwner: args.crossOwner,
    unknown: 0,
  }
  const expected: P4OwnerCensus = {
    pages: 3_616,
    entityBehaviors: {
      staticTrigger: 2_834,
      staticAuto: 987,
      dynamicTrigger: 172,
      dynamicAuto: 307,
      total: 4_300,
    },
    sceneHooks: {
      staticOnEnter: 160,
      staticOnTeleport: 67,
      dynamicOnEnter: 56,
      dynamicOnTeleport: 1,
      total: 284,
    },
    stages: {
      staticEntity: 5_664,
      dynamicEntity: 479,
      staticSceneHook: 271,
      dynamicSceneHook: 88,
      total: 6_502,
    },
    commandRewrites: 844,
    resolvedFragments: 7_039,
    deferredCrossOwner: 17,
    unknown: 0,
  }
  assert(isDeepStrictEqual(actual, expected), `PAL owner census drift ${JSON.stringify(actual)}`)
  return expected
}

function createGroup(
  groups: Map<string, GroupDraft>,
  id: string,
  kind: GroupDraft['kind'],
  transformId: GroupDraft['transformId'],
): GroupDraft {
  assert(!groups.has(id), `duplicate group ${id}`)
  const group: GroupDraft = {
    kind,
    transformId,
    sources: new Map(),
    targets: [],
    ownerKeys: new Set(),
    fragmentIds: new Set(),
    rewriteSources: new Set(),
  }
  groups.set(id, group)
  return group
}

function addSource(group: GroupDraft, source: P4OwnerTransitionGroup['sources'][number]): void {
  const key = sourceIdentityKey(source.identity)
  const existing = group.sources.get(key)
  assert(
    !existing || existing.baseCellSha256 === source.baseCellSha256,
    `group source hash mismatch ${key}`,
  )
  group.sources.set(key, clone(source))
}

function addTarget(group: GroupDraft, target: P4OwnerTransitionGroup['targets'][number]): void {
  if (!group.targets.some((candidate) => targetKey(candidate) === targetKey(target)))
    group.targets.push(clone(target))
}

function legacyBodyCell(
  scriptId: string,
  baseCellSha256: string,
): P4OwnerTransitionGroup['sources'][number] {
  return {
    identity: { kind: 'legacy-script', id: scriptId },
    baseCellSha256,
  }
}

function commandBodyMaps(p3: ScriptMigrationIRP3): {
  bodies: Map<string, unknown[]>
  handles: Map<string, `ir-body-${string}`>
} {
  const bodies = new Map<string, unknown[]>()
  const handles = new Map<string, `ir-body-${string}`>()
  for (const body of p3.retainedBodies) {
    bodies.set(body.legacyScriptId, body.body)
    handles.set(body.legacyScriptId, body.handle)
  }
  for (const structure of p3.flowStructures) {
    bodies.set(structure.target.legacyScriptId, structure.target.body)
    handles.set(structure.target.legacyScriptId, structure.target.handle)
  }
  return { bodies, handles }
}

function resolveDynamicBehaviorDrafts(args: {
  audit: ScriptControlFlowAuditV1
  p3Bodies: ReadonlyMap<string, unknown[]>
  entityScene: ReadonlyMap<string, string>
}): DynamicBehaviorDraft[] {
  const byTarget = new Map<string, DynamicBehaviorDraft>()
  for (const site of args.audit.product.references.sites) {
    if (site.kind !== 'setEntityAuto' && site.kind !== 'setEntityTrigger') continue
    const body = args.p3Bodies.get(site.callerBodyId)
    assert(body, `dynamic binding caller missing ${site.callerBodyId}`)
    const command = commandAtPointer(body, site.path)
    assert(
      isRecord(command) && command.kind === site.kind && typeof command.entity === 'string',
      `dynamic binding command drift ${site.callerBodyId}#${site.path}`,
    )
    const sceneId = args.entityScene.get(command.entity)
    assert(sceneId, `dynamic binding entity owner missing ${command.entity}`)
    const channel = site.kind === 'setEntityAuto' ? 'auto' : 'trigger'
    const existing = byTarget.get(site.targetId)
    if (existing) {
      assert(
        existing.sceneId === sceneId &&
          existing.entityId === command.entity &&
          existing.channel === channel,
        `dynamic binding target has multiple owners ${site.targetId}`,
      )
      existing.sites.push(site)
    } else {
      byTarget.set(site.targetId, {
        targetLegacyScriptId: site.targetId,
        sceneId,
        entityId: command.entity,
        channel,
        sites: [site],
      })
    }
  }
  return [...byTarget.values()]
    .map((draft) => ({
      ...draft,
      sites: draft.sites.sort(
        (left, right) =>
          stableStringCompare(left.callerBodyId, right.callerBodyId) ||
          stableStringCompare(left.path, right.path),
      ),
    }))
    .sort(
      (left, right) =>
        stableStringCompare(left.sceneId, right.sceneId) ||
        stableStringCompare(left.entityId, right.entityId) ||
        stableStringCompare(left.channel, right.channel) ||
        stableStringCompare(left.targetLegacyScriptId, right.targetLegacyScriptId),
    )
}

function resolveDynamicHookDrafts(audit: ScriptControlFlowAuditV1): DynamicHookDraft[] {
  const byGroup = new Map<string, DynamicHookDraft>()
  for (const site of audit.product.sceneHookBindings.sites) {
    const slot = site.kind === 'setSceneOnEnter' ? 'onEnter' : 'onTeleport'
    const key = `${site.targetScene}:${slot}:${site.targetIds.join('\0')}`
    const existing = byGroup.get(key)
    if (existing) existing.sites.push(site)
    else
      byGroup.set(key, {
        key,
        sceneId: site.targetScene,
        slot,
        targetIds: [...site.targetIds],
        sites: [site],
      })
  }
  return [...byGroup.values()]
    .map((draft) => ({
      ...draft,
      sites: draft.sites.sort(
        (left, right) =>
          stableStringCompare(left.callerBodyId, right.callerBodyId) ||
          stableStringCompare(left.path, right.path),
      ),
    }))
    .sort(
      (left, right) =>
        stableStringCompare(left.sceneId, right.sceneId) ||
        stableStringCompare(left.slot, right.slot) ||
        stableStringCompare(left.targetIds.join('\0'), right.targetIds.join('\0')),
    )
}

function rewriteBody(
  body: readonly unknown[],
  legacyScriptId: string,
  rewrites: ReadonlyMap<string, P4CommandRewrite>,
): unknown[] {
  const visit = (value: unknown, pointer: string): unknown => {
    const rewrite = rewrites.get(`${legacyScriptId}#${pointer}`)
    if (rewrite) return clone(rewrite.after)
    if (Array.isArray(value))
      return value.map((child, index) => visit(child, `${pointer}/${index}`))
    if (!isRecord(value)) return value
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        visit(child, `${pointer}/${pointerToken(key)}`),
      ]),
    )
  }
  return visit(body, '') as unknown[]
}

function commandTransitionSummary(
  census: ScriptMigrationIRP3['commandCensus'],
): P4CommandTransitionSummary {
  const transitionedP2 = (kind: P2LegacyCommandKind) => (kind === 'setEntityTrigger' ? 1 : 0)
  const byKind = Object.fromEntries(
    [...LEGACY_COMMAND_KINDS].sort(stableStringCompare).map((kind) => {
      const input = census[kind]
      const p2 = transitionedP2(kind)
      return [
        kind,
        {
          input,
          legacyPending: 0 as const,
          transitionedP2: p2,
          transitionedP4: input - p2,
        },
      ]
    }),
  ) as P4CommandTransitionSummary['byKind']
  return {
    input: 844,
    legacyPending: 0,
    transitionedP2: 1,
    transitionedP4: 843,
    byKind,
  }
}

function ledgerEntryKey(entry: P4TransitionEntry): string {
  return sourceIdentityKey(entry.from)
}

function buildLedger(args: {
  p3: ScriptMigrationIRP3
  p3Ledger: ScriptTransitionLedgerDraftP3
  irWithoutDigest: Omit<ScriptMigrationIRP4, 'digest'>
  groups: readonly P4OwnerTransitionGroup[]
}): ScriptTransitionLedgerDraftP4 {
  const newEntries: P4TransitionEntry[] = args.groups.flatMap((group) =>
    group.sources.map((source) => ({
      from: clone(source.identity),
      baseCellSha256: source.baseCellSha256,
      outcome: { kind: 'group' as const, groupId: group.id },
    })),
  )
  const entries = [...clone(args.p3Ledger.entries), ...newEntries].sort((left, right) =>
    stableStringCompare(ledgerEntryKey(left), ledgerEntryKey(right)),
  )
  assert(
    new Set(entries.map(ledgerEntryKey)).size === entries.length,
    'ledger source identity overlap',
  )
  const evidence: P4OwnerTransitionEvidence[] = args.groups.map((group) => ({
    id: group.evidenceId,
    kind:
      group.kind === 'selection-command-rewrite-group'
        ? 'stable-selection-rewrite'
        : 'named-owner-allocation',
    sourceAuditDigest: args.irWithoutDigest.sourceAudit.digest,
    legacyScriptIds: group.sources
      .flatMap((source) => (source.identity.kind === 'legacy-script' ? [source.identity.id] : []))
      .sort(stableStringCompare),
    sourceCells: group.sources
      .flatMap((source) =>
        source.identity.kind === 'legacy-script' ? [] : [sourceIdentityKey(source.identity)],
      )
      .sort(stableStringCompare),
    stableIdsExplicit: true,
    crossOwnerCopies: 0,
  }))
  const pending: P4PendingTransition[] = args.irWithoutDigest.retainedBodies
    .map((body) => ({
      legacyScriptId: body.legacyScriptId,
      handle: body.handle,
      phase: body.status.work.phase,
      reason: body.status.work.reason,
    }))
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  return digestRecord<ScriptTransitionLedgerDraftP4>({
    kind: 'script-transition-ledger-draft',
    version: 1,
    projectId: 'pal',
    transitionId: 'script-v4-v5',
    generatorEpoch: 'n3-script-v5-p4-v1',
    throughPhase: 'P4',
    sourceAudit: clone(args.p3Ledger.sourceAudit),
    previousPhase: {
      irDigest: args.p3.digest,
      ledgerDigest: args.p3Ledger.digest,
    },
    completed: [
      'folded-body-pruning',
      'misleading-scc-retirement',
      's018-owner-resolution',
      'acyclic-flow-structure',
      'named-owner-allocation',
      'legacy-selection-rewrite',
    ],
    entries,
    groups: [...clone(args.p3Ledger.groups), ...clone(args.groups)],
    evidence: [...clone(args.p3Ledger.evidence), ...evidence].sort((left, right) =>
      stableStringCompare(left.id, right.id),
    ),
    pending,
  })
}

export function buildP4ScriptMigrationIR(args: {
  migration: MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  p3: ScriptMigrationIRP3
  p3Ledger: ScriptTransitionLedgerDraftP3
}): P4TransformResult {
  assert(args.p3.throughPhase === 'P3', 'P3 IR phase mismatch')
  assert(args.p3Ledger.throughPhase === 'P3', 'P3 ledger phase mismatch')
  const corpus = readV4ScriptCorpus(args.migration)
  assert(
    corpus.sourceSnapshotSha256 === args.p3.source.sourceSnapshotSha256,
    'P3 source snapshot drift',
  )
  const scenes = sceneRecords(args.migration)
  assert(scenes.length === 294, `scene count drift ${scenes.length}`)
  const { bodies: p3Bodies, handles: bodyHandleById } = commandBodyMaps(args.p3)
  const retainedById = new Map(args.p3.retainedBodies.map((body) => [body.legacyScriptId, body]))
  const entityScene = new Map<string, string>()
  for (const scene of scenes) {
    for (const entity of scene.entities) {
      assert(typeof entity.id === 'string', `entity id missing ${scene.id}`)
      assert(!entityScene.has(entity.id), `PAL duplicate entity id ${entity.id}`)
      entityScene.set(entity.id, scene.id)
    }
  }

  const pages: P4EntityPageAllocation[] = []
  const owners: P4AuthorOwnerAllocation[] = []
  const ownerByKey = new Map<string, P4AuthorOwnerAllocation>()
  const groups = new Map<string, GroupDraft>()
  const addOwner = (owner: P4AuthorOwnerAllocation): void => {
    const key = ownerKey(owner.identity)
    assert(!ownerByKey.has(key), `duplicate author owner ${key}`)
    ownerByKey.set(key, owner)
    owners.push(owner)
  }

  for (const scene of scenes) {
    for (const [entityIndex, entity] of scene.entities.entries()) {
      const entityId = entity.id as string
      const rawPages = entity.pages
      if (rawPages === undefined) continue
      assert(Array.isArray(rawPages), `entity pages invalid ${scene.id}/${entityId}`)
      assert(rawPages.length === 1, `PAL multi-page owner requires naming ${scene.id}/${entityId}`)
      for (const [pageIndex, rawPage] of rawPages.entries()) {
        assert(isRecord(rawPage), `entity page invalid ${scene.id}/${entityId}/${pageIndex}`)
        const pageId = 'default'
        const pageIdentity: EntityPageIdentity = {
          kind: 'entity-page',
          sceneId: scene.id,
          entityId,
          pageId,
        }
        const pagePointer = `/entities/${entityIndex}/pages/${pageIndex}`
        const pageSource = sourceCell(
          { kind: 'source-cell', source: scene.path, pointer: pagePointer },
          rawPage,
        )
        const groupId = `p4-page-${scene.id}-${entityId}-${pageId}`
        const group = createGroup(
          groups,
          groupId,
          'page-owner-allocation-group',
          'allocate-entity-page-v1',
        )
        addSource(group, pageSource)
        addTarget(group, pageIdentity)
        const allocation: P4EntityPageAllocation = {
          kind: 'entity-page-allocation',
          identity: pageIdentity,
          label: '默认模式',
          legacyPageIndex: pageIndex,
          initial: true,
          source: pageSource,
          groupId,
        }
        for (const channel of ['trigger', 'auto'] as const) {
          const rawBinding = rawPage[channel]
          if (rawBinding === undefined) continue
          assert(isRecord(rawBinding), `static ${channel} invalid ${scene.id}/${entityId}`)
          assert(Array.isArray(rawBinding.stages), `static ${channel} stages missing`)
          const behaviorId = 'default'
          const identity: EntityBehaviorIdentity = {
            kind: 'entity-behavior',
            sceneId: scene.id,
            entityId,
            channel,
            behaviorId,
          }
          const behavior: P4EntityBehaviorAllocation = {
            kind: 'entity-behavior-allocation',
            identity,
            label: channel === 'trigger' ? '默认触发行为' : '默认自动行为',
            order: 0,
            origin: 'static-page',
            pageId,
            stages: rawBinding.stages.map((stage, index) =>
              stageEntry(
                stage,
                `${scene.path}#${pagePointer}/${channel}/stages/${index}`,
                bodyHandleById,
              ),
            ),
            sourceCells: [pageSource],
            groupId,
          }
          addOwner(behavior)
          group.ownerKeys.add(ownerKey(identity))
          addTarget(group, identity)
          if (channel === 'trigger') {
            allocation.triggerBehaviorId = behaviorId
            if (rawBinding.on === 'interact' || rawBinding.on === 'touch')
              allocation.triggerActivation = {
                on: rawBinding.on,
                ...(typeof rawBinding.range === 'number' ? { range: rawBinding.range } : {}),
              }
          } else allocation.autoBehaviorId = behaviorId
        }
        pages.push(allocation)
      }
    }
    for (const [property, slot] of [
      ['onEnter', 'onEnter'],
      ['onTeleport', 'onTeleport'],
    ] as const) {
      const rawStages = scene.value[property]
      if (rawStages === undefined) continue
      assert(Array.isArray(rawStages), `static scene hook invalid ${scene.id}/${slot}`)
      const identity: SceneHookIdentity = {
        kind: 'scene-hook',
        sceneId: scene.id,
        slot,
        hookId: 'default',
      }
      const pointer = `/${property}`
      const hookSource = sourceCell({ kind: 'source-cell', source: scene.path, pointer }, rawStages)
      const groupId = `p4-hook-${scene.id}-${slot}-default`
      const group = createGroup(
        groups,
        groupId,
        'scene-hook-allocation-group',
        'allocate-scene-hook-v1',
      )
      addSource(group, hookSource)
      addTarget(group, identity)
      group.ownerKeys.add(ownerKey(identity))
      addOwner({
        kind: 'scene-hook-allocation',
        identity,
        label: slot === 'onEnter' ? '默认进场行为' : '默认传送出口',
        order: 0,
        origin: 'static-scene',
        stages: rawStages.map((stage, index) =>
          stageEntry(stage, `${scene.path}#${pointer}/${index}`, bodyHandleById),
        ),
        sourceCells: [hookSource],
        groupId,
      })
    }
  }

  const dynamicBehaviorDrafts = resolveDynamicBehaviorDrafts({
    audit: args.frozenAudit,
    p3Bodies,
    entityScene,
  })
  const dynamicBehaviorByTarget = new Map<string, P4EntityBehaviorAllocation>()
  const behaviorOrdinal = new Map<string, number>()
  for (const draft of dynamicBehaviorDrafts) {
    const ordinalKey = `${draft.sceneId}:${draft.entityId}:${draft.channel}`
    const ordinal = (behaviorOrdinal.get(ordinalKey) ?? 0) + 1
    behaviorOrdinal.set(ordinalKey, ordinal)
    const behaviorId = `legacy-${String(ordinal).padStart(3, '0')}`
    const identity: EntityBehaviorIdentity = {
      kind: 'entity-behavior',
      sceneId: draft.sceneId,
      entityId: draft.entityId,
      channel: draft.channel,
      behaviorId,
    }
    const groupId = `p4-behavior-${draft.sceneId}-${draft.entityId}-${draft.channel}-${behaviorId}`
    const group = createGroup(
      groups,
      groupId,
      'entity-behavior-allocation-group',
      'allocate-entity-behavior-v1',
    )
    addTarget(group, identity)
    group.ownerKeys.add(ownerKey(identity))
    const sourceCells = draft.sites.map((site) => {
      const rawBody = corpus.byId.get(site.callerBodyId)
      assert(rawBody, `dynamic binding raw caller missing ${site.callerBodyId}`)
      const rawCommand = commandAtPointer(rawBody.body, site.path)
      const cell = sourceCell(
        {
          kind: 'legacy-script-cell',
          scriptId: site.callerBodyId,
          pointer: site.path,
        },
        rawCommand,
      )
      addSource(group, cell)
      addTarget(group, cell.identity)
      return cell
    })
    const handle = bodyHandleById.get(draft.targetLegacyScriptId)
    assert(handle, `dynamic behavior target missing ${draft.targetLegacyScriptId}`)
    const allocation: P4EntityBehaviorAllocation = {
      kind: 'entity-behavior-allocation',
      identity,
      label: `${draft.channel === 'trigger' ? '触发' : '自动'}行为 ${ordinal}`,
      order: ordinal,
      origin: 'dynamic-binding',
      stages: [
        {
          stageId: 'initial',
          legacyStageIndex: 0,
          entryLegacyScriptId: draft.targetLegacyScriptId,
          entryHandle: handle,
        },
      ],
      sourceCells,
      groupId,
    }
    addOwner(allocation)
    dynamicBehaviorByTarget.set(draft.targetLegacyScriptId, allocation)
  }

  const p2Resolution = args.p3.ownerResolutions[0]
  const p2Identity = p2Resolution.target
  const p2Body = retainedById.get(p2Resolution.legacyScriptId)
  assert(p2Body, 'P2 resolved behavior body missing')
  const p2Owner: P4EntityBehaviorAllocation = {
    kind: 'entity-behavior-allocation',
    identity: clone(p2Identity),
    label: p2Resolution.label,
    order: 1,
    origin: 'p2-special',
    stages: [
      {
        stageId: 'initial',
        legacyStageIndex: 0,
        entryLegacyScriptId: p2Resolution.legacyScriptId,
        entryHandle: p2Body.handle,
      },
    ],
    sourceCells: [
      {
        identity: {
          kind: 'source-cell',
          source: p2Resolution.installer.source,
          pointer: p2Resolution.installer.pointer,
        },
        baseCellSha256: p2Resolution.installer.beforeSha256,
      },
    ],
    groupId: 's018-owner-resolution',
  }
  addOwner(p2Owner)

  const dynamicHookDrafts = resolveDynamicHookDrafts(args.frozenAudit)
  const dynamicHookBySite = new Map<string, P4SceneHookAllocation>()
  const hookOrdinal = new Map<string, number>()
  for (const draft of dynamicHookDrafts) {
    const ordinalKey = `${draft.sceneId}:${draft.slot}`
    const ordinal = (hookOrdinal.get(ordinalKey) ?? 0) + 1
    hookOrdinal.set(ordinalKey, ordinal)
    const hookId = `legacy-${String(ordinal).padStart(3, '0')}`
    const identity: SceneHookIdentity = {
      kind: 'scene-hook',
      sceneId: draft.sceneId,
      slot: draft.slot,
      hookId,
    }
    const groupId = `p4-hook-${draft.sceneId}-${draft.slot}-${hookId}`
    const group = createGroup(
      groups,
      groupId,
      'scene-hook-allocation-group',
      'allocate-scene-hook-v1',
    )
    addTarget(group, identity)
    group.ownerKeys.add(ownerKey(identity))
    const sourceCells = draft.sites.map((site) => {
      const rawBody = corpus.byId.get(site.callerBodyId)
      assert(rawBody, `dynamic hook caller missing ${site.callerBodyId}`)
      const rawCommand = commandAtPointer(rawBody.body, site.path)
      const cell = sourceCell(
        {
          kind: 'legacy-script-cell',
          scriptId: site.callerBodyId,
          pointer: site.path,
        },
        rawCommand,
      )
      addSource(group, cell)
      addTarget(group, cell.identity)
      return cell
    })
    const allocation: P4SceneHookAllocation = {
      kind: 'scene-hook-allocation',
      identity,
      label: `${draft.slot === 'onEnter' ? '进场' : '传送出口'}行为 ${ordinal}`,
      order: ordinal,
      origin: 'dynamic-binding',
      stages: draft.targetIds.map((target, index) => {
        const handle = bodyHandleById.get(target)
        assert(handle, `dynamic hook target missing ${target}`)
        return {
          stageId: allocateP4StageId(index),
          legacyStageIndex: index,
          entryLegacyScriptId: target,
          entryHandle: handle,
        }
      }),
      sourceCells,
      groupId,
    }
    addOwner(allocation)
    for (const site of draft.sites)
      dynamicHookBySite.set(`${site.callerBodyId}#${site.path}`, allocation)
  }

  const commandRewrites: P4CommandRewrite[] = []
  const rewriteByCell = new Map<string, P4CommandRewrite>()
  let standaloneRewriteOrdinal = 0
  for (const site of args.p3.commandSites) {
    if (site.disposition === 'transitioned-p2') {
      const scene = args.migration.files.get(p2Resolution.installer.source)
      assert(scene, 'P2 installer source missing')
      const before = commandAtPointer(scene, p2Resolution.installer.pointer)
      commandRewrites.push({
        source: {
          identity: {
            kind: 'source-cell',
            source: p2Resolution.installer.source,
            pointer: p2Resolution.installer.pointer,
          },
          baseCellSha256: p2Resolution.installer.beforeSha256,
        },
        legacyKind: 'setEntityTrigger',
        transitionedIn: 'P2',
        before: clone(before),
        after: clone(p2Resolution.installer.after),
        groupId: 's018-owner-resolution',
      })
      continue
    }
    assert(site.source.startsWith('legacy-script:'), `P4 command source unsupported ${site.source}`)
    const separator = site.source.indexOf('#')
    const callerLegacyScriptId = site.source.slice('legacy-script:'.length, separator)
    const path = site.source.slice(separator + 1)
    const rawBody = corpus.byId.get(callerLegacyScriptId)
    assert(rawBody, `command caller missing ${callerLegacyScriptId}`)
    const before = commandAtPointer(rawBody.body, path)
    assert(
      isRecord(before) &&
        typeof before.kind === 'string' &&
        LEGACY_COMMAND_KINDS.has(before.kind as P2LegacyCommandKind),
      `legacy command missing ${site.source}`,
    )
    const source = sourceCell(
      { kind: 'legacy-script-cell', scriptId: callerLegacyScriptId, pointer: path },
      before,
    )
    let after: P4SelectionCommand
    let groupId: string | undefined
    if (site.kind === 'setEntityAuto' || site.kind === 'setEntityTrigger') {
      assert(typeof before.entity === 'string', `binding entity missing ${site.source}`)
      const sceneId = entityScene.get(before.entity)
      assert(sceneId, `binding entity scene missing ${before.entity}`)
      const channel = site.kind === 'setEntityAuto' ? 'auto' : 'trigger'
      if (site.representation === 'script-ref') {
        assert(site.targetLegacyScriptId, `binding target missing ${site.source}`)
        const allocation = dynamicBehaviorByTarget.get(site.targetLegacyScriptId)
        assert(allocation, `dynamic behavior allocation missing ${site.targetLegacyScriptId}`)
        groupId = allocation.groupId
        after = {
          kind: 'selectEntityBehavior',
          scene: sceneId,
          entity: before.entity,
          channel,
          selection: { kind: 'use', value: allocation.identity.behaviorId },
        }
      } else {
        assert(
          Array.isArray(before.stages) && before.stages.length === 0,
          `inline entity binding is not disable ${site.source}`,
        )
        after = {
          kind: 'selectEntityBehavior',
          scene: sceneId,
          entity: before.entity,
          channel,
          selection: { kind: 'disabled' },
        }
      }
    } else if (site.kind === 'setEntityTriggerMode') {
      assert(typeof before.entity === 'string', `trigger mode entity missing ${site.source}`)
      const sceneId = entityScene.get(before.entity)
      assert(sceneId, `trigger mode entity scene missing ${before.entity}`)
      after = {
        kind: 'setEntityTriggerActivation',
        scene: sceneId,
        entity: before.entity,
        selection:
          before.on === 'interact' || before.on === 'touch'
            ? {
                kind: 'use',
                value: {
                  on: before.on,
                  ...(typeof before.range === 'number' ? { range: before.range } : {}),
                },
              }
            : { kind: 'disabled' },
      }
    } else if (site.kind === 'setSceneOnEnter' || site.kind === 'setSceneOnTeleport') {
      const allocation = dynamicHookBySite.get(`${callerLegacyScriptId}#${path}`)
      assert(allocation, `dynamic hook allocation missing ${site.source}`)
      groupId = allocation.groupId
      const slot = site.kind === 'setSceneOnEnter' ? 'onEnter' : 'onTeleport'
      after = {
        kind: 'selectSceneHooks',
        scene: allocation.identity.sceneId,
        selection: { [slot]: { kind: 'use', value: allocation.identity.hookId } },
      }
    } else {
      assert(
        site.kind === 'clearSceneScripts' && typeof before.scene === 'string',
        `clear scene command invalid ${site.source}`,
      )
      after = {
        kind: 'selectSceneHooks',
        scene: before.scene,
        selection: {
          onEnter: { kind: 'disabled' },
          onTeleport: { kind: 'disabled' },
        },
      }
    }
    if (!groupId) {
      standaloneRewriteOrdinal++
      groupId = `p4-selection-rewrite-${String(standaloneRewriteOrdinal).padStart(3, '0')}`
      createGroup(
        groups,
        groupId,
        'selection-command-rewrite-group',
        'rewrite-selection-command-v1',
      )
    }
    const rewrite: P4CommandRewrite = {
      source,
      legacyKind: site.kind,
      transitionedIn: 'P4',
      before: clone(before),
      after,
      groupId,
    }
    commandRewrites.push(rewrite)
    const key = `${callerLegacyScriptId}#${path}`
    assert(!rewriteByCell.has(key), `duplicate command rewrite ${key}`)
    rewriteByCell.set(key, rewrite)
    const group = groups.get(groupId)
    assert(group, `command rewrite group missing ${groupId}`)
    addSource(group, source)
    addTarget(group, source.identity)
    group.rewriteSources.add(sourceIdentityKey(source.identity))
  }
  commandRewrites.sort((left, right) =>
    stableStringCompare(
      sourceIdentityKey(left.source.identity),
      sourceIdentityKey(right.source.identity),
    ),
  )
  assert(commandRewrites.length === 844, `command rewrite count drift ${commandRewrites.length}`)
  assert(rewriteByCell.size === 843, `P4 command rewrite count drift ${rewriteByCell.size}`)

  const ownerKeysByBody = new Map<string, Set<string>>(
    args.frozenAudit.product.bodies.map((body) => [body.id, new Set()]),
  )
  const queue: string[] = []
  const seed = (legacyScriptId: string, key: string): void => {
    const ownerSet = ownerKeysByBody.get(legacyScriptId)
    assert(ownerSet, `owner seed target missing ${legacyScriptId}`)
    if (!ownerSet.has(key)) {
      ownerSet.add(key)
      queue.push(legacyScriptId)
    }
  }
  for (const owner of owners) {
    const key = ownerKey(owner.identity)
    for (const stage of owner.stages) seed(stage.entryLegacyScriptId, key)
  }
  const executionTargets = new Map<string, string[]>()
  for (const site of args.frozenAudit.product.references.sites) {
    if (site.flow !== 'execution') continue
    const targets = executionTargets.get(site.callerBodyId) ?? []
    targets.push(site.targetId)
    executionTargets.set(site.callerBodyId, targets)
  }
  while (queue.length) {
    const caller = queue.shift()!
    const callerOwners = ownerKeysByBody.get(caller)
    assert(callerOwners, `owner propagation caller missing ${caller}`)
    for (const target of executionTargets.get(caller) ?? []) {
      const targetOwners = ownerKeysByBody.get(target)
      if (!targetOwners) continue
      for (const key of callerOwners) {
        if (!targetOwners.has(key)) {
          targetOwners.add(key)
          queue.push(target)
        }
      }
    }
  }

  const p4Candidates = args.p3.retainedBodies.filter(
    (body) => body.status.kind !== 'resolved-entity-behavior' && body.status.work.phase === 'P4',
  )
  assert(p4Candidates.length === 7_055, `P4 candidate count drift ${p4Candidates.length}`)
  const unowned = p4Candidates.filter(
    (body) => (ownerKeysByBody.get(body.legacyScriptId)?.size ?? 0) === 0,
  )
  assert(!unowned.length, `unowned P4 body ${unowned[0]?.legacyScriptId}`)
  const singleOwner = p4Candidates.filter(
    (body) =>
      classifyP4OwnerCardinality(ownerKeysByBody.get(body.legacyScriptId)!.size) ===
      'resolved-owner',
  )
  const crossOwner = p4Candidates.filter(
    (body) =>
      classifyP4OwnerCardinality(ownerKeysByBody.get(body.legacyScriptId)!.size) ===
      'deferred-cross-owner',
  )
  assert(singleOwner.length === 7_038, `single-owner body drift ${singleOwner.length}`)
  assert(crossOwner.length === 17, `cross-owner body drift ${crossOwner.length}`)

  const ownerFragments: P4OwnerFragment[] = [...singleOwner, p2Body]
    .map((body) => {
      const keys = ownerKeysByBody.get(body.legacyScriptId)
      assert(keys?.size === 1, `fragment owner ambiguity ${body.legacyScriptId}`)
      const key = [...keys][0]!
      const allocation = ownerByKey.get(key)
      assert(allocation, `fragment allocation missing ${key}`)
      const fragment: P4OwnerFragment = {
        handle: body.handle,
        legacyScriptId: body.legacyScriptId,
        activeRefId: body.activeRefId,
        baseCellSha256: body.baseCellSha256,
        body: rewriteBody(body.body, body.legacyScriptId, rewriteByCell),
        owner: clone(allocation.identity),
        evidenceId: `p4:${args.frozenAudit.digest}:owner:${body.legacyScriptId}`,
      }
      if (body.legacyScriptId !== p2Resolution.legacyScriptId) {
        const group = groups.get(allocation.groupId)
        assert(group, `fragment group missing ${allocation.groupId}`)
        addSource(group, legacyBodyCell(body.legacyScriptId, body.baseCellSha256))
        group.fragmentIds.add(body.legacyScriptId)
      }
      return fragment
    })
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))

  const crossOwnerIds = new Set(crossOwner.map((body) => body.legacyScriptId))
  const retainedBodies: P4RetainedBody[] = args.p3.retainedBodies
    .filter(
      (body) =>
        body.legacyScriptId !== p2Resolution.legacyScriptId &&
        !singleOwner.some((candidate) => candidate.legacyScriptId === body.legacyScriptId),
    )
    .map((body) => {
      let work: P4FutureWork
      if (crossOwnerIds.has(body.legacyScriptId))
        work = { phase: 'P6', reason: 'p4-cross-owner-reuse' }
      else {
        assert(
          body.status.kind !== 'resolved-entity-behavior',
          `unexpected resolved body ${body.legacyScriptId}`,
        )
        assert(
          body.status.work.phase === 'P5' || body.status.work.phase === 'P6',
          `unresolved P4 body survived ${body.legacyScriptId}`,
        )
        work = clone(body.status.work) as P4FutureWork
      }
      return {
        ...clone(body),
        body: rewriteBody(body.body, body.legacyScriptId, rewriteByCell),
        status:
          body.status.kind === 'pending-owner'
            ? { kind: 'pending-owner' as const, ownerKind: body.status.ownerKind, work }
            : { kind: 'future' as const, work },
      }
    })
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  assert(retainedBodies.length === 464, `retained body count drift ${retainedBodies.length}`)

  const pendingOwnerLinks: P4PendingOwnerLink[] = retainedBodies
    .map((body) => ({
      legacyScriptId: body.legacyScriptId,
      handle: body.handle,
      phase: body.status.work.phase,
      owners: [...(ownerKeysByBody.get(body.legacyScriptId) ?? [])]
        .map((key) => {
          const allocation = ownerByKey.get(key)
          assert(allocation, `pending owner allocation missing ${key}`)
          return clone(allocation.identity)
        })
        .sort((left, right) => stableStringCompare(ownerKey(left), ownerKey(right))),
    }))
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))

  const flowStructures = args.p3.flowStructures.map((structure) => ({
    ...clone(structure),
    target: {
      ...clone(structure.target),
      body: rewriteBody(structure.target.body, structure.target.legacyScriptId, rewriteByCell),
    },
  }))

  const transitionGroups: P4OwnerTransitionGroup[] = [...groups]
    .map(([id, draft]) => {
      assert(draft.sources.size, `group has no sources ${id}`)
      const evidenceId = `p4:${args.frozenAudit.digest}:group:${id}`
      return {
        kind: draft.kind,
        id,
        transformId: draft.transformId,
        editPolicy: 'conflict-if-modified' as const,
        sources: [...draft.sources.values()].sort((left, right) =>
          stableStringCompare(sourceIdentityKey(left.identity), sourceIdentityKey(right.identity)),
        ),
        targets: [...draft.targets].sort((left, right) =>
          stableStringCompare(targetKey(left), targetKey(right)),
        ),
        outcome: {
          kind:
            draft.kind === 'selection-command-rewrite-group'
              ? ('rewritten-to-stable-selection' as const)
              : ('allocated-to-named-owner' as const),
          ownerCount: draft.ownerKeys.size,
          fragmentCount: draft.fragmentIds.size,
          commandRewriteCount: draft.rewriteSources.size,
        },
        evidenceId,
        dependsOn: [],
      }
    })
    .sort((left, right) => stableStringCompare(left.id, right.id))
  assert(transitionGroups.length === 4_620, `P4 group count drift ${transitionGroups.length}`)

  pages.sort((left, right) =>
    stableStringCompare(
      `${left.identity.sceneId}:${left.identity.entityId}:${left.identity.pageId}`,
      `${right.identity.sceneId}:${right.identity.entityId}:${right.identity.pageId}`,
    ),
  )
  owners.sort((left, right) =>
    stableStringCompare(ownerKey(left.identity), ownerKey(right.identity)),
  )
  const census = ownerCensus({
    pages,
    owners,
    rewrites: commandRewrites,
    fragments: ownerFragments,
    crossOwner: crossOwner.length,
  })
  const pendingByPhase = { P4: 0, P5: 0, P6: 0 }
  for (const body of retainedBodies) pendingByPhase[body.status.work.phase]++
  assert(
    isDeepStrictEqual(pendingByPhase, { P4: 0, P5: 433, P6: 31 }),
    `pending phase drift ${JSON.stringify(pendingByPhase)}`,
  )

  const irWithoutDigest: Omit<ScriptMigrationIRP4, 'digest'> = {
    kind: 'script-migration-ir',
    version: 1,
    throughPhase: 'P4',
    generatorEpoch: 'n3-script-v5-p4-v1',
    canonical: false,
    runtimeConsumable: false,
    sourceAudit: clone(args.p3.sourceAudit),
    previousPhase: {
      irDigest: args.p3.digest,
      ledgerDigest: args.p3Ledger.digest,
    },
    source: clone(args.p3.source),
    commandCensus: clone(args.p3.commandCensus),
    commandSites: clone(args.p3.commandSites),
    commandTransition: commandTransitionSummary(args.p3.commandCensus),
    commandRewrites,
    retainedBodies,
    tombstones: clone(args.p3.tombstones),
    ownerResolutions: clone(args.p3.ownerResolutions),
    flowStructures,
    flowCensus: clone(args.p3.flowCensus),
    sizeGates: clone(args.p3.sizeGates),
    pages,
    owners,
    ownerFragments,
    pendingOwnerLinks,
    ownerCensus: census,
    pendingByPhase,
  }
  const ir = digestRecord<ScriptMigrationIRP4>(irWithoutDigest)
  const ledger = buildLedger({
    p3: args.p3,
    p3Ledger: args.p3Ledger,
    irWithoutDigest,
    groups: transitionGroups,
  })
  return { ir, ledger }
}
