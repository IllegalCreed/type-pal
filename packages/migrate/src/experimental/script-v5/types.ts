import type { Command } from '@type-pal/content'

export type ScriptMigrationPhase = 'P2' | 'P3' | 'P4' | 'P5' | 'P6'

export type LegacyBodyHandle = `ir-body-${string}`

export type P2TombstoneReason = 'folded-sprite-action' | 'folded-hostile-behavior'

export type P2PendingOwnerKind =
  | 'pending-author-root-absorption'
  | 'pending-shared-tail'
  | 'pending-scene-hook-inline'
  | 'pending-flow-structure'

export interface LegacyScriptIdentity {
  kind: 'legacy-script'
  id: string
}

export interface EntityBehaviorIdentity {
  kind: 'entity-behavior'
  sceneId: string
  entityId: string
  channel: 'trigger' | 'auto'
  behaviorId: string
}

export interface SourceCellIdentity {
  kind: 'source-cell'
  source: string
  pointer: string
}

export interface P2TombstoneOutcome {
  kind: 'tombstone'
  reason: P2TombstoneReason
  evidenceId: string
}

export interface P2TransitionGroupOutcome {
  kind: 'group'
  groupId: 's018-owner-resolution'
}

export type P2TransitionEntry =
  | {
      from: LegacyScriptIdentity
      baseCellSha256: string
      outcome: P2TombstoneOutcome
    }
  | {
      from: LegacyScriptIdentity | SourceCellIdentity
      baseCellSha256: string
      outcome: P2TransitionGroupOutcome
    }

export interface P2TransitionGroup {
  kind: 'transition-group'
  id: 's018-owner-resolution'
  transformId: 'resolve-s018-owner-v1'
  editPolicy: 'conflict-if-modified'
  sources: [
    {
      identity: LegacyScriptIdentity
      baseCellSha256: string
    },
    {
      identity: SourceCellIdentity
      baseCellSha256: string
    },
  ]
  targets: [EntityBehaviorIdentity, SourceCellIdentity]
  evidenceId: string
}

export interface P2TransitionEvidence {
  id: string
  kind: 'folded-body' | 's018-owner-resolution'
  sourceAuditDigest: string
  legacyScriptIds: string[]
  sourceCells: string[]
}

export interface P2PendingTransition {
  legacyScriptId: string
  handle: LegacyBodyHandle
  phase: 'P3' | 'P4' | 'P5' | 'P6'
  reason:
    | P2PendingOwnerKind
    | 'acyclic-scene-flow'
    | 'cyclic-flow'
    | 'entity-or-hook-owner'
    | 'author-root-body'
}

export interface ScriptTransitionLedgerDraftV1 {
  kind: 'script-transition-ledger-draft'
  version: 1
  projectId: 'pal'
  transitionId: 'script-v4-v5'
  generatorEpoch: 'n3-script-v5-p2-v1'
  throughPhase: 'P2'
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  completed: Array<'folded-body-pruning' | 'misleading-scc-retirement' | 's018-owner-resolution'>
  entries: P2TransitionEntry[]
  groups: [P2TransitionGroup]
  evidence: P2TransitionEvidence[]
  pending: P2PendingTransition[]
  digest: string
}

export interface P2LegacyCommandCensus {
  setEntityAuto: number
  setEntityTrigger: number
  setEntityTriggerMode: number
  setSceneOnEnter: number
  setSceneOnTeleport: number
  clearSceneScripts: number
  total: number
}

export type P2LegacyCommandKind = Exclude<keyof P2LegacyCommandCensus, 'total'>

export interface P2LegacyCommandSite {
  source: string
  kind: P2LegacyCommandKind
  representation: 'script-ref' | 'inline-stages' | 'state-mutation'
  targetLegacyScriptId?: string
  disposition: 'legacy-pending' | 'transitioned-p2'
}

export interface P2CommandTransitionSummary {
  input: number
  legacyPending: number
  transitionedP2: number
  byKind: Record<
    P2LegacyCommandKind,
    {
      input: number
      legacyPending: number
      transitionedP2: number
    }
  >
}

export interface P2SourceSummary {
  productBodies: number
  reachableBodies: number
  unreachableBodies: number
  sourceSnapshotSha256: string
  nonScriptSnapshotSha256: string
  scriptLibrarySnapshotSha256: string
}

export interface P2Tombstone {
  handle: LegacyBodyHandle
  legacyScriptId: string
  baseCellSha256: string
  reason: P2TombstoneReason
  evidenceId: string
}

export interface P2BodyFutureWork {
  phase: 'P3' | 'P4' | 'P5' | 'P6'
  reason: P2PendingTransition['reason']
}

export interface P2RetainedBody {
  handle: LegacyBodyHandle
  legacyScriptId: string
  baseCellSha256: string
  /**
   * 仅供 shadow IR 内部引用。它不是作者身份；P3-P6 必须把仍为 legacy/pending 的节点全部收口。
   */
  activeRefId: string
  body: Command[]
  status:
    | {
        kind: 'future'
        work: P2BodyFutureWork
      }
    | {
        kind: 'pending-owner'
        ownerKind: P2PendingOwnerKind
        work: P2BodyFutureWork
      }
    | {
        kind: 'resolved-entity-behavior'
        target: EntityBehaviorIdentity
        label: string
      }
}

export interface P2InstallerRewrite {
  source: 'content/scenes/s018.json'
  pointer: '/onEnter/0/entry/prepare/0'
  beforeSha256: string
  before: {
    kind: 'setEntityTrigger'
    entity: 'e204'
    targetLegacyScriptId: 'scene/s015/L-4211/e204/d-0a386828'
  }
  after: {
    kind: 'selectEntityBehavior'
    scene: 's015'
    entity: 'e204'
    channel: 'trigger'
    selection: { kind: 'use'; value: 'enter-s018' }
  }
}

export interface P2OwnerResolution {
  legacyScriptId: 'scene/s015/L-4211/e204/d-0a386828'
  target: EntityBehaviorIdentity
  label: '进入 s018'
  installer: P2InstallerRewrite
  preservedDefaultTriggerBodyIds: string[]
}

export interface ScriptMigrationIRP2 {
  kind: 'script-migration-ir'
  version: 1
  throughPhase: 'P2'
  generatorEpoch: 'n3-script-v5-p2-v1'
  canonical: false
  runtimeConsumable: false
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  source: P2SourceSummary
  commandCensus: P2LegacyCommandCensus
  commandSites: P2LegacyCommandSite[]
  commandTransition: P2CommandTransitionSummary
  retainedBodies: P2RetainedBody[]
  tombstones: P2Tombstone[]
  ownerResolutions: [P2OwnerResolution]
  pendingByPhase: Record<'P3' | 'P4' | 'P5' | 'P6', number>
  digest: string
}

export interface P2ValidationReport {
  kind: 'script-migration-phase-validation'
  version: 1
  throughPhase: 'P2'
  sourceAuditDigest: string
  checks: {
    sourceAuditFrozen: true
    tombstones: {
      spriteAction: number
      hostileBehavior: number
      overlap: number
      unknown: number
    }
    retainedBodies: number
    retainedSemanticChanges: number
    danglingReferences: number
    misleadingActiveSccIdentities: number
    unresolvedS018Bindings: number
    authorRootsDeleted: number
    pendingUnknown: number
  }
  digest: string
}

export interface P2TransitionConflict {
  kind:
    | 'source-audit-drift'
    | 'identity-tombstone-modify'
    | 'identity-transition-group-modify'
    | 'identity-tombstone-reference-modify'
    | 'identity-transition-group-reference-modify'
    | 'installer-rewrite-modify'
    | 'stale-base-cell'
    | 'target-digest-mismatch'
  source: string
  expected?: string
  actual?: string
}

export interface P2TransitionPlan {
  kind: 'script-transition-phase-plan'
  version: 1
  throughPhase: 'P2'
  dryOnly: true
  summary: {
    cellWrites: number
    cellDeletes: number
    conflicts: number
    tombstones: number
    transitionGroups: number
    installerRewrites: number
  }
  conflicts: P2TransitionConflict[]
}
