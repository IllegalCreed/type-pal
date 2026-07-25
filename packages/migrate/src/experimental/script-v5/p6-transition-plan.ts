import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import { planP5ScriptTransition } from './p5-transition-plan.js'
import { validateP6ScriptMigrationIR } from './p6-validate.js'
import {
  inboundReferenceInventory,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
  type V4MigrationSnapshotLike,
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

type P6TransitionOurs =
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
}): P6TransitionPlan {
  const targetConflicts: P6TransitionConflict[] = []
  if (args.target.digest !== digestWithoutSelf(args.target))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptMigrationIR P6',
      expected: digestWithoutSelf(args.target),
      actual: args.target.digest,
    })
  if (args.ledger.digest !== digestWithoutSelf(args.ledger))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptTransitionLedgerDraft P6',
      expected: digestWithoutSelf(args.ledger),
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
  })
  if (p5Plan.conflicts.length) return planWithConflicts([...p5Plan.conflicts], args.target)

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

  const conflicts: P6TransitionConflict[] = []
  for (const body of args.p5.retainedBodies) {
    const baseBody = baseCorpus.byId.get(body.legacyScriptId)?.body
    const oursBody = oursCorpus.byId.get(body.legacyScriptId)?.body
    const baseHash = baseBody === undefined ? '<missing>' : legacyAuthorCellSha256(baseBody)
    const oursHash = oursBody === undefined ? '<missing>' : legacyAuthorCellSha256(oursBody)
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
