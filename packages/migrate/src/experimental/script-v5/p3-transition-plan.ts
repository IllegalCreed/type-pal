import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import { planP2ScriptTransition } from './p2-transition-plan.js'
import { validateP3ScriptMigrationIR } from './p3-validate.js'
import {
  commandAtPointer,
  inboundReferenceInventory,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
  type V4MigrationSnapshotLike,
} from './source-v4.js'
import { stableJsonSha256 } from './stable-json.js'
import type {
  P3TransitionConflict,
  P3TransitionPlan,
  ScriptMigrationIRP2,
  ScriptMigrationIRP3,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

type P3TransitionOurs =
  | { kind: 'v4'; migration: V4MigrationSnapshotLike }
  | {
      kind: 'p3-ir'
      ir: ScriptMigrationIRP3
      ledger: ScriptTransitionLedgerDraftP3
    }

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

function planWithConflicts(
  conflicts: P3TransitionConflict[],
  target: ScriptMigrationIRP3,
): P3TransitionPlan {
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P3',
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
    },
    conflicts,
  }
}

function commandAtPointerOrMissing(root: unknown, pointer: string): unknown {
  try {
    return commandAtPointer(root, pointer)
  } catch {
    return undefined
  }
}

export function planP3ScriptTransition(args: {
  migration: import('../../pal-migration.js').MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
  base: V4MigrationSnapshotLike
  ours: P3TransitionOurs
  p2: ScriptMigrationIRP2
  p2Ledger: ScriptTransitionLedgerDraftV1
  target: ScriptMigrationIRP3
  ledger: ScriptTransitionLedgerDraftP3
}): P3TransitionPlan {
  const targetConflicts: P3TransitionConflict[] = []
  if (args.target.digest !== digestWithoutSelf(args.target))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptMigrationIR P3',
      expected: digestWithoutSelf(args.target),
      actual: args.target.digest,
    })
  if (args.ledger.digest !== digestWithoutSelf(args.ledger))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptTransitionLedgerDraft P3',
      expected: digestWithoutSelf(args.ledger),
      actual: args.ledger.digest,
    })
  try {
    validateP3ScriptMigrationIR({
      migration: args.migration,
      frozenAudit: args.frozenAudit,
      sourceCommands: args.sourceCommands,
      p2: args.p2,
      p2Ledger: args.p2Ledger,
      ir: args.target,
      ledger: args.ledger,
      throughPhase: 'P3',
    })
  } catch (error) {
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'P3 target-ledger relationship',
      actual: error instanceof Error ? error.message : String(error),
    })
  }
  if (targetConflicts.length) return planWithConflicts(targetConflicts, args.target)

  if (args.ours.kind === 'p3-ir') {
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
        throughPhase: 'P3',
        dryOnly: true,
        summary: {
          cellWrites: 0,
          cellDeletes: 0,
          conflicts: 0,
          tombstones: 0,
          transitionGroups: 0,
          installerRewrites: 0,
          flowAbsorptions: 0,
          flowReferenceRewrites: 0,
        },
        conflicts: [],
      }
    return planWithConflicts(
      [
        {
          kind: 'target-digest-mismatch',
          source: 'ScriptMigrationIR P3',
          expected: args.target.digest,
          actual: validOurs ? args.ours.ir.digest : '<invalid-self-digest>',
        },
      ],
      args.target,
    )
  }

  const p2Plan = planP2ScriptTransition({
    base: args.base,
    ours: args.ours,
    target: args.p2,
    ledger: args.p2Ledger,
  })
  if (p2Plan.conflicts.length) return planWithConflicts([...p2Plan.conflicts], args.target)

  let base: ReturnType<typeof readV4ScriptCorpus>
  let ours: ReturnType<typeof readV4ScriptCorpus>
  try {
    base = readV4ScriptCorpus(args.base)
    ours = readV4ScriptCorpus(args.ours.migration)
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

  const conflicts: P3TransitionConflict[] = []
  for (const structure of args.target.flowStructures) {
    const baseTarget = base.byId.get(structure.target.legacyScriptId)
    const oursTarget = ours.byId.get(structure.target.legacyScriptId)
    const baseTargetHash = baseTarget ? legacyAuthorCellSha256(baseTarget.body) : '<missing>'
    const oursTargetHash = oursTarget ? legacyAuthorCellSha256(oursTarget.body) : '<missing>'
    if (baseTargetHash !== structure.target.baseCellSha256)
      conflicts.push({
        kind: 'stale-base-cell',
        source: structure.target.legacyScriptId,
        expected: structure.target.baseCellSha256,
        actual: baseTargetHash,
      })
    else if (oursTargetHash !== structure.target.baseCellSha256)
      conflicts.push({
        kind: 'flow-target-modify',
        source: structure.target.legacyScriptId,
        expected: structure.target.baseCellSha256,
        actual: oursTargetHash,
      })

    for (const site of structure.incoming) {
      const baseCaller = base.byId.get(site.callerLegacyScriptId)
      const oursCaller = ours.byId.get(site.callerLegacyScriptId)
      const baseCommand = baseCaller
        ? commandAtPointerOrMissing(baseCaller.body, site.path)
        : undefined
      const oursCommand = oursCaller
        ? commandAtPointerOrMissing(oursCaller.body, site.path)
        : undefined
      const baseHash = baseCommand === undefined ? '<missing>' : legacyAuthorCellSha256(baseCommand)
      const oursHash = oursCommand === undefined ? '<missing>' : legacyAuthorCellSha256(oursCommand)
      const source = `legacy-script:${site.callerLegacyScriptId}#${site.path}`
      if (baseHash !== site.baseCellSha256)
        conflicts.push({
          kind: 'stale-base-cell',
          source,
          expected: site.baseCellSha256,
          actual: baseHash,
        })
      else if (oursHash !== site.baseCellSha256)
        conflicts.push({
          kind: 'flow-reference-modify',
          source,
          expected: site.baseCellSha256,
          actual: oursHash,
        })
    }
  }

  const absorbedTargets = new Set(
    args.target.flowStructures.map((structure) => structure.target.legacyScriptId),
  )
  const baseInbound = inboundReferenceInventory(args.base, base, absorbedTargets, {
    includeTargetBodies: true,
  })
  const oursInbound = inboundReferenceInventory(args.ours.migration, ours, absorbedTargets, {
    includeTargetBodies: true,
  })
  if (stableJsonSha256(baseInbound) !== stableJsonSha256(oursInbound))
    conflicts.push({
      kind: 'flow-reference-inventory-modify',
      source: 'references-to:P3-absorbed-flow-targets',
      expected: stableJsonSha256(baseInbound),
      actual: stableJsonSha256(oursInbound),
    })
  if (baseInbound.length !== 655)
    conflicts.push({
      kind: 'stale-base-cell',
      source: 'references-to:P3-absorbed-flow-targets',
      expected: '655',
      actual: String(baseInbound.length),
    })

  if (conflicts.length) return planWithConflicts(conflicts, args.target)
  const presentFlowTargets = args.target.flowStructures.filter((structure) =>
    ours.byId.has(structure.target.legacyScriptId),
  ).length
  const flowReferenceRewrites = args.target.flowStructures.reduce(
    (total, structure) => total + structure.incoming.length,
    0,
  )
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P3',
    dryOnly: true,
    summary: {
      cellWrites: p2Plan.summary.cellWrites + flowReferenceRewrites,
      cellDeletes: p2Plan.summary.cellDeletes + presentFlowTargets,
      conflicts: 0,
      tombstones: p2Plan.summary.tombstones,
      transitionGroups: p2Plan.summary.transitionGroups + args.target.flowStructures.length,
      installerRewrites: p2Plan.summary.installerRewrites,
      flowAbsorptions: args.target.flowStructures.length,
      flowReferenceRewrites,
    },
    conflicts: [],
  }
}
