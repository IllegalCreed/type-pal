// Storage-only rehearsal in a caller-owned new directory. No production publish path.
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { inspectCurrentNativeControl } from './current-native-control.mjs'
import { currentNativeControlAdmissions } from './current-native-control-admission.mjs'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { packReviewDependencyClosure } from './review-dependency-packing.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'
import { biomeFormat } from './review-record-storage-packing.mjs'
import {
  projectRollforwardControls,
  rollforwardRegistryPartition,
} from './rollforward-control-plan.mjs'
import { rollforwardControlProjection } from './rollforward-control-view.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export function rehearseRollforwardStorage({
  root,
  directory,
  baseRevision,
  group,
  plan,
  pinKind = 'rollforward-storage-planning-pin',
}) {
  assert(
    ['rollforward-storage-planning-pin', 'rollforward-publication-after-pin'].includes(pinKind),
    'unknown storage pin event',
  )
  // wx ownership must be acquired before any copy. Never overlay a prior red run.
  mkdirSync(directory)
  const put = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes, { flag: 'wx' })
  }
  const next = new Map([...plan.records].map(([owner, record]) => [owner, structuredClone(record)]))
  const registryRoot = 'docs/phase-governance/document-registry.json'
  const original = loadDocumentRegistry({ manifestPath: join(root, registryRoot) })
  const routingPath = 'docs/phase-governance/routing.json'
  const projected = projectRollforwardControls({
    registry: original.registry,
    routing: parseTerminalJson(readFileSync(join(root, routingPath))),
    plan,
  })
  for (const file of original.loadedSource.files)
    put(`docs/phase-governance/${file.path.split('/').at(-1)}`, readFileSync(file.path))
  const copied = loadDocumentRegistry({ manifestPath: join(directory, registryRoot) })
  const written = writeDocumentRegistry({
    registry: projected.registry,
    loadedSource: copied.loadedSource,
  })
  assert.deepEqual(
    written.registry.entries,
    projected.registry.entries,
    'prospective registry entries changed',
  )
  assert.equal(written.registry.shards.length, 10)
  const newPart = written.loadedSource.files.find((f) =>
    f.path.endsWith(rollforwardRegistryPartition.path),
  )
  assert(
    newPart && readFileSync(newPart.path).length < 524288,
    'new registry part must remain below512KiB',
  )
  const routeBytes = biomeFormat(projected.routing, routingPath, { repoRoot: root })
  assert.deepEqual(parseTerminalJson(routeBytes), projected.routing)
  put(routingPath, routeBytes)
  const controlBytes = new Map(
    written.loadedSource.files.map((file) => [
      `docs/phase-governance/${file.path.split('/').at(-1)}`,
      readFileSync(file.path),
    ]),
  )
  controlBytes.set(routingPath, routeBytes)
  if (pinKind === 'rollforward-publication-after-pin') {
    assert(
      next.get('docs/phase-governance/reviews/20261018-semantic-rework.json')
        .rollforwardPublication,
      'accepted publication required',
    )
    const readBuffer = (path) => controlBytes.get(path) ?? readFileSync(join(root, path))
    for (const binding of currentNativeControlAdmissions) {
      const expected = rollforwardControlProjection(
        binding.path,
        {
          root,
          readBuffer,
          readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
          reviewGroupReader: () => ({ ...group, records: next }),
        },
        inspectCurrentNativeControl,
      )
      if (!expected) continue
      const actual = inspectCurrentNativeControl(binding.path, readBuffer)
      assert.equal(actual.structureSha256, expected.structureSha256)
      assert.equal(actual.membershipSha256, expected.membershipSha256)
      const row = next.get(binding.reviewRecord).entries[binding.index]
      assert(
        !(row.maintenanceDeltas ?? []).some((event) => event.kind === expected.kind),
        'publication observation already exists',
      )
      row.maintenanceDeltas ??= []
      row.maintenanceDeltas.push(expected)
    }
  }
  const packed = packReviewDependencyClosure({
    root,
    baseRevision,
    group,
    records: next,
    dependencies: controlBytes,
    pinKind,
  })
  const { built, dirty, pinDeltas, upgrades } = packed
  const skipped = new Set()
  for (const owner of dirty) {
    skipped.add(owner)
    for (const shard of group.storages.get(owner)?.shards ?? [])
      skipped.add(`docs/phase-governance/reviews/${shard.path}`)
  }
  for (const input of group.loadedSource.files)
    if (!skipped.has(input.path)) put(input.path, readFileSync(join(root, input.path)))
  for (const outputs of built.values()) for (const output of outputs) put(output.path, output.bytes)
  const loaded = loadReviewRecords({
    root: directory,
    readSourceSnapshot: (pin) => readGitDocumentSnapshot(root, pin),
  })
  assert.deepEqual(
    loaded.records,
    packed.records,
    'public storage materialization differs from the plan',
  )
  assert.equal(
    [...loaded.records.values()].reduce((n, record) => n + record.entries.length, 0),
    4530,
  )
  // Reverse only the physical dependency observations and compare with the
  // pre-packing plan. The pure planner separately proves full old4351 recovery.
  const reversed = new Map(
    [...loaded.records].map(([owner, record]) => [owner, structuredClone(record)]),
  )
  for (const delta of pinDeltas) {
    const row = reversed.get(delta.owner).entries[delta.index]
    row.afterSha256 = delta.beforeSha256
    if (delta.priorMaintenanceLength === null) delete row.maintenanceDeltas
    else row.maintenanceDeltas.length = delta.priorMaintenanceLength
  }
  if (pinKind === 'rollforward-storage-planning-pin')
    assert.deepEqual(reversed, plan.records, 'packing altered semantics beyond explicit pin deltas')
  assertReviewRecordSourceUnchanged(group.loadedSource)
  assertReviewRecordSourceUnchanged(loaded.loadedSource)
  return {
    logicalOwners: loaded.records.size,
    reviewRows: 4530,
    changedOwners: dirty.size,
    physicalFiles: loaded.loadedSource.files.length,
    pinDeltas,
    proposedStorageUpgrades: upgrades,
    maxNewShardBytes: Math.max(
      ...[...built.values()]
        .flat()
        .filter((f) => f.kind !== 'review')
        .map((f) => f.bytes.length),
    ),
    publicLoaderReadbackExact: true,
    priorPlanRestoredExactly: true,
    registryRegisteredIdentities: written.registry.entries.length,
    registryPhysicalParts: written.registry.shards.length,
    registryNewPartBytes: readFileSync(newPart.path).length,
    activeRoutes: projected.routing.migratedDocuments.length,
    retiredNativeIdentities: 6,
    templateModelExecuted: false,
    productionPublication: false,
    formalGrants: 0,
  }
}
