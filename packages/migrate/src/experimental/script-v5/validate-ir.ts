import { visitScriptRefs } from '@type-pal/content'
import type { MigrationFileSet } from '../../pal-migration.js'
import type { ScriptControlFlowAuditV1 } from '../../script-control-flow-audit.js'
import {
  canonicalLegacyAuthorCell,
  commandAtPointer,
  legacyAuthorCellSha256,
  readV4ScriptCorpus,
  reverseP2ScriptRefs,
} from './source-v4.js'
import { digestRecord, stableJsonSha256, stableStringCompare } from './stable-json.js'
import type {
  P2TransitionEntry,
  P2ValidationReport,
  ScriptMigrationIRP2,
  ScriptTransitionLedgerDraftV1,
} from './types.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`P2 validation: ${message}`)
}

function digestWithoutSelf<T extends object>(value: T & { digest: string }): string {
  const { digest: _digest, ...withoutDigest } = value
  return stableJsonSha256(withoutDigest)
}

function pendingOwnerCounts(ir: ScriptMigrationIRP2): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const body of ir.retainedBodies) {
    if (body.status.kind !== 'pending-owner') continue
    counts[body.status.ownerKind] = (counts[body.status.ownerKind] ?? 0) + 1
  }
  return counts
}

function transitionEntryKey(entry: P2TransitionEntry): string {
  return entry.from.kind === 'legacy-script'
    ? `legacy-script:${entry.from.id}`
    : `source-cell:${entry.from.source}#${entry.from.pointer}`
}

export function validateScriptMigrationIR(args: {
  migration: MigrationFileSet
  frozenAudit: ScriptControlFlowAuditV1
  ir: ScriptMigrationIRP2
  ledger: ScriptTransitionLedgerDraftV1
  throughPhase: 'P2'
}): P2ValidationReport {
  const { migration, frozenAudit, ir, ledger } = args
  assert(args.throughPhase === 'P2', 'only P2 is implemented')
  assert(ir.throughPhase === 'P2' && ledger.throughPhase === 'P2', 'phase mismatch')
  assert(ir.kind === 'script-migration-ir' && ir.version === 1, 'IR header mismatch')
  assert(ir.generatorEpoch === 'n3-script-v5-p2-v1', 'IR generator epoch mismatch')
  assert(ir.canonical === false && ir.runtimeConsumable === false, 'IR masquerades as canonical')
  assert(ir.digest === digestWithoutSelf(ir), 'IR digest mismatch')
  assert(ledger.digest === digestWithoutSelf(ledger), 'ledger digest mismatch')
  assert(ir.sourceAudit.digest === frozenAudit.digest, 'source audit digest mismatch')
  assert(ledger.sourceAudit.digest === frozenAudit.digest, 'ledger audit digest mismatch')

  const corpus = readV4ScriptCorpus(migration)
  assert(ir.source.sourceSnapshotSha256 === corpus.sourceSnapshotSha256, 'source snapshot drift')
  assert(
    ir.source.nonScriptSnapshotSha256 === corpus.nonScriptSnapshotSha256,
    'non-script snapshot drift',
  )
  assert(
    ir.source.scriptLibrarySnapshotSha256 === corpus.scriptLibrarySnapshotSha256,
    'script library snapshot drift',
  )
  assert(ir.source.productBodies === corpus.bodies.length, 'source body count mismatch')
  assert(
    ir.source.reachableBodies === frozenAudit.summary.runtimeReachableBodies &&
      ir.source.unreachableBodies === frozenAudit.summary.unreachableBodies,
    'source reachability count mismatch',
  )
  assert(
    stableJsonSha256(ir.commandCensus) === stableJsonSha256(corpus.commandCensus),
    'command census mismatch',
  )
  assert(
    stableJsonSha256(ir.commandSites) === stableJsonSha256(corpus.commandSites),
    'command site inventory mismatch',
  )
  assert(ir.commandCensus.total === 844, 'legacy command total is not 844')
  assert(ir.commandTransition.input === 844, 'command transition input mismatch')
  assert(ir.commandTransition.legacyPending === 843, 'command pending total mismatch')
  assert(ir.commandTransition.transitionedP2 === 1, 'P2 transitioned total mismatch')
  assert(
    ir.commandTransition.byKind.setEntityTrigger.input === 202 &&
      ir.commandTransition.byKind.setEntityTrigger.legacyPending === 201 &&
      ir.commandTransition.byKind.setEntityTrigger.transitionedP2 === 1,
    'setEntityTrigger 202=201+1 conservation failed',
  )
  for (const [kind, count] of Object.entries(ir.commandTransition.byKind))
    assert(
      count.input === count.legacyPending + count.transitionedP2,
      `${kind} command conservation failed`,
    )
  const transitionedSites = ir.commandSites.filter((site) => site.disposition === 'transitioned-p2')
  assert(
    transitionedSites.length === 1 &&
      transitionedSites[0]?.source === 'content/scenes/s018.json#/onEnter/0/entry/prepare/0' &&
      transitionedSites[0].kind === 'setEntityTrigger' &&
      transitionedSites[0].targetLegacyScriptId === 'scene/s015/L-4211/e204/d-0a386828',
    's018 transitioned command site mismatch',
  )

  const sprite = new Set(frozenAudit.product.folded.spriteAction.bodies)
  const hostile = new Set(frozenAudit.product.folded.hostileBehavior.bodies)
  const foldedOverlap = [...sprite].filter((id) => hostile.has(id)).length
  const tombstoneById = new Map(ir.tombstones.map((entry) => [entry.legacyScriptId, entry]))
  const unknownTombstones = ir.tombstones.filter(
    (entry) => !sprite.has(entry.legacyScriptId) && !hostile.has(entry.legacyScriptId),
  ).length
  assert(foldedOverlap === 0, `folded source overlap is ${foldedOverlap}`)
  assert(unknownTombstones === 0, `unknown tombstones is ${unknownTombstones}`)
  assert(tombstoneById.size === ir.tombstones.length, 'duplicate tombstone')
  assert(ir.tombstones.length === sprite.size + hostile.size, 'tombstone count mismatch')
  for (const id of sprite) {
    const entry = tombstoneById.get(id)
    assert(entry?.reason === 'folded-sprite-action', `sprite tombstone missing ${id}`)
  }
  for (const id of hostile) {
    const entry = tombstoneById.get(id)
    assert(entry?.reason === 'folded-hostile-behavior', `hostile tombstone missing ${id}`)
  }
  for (const entry of ir.tombstones) {
    const source = corpus.byId.get(entry.legacyScriptId)
    assert(source, `tombstone source missing ${entry.legacyScriptId}`)
    assert(
      legacyAuthorCellSha256(source.body) === entry.baseCellSha256,
      `tombstone base hash mismatch ${entry.legacyScriptId}`,
    )
    assert(
      entry.evidenceId.includes(frozenAudit.digest) &&
        entry.evidenceId.includes(entry.legacyScriptId),
      `tombstone evidence missing ${entry.legacyScriptId}`,
    )
  }

  const retainedByLegacy = new Map(
    ir.retainedBodies.map((body) => [body.legacyScriptId, body] as const),
  )
  const retainedByTarget = new Map(
    ir.retainedBodies.map((body) => [body.activeRefId, body] as const),
  )
  assert(retainedByLegacy.size === ir.retainedBodies.length, 'duplicate retained legacy id')
  assert(retainedByTarget.size === ir.retainedBodies.length, 'duplicate retained target id')
  assert(ir.retainedBodies.length === 8_102, 'retained body count is not 8,102')
  assert(
    ir.retainedBodies.length + ir.tombstones.length === corpus.bodies.length,
    'body conservation failed',
  )
  assert(
    new Set([
      ...ir.retainedBodies.map((body) => body.handle),
      ...ir.tombstones.map((body) => body.handle),
    ]).size === corpus.bodies.length,
    'body handle collision',
  )
  for (const tombstone of ir.tombstones)
    assert(
      !retainedByLegacy.has(tombstone.legacyScriptId),
      `body retained and removed ${tombstone}`,
    )

  const reverseIds = new Map(
    ir.retainedBodies
      .filter((body) => body.activeRefId !== body.legacyScriptId)
      .map((body) => [body.activeRefId, body.legacyScriptId] as const),
  )
  let semanticChanges = 0
  let dangling = 0
  let misleading = 0
  for (const body of ir.retainedBodies) {
    if (body.activeRefId.startsWith('shared/scc-')) misleading++
    const source = corpus.byId.get(body.legacyScriptId)
    assert(source, `retained source missing ${body.legacyScriptId}`)
    const restored = reverseP2ScriptRefs(body.body, reverseIds)
    if (
      stableJsonSha256(canonicalLegacyAuthorCell(source.body)) !==
      stableJsonSha256(canonicalLegacyAuthorCell(restored))
    )
      semanticChanges++
    visitScriptRefs(body.body, (ref) => {
      if (!retainedByTarget.has(ref.id)) dangling++
      if (ref.id.startsWith('shared/scc-')) misleading++
    })
  }
  assert(semanticChanges === 0, `${semanticChanges} retained bodies changed semantics`)
  assert(dangling === 0, `${dangling} retained references are dangling`)
  assert(misleading === 0, `${misleading} active shared/scc identities remain`)

  const sccCanaries = new Set(frozenAudit.canaries.misleadingSccBodies.map((body) => body.id))
  const pendingScc = ir.retainedBodies.filter((body) => body.status.kind === 'pending-owner')
  assert(pendingScc.length === 13, 'pending shared/scc count mismatch')
  for (const body of pendingScc)
    assert(sccCanaries.has(body.legacyScriptId), `unexpected pending SCC ${body.legacyScriptId}`)
  const ownerCounts = pendingOwnerCounts(ir)
  assert(ownerCounts['pending-author-root-absorption'] === 6, 'author-root SCC count mismatch')
  assert(ownerCounts['pending-shared-tail'] === 2, 'shared-tail SCC count mismatch')
  assert(ownerCounts['pending-scene-hook-inline'] === 4, 'scene-hook SCC count mismatch')
  assert(ownerCounts['pending-flow-structure'] === 1, 'flow SCC count mismatch')

  const resolution = ir.ownerResolutions[0]
  assert(ir.ownerResolutions.length === 1 && resolution, 's018 resolution missing')
  assert(
    ir.retainedBodies.filter((body) => body.status.kind === 'resolved-entity-behavior').length ===
      1,
    'resolved entity behavior count mismatch',
  )
  assert(
    resolution.target.sceneId === 's015' &&
      resolution.target.entityId === 'e204' &&
      resolution.target.channel === 'trigger' &&
      resolution.target.behaviorId === 'enter-s018',
    's018 owner resolved incorrectly',
  )
  assert(
    stableJsonSha256(resolution.installer.before) ===
      stableJsonSha256({
        kind: 'setEntityTrigger',
        entity: 'e204',
        targetLegacyScriptId: 'scene/s015/L-4211/e204/d-0a386828',
      }),
    's018 installer before payload mismatch',
  )
  assert(
    stableJsonSha256(resolution.installer.after) ===
      stableJsonSha256({
        kind: 'selectEntityBehavior',
        scene: 's015',
        entity: 'e204',
        channel: 'trigger',
        selection: { kind: 'use', value: 'enter-s018' },
      }),
    's018 installer after payload mismatch',
  )
  assert(resolution.preservedDefaultTriggerBodyIds.length > 0, 's018 default trigger lost')
  assert(
    resolution.preservedDefaultTriggerBodyIds.every((id) => retainedByLegacy.has(id)),
    's018 default trigger body pruned',
  )

  const authorRoots = frozenAudit.canaries.authorRoots.map((root) => root.id)
  const authorRootsDeleted = authorRoots.filter((id) => !retainedByLegacy.has(id)).length
  assert(authorRootsDeleted === 0, 'author root deleted')
  assert(ledger.kind === 'script-transition-ledger-draft', 'ledger kind mismatch')
  assert(ledger.version === 1, 'ledger version mismatch')
  assert(ledger.projectId === 'pal', 'ledger project mismatch')
  assert(ledger.transitionId === 'script-v4-v5', 'ledger transition id mismatch')
  assert(ledger.generatorEpoch === ir.generatorEpoch, 'ledger generator epoch mismatch')
  assert(
    ledger.sourceAudit.methodVersion === frozenAudit.methodVersion,
    'ledger audit method mismatch',
  )
  assert(
    stableJsonSha256(ledger.completed) ===
      stableJsonSha256([
        'folded-body-pruning',
        'misleading-scc-retirement',
        's018-owner-resolution',
      ]),
    'ledger completed inventory mismatch',
  )
  assert(ledger.entries.length === ir.tombstones.length + 2, 'draft ledger entry count mismatch')
  const ledgerSources = new Set(ledger.entries.map(transitionEntryKey))
  assert(ledgerSources.size === ledger.entries.length, 'draft ledger duplicate source')
  for (const tombstone of ir.tombstones) {
    const entry = ledger.entries.find(
      (candidate) =>
        candidate.from.kind === 'legacy-script' &&
        candidate.from.id === tombstone.legacyScriptId &&
        candidate.outcome.kind === 'tombstone',
    )
    assert(entry, `ledger tombstone missing ${tombstone.legacyScriptId}`)
    assert(entry.baseCellSha256 === tombstone.baseCellSha256, 'ledger tombstone hash mismatch')
    assert(entry.outcome.kind === 'tombstone', 'ledger tombstone outcome mismatch')
    assert(entry.outcome.reason === tombstone.reason, 'ledger tombstone reason mismatch')
    assert(entry.outcome.evidenceId === tombstone.evidenceId, 'ledger evidence id mismatch')
  }
  const group = ledger.groups[0]
  assert(ledger.groups.length === 1 && group, 's018 transition group missing')
  assert(group.kind === 'transition-group', 's018 group kind mismatch')
  assert(group.id === 's018-owner-resolution', 's018 group id mismatch')
  assert(group.transformId === 'resolve-s018-owner-v1', 's018 group transform mismatch')
  assert(group.editPolicy === 'conflict-if-modified', 's018 group edit policy mismatch')
  assert(group.sources.length === 2 && group.targets.length === 2, 's018 group arity mismatch')
  assert(
    group.sources[0].identity.kind === 'legacy-script' &&
      group.sources[0].identity.id === resolution.legacyScriptId &&
      group.sources[0].baseCellSha256 ===
        retainedByLegacy.get(resolution.legacyScriptId)?.baseCellSha256,
    's018 group body source mismatch',
  )
  assert(
    group.sources[1].identity.kind === 'source-cell' &&
      group.sources[1].identity.source === resolution.installer.source &&
      group.sources[1].identity.pointer === resolution.installer.pointer &&
      group.sources[1].baseCellSha256 === resolution.installer.beforeSha256,
    's018 group installer source mismatch',
  )
  assert(
    group.targets[0].kind === 'entity-behavior' &&
      group.targets[0].sceneId === 's015' &&
      group.targets[0].entityId === 'e204' &&
      group.targets[0].channel === 'trigger' &&
      group.targets[0].behaviorId === 'enter-s018',
    's018 group behavior target mismatch',
  )
  assert(
    group.targets[1].kind === 'source-cell' &&
      group.targets[1].source === resolution.installer.source &&
      group.targets[1].pointer === resolution.installer.pointer,
    's018 group installer target mismatch',
  )
  const groupEntries = ledger.entries.filter(
    (entry) => entry.outcome.kind === 'group' && entry.outcome.groupId === 's018-owner-resolution',
  )
  assert(groupEntries.length === 2, 's018 group entry count mismatch')
  assert(
    stableJsonSha256(
      groupEntries
        .map((entry) => ({
          key: transitionEntryKey(entry),
          baseCellSha256: entry.baseCellSha256,
          outcome: entry.outcome,
        }))
        .sort((left, right) => stableStringCompare(left.key, right.key)),
    ) ===
      stableJsonSha256(
        group.sources
          .map((source) => ({
            key:
              source.identity.kind === 'legacy-script'
                ? `legacy-script:${source.identity.id}`
                : `source-cell:${source.identity.source}#${source.identity.pointer}`,
            baseCellSha256: source.baseCellSha256,
            outcome: {
              kind: 'group',
              groupId: 's018-owner-resolution',
            },
          }))
          .sort((left, right) => stableStringCompare(left.key, right.key)),
      ),
    's018 group entries and sources mismatch',
  )
  const installerSource = migration.files.get(resolution.installer.source)
  assert(installerSource, 's018 installer source file missing')
  assert(
    legacyAuthorCellSha256(commandAtPointer(installerSource, resolution.installer.pointer)) ===
      resolution.installer.beforeSha256,
    's018 installer source hash mismatch',
  )
  const resolvedBody = retainedByLegacy.get(resolution.legacyScriptId)
  const unresolvedS018Bindings =
    resolvedBody?.status.kind === 'resolved-entity-behavior' &&
    stableJsonSha256(resolvedBody.status.target) === stableJsonSha256(resolution.target)
      ? 0
      : 1
  assert(unresolvedS018Bindings === 0, 's018 resolved body binding mismatch')
  const evidenceById = new Map(ledger.evidence.map((entry) => [entry.id, entry]))
  assert(evidenceById.size === ledger.evidence.length, 'duplicate ledger evidence id')
  assert(ledger.evidence.length === ir.tombstones.length + 1, 'ledger evidence count mismatch')
  for (const tombstone of ir.tombstones) {
    const evidence = evidenceById.get(tombstone.evidenceId)
    assert(evidence?.kind === 'folded-body', 'folded evidence missing')
    assert(evidence.sourceAuditDigest === frozenAudit.digest, 'folded evidence audit drift')
    assert(
      evidence.legacyScriptIds.length === 1 &&
        evidence.legacyScriptIds[0] === tombstone.legacyScriptId,
      'folded evidence source mismatch',
    )
    assert(evidence.sourceCells.length === 0, 'folded evidence has source cell')
  }
  const groupEvidence = evidenceById.get(group.evidenceId)
  assert(groupEvidence?.kind === 's018-owner-resolution', 's018 group evidence missing')
  assert(groupEvidence.sourceAuditDigest === frozenAudit.digest, 's018 evidence audit drift')
  assert(
    groupEvidence.legacyScriptIds.length === 1 &&
      groupEvidence.legacyScriptIds[0] === resolution.legacyScriptId,
    's018 evidence body mismatch',
  )
  assert(
    stableJsonSha256(groupEvidence.sourceCells) ===
      stableJsonSha256([`${resolution.installer.source}#${resolution.installer.pointer}`]),
    's018 evidence source cell mismatch',
  )

  const expectedPending = ir.retainedBodies
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
  const pendingIds = new Set(ledger.pending.map((entry) => entry.legacyScriptId))
  const pendingPhaseCounts = { P3: 0, P4: 0, P5: 0, P6: 0 }
  for (const entry of ledger.pending) pendingPhaseCounts[entry.phase]++
  let pendingUnknown = 0
  if (pendingIds.size !== ledger.pending.length) pendingUnknown++
  if (stableJsonSha256(ledger.pending) !== stableJsonSha256(expectedPending)) pendingUnknown++
  if (stableJsonSha256(pendingPhaseCounts) !== stableJsonSha256(ir.pendingByPhase)) pendingUnknown++
  assert(pendingUnknown === 0, 'future pending inventory mismatch')

  return digestRecord<P2ValidationReport>({
    kind: 'script-migration-phase-validation',
    version: 1,
    throughPhase: 'P2',
    sourceAuditDigest: frozenAudit.digest,
    checks: {
      sourceAuditFrozen: true,
      tombstones: {
        spriteAction: sprite.size,
        hostileBehavior: hostile.size,
        overlap: foldedOverlap,
        unknown: unknownTombstones,
      },
      retainedBodies: ir.retainedBodies.length,
      retainedSemanticChanges: semanticChanges,
      danglingReferences: dangling,
      misleadingActiveSccIdentities: misleading,
      unresolvedS018Bindings,
      authorRootsDeleted,
      pendingUnknown,
    },
  })
}
