// Storage-only rehearsal in a caller-owned new directory. No production publish path.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'
import { biomeFormat, packReviewStorageRecord } from './review-record-storage-packing.mjs'
import {
  projectRollforwardControls,
  rollforwardRegistryPartition,
} from './rollforward-control-plan.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
export function rehearseRollforwardStorage({ root, directory, baseRevision, group, plan }) {
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
  const dirty = new Set(plan.changes.map((change) => change.owner))
  let size = -1
  while (size !== dirty.size) {
    size = dirty.size
    for (const [owner, record] of next)
      if (record.entries.some((row) => dirty.has(row.path) || controlBytes.has(row.path)))
        dirty.add(owner)
  }
  const built = new Map(),
    visiting = new Set(),
    pinDeltas = [],
    upgrades = []
  function build(owner) {
    if (built.has(owner)) return built.get(owner)
    assert(!visiting.has(owner), `review dependency cycle: ${owner}`)
    visiting.add(owner)
    const record = next.get(owner)
    for (const [index, row] of record.entries.entries())
      if (dirty.has(row.path) || controlBytes.has(row.path)) {
        const bytes =
          controlBytes.get(row.path) ??
          build(row.path).find((output) => output.path === row.path).bytes
        const after = hash(bytes)
        if (after === row.afterSha256) continue
        pinDeltas.push({
          owner,
          index,
          path: row.path,
          beforeSha256: row.afterSha256,
          afterSha256: after,
          priorMaintenanceLength: row.maintenanceDeltas?.length ?? null,
        })
        row.maintenanceDeltas ??= []
        row.maintenanceDeltas.push({
          kind: 'rollforward-storage-planning-pin',
          beforeSha256: row.afterSha256,
          afterSha256: after,
          newSemanticCredit: 0,
          runtimeCredit: false,
        })
        row.afterSha256 = after
      }
    const storage = group.storages.get(owner)
    let sourcePin = storage?.source
    // Any formerly-flat owner that exceeds the old cap needs an explicit real
    // Git source upgrade proposal; never borrow another owner's source pin.
    if (!sourcePin && Buffer.byteLength(JSON.stringify(record, null, 2)) >= 950000) {
      const source = readGitDocumentSnapshot(root, { path: owner, revision: baseRevision })
      assert(source?.mode === '100644', 'real original flat owner source required')
      sourcePin = {
        revision: baseRevision,
        path: owner,
        gitObject: source.gitObject,
        sha256: hash(source.buffer),
      }
      upgrades.push(sourcePin)
    }
    const outputs = sourcePin
      ? packReviewStorageRecord({
          logicalPath: owner,
          record,
          sourcePin,
          context: { repoRoot: root },
        }).outputs
      : [{ path: owner, kind: 'review', bytes: biomeFormat(record, owner, { repoRoot: root }) }]
    for (const output of outputs)
      assert(
        output.bytes.length < (sourcePin ? 524288 : 1048576),
        `capacity exceeded: ${output.path}`,
      )
    visiting.delete(owner)
    built.set(owner, outputs)
    return outputs
  }
  for (const owner of dirty) build(owner)
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
  assert.deepEqual(loaded.records, next, 'public storage materialization differs from the plan')
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
