import type { V4MigrationSnapshotLike } from './source-v4.js'
import {
  commandAtPointer,
  inboundReferenceInventory,
  legacyAuthorCellSha256,
  modifiedCellConflict,
  readV4ScriptCorpus,
} from './source-v4.js'
import { stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P2TransitionConflict,
  P2TransitionEntry,
  P2TransitionPlan,
  ScriptMigrationIRP2,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

type P2TransitionOurs =
  | { kind: 'v4'; migration: V4MigrationSnapshotLike }
  | {
      kind: 'p2-ir'
      ir: ScriptMigrationIRP2
      ledger: ScriptTransitionLedgerDraftV1
    }

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

function planWithConflicts(
  conflicts: P2TransitionConflict[],
  tombstones: number,
): P2TransitionPlan {
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P2',
    dryOnly: true,
    summary: {
      cellWrites: 0,
      cellDeletes: 0,
      conflicts: conflicts.length,
      tombstones,
      transitionGroups: 0,
      installerRewrites: 0,
    },
    conflicts,
  }
}

function transitionEntryKey(entry: P2TransitionEntry): string {
  return entry.from.kind === 'legacy-script'
    ? `legacy-script:${entry.from.id}`
    : `source-cell:${entry.from.source}#${entry.from.pointer}`
}

function isTombstoneEntry(
  entry: P2TransitionEntry,
): entry is Extract<P2TransitionEntry, { outcome: { kind: 'tombstone' } }> {
  return entry.outcome.kind === 'tombstone'
}

function targetLedgerRelationshipValid(
  target: ScriptMigrationIRP2,
  ledger: ScriptTransitionLedgerDraftV1,
): boolean {
  const resolution = target.ownerResolutions[0]
  const resolvedBody = target.retainedBodies.find(
    (body) => body.legacyScriptId === resolution?.legacyScriptId,
  )
  if (
    !resolution ||
    !resolvedBody ||
    resolvedBody.status.kind !== 'resolved-entity-behavior' ||
    target.ownerResolutions.length !== 1 ||
    target.retainedBodies.filter((body) => body.status.kind === 'resolved-entity-behavior')
      .length !== 1 ||
    stableJsonSha256(resolution.target) !==
      stableJsonSha256({
        kind: 'entity-behavior',
        sceneId: 's015',
        entityId: 'e204',
        channel: 'trigger',
        behaviorId: 'enter-s018',
      }) ||
    stableJsonSha256(resolution.installer.before) !==
      stableJsonSha256({
        kind: 'setEntityTrigger',
        entity: 'e204',
        targetLegacyScriptId: 'scene/s015/L-4211/e204/d-0a386828',
      }) ||
    stableJsonSha256(resolution.installer.after) !==
      stableJsonSha256({
        kind: 'selectEntityBehavior',
        scene: 's015',
        entity: 'e204',
        channel: 'trigger',
        selection: { kind: 'use', value: 'enter-s018' },
      })
  )
    return false
  const installerCell = {
    kind: 'source-cell' as const,
    source: resolution.installer.source,
    pointer: resolution.installer.pointer,
  }
  const expectedGroup = {
    kind: 'transition-group' as const,
    id: 's018-owner-resolution' as const,
    transformId: 'resolve-s018-owner-v1' as const,
    editPolicy: 'conflict-if-modified' as const,
    sources: [
      {
        identity: { kind: 'legacy-script' as const, id: resolution.legacyScriptId },
        baseCellSha256: resolvedBody.baseCellSha256,
      },
      {
        identity: installerCell,
        baseCellSha256: resolution.installer.beforeSha256,
      },
    ],
    targets: [resolution.target, installerCell],
    evidenceId: `p0:${target.sourceAudit.digest}:s018-owner-resolution`,
  }
  const expectedEntries: P2TransitionEntry[] = [
    ...target.tombstones.map((entry) => ({
      from: { kind: 'legacy-script' as const, id: entry.legacyScriptId },
      baseCellSha256: entry.baseCellSha256,
      outcome: {
        kind: 'tombstone' as const,
        reason: entry.reason,
        evidenceId: entry.evidenceId,
      },
    })),
    {
      from: { kind: 'legacy-script', id: resolution.legacyScriptId },
      baseCellSha256: resolvedBody.baseCellSha256,
      outcome: { kind: 'group', groupId: 's018-owner-resolution' },
    },
    {
      from: installerCell,
      baseCellSha256: resolution.installer.beforeSha256,
      outcome: { kind: 'group', groupId: 's018-owner-resolution' },
    },
  ]
  expectedEntries.sort((left, right) =>
    stableStringCompare(transitionEntryKey(left), transitionEntryKey(right)),
  )
  const expectedEvidence = [
    ...target.tombstones.map((entry) => ({
      id: entry.evidenceId,
      kind: 'folded-body' as const,
      sourceAuditDigest: target.sourceAudit.digest,
      legacyScriptIds: [entry.legacyScriptId],
      sourceCells: [],
    })),
    {
      id: expectedGroup.evidenceId,
      kind: 's018-owner-resolution' as const,
      sourceAuditDigest: target.sourceAudit.digest,
      legacyScriptIds: [resolution.legacyScriptId],
      sourceCells: [`${resolution.installer.source}#${resolution.installer.pointer}`],
    },
  ].sort((left, right) => stableStringCompare(left.id, right.id))
  const expectedPending = target.retainedBodies
    .flatMap((body) =>
      body.status.kind === 'resolved-entity-behavior'
        ? []
        : [
            {
              legacyScriptId: body.legacyScriptId,
              handle: body.handle,
              phase: body.status.work.phase,
              reason: body.status.work.reason,
            },
          ],
    )
    .sort((left, right) => stableStringCompare(left.legacyScriptId, right.legacyScriptId))
  return (
    target.kind === 'script-migration-ir' &&
    target.version === 1 &&
    target.throughPhase === 'P2' &&
    target.generatorEpoch === 'n3-script-v5-p2-v1' &&
    target.canonical === false &&
    target.runtimeConsumable === false &&
    ledger.kind === 'script-transition-ledger-draft' &&
    ledger.version === 1 &&
    ledger.projectId === 'pal' &&
    ledger.transitionId === 'script-v4-v5' &&
    ledger.generatorEpoch === target.generatorEpoch &&
    ledger.throughPhase === target.throughPhase &&
    ledger.sourceAudit.digest === target.sourceAudit.digest &&
    ledger.sourceAudit.methodVersion === target.sourceAudit.methodVersion &&
    stableJsonSha256(ledger.completed) ===
      stableJsonSha256([
        'folded-body-pruning',
        'misleading-scc-retirement',
        's018-owner-resolution',
      ]) &&
    stableJsonSha256(ledger.entries) === stableJsonSha256(expectedEntries) &&
    ledger.groups.length === 1 &&
    stableJsonSha256(ledger.groups[0]) === stableJsonSha256(expectedGroup) &&
    stableJsonSha256(ledger.evidence) === stableJsonSha256(expectedEvidence) &&
    stableJsonSha256(ledger.pending) === stableJsonSha256(expectedPending)
  )
}

function commandAtPointerOrMissing(root: unknown, pointer: string): unknown {
  try {
    return commandAtPointer(root, pointer)
  } catch {
    return undefined
  }
}

export function planP2ScriptTransition(args: {
  base: V4MigrationSnapshotLike
  ours: P2TransitionOurs
  target: ScriptMigrationIRP2
  ledger: ScriptTransitionLedgerDraftV1
}): P2TransitionPlan {
  const targetDigest = digestWithoutSelf(args.target)
  const ledgerDigest = digestWithoutSelf(args.ledger)
  const targetConflicts: P2TransitionConflict[] = []
  if (args.target.digest !== targetDigest)
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptMigrationIR',
      expected: targetDigest,
      actual: args.target.digest,
    })
  if (args.ledger.digest !== ledgerDigest)
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'ScriptTransitionLedgerDraft',
      expected: ledgerDigest,
      actual: args.ledger.digest,
    })
  if (!targetLedgerRelationshipValid(args.target, args.ledger))
    targetConflicts.push({
      kind: 'target-digest-mismatch',
      source: 'P2 target-ledger relationship',
    })
  if (targetConflicts.length)
    return planWithConflicts(targetConflicts, args.target.tombstones.length)

  if (args.ours.kind === 'p2-ir') {
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
        throughPhase: 'P2',
        dryOnly: true,
        summary: {
          cellWrites: 0,
          cellDeletes: 0,
          conflicts: 0,
          tombstones: 0,
          transitionGroups: 0,
          installerRewrites: 0,
        },
        conflicts: [],
      }
    return planWithConflicts(
      [
        {
          kind: 'target-digest-mismatch',
          source: 'ScriptMigrationIR',
          expected: args.target.digest,
          actual: validOurs ? args.ours.ir.digest : '<invalid-self-digest>',
        },
      ],
      0,
    )
  }

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
      args.target.tombstones.length,
    )
  }
  const conflicts: P2TransitionConflict[] = []
  if (base.sourceSnapshotSha256 !== args.target.source.sourceSnapshotSha256)
    conflicts.push({
      kind: 'source-audit-drift',
      source: 'v4-source-snapshot',
      expected: args.target.source.sourceSnapshotSha256,
      actual: base.sourceSnapshotSha256,
    })

  const tombstoneEntries = args.ledger.entries.filter(isTombstoneEntry)
  for (const entry of tombstoneEntries) {
    const baseBody = base.byId.get(entry.from.id)
    const oursBody = ours.byId.get(entry.from.id)
    if (!baseBody) {
      conflicts.push({
        kind: 'stale-base-cell',
        source: entry.from.id,
        expected: entry.baseCellSha256,
        actual: '<missing>',
      })
      continue
    }
    const baseHash = legacyAuthorCellSha256(baseBody.body)
    if (baseHash !== entry.baseCellSha256) {
      conflicts.push({
        kind: 'stale-base-cell',
        source: entry.from.id,
        expected: entry.baseCellSha256,
        actual: baseHash,
      })
      continue
    }
    if (!oursBody) continue
    const oursHash = legacyAuthorCellSha256(oursBody.body)
    if (oursHash !== entry.baseCellSha256)
      conflicts.push(
        modifiedCellConflict({
          kind: 'identity-tombstone-modify',
          source: entry.from.id,
          expected: entry.baseCellSha256,
          actual: oursHash,
        }),
      )
  }

  const group = args.ledger.groups[0]
  const groupBody = group?.sources.find((source) => source.identity.kind === 'legacy-script')
  if (
    args.ledger.groups.length !== 1 ||
    !group ||
    group.id !== 's018-owner-resolution' ||
    !groupBody ||
    groupBody.identity.kind !== 'legacy-script'
  )
    conflicts.push({ kind: 'stale-base-cell', source: 's018-transition-group' })
  else {
    const baseBody = base.byId.get(groupBody.identity.id)
    const oursBody = ours.byId.get(groupBody.identity.id)
    const baseHash = baseBody ? legacyAuthorCellSha256(baseBody.body) : '<missing>'
    const oursHash = oursBody ? legacyAuthorCellSha256(oursBody.body) : '<missing>'
    if (baseHash !== groupBody.baseCellSha256)
      conflicts.push({
        kind: 'stale-base-cell',
        source: groupBody.identity.id,
        expected: groupBody.baseCellSha256,
        actual: baseHash,
      })
    else if (oursHash !== groupBody.baseCellSha256)
      conflicts.push(
        modifiedCellConflict({
          kind: 'identity-transition-group-modify',
          source: groupBody.identity.id,
          expected: groupBody.baseCellSha256,
          actual: oursHash,
        }),
      )
  }

  const transitionedIds = new Set([
    ...tombstoneEntries.map((entry) => entry.from.id),
    ...(groupBody?.identity.kind === 'legacy-script' ? [groupBody.identity.id] : []),
  ])
  const baseInbound = inboundReferenceInventory(args.base, base, transitionedIds)
  const oursInbound = inboundReferenceInventory(args.ours.migration, ours, transitionedIds)
  for (const site of baseInbound)
    conflicts.push({
      kind: 'stale-base-cell',
      source: `uncovered-reference:${site.source}`,
      expected: '<no inbound reference to transitioned identity>',
      actual: site.targetLegacyScriptId,
    })
  const byTarget = (sites: typeof baseInbound, target: string) =>
    sites.filter((site) => site.targetLegacyScriptId === target)
  for (const target of [...transitionedIds].sort(stableStringCompare)) {
    const before = byTarget(baseInbound, target)
    const after = byTarget(oursInbound, target)
    if (stableJsonSha256(before) === stableJsonSha256(after)) continue
    conflicts.push({
      kind: tombstoneEntries.some((entry) => entry.from.id === target)
        ? 'identity-tombstone-reference-modify'
        : 'identity-transition-group-reference-modify',
      source: `references-to:${target}`,
      expected: stableJsonSha256(before),
      actual: stableJsonSha256(after),
    })
  }

  const resolution = args.target.ownerResolutions[0]
  const pointer = resolution?.installer.pointer
  const baseScene = args.base.files.get('content/scenes/s018.json')
  const oursScene = args.ours.migration.files.get('content/scenes/s018.json')
  if (!resolution || !pointer || !baseScene || !oursScene)
    conflicts.push({ kind: 'stale-base-cell', source: 'content/scenes/s018.json' })
  else {
    const baseCommand = commandAtPointerOrMissing(baseScene, pointer)
    const oursCommand = commandAtPointerOrMissing(oursScene, pointer)
    const baseHash = baseCommand === undefined ? '<missing>' : legacyAuthorCellSha256(baseCommand)
    const oursHash = oursCommand === undefined ? '<missing>' : legacyAuthorCellSha256(oursCommand)
    if (baseHash !== resolution.installer.beforeSha256)
      conflicts.push({
        kind: 'stale-base-cell',
        source: `content/scenes/s018.json#${pointer}`,
        expected: resolution.installer.beforeSha256,
        actual: baseHash,
      })
    else if (oursHash !== resolution.installer.beforeSha256)
      conflicts.push(
        modifiedCellConflict({
          kind: 'installer-rewrite-modify',
          source: `content/scenes/s018.json#${pointer}`,
          expected: resolution.installer.beforeSha256,
          actual: oursHash,
        }),
      )
  }

  if (conflicts.length) return planWithConflicts(conflicts, tombstoneEntries.length)
  const presentTombstones = tombstoneEntries.filter((entry) => ours.byId.has(entry.from.id)).length
  return {
    kind: 'script-transition-phase-plan',
    version: 1,
    throughPhase: 'P2',
    dryOnly: true,
    summary: {
      cellWrites: 2,
      cellDeletes: presentTombstones + 1,
      conflicts: 0,
      tombstones: tombstoneEntries.length,
      transitionGroups: 1,
      installerRewrites: 1,
    },
    conflicts: [],
  }
}
