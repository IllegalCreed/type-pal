import { isDeepStrictEqual } from 'node:util'
import { type Command, isScriptRef } from '@type-pal/content'
import { sha256 } from '../../migration-baseline.js'
import type { MigrationFileSet } from '../../pal-migration.js'
import type { ScriptBodyAudit, ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import {
  commandAtPointer,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
  rewriteScriptRefs,
} from './source-v4.js'
import { digestRecord, stableStringCompare } from './stable-json.js'
import type {
  EntityBehaviorIdentity,
  LegacyBodyHandle,
  P2BodyFutureWork,
  P2CommandTransitionSummary,
  P2LegacyCommandKind,
  P2OwnerResolution,
  P2PendingOwnerKind,
  P2PendingTransition,
  P2RetainedBody,
  P2Tombstone,
  P2TransitionEvidence,
  P2TransitionGroup,
  ScriptMigrationIRP2,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

export const PAL_P0_SCRIPT_AUDIT_DIGEST =
  '15c237c52e24c5e456cd5b36753689be511412921914dbd2c51de7e2f0dc0242'
export const PAL_P0_SPRITE_FOLDED_LIST_DIGEST =
  '9d977363e9098971a035c6269c802b17bd207f33011c3820db4c9229b341566f'
export const PAL_P0_HOSTILE_FOLDED_LIST_DIGEST =
  'dfc2596816af080e9d26e44f325f28d3186d2d983547737f215b53de9605f7d0'

const S018_LEGACY_BODY = 'scene/s015/L-4211/e204/d-0a386828' as const
const S018_ACTIVE_REF = 'ir/p2/entity-behavior/s015/e204/trigger/enter-s018'
const LEGACY_COMMAND_KINDS: P2LegacyCommandKind[] = [
  'setEntityAuto',
  'setEntityTrigger',
  'setEntityTriggerMode',
  'setSceneOnEnter',
  'setSceneOnTeleport',
  'clearSceneScripts',
]
const S018_TARGET: EntityBehaviorIdentity = {
  kind: 'entity-behavior',
  sceneId: 's015',
  entityId: 'e204',
  channel: 'trigger',
  behaviorId: 'enter-s018',
}

interface PendingSccAllocation {
  activeRefId: string
  ownerKind: P2PendingOwnerKind
  phase: 'P3' | 'P4' | 'P6'
}

/**
 * P2 的 id 仅是 shadow IR 内部、显式冻结的过渡 handle，不是作者身份。
 * 最终吸收到 flow/hook/作者共享脚本的稳定身份由 P3/P4/P6 ledger 完成。
 */
const PENDING_SCC_ALLOCATIONS = {
  'shared/scc-L-27506/L-27506/none/d-13eac5be': {
    activeRefId: 'ir/p2/pending/scene-s182-on-enter-tail-a',
    ownerKind: 'pending-scene-hook-inline',
    phase: 'P4',
  },
  'shared/scc-L-27510/L-27510/none/d-92510afd': {
    activeRefId: 'ir/p2/pending/scene-s182-on-enter-tail-b',
    ownerKind: 'pending-scene-hook-inline',
    phase: 'P4',
  },
  'shared/scc-L-38780/L-38780/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-use-shared-tail-a',
    ownerKind: 'pending-shared-tail',
    phase: 'P6',
  },
  'shared/scc-L-39613/L-39613/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-280-author-root',
    ownerKind: 'pending-author-root-absorption',
    phase: 'P6',
  },
  'shared/scc-L-39663/L-39663/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-use-flow-a',
    ownerKind: 'pending-flow-structure',
    phase: 'P3',
  },
  'shared/scc-L-39753/L-39753/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-290-author-root',
    ownerKind: 'pending-author-root-absorption',
    phase: 'P6',
  },
  'shared/scc-L-39793/L-39793/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-265-author-root',
    ownerKind: 'pending-author-root-absorption',
    phase: 'P6',
  },
  'shared/scc-L-39799/L-39799/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-266-author-root',
    ownerKind: 'pending-author-root-absorption',
    phase: 'P6',
  },
  'shared/scc-L-39805/L-39805/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-267-author-root',
    ownerKind: 'pending-author-root-absorption',
    phase: 'P6',
  },
  'shared/scc-L-39811/L-39811/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-use-shared-tail-b',
    ownerKind: 'pending-shared-tail',
    phase: 'P6',
  },
  'shared/scc-L-39835/L-39835/global/items/d-0a386828': {
    activeRefId: 'ir/p2/pending/item-293-author-root',
    ownerKind: 'pending-author-root-absorption',
    phase: 'P6',
  },
  'shared/scc-L-41075/L-41075/none/d-4037dfb1': {
    activeRefId: 'ir/p2/pending/scene-s145-on-enter-tail',
    ownerKind: 'pending-scene-hook-inline',
    phase: 'P4',
  },
  'shared/scc-L-41075/L-41075/none/d-4f05e003': {
    activeRefId: 'ir/p2/pending/scene-s117-on-enter-tail',
    ownerKind: 'pending-scene-hook-inline',
    phase: 'P4',
  },
} as const satisfies Record<string, PendingSccAllocation>

function bodyHandle(legacyScriptId: string): LegacyBodyHandle {
  return `ir-body-${sha256(legacyScriptId).slice(0, 20)}`
}

function assertPalP0Audit(
  current: ScriptControlFlowAuditV1,
  frozen: ScriptControlFlowAuditV1,
): void {
  if (frozen.methodVersion !== 'n3-p0-v1')
    throw new Error(`P2 source audit method drift: ${frozen.methodVersion}`)
  if (frozen.digest !== PAL_P0_SCRIPT_AUDIT_DIGEST)
    throw new Error(`P2 frozen audit digest drift: ${frozen.digest}`)
  if (current.digest !== frozen.digest || !isDeepStrictEqual(current, frozen))
    throw new Error(
      `P2 current audit differs from frozen P0: ${current.digest} != ${frozen.digest}`,
    )
  if (frozen.issues.length)
    throw new Error(`P2 frozen audit has issues: ${frozen.issues.join(',')}`)
  const folded = frozen.product.folded
  if (
    frozen.summary.productBodies !== 11_447 ||
    frozen.summary.runtimeReachableBodies !== 8_102 ||
    frozen.summary.unreachableBodies !== 3_345 ||
    folded.spriteAction.bodies.length !== 863 ||
    folded.hostileBehavior.bodies.length !== 2_482 ||
    folded.overlap.length !== 0 ||
    folded.unclassifiedUnreachable.length !== 0
  )
    throw new Error('P2 frozen P0 body conservation drift')
  if (sha256(`${folded.spriteAction.bodies.join('\n')}\n`) !== PAL_P0_SPRITE_FOLDED_LIST_DIGEST)
    throw new Error('P2 sprite folded list drift')
  if (sha256(`${folded.hostileBehavior.bodies.join('\n')}\n`) !== PAL_P0_HOSTILE_FOLDED_LIST_DIGEST)
    throw new Error('P2 hostile folded list drift')
  if (
    !isDeepStrictEqual(
      frozen.canaries.misleadingSccBodies.map((body) => body.id),
      Object.keys(PENDING_SCC_ALLOCATIONS),
    )
  )
    throw new Error('P2 misleading shared/scc canary drift')
  if (
    frozen.canaries.misleadingSccBodies.some(
      (body) => !body.reachable || body.productCyclic || body.sourceCyclic !== false,
    )
  )
    throw new Error('P2 misleading shared/scc classification drift')
}

function futureWorkFor(body: ScriptBodyAudit): P2BodyFutureWork {
  if (body.productComponent.cyclic) return { phase: 'P5', reason: 'cyclic-flow' }
  if (body.category === 'shared-author') return { phase: 'P6', reason: 'author-root-body' }
  if (body.category === 'scene-root') return { phase: 'P4', reason: 'entity-or-hook-owner' }
  return { phase: 'P3', reason: 'acyclic-scene-flow' }
}

function isCommandRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function s018Resolution(
  migration: MigrationFileSet,
  frozen: ScriptControlFlowAuditV1,
): P2OwnerResolution {
  const scene = migration.files.get('content/scenes/s018.json')
  if (!scene) throw new Error('P2 s018: scene file missing')
  const command = commandAtPointer(scene, '/onEnter/0/entry/prepare/0')
  if (
    !isCommandRecord(command) ||
    command.kind !== 'setEntityTrigger' ||
    command.entity !== 'e204' ||
    !isScriptRef(command.script) ||
    command.script.id !== S018_LEGACY_BODY
  )
    throw new Error('P2 s018: installer canary drift')
  const canary = frozen.canaries.s018
  if (
    canary.length !== 1 ||
    canary[0]?.source !== 'content/scenes/s018.json' ||
    canary[0].targetId !== S018_LEGACY_BODY
  )
    throw new Error('P2 s018: audit canary drift')
  const preservedDefaultTriggerBodyIds = frozen.product.entries.sites
    .filter(
      (entry) =>
        entry.source === 'content/scenes/s015.json' &&
        entry.targetId.includes('root/entity-e204/page-0/trigger/'),
    )
    .map((entry) => entry.targetId)
    .sort()
  if (!preservedDefaultTriggerBodyIds.length)
    throw new Error('P2 s018: s015/e204 default trigger missing')
  if (preservedDefaultTriggerBodyIds.includes(S018_LEGACY_BODY))
    throw new Error('P2 s018: dynamic behavior was merged with default trigger')
  return {
    legacyScriptId: S018_LEGACY_BODY,
    target: S018_TARGET,
    label: '进入 s018',
    installer: {
      source: 'content/scenes/s018.json',
      pointer: '/onEnter/0/entry/prepare/0',
      beforeSha256: legacyAuthorCellSha256(command),
      before: {
        kind: 'setEntityTrigger',
        entity: 'e204',
        targetLegacyScriptId: S018_LEGACY_BODY,
      },
      after: {
        kind: 'selectEntityBehavior',
        scene: 's015',
        entity: 'e204',
        channel: 'trigger',
        selection: { kind: 'use', value: 'enter-s018' },
      },
    },
    preservedDefaultTriggerBodyIds,
  }
}

function draftLedger(
  frozen: ScriptControlFlowAuditV1,
  retained: readonly P2RetainedBody[],
  tombstones: readonly P2Tombstone[],
  ownerResolution: P2OwnerResolution,
): ScriptTransitionLedgerDraftV1 {
  const resolved = retained.find((body) => body.legacyScriptId === ownerResolution.legacyScriptId)
  if (!resolved) throw new Error('P2 ledger: s018 target body missing')
  const installerCell = {
    kind: 'source-cell' as const,
    source: ownerResolution.installer.source,
    pointer: ownerResolution.installer.pointer,
  }
  const entries = [
    ...tombstones.map((body) => ({
      from: { kind: 'legacy-script' as const, id: body.legacyScriptId },
      baseCellSha256: body.baseCellSha256,
      outcome: {
        kind: 'tombstone' as const,
        reason: body.reason,
        evidenceId: body.evidenceId,
      },
    })),
    {
      from: { kind: 'legacy-script' as const, id: ownerResolution.legacyScriptId },
      baseCellSha256: resolved.baseCellSha256,
      outcome: {
        kind: 'group' as const,
        groupId: 's018-owner-resolution' as const,
      },
    },
    {
      from: installerCell,
      baseCellSha256: ownerResolution.installer.beforeSha256,
      outcome: {
        kind: 'group' as const,
        groupId: 's018-owner-resolution' as const,
      },
    },
  ].sort((left, right) =>
    stableStringCompare(
      left.from.kind === 'legacy-script'
        ? `legacy-script:${left.from.id}`
        : `source-cell:${left.from.source}#${left.from.pointer}`,
      right.from.kind === 'legacy-script'
        ? `legacy-script:${right.from.id}`
        : `source-cell:${right.from.source}#${right.from.pointer}`,
    ),
  )
  const groupEvidenceId = `p0:${frozen.digest}:s018-owner-resolution`
  const groups: [P2TransitionGroup] = [
    {
      kind: 'transition-group',
      id: 's018-owner-resolution',
      transformId: 'resolve-s018-owner-v1',
      editPolicy: 'conflict-if-modified',
      sources: [
        {
          identity: { kind: 'legacy-script', id: ownerResolution.legacyScriptId },
          baseCellSha256: resolved.baseCellSha256,
        },
        {
          identity: installerCell,
          baseCellSha256: ownerResolution.installer.beforeSha256,
        },
      ],
      targets: [ownerResolution.target, installerCell],
      evidenceId: groupEvidenceId,
    },
  ]
  const evidence: P2TransitionEvidence[] = [
    ...tombstones.map((body) => ({
      id: body.evidenceId,
      kind: 'folded-body' as const,
      sourceAuditDigest: frozen.digest,
      legacyScriptIds: [body.legacyScriptId],
      sourceCells: [],
    })),
    {
      id: groupEvidenceId,
      kind: 's018-owner-resolution' as const,
      sourceAuditDigest: frozen.digest,
      legacyScriptIds: [ownerResolution.legacyScriptId],
      sourceCells: [`${ownerResolution.installer.source}#${ownerResolution.installer.pointer}`],
    },
  ].sort((left, right) => stableStringCompare(left.id, right.id))
  const pending: P2PendingTransition[] = retained
    .flatMap((body) => {
      if (body.status.kind === 'resolved-entity-behavior') return []
      const work = body.status.work
      return [
        {
          legacyScriptId: body.legacyScriptId,
          handle: body.handle,
          phase: work.phase,
          reason: work.reason,
        },
      ]
    })
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  return digestRecord<ScriptTransitionLedgerDraftV1>({
    kind: 'script-transition-ledger-draft',
    version: 1,
    projectId: 'pal',
    transitionId: 'script-v4-v5',
    generatorEpoch: 'n3-script-v5-p2-v1',
    throughPhase: 'P2',
    sourceAudit: {
      methodVersion: frozen.methodVersion,
      digest: frozen.digest,
    },
    completed: ['folded-body-pruning', 'misleading-scc-retirement', 's018-owner-resolution'],
    entries,
    groups,
    evidence,
    pending,
  })
}

export interface P2TransformResult {
  ir: ScriptMigrationIRP2
  ledger: ScriptTransitionLedgerDraftV1
}

function commandTransitionSummary(
  sites: readonly import('./types.js').P2LegacyCommandSite[],
): P2CommandTransitionSummary {
  const byKind = Object.fromEntries(
    LEGACY_COMMAND_KINDS.map((kind) => {
      const matching = sites.filter((site) => site.kind === kind)
      const transitionedP2 = matching.filter(
        (site) => site.disposition === 'transitioned-p2',
      ).length
      return [
        kind,
        {
          input: matching.length,
          legacyPending: matching.length - transitionedP2,
          transitionedP2,
        },
      ]
    }),
  ) as P2CommandTransitionSummary['byKind']
  const transitionedP2 = sites.filter((site) => site.disposition === 'transitioned-p2').length
  return {
    input: sites.length,
    legacyPending: sites.length - transitionedP2,
    transitionedP2,
    byKind,
  }
}

export function buildP2ScriptMigrationIR(args: {
  migration: MigrationFileSet
  currentAudit: ScriptControlFlowAuditV1
  frozenAudit: ScriptControlFlowAuditV1
}): P2TransformResult {
  assertPalP0Audit(args.currentAudit, args.frozenAudit)
  const frozen = args.frozenAudit
  const corpus = readV4ScriptCorpus(args.migration)
  if (corpus.bodies.length !== frozen.summary.productBodies)
    throw new Error(`P2 corpus count drift: ${corpus.bodies.length}`)
  const census = corpus.commandCensus
  if (
    census.setEntityAuto !== 388 ||
    census.setEntityTrigger !== 202 ||
    census.setSceneOnEnter !== 60 ||
    census.setSceneOnTeleport !== 1 ||
    census.setEntityTriggerMode !== 192 ||
    census.clearSceneScripts !== 1 ||
    census.total !== 844
  )
    throw new Error(`P2 legacy command census drift: ${JSON.stringify(census)}`)
  const commandTransition = commandTransitionSummary(corpus.commandSites)
  if (
    commandTransition.byKind.setEntityTrigger.input !== 202 ||
    commandTransition.byKind.setEntityTrigger.legacyPending !== 201 ||
    commandTransition.byKind.setEntityTrigger.transitionedP2 !== 1 ||
    commandTransition.input !== 844 ||
    commandTransition.legacyPending !== 843 ||
    commandTransition.transitionedP2 !== 1
  )
    throw new Error(
      `P2 legacy command transition conservation drift: ${JSON.stringify(commandTransition)}`,
    )

  const auditBodies = new Map(frozen.product.bodies.map((body) => [body.id, body]))
  const handles = new Map(corpus.bodies.map((body) => [body.id, bodyHandle(body.id)] as const))
  if (new Set(handles.values()).size !== handles.size)
    throw new Error('P2 stable body handle collision')
  const spriteFolded = new Set(frozen.product.folded.spriteAction.bodies)
  const hostileFolded = new Set(frozen.product.folded.hostileBehavior.bodies)
  const folded = new Set([...spriteFolded, ...hostileFolded])
  const replacements = new Map<string, string>([
    ...Object.entries(PENDING_SCC_ALLOCATIONS).map(
      ([legacyId, allocation]) => [legacyId, allocation.activeRefId] as const,
    ),
    [S018_LEGACY_BODY, S018_ACTIVE_REF],
  ])

  const tombstones: P2Tombstone[] = corpus.bodies
    .filter((body) => folded.has(body.id))
    .map((body) => {
      const handle = handles.get(body.id)
      if (!handle) throw new Error(`P2 tombstone handle missing ${body.id}`)
      const reason = spriteFolded.has(body.id)
        ? ('folded-sprite-action' as const)
        : ('folded-hostile-behavior' as const)
      return {
        handle,
        legacyScriptId: body.id,
        baseCellSha256: legacyAuthorCellSha256(body.body),
        reason,
        evidenceId: `p0:${frozen.digest}:${reason}:${body.id}`,
      }
    })
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))

  const retainedBodies: P2RetainedBody[] = corpus.bodies
    .filter((body) => !folded.has(body.id))
    .map((body) => {
      const audit = auditBodies.get(body.id)
      const handle = handles.get(body.id)
      if (!audit || !handle) throw new Error(`P2 retained provenance missing ${body.id}`)
      const rewritten = rewriteScriptRefs(body.body, replacements) as Command[]
      const base = {
        handle,
        legacyScriptId: body.id,
        baseCellSha256: legacyAuthorCellSha256(body.body),
        activeRefId: replacements.get(body.id) ?? body.id,
        body: rewritten,
      }
      if (body.id === S018_LEGACY_BODY)
        return {
          ...base,
          status: {
            kind: 'resolved-entity-behavior' as const,
            target: S018_TARGET,
            label: '进入 s018' as const,
          },
        }
      const pending = PENDING_SCC_ALLOCATIONS[body.id as keyof typeof PENDING_SCC_ALLOCATIONS] as
        | PendingSccAllocation
        | undefined
      if (pending)
        return {
          ...base,
          status: {
            kind: 'pending-owner' as const,
            ownerKind: pending.ownerKind,
            work: { phase: pending.phase, reason: pending.ownerKind },
          },
        }
      return {
        ...base,
        status: { kind: 'future' as const, work: futureWorkFor(audit) },
      }
    })
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))

  const ownerResolution = s018Resolution(args.migration, frozen)
  const pendingByPhase = { P3: 0, P4: 0, P5: 0, P6: 0 }
  for (const body of retainedBodies) {
    if (body.status.kind === 'resolved-entity-behavior') continue
    pendingByPhase[body.status.work.phase]++
  }
  const ir = digestRecord<ScriptMigrationIRP2>({
    kind: 'script-migration-ir',
    version: 1,
    throughPhase: 'P2',
    generatorEpoch: 'n3-script-v5-p2-v1',
    canonical: false,
    runtimeConsumable: false,
    sourceAudit: {
      methodVersion: frozen.methodVersion,
      digest: frozen.digest,
    },
    source: {
      productBodies: frozen.summary.productBodies,
      reachableBodies: frozen.summary.runtimeReachableBodies,
      unreachableBodies: frozen.summary.unreachableBodies,
      sourceSnapshotSha256: corpus.sourceSnapshotSha256,
      nonScriptSnapshotSha256: corpus.nonScriptSnapshotSha256,
      scriptLibrarySnapshotSha256: corpus.scriptLibrarySnapshotSha256,
    },
    commandCensus: census,
    commandSites: corpus.commandSites,
    commandTransition,
    retainedBodies,
    tombstones,
    ownerResolutions: [ownerResolution],
    pendingByPhase,
  })
  const ledger = draftLedger(frozen, retainedBodies, tombstones, ownerResolution)
  return { ir, ledger }
}
