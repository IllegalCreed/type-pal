import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import {
  type PreparedP4ScriptTransition,
  planP4ScriptTransition,
  prepareP4ScriptTransition,
} from './p4-transition-plan.js'
import { validateP5ScriptMigrationIR } from './p5-validate.js'
import {
  createV4ScriptCorpusReader,
  inboundReferenceInventory,
  type V4MigrationSnapshotLike,
  type V4ScriptCorpusReader,
} from './source-v4.js'
import { stableJsonSha256 } from './stable-json.js'
import type {
  P5TransitionConflict,
  P5TransitionPlan,
  ScriptMigrationIRP2,
  ScriptMigrationIRP3,
  ScriptMigrationIRP4,
  ScriptMigrationIRP5,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftP4,
  ScriptTransitionLedgerDraftP5,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

export type P5TransitionOurs =
  | { kind: 'v4'; migration: V4MigrationSnapshotLike }
  | {
      kind: 'p5-ir'
      ir: ScriptMigrationIRP5
      ledger: ScriptTransitionLedgerDraftP5
    }

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

function planWithConflicts(
  conflicts: P5TransitionConflict[],
  target: ScriptMigrationIRP5,
): P5TransitionPlan {
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P5',
    dryOnly: true,
    summary: {
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: conflicts.length,
      tombstones: target.tombstones.length,
      transitionGroups: 0,
      installerRewrites: 0,
      flowAbsorptions: 0,
      flowReferenceRewrites: 0,
      pageAllocations: 0,
      ownerAllocations: 0,
      ownerFragments: 0,
      selectionCommandRewrites: 0,
      deferredCrossOwner: 0,
      cycleStructures: 0,
      cycleBodies: 0,
      autoRunnerRepeat: 0,
      structuredLoops: 0,
      stateMachines: 0,
      stateMachineStates: 0,
      jumpTransitionRewrites: 0,
      remainingLegacyJumps: 0,
    },
    conflicts,
  }
}

export interface PreparedP5ScriptTransition {
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
  readonly target: ScriptMigrationIRP5
  readonly ledger: ScriptTransitionLedgerDraftP5
  readonly corpusReader: V4ScriptCorpusReader
  readonly p4Prepared?: PreparedP4ScriptTransition
  readonly targetDigest: string
  readonly ledgerDigest: string
  readonly targetConflicts: readonly P5TransitionConflict[]
}

export function prepareP5ScriptTransition(
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
    target: ScriptMigrationIRP5
    ledger: ScriptTransitionLedgerDraftP5
  },
  corpusReader: V4ScriptCorpusReader = createV4ScriptCorpusReader(),
  p4Prepared?: PreparedP4ScriptTransition,
): PreparedP5ScriptTransition {
  const targetDigest = digestWithoutSelf(args.target)
  const ledgerDigest = digestWithoutSelf(args.ledger)
  const targetConflicts: P5TransitionConflict[] = []
  if (args.target.digest !== targetDigest)
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptMigrationIR P5',
      expected: targetDigest,
      actual: args.target.digest,
    })
  if (args.ledger.digest !== ledgerDigest)
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptTransitionLedgerDraft P5',
      expected: ledgerDigest,
      actual: args.ledger.digest,
    })
  try {
    validateP5ScriptMigrationIR({
      frozenAudit: args.frozenAudit,
      p4: args.p4,
      p4Ledger: args.p4Ledger,
      ir: args.target,
      ledger: args.ledger,
      throughPhase: 'P5',
    })
  } catch (error) {
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'P5 target-ledger relationship',
      actual: error instanceof Error ? error.message : String(error),
    })
  }
  const cumulativeP4Prepared =
    targetConflicts.length === 0
      ? (p4Prepared ??
        prepareP4ScriptTransition(
          {
            migration: args.migration,
            frozenAudit: args.frozenAudit,
            sourceCommands: args.sourceCommands,
            base: args.base,
            p2: args.p2,
            p2Ledger: args.p2Ledger,
            p3: args.p3,
            p3Ledger: args.p3Ledger,
            target: args.p4,
            ledger: args.p4Ledger,
          },
          corpusReader,
        ))
      : undefined
  return {
    ...args,
    corpusReader,
    p4Prepared: cumulativeP4Prepared,
    targetDigest,
    ledgerDigest,
    targetConflicts,
  }
}

export function planP5ScriptTransition(args: {
  migration: import('../../pal-migration.js').MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
  base: V4MigrationSnapshotLike
  ours: P5TransitionOurs
  p2: ScriptMigrationIRP2
  p2Ledger: ScriptTransitionLedgerDraftV1
  p3: ScriptMigrationIRP3
  p3Ledger: ScriptTransitionLedgerDraftP3
  p4: ScriptMigrationIRP4
  p4Ledger: ScriptTransitionLedgerDraftP4
  target: ScriptMigrationIRP5
  ledger: ScriptTransitionLedgerDraftP5
  /**
   * Reuses cumulative target validation and corpus scans while every supplied
   * snapshot remains immutable for the preparation lifetime.
   */
  prepared?: PreparedP5ScriptTransition
}): P5TransitionPlan {
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
    args.prepared.target === args.target &&
    args.prepared.ledger === args.ledger &&
    args.prepared.targetDigest === digestWithoutSelf(args.target) &&
    args.prepared.ledgerDigest === digestWithoutSelf(args.ledger)
      ? args.prepared
      : prepareP5ScriptTransition(args)
  const targetConflicts = [...prepared.targetConflicts]
  if (targetConflicts.length) return planWithConflicts(targetConflicts, args.target)

  if (args.ours.kind === 'p5-ir') {
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
        throughPhase: 'P5',
        dryOnly: true,
        summary: {
          cellWrites: 0,
          cellDeletes: 0,
          conflicts: 0,
          tombstones: args.target.tombstones.length,
          transitionGroups: args.ledger.groups.length,
          installerRewrites: 1,
          flowAbsorptions: args.target.flowStructures.length,
          flowReferenceRewrites: args.target.flowStructures.reduce(
            (total, structure) => total + structure.incoming.length,
            0,
          ),
          pageAllocations: args.target.pages.length,
          ownerAllocations: args.target.owners.length,
          ownerFragments: args.target.ownerFragments.length,
          selectionCommandRewrites: args.target.commandRewrites.filter(
            (rewrite) => rewrite.transitionedIn === 'P4',
          ).length,
          deferredCrossOwner: args.target.ownerCensus.deferredCrossOwner,
          cycleStructures: args.target.cycleStructures.length,
          cycleBodies: args.target.cycleCensus.bodies,
          autoRunnerRepeat: args.target.cycleCensus.projections.autoRunnerRepeat,
          structuredLoops: args.target.cycleCensus.projections.structuredLoops,
          stateMachines: args.target.cycleCensus.projections.stateMachines,
          stateMachineStates: args.target.cycleCensus.projections.stateMachineStates,
          jumpTransitionRewrites: args.target.transitionRewrites.length,
          remainingLegacyJumps: args.target.cycleCensus.jumpTransitions.deferredP6,
        },
        conflicts: [],
      }
    return planWithConflicts(
      [
        {
          kind: 'target-digest-mismatch',
          source: 'P5 ours',
          expected: `${args.target.digest}:${args.ledger.digest}`,
          actual: `${args.ours.ir.digest}:${args.ours.ledger.digest}`,
        },
      ],
      args.target,
    )
  }

  const p4Plan = planP4ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.base,
    ours: args.ours,
    p2: args.p2,
    p2Ledger: args.p2Ledger,
    p3: args.p3,
    p3Ledger: args.p3Ledger,
    target: args.p4,
    ledger: args.p4Ledger,
    prepared: prepared.p4Prepared,
  })
  if (p4Plan.conflicts.length) return planWithConflicts([...p4Plan.conflicts], args.target)

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

  const conflicts: P5TransitionConflict[] = []
  const cycleBodyIds = new Set(
    args.target.cycleStructures.flatMap((structure) =>
      structure.bodies.map((body) => body.legacyScriptId),
    ),
  )
  for (const structure of args.target.cycleStructures) {
    for (const body of structure.bodies) {
      const baseHash = baseCorpus.byId.get(body.legacyScriptId)?.authorCellSha256 ?? '<missing>'
      const oursHash = oursCorpus.byId.get(body.legacyScriptId)?.authorCellSha256 ?? '<missing>'
      if (baseHash !== body.sourceBodySha256)
        conflicts.push({
          kind: 'stale-base-cell',
          source: `legacy-script:${body.legacyScriptId}`,
          expected: body.sourceBodySha256,
          actual: baseHash,
        })
      else if (oursHash !== body.sourceBodySha256)
        conflicts.push({
          kind: 'cycle-source-modify',
          source: `legacy-script:${body.legacyScriptId}`,
          expected: body.sourceBodySha256,
          actual: oursHash,
        })
    }
  }

  const baseInbound = inboundReferenceInventory(args.base, baseCorpus, cycleBodyIds, {
    includeTargetBodies: true,
  })
  const oursInbound = inboundReferenceInventory(args.ours.migration, oursCorpus, cycleBodyIds, {
    includeTargetBodies: true,
  })
  if (stableJsonSha256(baseInbound) !== stableJsonSha256(oursInbound))
    conflicts.push({
      kind: 'cycle-reference-inventory-modify',
      source: 'references-to:P5-cycle-bodies',
      expected: stableJsonSha256(baseInbound),
      actual: stableJsonSha256(oursInbound),
    })
  if (conflicts.length) return planWithConflicts(conflicts, args.target)

  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P5',
    dryOnly: true,
    summary: {
      cellWrites: p4Plan.summary.cellWrites + 331 + 533,
      cellDeletes: p4Plan.summary.cellDeletes + 433,
      conflicts: 0,
      tombstones: p4Plan.summary.tombstones,
      transitionGroups: p4Plan.summary.transitionGroups + 400,
      installerRewrites: p4Plan.summary.installerRewrites,
      flowAbsorptions: p4Plan.summary.flowAbsorptions,
      flowReferenceRewrites: p4Plan.summary.flowReferenceRewrites,
      pageAllocations: p4Plan.summary.pageAllocations,
      ownerAllocations: p4Plan.summary.ownerAllocations,
      ownerFragments: p4Plan.summary.ownerFragments,
      selectionCommandRewrites: p4Plan.summary.selectionCommandRewrites,
      deferredCrossOwner: p4Plan.summary.deferredCrossOwner,
      cycleStructures: args.target.cycleStructures.length,
      cycleBodies: args.target.cycleCensus.bodies,
      autoRunnerRepeat: args.target.cycleCensus.projections.autoRunnerRepeat,
      structuredLoops: args.target.cycleCensus.projections.structuredLoops,
      stateMachines: args.target.cycleCensus.projections.stateMachines,
      stateMachineStates: args.target.cycleCensus.projections.stateMachineStates,
      jumpTransitionRewrites: args.target.transitionRewrites.length,
      remainingLegacyJumps: args.target.cycleCensus.jumpTransitions.deferredP6,
    },
    conflicts: [],
  }
}
