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

export type P3DeferredReason =
  | 'p3-call-owner-resolution'
  | 'p3-entity-binding-owner-resolution'
  | 'p3-multi-owner-join'
  | 'p3-mixed-flow-binding'

export interface P3FlowExitCommand {
  /**
   * Shadow-only generated node. It is never an AuthorCommand and cannot be consumed by runtime.
   */
  kind: 'n3P3FlowExit'
  structureId: string
  sourcePath: string
  scheduling: {
    kind: 'macroTask'
    worldClockAdvanceMs: 0
  }
  continuation: 'terminate-current-activation'
}

export interface P3FlowReferenceSite {
  callerLegacyScriptId: string
  callerHandle: LegacyBodyHandle
  path: string
  baseCellSha256: string
  sourceCommand: Command
}

export interface P3FlowContextEvidence {
  dialogue: {
    entryHash: string
    exitStateSha256?: string
    registryIdentityMatched: true
  }
  self: {
    targetOwner?: string
    allIncomingMatched: true
  }
  rng: {
    firstRelevantOpcode: 'none' | 'set-before-use'
    inheritedConsumer: false
  }
  pendingBattleAuto: {
    firstRelevantOpcode: 'none' | 'set-before-use'
    inheritedConsumer: false
  }
  incomingShape: 'single-predecessor' | 'same-caller-conditional-arms'
}

export interface P3FlowSizeEvidence {
  callerAstNodes: number
  targetAstNodes: number
  materializedAstNodes: number
  targetBytes: number
  ownerChunk: string
  targetChunk: string
}

export interface P3FlowStructure {
  kind: 'tail-inline' | 'branch-switch-join'
  id: string
  target: {
    handle: LegacyBodyHandle
    legacyScriptId: string
    activeRefId: string
    baseCellSha256: string
    /**
     * P3 shadow command tree after downstream acyclic exits are rewritten.
     */
    body: unknown[]
  }
  ownerLegacyScriptId: string
  incoming: P3FlowReferenceSite[]
  context: P3FlowContextEvidence
  size: P3FlowSizeEvidence
  evidenceId: string
}

export interface P3FlowCensus {
  input: 1715
  tailInline: 579
  branchSwitchJoin: 20
  deferredCallOwner: 622
  deferredEntityBindingOwner: 455
  deferredMultiOwnerJoin: 38
  deferredMixedFlowBinding: 1
  unknown: 0
}

export interface P3SizeGateReport {
  limits: {
    materializedAstNodes: 512
    targetBytes: 65536
    projectedChunkBytes: 1048576
  }
  observed: {
    materializedAstNodes: number
    targetBytes: number
    projectedChunkBytes: number
  }
  projectedChunks: Array<{
    chunk: string
    bytes: number
  }>
  violations: string[]
}

export type P3FutureWork =
  | {
      phase: Exclude<ScriptMigrationPhase, 'P2' | 'P3'>
      reason: P2PendingTransition['reason']
    }
  | {
      phase: 'P4' | 'P6'
      reason: P3DeferredReason
    }

export interface P3RetainedBody extends Omit<P2RetainedBody, 'body' | 'status'> {
  body: unknown[]
  status:
    | {
        kind: 'future'
        work: P3FutureWork
      }
    | {
        kind: 'pending-owner'
        ownerKind: P2PendingOwnerKind
        work: P3FutureWork
      }
    | {
        kind: 'resolved-entity-behavior'
        target: EntityBehaviorIdentity
        label: string
      }
}

export interface P3LegacyScriptCellIdentity {
  kind: 'legacy-script-cell'
  scriptId: string
  pointer: string
}

export type P3TransitionEntry =
  | P2TransitionEntry
  | {
      from: LegacyScriptIdentity | P3LegacyScriptCellIdentity
      baseCellSha256: string
      outcome: {
        kind: 'group'
        groupId: string
      }
    }

export interface P3FlowTransitionGroup {
  kind: 'flow-absorption-group'
  id: string
  transformId: 'inline-acyclic-tail-v1' | 'restore-branch-switch-join-v1'
  editPolicy: 'conflict-if-modified'
  sources: Array<{
    identity: LegacyScriptIdentity | P3LegacyScriptCellIdentity
    baseCellSha256: string
  }>
  outcome: {
    kind: 'absorbed-into-structured-flow'
    structure: 'tail-inline' | 'branch-switch-join'
  }
  evidenceId: string
  dependsOn: string[]
}

export interface P3FlowTransitionEvidence {
  id: string
  kind: 'acyclic-tail-inline' | 'branch-switch-join'
  sourceAuditDigest: string
  legacyScriptIds: string[]
  sourceCells: string[]
  contextCompatible: true
  sizeGatesPassed: true
}

export interface P3PendingTransition {
  legacyScriptId: string
  handle: LegacyBodyHandle
  phase: 'P4' | 'P5' | 'P6'
  reason: P2PendingTransition['reason'] | P3DeferredReason
}

export interface ScriptTransitionLedgerDraftP3 {
  kind: 'script-transition-ledger-draft'
  version: 1
  projectId: 'pal'
  transitionId: 'script-v4-v5'
  generatorEpoch: 'n3-script-v5-p3-v1'
  throughPhase: 'P3'
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  completed: Array<
    | 'folded-body-pruning'
    | 'misleading-scc-retirement'
    | 's018-owner-resolution'
    | 'acyclic-flow-structure'
  >
  entries: P3TransitionEntry[]
  groups: Array<P2TransitionGroup | P3FlowTransitionGroup>
  evidence: Array<P2TransitionEvidence | P3FlowTransitionEvidence>
  pending: P3PendingTransition[]
  digest: string
}

export interface ScriptMigrationIRP3 {
  kind: 'script-migration-ir'
  version: 1
  throughPhase: 'P3'
  generatorEpoch: 'n3-script-v5-p3-v1'
  canonical: false
  runtimeConsumable: false
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  source: P2SourceSummary
  commandCensus: P2LegacyCommandCensus
  commandSites: P2LegacyCommandSite[]
  commandTransition: P2CommandTransitionSummary
  retainedBodies: P3RetainedBody[]
  tombstones: P2Tombstone[]
  ownerResolutions: [P2OwnerResolution]
  flowStructures: P3FlowStructure[]
  flowCensus: P3FlowCensus
  sizeGates: P3SizeGateReport
  pendingByPhase: Record<'P3' | 'P4' | 'P5' | 'P6', number>
  digest: string
}

export interface P3ValidationReport {
  kind: 'script-migration-phase-validation'
  version: 1
  throughPhase: 'P3'
  sourceAuditDigest: string
  checks: {
    sourceAuditFrozen: true
    previousPhaseFrozen: true
    candidateBodies: number
    structuredBodies: number
    rewrittenJumpSites: number
    retainedBodies: number
    reversibleBodies: number
    danglingFlowStructures: number
    activeAbsorbedJumpRefs: number
    callSitesChanged: number
    contextViolations: number
    sizeViolations: number
    pendingP3: number
    pendingUnknown: number
  }
  digest: string
}

export type P3TransitionConflict =
  | P2TransitionConflict
  | {
      kind: 'flow-target-modify' | 'flow-reference-modify' | 'flow-reference-inventory-modify'
      source: string
      expected?: string
      actual?: string
    }

export interface P3TransitionPlan {
  kind: 'script-transition-phase-plan'
  version: 1
  throughPhase: 'P3'
  dryOnly: true
  summary: {
    cellWrites: number
    cellDeletes: number
    conflicts: number
    tombstones: number
    transitionGroups: number
    installerRewrites: number
    flowAbsorptions: number
    flowReferenceRewrites: number
  }
  conflicts: P3TransitionConflict[]
}

export interface EntityPageIdentity {
  kind: 'entity-page'
  sceneId: string
  entityId: string
  pageId: string
}

export interface SceneHookIdentity {
  kind: 'scene-hook'
  sceneId: string
  slot: 'onEnter' | 'onTeleport'
  hookId: string
}

export type P4AuthorOwnerIdentity = EntityBehaviorIdentity | SceneHookIdentity

export interface P4SourceCell {
  identity: SourceCellIdentity | P3LegacyScriptCellIdentity
  baseCellSha256: string
}

export interface P4EntityPageAllocation {
  kind: 'entity-page-allocation'
  identity: EntityPageIdentity
  label: string
  legacyPageIndex: number
  initial: true
  triggerBehaviorId?: string
  autoBehaviorId?: string
  triggerActivation?: {
    on: 'interact' | 'touch'
    range?: number
  }
  source: P4SourceCell
  groupId: string
}

export interface P4StageAllocation {
  stageId: string
  legacyStageIndex: number
  entryLegacyScriptId: string
  entryHandle: LegacyBodyHandle
}

export interface P4EntityBehaviorAllocation {
  kind: 'entity-behavior-allocation'
  identity: EntityBehaviorIdentity
  label: string
  order: number
  origin: 'static-page' | 'dynamic-binding' | 'p2-special'
  pageId?: string
  stages: P4StageAllocation[]
  sourceCells: P4SourceCell[]
  groupId: string
}

export interface P4SceneHookAllocation {
  kind: 'scene-hook-allocation'
  identity: SceneHookIdentity
  label: string
  order: number
  origin: 'static-scene' | 'dynamic-binding'
  stages: P4StageAllocation[]
  sourceCells: P4SourceCell[]
  groupId: string
}

export type P4AuthorOwnerAllocation = P4EntityBehaviorAllocation | P4SceneHookAllocation

export interface P4OwnerFragment {
  handle: LegacyBodyHandle
  legacyScriptId: string
  activeRefId: string
  baseCellSha256: string
  body: unknown[]
  owner: P4AuthorOwnerIdentity
  evidenceId: string
}

export interface P4PendingOwnerLink {
  legacyScriptId: string
  handle: LegacyBodyHandle
  phase: 'P5' | 'P6'
  owners: P4AuthorOwnerIdentity[]
}

export type P4SelectionCommand =
  | {
      kind: 'selectEntityBehavior'
      scene: string
      entity: string
      channel: 'trigger' | 'auto'
      selection: { kind: 'disabled' } | { kind: 'use'; value: string }
    }
  | {
      kind: 'setEntityTriggerActivation'
      scene: string
      entity: string
      selection:
        | { kind: 'disabled' }
        | { kind: 'use'; value: { on: 'interact' | 'touch'; range?: number } }
    }
  | {
      kind: 'selectSceneHooks'
      scene: string
      selection: Partial<
        Record<'onEnter' | 'onTeleport', { kind: 'disabled' } | { kind: 'use'; value: string }>
      >
    }

export interface P4CommandRewrite {
  source: P4SourceCell
  legacyKind: P2LegacyCommandKind
  transitionedIn: 'P2' | 'P4'
  before: unknown
  after: P4SelectionCommand
  groupId: string
}

export interface P4CommandTransitionSummary {
  input: 844
  legacyPending: 0
  transitionedP2: 1
  transitionedP4: 843
  byKind: Record<
    P2LegacyCommandKind,
    {
      input: number
      legacyPending: 0
      transitionedP2: number
      transitionedP4: number
    }
  >
}

export interface P4OwnerCensus {
  pages: 3616
  entityBehaviors: {
    staticTrigger: 2834
    staticAuto: 987
    dynamicTrigger: 172
    dynamicAuto: 307
    total: 4300
  }
  sceneHooks: {
    staticOnEnter: 160
    staticOnTeleport: 67
    dynamicOnEnter: 56
    dynamicOnTeleport: 1
    total: 284
  }
  stages: {
    staticEntity: 5664
    dynamicEntity: 479
    staticSceneHook: 271
    dynamicSceneHook: 88
    total: 6502
  }
  commandRewrites: 844
  resolvedFragments: 7039
  deferredCrossOwner: 17
  unknown: 0
}

export type P4FutureWork =
  | {
      phase: 'P5'
      reason: P2PendingTransition['reason']
    }
  | {
      phase: 'P6'
      reason: P2PendingTransition['reason'] | P3DeferredReason | 'p4-cross-owner-reuse'
    }

export interface P4RetainedBody extends Omit<P3RetainedBody, 'status'> {
  status:
    | {
        kind: 'future'
        work: P4FutureWork
      }
    | {
        kind: 'pending-owner'
        ownerKind: P2PendingOwnerKind
        work: P4FutureWork
      }
}

export type P4TransitionEntry =
  | P3TransitionEntry
  | {
      from: LegacyScriptIdentity | SourceCellIdentity | P3LegacyScriptCellIdentity
      baseCellSha256: string
      outcome: {
        kind: 'group'
        groupId: string
      }
    }

export interface P4OwnerTransitionGroup {
  kind:
    | 'page-owner-allocation-group'
    | 'entity-behavior-allocation-group'
    | 'scene-hook-allocation-group'
    | 'selection-command-rewrite-group'
  id: string
  transformId:
    | 'allocate-entity-page-v1'
    | 'allocate-entity-behavior-v1'
    | 'allocate-scene-hook-v1'
    | 'rewrite-selection-command-v1'
  editPolicy: 'conflict-if-modified'
  sources: Array<{
    identity: LegacyScriptIdentity | SourceCellIdentity | P3LegacyScriptCellIdentity
    baseCellSha256: string
  }>
  targets: Array<
    | EntityPageIdentity
    | EntityBehaviorIdentity
    | SceneHookIdentity
    | SourceCellIdentity
    | P3LegacyScriptCellIdentity
  >
  outcome: {
    kind: 'allocated-to-named-owner' | 'rewritten-to-stable-selection'
    ownerCount: number
    fragmentCount: number
    commandRewriteCount: number
  }
  evidenceId: string
  dependsOn: string[]
}

export interface P4OwnerTransitionEvidence {
  id: string
  kind: 'named-owner-allocation' | 'stable-selection-rewrite'
  sourceAuditDigest: string
  legacyScriptIds: string[]
  sourceCells: string[]
  stableIdsExplicit: true
  crossOwnerCopies: 0
}

export interface P4PendingTransition {
  legacyScriptId: string
  handle: LegacyBodyHandle
  phase: 'P5' | 'P6'
  reason: P2PendingTransition['reason'] | P3DeferredReason | 'p4-cross-owner-reuse'
}

export interface ScriptTransitionLedgerDraftP4 {
  kind: 'script-transition-ledger-draft'
  version: 1
  projectId: 'pal'
  transitionId: 'script-v4-v5'
  generatorEpoch: 'n3-script-v5-p4-v1'
  throughPhase: 'P4'
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  completed: Array<
    | 'folded-body-pruning'
    | 'misleading-scc-retirement'
    | 's018-owner-resolution'
    | 'acyclic-flow-structure'
    | 'named-owner-allocation'
    | 'legacy-selection-rewrite'
  >
  entries: P4TransitionEntry[]
  groups: Array<P2TransitionGroup | P3FlowTransitionGroup | P4OwnerTransitionGroup>
  evidence: Array<P2TransitionEvidence | P3FlowTransitionEvidence | P4OwnerTransitionEvidence>
  pending: P4PendingTransition[]
  digest: string
}

export interface ScriptMigrationIRP4 {
  kind: 'script-migration-ir'
  version: 1
  throughPhase: 'P4'
  generatorEpoch: 'n3-script-v5-p4-v1'
  canonical: false
  runtimeConsumable: false
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  source: P2SourceSummary
  commandCensus: P2LegacyCommandCensus
  commandSites: P2LegacyCommandSite[]
  commandTransition: P4CommandTransitionSummary
  commandRewrites: P4CommandRewrite[]
  retainedBodies: P4RetainedBody[]
  tombstones: P2Tombstone[]
  ownerResolutions: [P2OwnerResolution]
  flowStructures: P3FlowStructure[]
  flowCensus: P3FlowCensus
  sizeGates: P3SizeGateReport
  pages: P4EntityPageAllocation[]
  owners: P4AuthorOwnerAllocation[]
  ownerFragments: P4OwnerFragment[]
  pendingOwnerLinks: P4PendingOwnerLink[]
  ownerCensus: P4OwnerCensus
  pendingByPhase: Record<'P4' | 'P5' | 'P6', number>
  digest: string
}

export interface P4ValidationReport {
  kind: 'script-migration-phase-validation'
  version: 1
  throughPhase: 'P4'
  sourceAuditDigest: string
  checks: {
    sourceAuditFrozen: true
    previousPhaseFrozen: true
    pages: number
    owners: number
    stages: number
    commandRewrites: number
    resolvedFragments: number
    retainedBodies: number
    reversibleBodies: number
    danglingOwnerEntries: number
    duplicateStableIds: number
    legacySelectionCommands: number
    crossOwnerCopies: number
    deferredCrossOwner: number
    pendingP4: number
    pendingUnknown: number
  }
  digest: string
}

export type P4TransitionConflict =
  | P3TransitionConflict
  | {
      kind: 'owner-source-modify' | 'owner-source-inventory-modify' | 'selection-command-modify'
      source: string
      expected?: string
      actual?: string
    }

export interface P4TransitionPlan {
  kind: 'script-transition-phase-plan'
  version: 1
  throughPhase: 'P4'
  dryOnly: true
  summary: {
    cellWrites: number
    cellDeletes: number
    conflicts: number
    tombstones: number
    transitionGroups: number
    installerRewrites: number
    flowAbsorptions: number
    flowReferenceRewrites: number
    pageAllocations: number
    ownerAllocations: number
    ownerFragments: number
    selectionCommandRewrites: number
    deferredCrossOwner: number
  }
  conflicts: P4TransitionConflict[]
}

export interface P5RepresentationCellIdentity {
  kind: 'p4-representation-cell'
  representation: 'owner-fragment' | 'flow-structure'
  scriptId: string
  pointer: string
}

export interface P5CycleStructureIdentity {
  kind: 'cycle-structure'
  cycleId: string
}

export interface P5OwnerFlowIdentity {
  kind: 'owner-flow'
  owner: P4AuthorOwnerIdentity
  flowId: string
}

export interface P5OwnerFlowAllocation {
  identity: P5OwnerFlowIdentity
  machineId?: string
  legacyEntryAliases: Array<{
    legacyScriptId: string
    stateId?: string
  }>
}

export type P5CycleKind = 'auto-runner-repeat' | 'structured-loop' | 'state-machine'

export interface P5ResolvedSelf {
  sceneId: string
  entityId: string
}

export type P5FlowExitTarget =
  | {
      kind: 'cycle'
      cycleId: string
      legacyScriptId: string
      stateId?: string
      ownerFlows: P5OwnerFlowIdentity[]
    }
  | {
      kind: 'owner-fragment'
      legacyScriptId: string
      owner: P4AuthorOwnerIdentity
    }

/**
 * P5 shadow lowering node. It is deliberately absent from canonical AuthorCommand.
 * P7 must compile the author loop/state-machine projection back into an executable exit.
 */
export interface P5GeneratedFlowExit {
  kind: 'n3P5FlowExit'
  target: P5FlowExitTarget
  scheduling: 'macroTask' | 'worldTick'
  worldClockAdvanceMs: 0
  cancellation: 'required'
  continuation: 'terminate-current-segment'
  self?: P5ResolvedSelf
}

export interface P5TransitionRewrite {
  source: {
    representation: 'owner-fragment' | 'flow-structure' | 'cycle-body'
    legacyScriptId: string
    pointer: string
    baseCellSha256: string
  }
  before: unknown
  after: P5GeneratedFlowExit
  targetLegacyScriptId: string
  backEdge: boolean
  groupId: string
}

export type P5AuthorTransitionTrigger =
  | {
      kind: 'body-end'
    }
  | {
      kind: 'condition'
      cond: unknown
      arm: 'then'
      fallback: 'continue'
    }
  | {
      kind: 'command-outcome'
      command: 'confirm'
      outcome: 'no'
      fallback: 'continue'
    }

/**
 * P5 shadow author-facing edge. Unlike n3P5FlowExit lowering nodes, this record
 * gives every recovered transfer an explicit, editable identity and trigger.
 */
export interface P5AuthorTransitionAllocation {
  transitionId: string
  from: {
    legacyScriptId: string
    stateId?: string
  }
  sourcePointer: string
  trigger: P5AuthorTransitionTrigger
  target: P5FlowExitTarget
  scheduling: 'macroTask' | 'worldTick'
  cancellation: 'required'
  backEdge: boolean
}

export interface P5CycleBodyProjection {
  handle: LegacyBodyHandle
  legacyScriptId: string
  sourceBodySha256: string
  stateId?: string
  loweredBody: unknown[]
}

export type P5AuthorCycleProjection =
  | {
      kind: 'auto-runner-repeat'
      body: unknown[]
      yield: 'worldTick'
      lifecycle: 'auto-runner'
      repeatTransitionId: string
    }
  | {
      kind: 'structured-loop'
      body: unknown[]
      loop: {
        kind: 'loop'
        mode: 'until'
        cond: unknown
        body: unknown[]
        yield: 'worldTick'
        maxIterations: 10_000
      }
      loopTransitionId: string
      exitTransitionIds: string[]
    }
  | {
      kind: 'state-machine'
      machineIds: P5OwnerFlowIdentity[]
      initialStateId: string
      states: Array<{
        id: string
        label: string
        legacyScriptId: string
        body: unknown[]
        transitionIds: string[]
      }>
      transitionProjection: 'explicit-transition-table'
    }

export interface P5CycleStructure {
  identity: P5CycleStructureIdentity
  kind: P5CycleKind
  componentOrdinal: number
  productComponentId: number
  owners: P4AuthorOwnerIdentity[]
  ownerFlows: P5OwnerFlowAllocation[]
  bodies: P5CycleBodyProjection[]
  transitions: P5AuthorTransitionAllocation[]
  authorProjection: P5AuthorCycleProjection
  entryLegacyScriptIds: string[]
  transitionRewriteCount: number
  backEdgeCount: number
  nestedOutcomeTransitions: number
  bodyCopies: 0
  evidenceId: string
  groupId: string
}

export interface P5CycleCensus {
  components: 331
  bodies: 433
  componentSizes: {
    size1: 275
    size2: 10
    size3: 46
  }
  projections: {
    autoRunnerRepeat: 99
    structuredLoops: 162
    stateMachines: 70
    stateMachineStates: 172
  }
  ownerChannels: {
    triggerComponents: 6
    autoComponents: 323
    sceneHookComponents: 2
  }
  jumpTransitions: {
    input: 1297
    rewrittenP5: 1286
    cycleBody: 753
    ownerFragment: 528
    flowStructure: 5
    sccBackEdges: 694
    crossComponent: 51
    ownerInboundToCycles: 464
    acyclicOwnerFlow: 69
    deferredP6: 11
  }
  crossOwnerStructures: 3
  bodyCopies: 0
  nestedOutcomeTransitions: 1
  authorTransitions: {
    total: 753
    bodyEnd: 230
    condition: 522
    commandOutcome: 1
  }
  maxIterations: 10_000
  unknown: 0
}

export interface P5SchedulingContract {
  commandPaceMs: 100
  stageIntervalMs: 40
  hiddenEntityMs: 120
  authorityMs: 150
  chaseMs: 200
  backEdgeYield: 'worldTick'
  forwardTransferYield: 'macroTask'
  cancellation: 'required'
}

export interface P5RetainedBody extends P4RetainedBody {
  status: P4RetainedBody['status'] & {
    work: Extract<P4FutureWork, { phase: 'P6' }>
  }
}

export type P5TransitionEntry =
  | P4TransitionEntry
  | {
      from: LegacyScriptIdentity | P5RepresentationCellIdentity
      baseCellSha256: string
      outcome: {
        kind: 'group'
        groupId: string
      }
    }

export interface P5CycleTransitionGroup {
  kind: 'cycle-structure-group' | 'flow-exit-rewrite-group'
  id: string
  transformId: 'restore-cycle-structure-v1' | 'rewrite-flow-exit-v1'
  editPolicy: 'conflict-if-modified'
  sources: Array<{
    identity: LegacyScriptIdentity | P5RepresentationCellIdentity
    baseCellSha256: string
  }>
  targets: Array<P5CycleStructureIdentity | P5OwnerFlowIdentity | P5RepresentationCellIdentity>
  outcome: {
    kind: 'restored-cycle-structure' | 'rewritten-flow-exit'
    cycleBodyCount: number
    transitionRewriteCount: number
    ownerFlowCount: number
    bodyCopies: 0
  }
  evidenceId: string
  dependsOn: string[]
}

export interface P5CycleTransitionEvidence {
  id: string
  kind: 'cycle-structure' | 'flow-exit-rewrite'
  sourceAuditDigest: string
  legacyScriptIds: string[]
  sourceCells: string[]
  stableIdsExplicit: true
  backEdgesYield: true
  bodyCopies: 0
}

export interface P5PendingTransition {
  legacyScriptId: string
  handle: LegacyBodyHandle
  phase: 'P6'
  reason: P4FutureWork['reason']
}

export interface ScriptTransitionLedgerDraftP5 {
  kind: 'script-transition-ledger-draft'
  version: 1
  projectId: 'pal'
  transitionId: 'script-v4-v5'
  generatorEpoch: 'n3-script-v5-p5-v1'
  throughPhase: 'P5'
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  completed: Array<
    | 'folded-body-pruning'
    | 'misleading-scc-retirement'
    | 's018-owner-resolution'
    | 'acyclic-flow-structure'
    | 'named-owner-allocation'
    | 'legacy-selection-rewrite'
    | 'cyclic-flow-structure'
    | 'legacy-flow-exit-rewrite'
  >
  entries: P5TransitionEntry[]
  groups: Array<
    P2TransitionGroup | P3FlowTransitionGroup | P4OwnerTransitionGroup | P5CycleTransitionGroup
  >
  evidence: Array<
    | P2TransitionEvidence
    | P3FlowTransitionEvidence
    | P4OwnerTransitionEvidence
    | P5CycleTransitionEvidence
  >
  pending: P5PendingTransition[]
  digest: string
}

export interface ScriptMigrationIRP5 {
  kind: 'script-migration-ir'
  version: 1
  throughPhase: 'P5'
  generatorEpoch: 'n3-script-v5-p5-v1'
  canonical: false
  runtimeConsumable: false
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  source: P2SourceSummary
  commandCensus: P2LegacyCommandCensus
  commandSites: P2LegacyCommandSite[]
  commandTransition: P4CommandTransitionSummary
  commandRewrites: P4CommandRewrite[]
  retainedBodies: P5RetainedBody[]
  tombstones: P2Tombstone[]
  ownerResolutions: [P2OwnerResolution]
  flowStructures: P3FlowStructure[]
  flowCensus: P3FlowCensus
  sizeGates: P3SizeGateReport
  pages: P4EntityPageAllocation[]
  owners: P4AuthorOwnerAllocation[]
  ownerFragments: P4OwnerFragment[]
  pendingOwnerLinks: P4PendingOwnerLink[]
  ownerCensus: P4OwnerCensus
  cycleStructures: P5CycleStructure[]
  transitionRewrites: P5TransitionRewrite[]
  cycleCensus: P5CycleCensus
  scheduling: P5SchedulingContract
  pendingByPhase: Record<'P5' | 'P6', number>
  digest: string
}

export interface P5ValidationReport {
  kind: 'script-migration-phase-validation'
  version: 1
  throughPhase: 'P5'
  sourceAuditDigest: string
  checks: {
    sourceAuditFrozen: true
    previousPhaseFrozen: true
    cycleComponents: number
    cycleBodies: number
    autoRunnerRepeat: number
    structuredLoops: number
    stateMachines: number
    stateMachineStates: number
    transitionRewrites: number
    backEdges: number
    legacyJumpCommands: number
    deferredP6JumpCommands: number
    reversibleBodies: number
    duplicateStableIds: number
    danglingFlowTargets: number
    crossOwnerCopies: number
    nestedOutcomeTransitions: number
    authorTransitions: number
    pendingP5: number
    pendingUnknown: number
  }
  digest: string
}

export type P5TransitionConflict =
  | P4TransitionConflict
  | {
      kind: 'cycle-source-modify' | 'cycle-reference-inventory-modify'
      source: string
      expected?: string
      actual?: string
    }

export interface P5TransitionPlan {
  kind: 'script-transition-phase-plan'
  version: 1
  throughPhase: 'P5'
  dryOnly: true
  summary: {
    cellWrites: number
    cellDeletes: number
    conflicts: number
    tombstones: number
    transitionGroups: number
    installerRewrites: number
    flowAbsorptions: number
    flowReferenceRewrites: number
    pageAllocations: number
    ownerAllocations: number
    ownerFragments: number
    selectionCommandRewrites: number
    deferredCrossOwner: number
    cycleStructures: number
    cycleBodies: number
    autoRunnerRepeat: number
    structuredLoops: number
    stateMachines: number
    stateMachineStates: number
    jumpTransitionRewrites: number
    remainingLegacyJumps: number
  }
  conflicts: P5TransitionConflict[]
}

export interface P6RepresentationCellIdentity {
  kind: 'p5-representation-cell'
  representation: 'owner-fragment' | 'flow-structure' | 'cycle-body'
  scriptId: string
}

export interface P6LocalFlowIdentity {
  kind: 'owner-local-flow'
  owner: P4AuthorOwnerIdentity
  flowId: string
}

export interface P6ItemPrivateScriptIdentity {
  kind: 'item-private-script'
  itemId: string
  scriptId: 'use'
}

export interface P6LocalSourceBody {
  handle: LegacyBodyHandle
  legacyScriptId: string
  baseCellSha256: string
  body: unknown[]
  origin: 'p4-owner-fragment' | 'p6-retained-body'
  groupId: string
}

export interface P6LocalFlowAllocation {
  identity: P6LocalFlowIdentity
  label: string
  sourceHandle: LegacyBodyHandle
  sourceLegacyScriptId: string
  sourceBodySha256: string
  authorBody: unknown[]
  entry: 'call-inline' | 'tail-transition' | 'direct-owner-body'
  materializedCallSites: number
  groupId: string
}

export interface P6GeneratedFlowExit {
  kind: 'n3P6FlowExit'
  target: P6LocalFlowIdentity
  scheduling: 'macroTask'
  worldClockAdvanceMs: 0
  cancellation: 'required'
  continuation: 'terminate-current-segment'
}

export interface P6CallInlineRewrite {
  source: {
    representation: 'owner-fragment' | 'cycle-body'
    scriptId: string
    pointer: string
    baseCellSha256: string
  }
  before: unknown
  afterBody: unknown[]
  targetLegacyScriptId: string
  targetBodySha256: string
  callReturn: 'preserved'
  compatibilityBoundaryAfterMs: 0 | 100
  groupId: 'p6-local-call-closure'
}

export interface P6FlowExitRewrite {
  source: {
    representation: 'owner-fragment'
    scriptId: string
    pointer: string
    baseCellSha256: string
  }
  before: unknown
  after: P6GeneratedFlowExit
  targetLegacyScriptId: string
  groupId: string
}

export interface P6ReversibleItemSourceBody {
  handle: LegacyBodyHandle
  legacyScriptId: string
  baseCellSha256: string
  body: unknown[]
  origin: 'p6-retained-body' | 'p3-flow-structure'
}

export type P6ItemPrivateAnalysis =
  | {
      kind: 'spirit-orb-altar'
      sceneId: string
      placements: Array<{
        itemId: string
        target: { sceneId: string; entityId: string }
        placedState: number
        facing: string
        frame: number
        fallback: 'no-effect' | 'scene-teleport'
      }>
      noEffectBody: unknown[]
      sceneTeleportBody: unknown[]
      completion: {
        targets: Array<{
          target: { sceneId: string; entityId: string }
          blockedStates: [0, 2]
        }>
        body: unknown[]
      }
    }
  | {
      kind: 'reward-bundle'
      presentation: unknown[]
      money: number
      items: Array<{ itemId: string; count: number }>
    }
  | {
      kind: 'narrative'
      body: unknown[]
    }
  | {
      kind: 'teach-skills'
      presentation: unknown[]
      skills: Array<{ role: number; skillId: string }>
    }

export interface P6ItemPrivateScript {
  identity: P6ItemPrivateScriptIdentity
  label: string
  authorBody: unknown[]
}

export interface P6ItemPrivateClosure {
  domainId: 'spirit-orb-altar' | 'reward-bundle' | 'narrative' | 'teach-skills'
  label: string
  scripts: P6ItemPrivateScript[]
  sourceBodies: P6ReversibleItemSourceBody[]
  analysis: P6ItemPrivateAnalysis
  groupId: string
  sharedScriptCount: 0
}

export type P6SharedTailDisposition =
  | 'p5-cycle-structure'
  | 'p4-named-owner'
  | 'p6-owner-local'
  | 'p6-item-private'

export interface P6SharedTailClassification {
  legacyScriptId: string
  disposition: P6SharedTailDisposition
  sharedAuthorScript: false
}

export interface P6MisleadingSccRetirement {
  legacyScriptId: string
  disposition: 'owner-local-flow' | 'item-private-script'
  activeAuthorIdentities: Array<P6LocalFlowIdentity | P6ItemPrivateScriptIdentity>
}

export interface P6ClosureCensus {
  retainedInput: 31
  retainedOutput: 0
  localSourceBodies: 21
  localFlowAllocations: 42
  localBodyCopies: 21
  itemPrivateScripts: 6
  itemPrivateClosures: 4
  sharedAuthorScripts: 0
  sharedTails: {
    input: 532
    p5CycleStructure: 433
    p4NamedOwner: 80
    p6OwnerLocal: 17
    p6ItemPrivate: 2
    sharedAuthorScript: 0
    unknown: 0
  }
  internalCalls: {
    input: 580
    inlinedLocal: 574
    absorbedItemBridges: 6
    autoCompatibilityBoundaries: 22
    remaining: 0
  }
  legacyJumps: {
    input: 11
    rewrittenLocal: 5
    absorbedItemPrivate: 6
    remaining: 0
  }
  misleadingScc: {
    input: 13
    active: 0
    provenanceOnly: 13
  }
  authorRoots: {
    input: 6
    bridgeShells: 0
    itemPrivate: 6
    shared: 0
  }
  reversibleBodies: 8102
  unknown: 0
}

export type P6TransitionEntry =
  | P5TransitionEntry
  | {
      from: LegacyScriptIdentity | P6RepresentationCellIdentity
      baseCellSha256: string
      outcome: {
        kind: 'group'
        groupId: string
      }
    }

export interface P6ClosureTransitionGroup {
  kind:
    | 'local-call-closure-group'
    | 'local-flow-closure-group'
    | 'item-private-script-closure-group'
  id: string
  transformId:
    | 'inline-local-call-closure-v1'
    | 'restore-owner-local-flow-v1'
    | 'absorb-item-private-script-v1'
  editPolicy: 'conflict-if-modified'
  sources: Array<{
    identity: LegacyScriptIdentity | P6RepresentationCellIdentity
    baseCellSha256: string
  }>
  targets: Array<P6RepresentationCellIdentity | P6LocalFlowIdentity | P6ItemPrivateScriptIdentity>
  outcome: {
    kind: 'inlined-local-calls' | 'restored-owner-local-flow' | 'absorbed-item-private-script'
    callInlineCount: number
    flowExitRewriteCount: number
    localSourceBodyCount: number
    localFlowAllocationCount: number
    itemPrivateScriptCount: number
    bodyCopies: number
    sharedScriptCount: 0
  }
  evidenceId: string
  dependsOn: string[]
}

export interface P6ClosureTransitionEvidence {
  id: string
  kind: 'local-call-closure' | 'owner-local-flow' | 'item-private-script'
  sourceAuditDigest: string
  legacyScriptIds: string[]
  sourceCells: string[]
  stableIdsExplicit: true
  genericFunctionCriterion: true
  sharedScriptCount: 0
}

export interface ScriptTransitionLedgerDraftP6 {
  kind: 'script-transition-ledger-draft'
  version: 1
  projectId: 'pal'
  transitionId: 'script-v4-v5'
  generatorEpoch: 'n3-script-v5-p6-v1'
  throughPhase: 'P6'
  sourceAudit: {
    methodVersion: string
    digest: string
  }
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  completed: Array<
    | ScriptTransitionLedgerDraftP5['completed'][number]
    | 'local-call-closure'
    | 'owner-local-flow'
    | 'item-private-script'
    | 'shared-script-closure'
    | 'legacy-script-model-retirement'
  >
  entries: P6TransitionEntry[]
  groups: Array<
    | P2TransitionGroup
    | P3FlowTransitionGroup
    | P4OwnerTransitionGroup
    | P5CycleTransitionGroup
    | P6ClosureTransitionGroup
  >
  evidence: Array<
    | P2TransitionEvidence
    | P3FlowTransitionEvidence
    | P4OwnerTransitionEvidence
    | P5CycleTransitionEvidence
    | P6ClosureTransitionEvidence
  >
  pending: []
  digest: string
}

export interface ScriptMigrationIRP6
  extends Omit<
    ScriptMigrationIRP5,
    | 'throughPhase'
    | 'generatorEpoch'
    | 'previousPhase'
    | 'retainedBodies'
    | 'pendingOwnerLinks'
    | 'pendingByPhase'
    | 'digest'
  > {
  throughPhase: 'P6'
  generatorEpoch: 'n3-script-v5-p6-v1'
  previousPhase: {
    irDigest: string
    ledgerDigest: string
  }
  retainedBodies: []
  pendingOwnerLinks: []
  localSourceBodies: P6LocalSourceBody[]
  localFlows: P6LocalFlowAllocation[]
  itemPrivateClosures: P6ItemPrivateClosure[]
  itemPrivateScripts: P6ItemPrivateScript[]
  sharedAuthorScripts: []
  callInlineRewrites: P6CallInlineRewrite[]
  flowExitRewrites: P6FlowExitRewrite[]
  sharedTailClassifications: P6SharedTailClassification[]
  misleadingSccRetirements: P6MisleadingSccRetirement[]
  closureCensus: P6ClosureCensus
  pendingByPhase: { P6: 0 }
  digest: string
}

export interface P6ValidationReport {
  kind: 'script-migration-phase-validation'
  version: 1
  throughPhase: 'P6'
  sourceAuditDigest: string
  checks: {
    sourceAuditFrozen: true
    previousPhaseFrozen: true
    retainedBodies: 0
    localSourceBodies: number
    localFlowAllocations: number
    itemPrivateScripts: number
    sharedAuthorScripts: number
    sharedTailsClassified: number
    internalCallCommands: number
    legacyJumpCommands: number
    misleadingActiveSccIdentities: number
    bridgeAuthorRoots: number
    reversibleBodies: number
    duplicateStableIds: number
    danglingLocalFlows: number
    pendingP6: 0
    pendingUnknown: 0
  }
  digest: string
}

export type P6TransitionConflict =
  | P5TransitionConflict
  | {
      kind:
        | 'closure-source-modify'
        | 'closure-reference-inventory-modify'
        | 'closure-source-inventory-modify'
      source: string
      expected?: string
      actual?: string
    }

export interface P6TransitionPlan {
  kind: 'script-transition-phase-plan'
  version: 1
  throughPhase: 'P6'
  dryOnly: true
  summary: P5TransitionPlan['summary'] & {
    localCallInlines: number
    localSourceBodies: number
    localFlowAllocations: number
    localBodyCopies: number
    itemPrivateScripts: number
    sharedAuthorScripts: number
    classifiedSharedTails: number
    remainingInternalCalls: number
    remainingLegacyJumps: 0
    remainingPendingBodies: 0
  }
  conflicts: P6TransitionConflict[]
}
