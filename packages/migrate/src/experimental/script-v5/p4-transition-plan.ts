import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import type { SourceCmd } from '../../source-facts.js'
import { planP3ScriptTransition } from './p3-transition-plan.js'
import { validateP4ScriptMigrationIR } from './p4-validate.js'
import {
  commandAtPointer,
  inboundReferenceInventory,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
  type V4MigrationSnapshotLike,
} from './source-v4.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P4TransitionConflict,
  P4TransitionPlan,
  ScriptMigrationIRP2,
  ScriptMigrationIRP3,
  ScriptMigrationIRP4,
  ScriptTransitionLedgerDraftP3,
  ScriptTransitionLedgerDraftP4,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

type P4TransitionOurs =
  | { kind: 'v4'; migration: V4MigrationSnapshotLike }
  | {
      kind: 'p4-ir'
      ir: ScriptMigrationIRP4
      ledger: ScriptTransitionLedgerDraftP4
    }

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

function planWithConflicts(
  conflicts: P4TransitionConflict[],
  target: ScriptMigrationIRP4,
): P4TransitionPlan {
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P4',
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
    },
    conflicts,
  }
}

function cellAtPointerOrMissing(root: unknown, pointer: string): unknown {
  try {
    return commandAtPointer(root, pointer)
  } catch {
    return undefined
  }
}

function sourceCellValue(
  snapshot: V4MigrationSnapshotLike,
  corpus: ReturnType<typeof readV4ScriptCorpus>,
  source:
    | { kind: 'legacy-script'; id: string }
    | { kind: 'legacy-script-cell'; scriptId: string; pointer: string }
    | { kind: 'source-cell'; source: string; pointer: string },
): unknown {
  if (source.kind === 'legacy-script') return corpus.byId.get(source.id)?.body
  if (source.kind === 'legacy-script-cell') {
    const body = corpus.byId.get(source.scriptId)
    return body ? cellAtPointerOrMissing(body.body, source.pointer) : undefined
  }
  const file = snapshot.files.get(source.source)
  return file === undefined ? undefined : cellAtPointerOrMissing(file, source.pointer)
}

function ownerSurfaceInventory(snapshot: V4MigrationSnapshotLike): Array<{
  source: string
  pointer: string
  baseCellSha256: string
}> {
  const inventory: Array<{
    source: string
    pointer: string
    baseCellSha256: string
  }> = []
  for (const [path, value] of [...snapshot.files]
    .filter(([path]) => /^content\/scenes\/s\d+\.json$/.test(path))
    .sort(([left], [right]) => stableStringCompare(left, right))) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const record = value as Record<string, unknown>
    if (Array.isArray(record.entities)) {
      for (const [entityIndex, entity] of record.entities.entries()) {
        if (!entity || typeof entity !== 'object' || Array.isArray(entity)) continue
        const pages = (entity as Record<string, unknown>).pages
        if (!Array.isArray(pages)) continue
        for (const [pageIndex, page] of pages.entries())
          inventory.push({
            source: path,
            pointer: `/entities/${entityIndex}/pages/${pageIndex}`,
            baseCellSha256: legacyAuthorCellSha256(page),
          })
      }
    }
    for (const property of ['onEnter', 'onTeleport'] as const) {
      if (record[property] === undefined) continue
      inventory.push({
        source: path,
        pointer: `/${property}`,
        baseCellSha256: legacyAuthorCellSha256(record[property]),
      })
    }
  }
  return inventory
}

export function planP4ScriptTransition(args: {
  migration: import('../../pal-migration.js').MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  sourceCommands: readonly SourceCmd[]
  base: V4MigrationSnapshotLike
  ours: P4TransitionOurs
  p2: ScriptMigrationIRP2
  p2Ledger: ScriptTransitionLedgerDraftV1
  p3: ScriptMigrationIRP3
  p3Ledger: ScriptTransitionLedgerDraftP3
  target: ScriptMigrationIRP4
  ledger: ScriptTransitionLedgerDraftP4
}): P4TransitionPlan {
  const targetConflicts: P4TransitionConflict[] = []
  if (args.target.digest !== digestWithoutSelf(args.target))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptMigrationIR P4',
      expected: digestWithoutSelf(args.target),
      actual: args.target.digest,
    })
  if (args.ledger.digest !== digestWithoutSelf(args.ledger))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptTransitionLedgerDraft P4',
      expected: digestWithoutSelf(args.ledger),
      actual: args.ledger.digest,
    })
  try {
    validateP4ScriptMigrationIR({
      migration: args.migration,
      frozenAudit: args.frozenAudit,
      p3: args.p3,
      p3Ledger: args.p3Ledger,
      ir: args.target,
      ledger: args.ledger,
      throughPhase: 'P4',
    })
  } catch (error) {
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'P4 target-ledger relationship',
      actual: error instanceof Error ? error.message : String(error),
    })
  }
  if (targetConflicts.length) return planWithConflicts(targetConflicts, args.target)

  if (args.ours.kind === 'p4-ir') {
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
        throughPhase: 'P4',
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
          pageAllocations: 0,
          ownerAllocations: 0,
          ownerFragments: 0,
          selectionCommandRewrites: 0,
          deferredCrossOwner: 0,
        },
        conflicts: [],
      }
    return planWithConflicts(
      [
        {
          kind: 'target-digest-mismatch',
          source: 'ScriptMigrationIR P4',
          expected: args.target.digest,
          actual: validOurs ? args.ours.ir.digest : '<invalid-self-digest>',
        },
      ],
      args.target,
    )
  }

  const p3Plan = planP3ScriptTransition({
    migration: args.migration,
    frozenAudit: args.frozenAudit,
    sourceCommands: args.sourceCommands,
    base: args.base,
    ours: args.ours,
    p2: args.p2,
    p2Ledger: args.p2Ledger,
    target: args.p3,
    ledger: args.p3Ledger,
  })
  if (p3Plan.conflicts.length) return planWithConflicts([...p3Plan.conflicts], args.target)

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

  const rewriteSources = new Set(
    args.target.commandRewrites
      .filter((rewrite) => rewrite.transitionedIn === 'P4')
      .map((rewrite) => {
        const identity = rewrite.source.identity
        return identity.kind === 'legacy-script-cell'
          ? `legacy-script-cell:${identity.scriptId}#${identity.pointer}`
          : `source-cell:${identity.source}#${identity.pointer}`
      }),
  )
  const p4Groups = args.ledger.groups.filter(
    (
      group,
    ): group is Extract<
      ScriptTransitionLedgerDraftP4['groups'][number],
      { kind: `${string}-group` }
    > =>
      group.kind === 'page-owner-allocation-group' ||
      group.kind === 'entity-behavior-allocation-group' ||
      group.kind === 'scene-hook-allocation-group' ||
      group.kind === 'selection-command-rewrite-group',
  )
  const conflicts: P4TransitionConflict[] = []
  for (const group of p4Groups) {
    for (const source of group.sources) {
      const baseValue = sourceCellValue(args.base, baseCorpus, source.identity)
      const oursValue = sourceCellValue(args.ours.migration, oursCorpus, source.identity)
      const baseHash = baseValue === undefined ? '<missing>' : legacyAuthorCellSha256(baseValue)
      const oursHash = oursValue === undefined ? '<missing>' : legacyAuthorCellSha256(oursValue)
      const key =
        source.identity.kind === 'legacy-script'
          ? `legacy-script:${source.identity.id}`
          : source.identity.kind === 'legacy-script-cell'
            ? `legacy-script-cell:${source.identity.scriptId}#${source.identity.pointer}`
            : `source-cell:${source.identity.source}#${source.identity.pointer}`
      if (baseHash !== source.baseCellSha256)
        conflicts.push({
          kind: 'stale-base-cell',
          source: key,
          expected: source.baseCellSha256,
          actual: baseHash,
        })
      else if (oursHash !== source.baseCellSha256)
        conflicts.push({
          kind: rewriteSources.has(key) ? 'selection-command-modify' : 'owner-source-modify',
          source: key,
          expected: source.baseCellSha256,
          actual: oursHash,
        })
    }
  }

  const baseSurface = ownerSurfaceInventory(args.base)
  const oursSurface = ownerSurfaceInventory(args.ours.migration)
  if (stableJsonSha256(baseSurface) !== stableJsonSha256(oursSurface))
    conflicts.push({
      kind: 'owner-source-inventory-modify',
      source: 'entity-pages-and-scene-hooks',
      expected: stableJsonSha256(baseSurface),
      actual: stableJsonSha256(oursSurface),
    })
  if (stableJsonSha256(baseCorpus.commandSites) !== stableJsonSha256(oursCorpus.commandSites))
    conflicts.push({
      kind: 'owner-source-inventory-modify',
      source: 'legacy-selection-command-inventory',
      expected: stableJsonSha256(baseCorpus.commandSites),
      actual: stableJsonSha256(oursCorpus.commandSites),
    })

  const fragmentTargets = new Set(
    args.target.ownerFragments
      .filter(
        (fragment) => fragment.legacyScriptId !== args.target.ownerResolutions[0].legacyScriptId,
      )
      .map((fragment) => fragment.legacyScriptId),
  )
  const baseInbound = inboundReferenceInventory(args.base, baseCorpus, fragmentTargets, {
    includeTargetBodies: true,
  })
  const oursInbound = inboundReferenceInventory(args.ours.migration, oursCorpus, fragmentTargets, {
    includeTargetBodies: true,
  })
  if (stableJsonSha256(baseInbound) !== stableJsonSha256(oursInbound))
    conflicts.push({
      kind: 'owner-source-inventory-modify',
      source: 'references-to:P4-owner-fragments',
      expected: stableJsonSha256(baseInbound),
      actual: stableJsonSha256(oursInbound),
    })

  if (conflicts.length) return planWithConflicts(conflicts, args.target)
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P4',
    dryOnly: true,
    summary: {
      cellWrites: p3Plan.summary.cellWrites + 3_616 + 227 + 843,
      cellDeletes: p3Plan.summary.cellDeletes + 7_038,
      conflicts: 0,
      tombstones: p3Plan.summary.tombstones,
      transitionGroups: p3Plan.summary.transitionGroups + 4_620,
      installerRewrites: p3Plan.summary.installerRewrites,
      flowAbsorptions: p3Plan.summary.flowAbsorptions,
      flowReferenceRewrites: p3Plan.summary.flowReferenceRewrites,
      pageAllocations: args.target.pages.length,
      ownerAllocations: args.target.owners.length,
      ownerFragments: args.target.ownerFragments.length,
      selectionCommandRewrites: args.target.commandRewrites.filter(
        (rewrite) => rewrite.transitionedIn === 'P4',
      ).length,
      deferredCrossOwner: args.target.ownerCensus.deferredCrossOwner,
    },
    conflicts: [],
  }
}
