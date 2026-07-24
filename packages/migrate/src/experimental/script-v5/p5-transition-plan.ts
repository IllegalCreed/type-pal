import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import { planP4ScriptTransition } from './p4-transition-plan.js'
import { validateP5ScriptMigrationIR } from './p5-validate.js'
import {
  inboundReferenceInventory,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
  type V4MigrationSnapshotLike,
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

type P5TransitionOurs =
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
}): P5TransitionPlan {
  const targetConflicts: P5TransitionConflict[] = []
  if (args.target.digest !== digestWithoutSelf(args.target))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptMigrationIR P5',
      expected: digestWithoutSelf(args.target),
      actual: args.target.digest,
    })
  if (args.ledger.digest !== digestWithoutSelf(args.ledger))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptTransitionLedgerDraft P5',
      expected: digestWithoutSelf(args.ledger),
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
  })
  if (p4Plan.conflicts.length) return planWithConflicts([...p4Plan.conflicts], args.target)

  let baseCorpus: ReturnType<typeof readV4ScriptCorpus>
  let oursCorpus: ReturnType<typeof readV4ScriptCorpus>
  try {
    baseCorpus = readV4ScriptCorpus(args.base)
    oursCorpus = readV4ScriptCorpus(args.ours.migration)
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
      const baseBody = baseCorpus.byId.get(body.legacyScriptId)?.body
      const oursBody = oursCorpus.byId.get(body.legacyScriptId)?.body
      const baseHash = baseBody === undefined ? '<missing>' : legacyAuthorCellSha256(baseBody)
      const oursHash = oursBody === undefined ? '<missing>' : legacyAuthorCellSha256(oursBody)
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
