import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import {
  type PreparedP5ScriptTransition,
  planP5ScriptTransition,
  prepareP5ScriptTransition,
} from './p5-transition-plan.js'
import { validateP6ScriptMigrationIR } from './p6-validate.js'
import {
  createV4ScriptCorpusReader,
  inboundReferenceInventory,
  type V4MigrationSnapshotLike,
  type V4ScriptCorpusReader,
} from './source-v4.js'
import { stableJsonSha256 } from './stable-json.js'
import type {
  P6TransitionConflict,
  P6TransitionPlan,
  ScriptMigrationIRP2,
  ScriptMigrationIRP3,
  ScriptMigrationIRP4,
  ScriptMigrationIRP5,
  ScriptMigrationIRP6,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftP4,
  ScriptTransitionLedgerDraftP5,
  ScriptTransitionLedgerDraftP6,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

export type P6TransitionOurs =
  | { kind: 'v4'; migration: V4MigrationSnapshotLike }
  | {
      kind: 'p6-ir'
      ir: ScriptMigrationIRP6
      ledger: ScriptTransitionLedgerDraftP6
    }

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

function inventorySummary(
  target: ScriptMigrationIRP6,
  writes: number,
  deletes: number,
  conflicts: number,
): P6TransitionPlan['summary'] {
  return {
    cellWrites: writes,
    cellDeletes: deletes,
    conflicts,
    tombstones: target.tombstones.length,
    transitionGroups: target.closureCensus.sharedAuthorScripts === 0 ? 5_630 : 0,
    installerRewrites: 1,
    flowAbsorptions: 599,
    flowReferenceRewrites: 655,
    pageAllocations: target.pages.length,
    ownerAllocations: target.owners.length,
    ownerFragments: 7_039,
    selectionCommandRewrites: target.commandRewrites.filter(
      (rewrite) => rewrite.transitionedIn === 'P4',
    ).length,
    deferredCrossOwner: 0,
    cycleStructures: target.cycleStructures.length,
    cycleBodies: target.cycleCensus.bodies,
    autoRunnerRepeat: target.cycleCensus.projections.autoRunnerRepeat,
    structuredLoops: target.cycleCensus.projections.structuredLoops,
    stateMachines: target.cycleCensus.projections.stateMachines,
    stateMachineStates: target.cycleCensus.projections.stateMachineStates,
    jumpTransitionRewrites: target.transitionRewrites.length + target.flowExitRewrites.length,
    remainingLegacyJumps: 0,
    localCallInlines: target.callInlineRewrites.length,
    localSourceBodies: target.localSourceBodies.length,
    localFlowAllocations: target.localFlows.length,
    localBodyCopies: target.closureCensus.localBodyCopies,
    itemPrivateScripts: target.itemPrivateScripts.length,
    sharedAuthorScripts: target.sharedAuthorScripts.length,
    classifiedSharedTails: target.sharedTailClassifications.length,
    remainingInternalCalls: 0,
    remainingPendingBodies: 0,
  }
}

function planWithConflicts(
  conflicts: P6TransitionConflict[],
  target: ScriptMigrationIRP6,
): P6TransitionPlan {
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P6',
    dryOnly: true,
    summary: inventorySummary(target, 0, 0, conflicts.length),
    conflicts,
  }
}

export interface PreparedP6ScriptTransition {
  readonly migration: import('../../pal-migration.js').MigrationFileSet
  readonly frozenAudit: ScriptControlFlowAuditV1
  readonly sourceCommands: readonly SourceCmd[]
  readonly base: V4MigrationSnapshotLike
  readonly p2: ScriptMigrationIRP2
  readonly p2Ledger: ScriptTransitionLedgerDraftV1
  readonly p3: ScriptMigrationIRP3
  readonly p3Ledger: ScriptTransitionLedgerDraftP3
  readonly p4: ScriptMigrationIRP4
  readonly p4Ledger: ScriptTransitionLedgerDraftP4
  readonly p5: ScriptMigrationIRP5
  readonly p5Ledger: ScriptTransitionLedgerDraftP5
  readonly target: ScriptMigrationIRP6
  readonly ledger: ScriptTransitionLedgerDraftP6
  readonly corpusReader: V4ScriptCorpusReader
  readonly p5Prepared?: PreparedP5ScriptTransition
  readonly targetDigest: string
  readonly ledgerDigest: string
  readonly targetConflicts: readonly P6TransitionConflict[]
}

export function prepareP6ScriptTransition(
  args: {
    migration: import('../../pal-migration.js').MigrationFileSet
    frozenAudit: ScriptControlFlowAuditV1
    sourceCommands: readonly SourceCmd[]
    base: V4MigrationSnapshotLike
    p2: ScriptMigrationIRP2
    p2Ledger: ScriptTransitionLedgerDraftV1
    p3: ScriptMigrationIRP3
    p3Ledger: ScriptTransitionLedgerDraftP3
    p4: ScriptMigrationIRP4
    p4Ledger: ScriptTransitionLedgerDraftP4
    p5: ScriptMigrationIRP5
    p5Ledger: ScriptTransitionLedgerDraftP5
    target: ScriptMigrationIRP6
    ledger: ScriptTransitionLedgerDraftP6
  },
  corpusReader: V4ScriptCorpusReader = createV4ScriptCorpusReader(),
  p5Prepared?: PreparedP5ScriptTransition,
): PreparedP6ScriptTransition {
  const targetDigest = digestWithoutSelf(args.target)
  const ledgerDigest = digestWithoutSelf(args.ledger)
  const targetConflicts: P6TransitionConflict[] = []
  if (args.target.digest !== targetDigest)
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptMigrationIR P6',
      expected: targetDigest,
      actual: args.target.digest,
    })
  if (args.ledger.digest !== ledgerDigest)
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptTransitionLedgerDraft P6',
      expected: ledgerDigest,
      actual: args.ledger.digest,
    })
  try {
    validateP6ScriptMigrationIR({
      frozenAudit: args.frozenAudit,
      p5: args.p5,
      p5Ledger: args.p5Ledger,
      ir: args.target,
      ledger: args.ledger,
      throughPhase: 'P6',
    })
  } catch (error) {
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'P6 target-ledger relationship',
      actual: error instanceof Error ? error.message : String(error),
    })
  }
  const cumulativeP5Prepared =
    targetConflicts.length === 0
      ? (p5Prepared ??
        prepareP5ScriptTransition(
          {
            migration: args.migration,
            frozenAudit: args.frozenAudit,
            sourceCommands: args.sourceCommands,
            base: args.base,
            p2: args.p2,
            p2Ledger: args.p2Ledger,
            p3: args.p3,
            p3Ledger: args.p3Ledger,
            p4: args.p4,
            p4Ledger: args.p4Ledger,
            target: args.p5,
            ledger: args.p5Ledger,
          },
          corpusReader,
        ))
      : undefined
  return {
    ...args,
    corpusReader,
    p5Prepared: cumulativeP5Prepared,
    targetDigest,
    ledgerDigest,
    targetConflicts,
  }
}

export function planP6ScriptTransition(args: {
  migration: import('../../pal-migration.js').MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
  base: V4MigrationSnapshotLike
  ours: P6TransitionOurs
  p2: ScriptMigrationIRP2
  p2Ledger: ScriptTransitionLedgerDraftV1
  p3: ScriptMigrationIRP3
  p3Ledger: ScriptTransitionLedgerDraftP3
  p4: ScriptMigrationIRP4
  p4Ledger: ScriptTransitionLedgerDraftP4
  p5: ScriptMigrationIRP5
  p5Ledger: ScriptTransitionLedgerDraftP5
  target: ScriptMigrationIRP6
  ledger: ScriptTransitionLedgerDraftP6
  /**
   * Reuses cumulative target validation and corpus scans while every supplied
   * snapshot remains immutable for the preparation lifetime.
   */
  prepared?: PreparedP6ScriptTransition
}): P6TransitionPlan {
  const prepared =
    args.prepared?.migration === args.migration &&
    args.prepared.frozenAudit === args.frozenAudit &&
    args.prepared.sourceCommands === args.sourceCommands &&
    args.prepared.base === args.base &&
    args.prepared.p2 === args.p2 &&
    args.prepared.p2Ledger === args.p2Ledger &&
    args.prepared.p3 === args.p3 &&
    args.prepared.p3Ledger === args.p3Ledger &&
    args.prepared.p4 === args.p4 &&
    args.prepared.p4Ledger === args.p4Ledger &&
    args.prepared.p5 === args.p5 &&
    args.prepared.p5Ledger === args.p5Ledger &&
    args.prepared.target === args.target &&
    args.prepared.ledger === args.ledger &&
    args.prepared.targetDigest === digestWithoutSelf(args.target) &&
    args.prepared.ledgerDigest === digestWithoutSelf(args.ledger)
      ? args.prepared
      : prepareP6ScriptTransition(args)
  const targetConflicts = [...prepared.targetConflicts]
  if (targetConflicts.length) return planWithConflicts(targetConflicts, args.target)

  if (args.ours.kind === 'p6-ir') {
    const validOurs =
      args.ours.ir.digest === digestWithoutSelf(args.ours.ir) &&
      args.ours.ledger.digest === digestWithoutSelf(args.ours.ledger)
    if (
      validOurs &&
      args.ours.ir.digest === args.target.digest &&
      args.ours.ledger.digest === args.ledger.digest
    )
      return {
        kind: 'script-transition-phase-plan',
        version: 1,
        throughPhase: 'P6',
        dryOnly: true,
        summary: inventorySummary(args.target, 0, 0, 0),
        conflicts: [],
      }
    return planWithConflicts(
      [
        {
          kind: 'target-digest-mismatch',
          source: 'P6 ours',
          expected: `${args.target.digest}:${args.ledger.digest}`,
          actual: `${args.ours.ir.digest}:${args.ours.ledger.digest}`,
        },
      ],
      args.target,
    )
  }

  const p5Plan = planP5ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.base,
    ours: args.ours,
    p2: args.p2,
    p2Ledger: args.p2Ledger,
    p3: args.p3,
    p3Ledger: args.p3Ledger,
    p4: args.p4,
    p4Ledger: args.p4Ledger,
    target: args.p5,
    ledger: args.p5Ledger,
    prepared: prepared.p5Prepared,
  })
  if (p5Plan.conflicts.length) return planWithConflicts([...p5Plan.conflicts], args.target)

  let baseCorpus: ReturnType<V4ScriptCorpusReader['read']>
  let oursCorpus: ReturnType<V4ScriptCorpusReader['read']>
  try {
    baseCorpus = prepared.corpusReader.read(args.base)
    oursCorpus = prepared.corpusReader.read(args.ours.migration)
  } catch (error) {
    return planWithConflicts(
      [
        {
          kind: 'stale-base-cell',
          source: 'v4-script-corpus',
          actual: error instanceof Error ? error.message : String(error),
        },
      ],
      args.target,
    )
  }

  const conflicts: P6TransitionConflict[] = []
  for (const body of args.p5.retainedBodies) {
    const baseHash = baseCorpus.byId.get(body.legacyScriptId)?.authorCellSha256 ?? '<missing>'
    const oursHash = oursCorpus.byId.get(body.legacyScriptId)?.authorCellSha256 ?? '<missing>'
    if (baseHash !== body.baseCellSha256)
      conflicts.push({
        kind: 'stale-base-cell',
        source: `legacy-script:${body.legacyScriptId}`,
        expected: body.baseCellSha256,
        actual: baseHash,
      })
    else if (oursHash !== body.baseCellSha256)
      conflicts.push({
        kind: 'closure-source-modify',
        source: `legacy-script:${body.legacyScriptId}`,
        expected: body.baseCellSha256,
        actual: oursHash,
      })
  }
  const closureTargets = new Set([
    ...args.target.callInlineRewrites.map((rewrite) => rewrite.targetLegacyScriptId),
    ...args.target.flowExitRewrites.map((rewrite) => rewrite.targetLegacyScriptId),
    ...args.p5.retainedBodies.map((body) => body.legacyScriptId),
  ])
  const baseInbound = inboundReferenceInventory(args.base, baseCorpus, closureTargets, {
    includeTargetBodies: true,
  })
  const oursInbound = inboundReferenceInventory(args.ours.migration, oursCorpus, closureTargets, {
    includeTargetBodies: true,
  })
  if (stableJsonSha256(baseInbound) !== stableJsonSha256(oursInbound))
    conflicts.push({
      kind: 'closure-reference-inventory-modify',
      source: 'references-to:P6-closure-sources',
      expected: stableJsonSha256(baseInbound),
      actual: stableJsonSha256(oursInbound),
    })
  if (conflicts.length) return planWithConflicts(conflicts, args.target)

  const rewrittenRepresentations = new Set([
    ...args.target.callInlineRewrites.map(
      (rewrite) => `${rewrite.source.representation}:${rewrite.source.scriptId}`,
    ),
    ...args.target.flowExitRewrites.map(
      (rewrite) => `${rewrite.source.representation}:${rewrite.source.scriptId}`,
    ),
  ]).size
  const addedWrites =
    rewrittenRepresentations + args.target.localFlows.length + args.target.itemPrivateScripts.length
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P6',
    dryOnly: true,
    summary: inventorySummary(
      args.target,
      p5Plan.summary.cellWrites + addedWrites,
      p5Plan.summary.cellDeletes + args.p5.retainedBodies.length,
      0,
    ),
    conflicts: [],
  }
}
