// One closed publication: reuse the existing protected transaction, not another IO writer.
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { inspectCurrentNativeControl } from './current-native-control.mjs'
import { currentNativeControlAdmissions } from './current-native-control-admission.mjs'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  extendIncrementalRegistry,
  incrementalControlProjection,
  incrementalRoute,
} from './incremental-control-view.mjs'
import { inspectIncrementalCohort } from './incremental-review.mjs'
import { incrementalReviewAdmission as admission } from './incremental-review-admission.mjs'
import {
  grantIncrementalReview,
  incrementalContentHash,
  incrementalEntryOffset,
  incrementalQualifiedContent,
  incrementalReviewPath,
} from './incremental-review-content.mjs'
import {
  prepareCurrentReviewTransaction,
  publishCurrentReviewTransaction,
} from './review-current-generation-transaction.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'
import { biomeFormat, packReviewStorageRecord } from './review-record-storage-packing.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')
const plans = new WeakMap()
const demand = (condition, reason) => {
  if (!condition) throw new Error(`incremental publication: ${reason}`)
}

function registryOutputs(root, rows) {
  const current = loadDocumentRegistry({
    manifestPath: join(root, 'docs/phase-governance/document-registry.json'),
  })
  for (const file of current.loadedSource.files) {
    const path = `docs/phase-governance/${file.path.split('/').at(-1)}`
    const frozen = readGitDocumentSnapshot(root, {
      path,
      revision: admission.integrationSourceRevision,
    })
    demand(
      frozen?.mode === '100644' && frozen.buffer.equals(readFileSync(file.path)),
      `registry input differs from the fixed integration source: ${path}`,
    )
  }
  const scratch = mkdtempSync(join(tmpdir(), 'incremental-registry-'))
  try {
    for (const file of current.loadedSource.files)
      writeFileSync(join(scratch, file.path.split('/').at(-1)), readFileSync(file.path), {
        flag: 'wx',
      })
    const manifestPath = join(scratch, 'document-registry.json')
    const copied = loadDocumentRegistry({ manifestPath })
    const registry = extendIncrementalRegistry(copied.registry, rows)
    const after = writeDocumentRegistry({ registry, loadedSource: copied.loadedSource })
    const outputs = []
    for (const file of after.loadedSource.files) {
      const path = `docs/phase-governance/${file.path.split('/').at(-1)}`
      const bytes = readFileSync(file.path)
      let before
      try {
        before = readFileSync(join(root, path))
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      if (!before?.equals(bytes)) outputs.push({ path, kind: 'control', bytes })
    }
    return outputs
  } finally {
    rmSync(scratch, { recursive: true })
  }
}

/** The only mutable row fields outside the new cohort are observed after pins and maintenance. */
export function prepareIncrementalPublication({ root, baseRevision, rows }) {
  root = resolve(root)
  demand(
    incrementalContentHash(rows.map(incrementalQualifiedContent)) ===
      admission.acceptedContentSha256,
    'exact accepted normalized content required',
  )
  const group = loadReviewRecords({ root })
  demand(
    group.records.get(incrementalReviewPath).entries.length === incrementalEntryOffset,
    'first publication requires original28 semantic rows; inspect an already-published group instead',
  )
  const records = new Map(
    [...group.records].map(([path, record]) => [path, structuredClone(record)]),
  )
  const granted = rows.map(grantIncrementalReview)
  records.get(incrementalReviewPath).entries.push(...granted)
  inspectIncrementalCohort(records)
  const readBuffer = (path) => readFileSync(join(root, path))
  const outputs = registryOutputs(root, granted)
  const routingPath = 'docs/phase-governance/routing.json'
  const routing = parseTerminalJson(readBuffer(routingPath))
  demand(
    readGitDocumentSnapshot(root, {
      path: routingPath,
      revision: admission.integrationSourceRevision,
    })?.buffer.equals(readBuffer(routingPath)),
    'routing input differs from fixed integration source',
  )
  demand(routing.migratedDocuments.length === 2435, 'exact original2435 routing required')
  routing.migratedDocuments.push(...granted.map(incrementalRoute))
  const routeBytes = biomeFormat(routing, routingPath, { repoRoot: root })
  demand(
    routeBytes.length < 1048576 && same(parseTerminalJson(routeBytes), routing),
    'routing format/cap mismatch',
  )
  outputs.push({ path: routingPath, kind: 'control', bytes: routeBytes })
  const byPath = new Map(outputs.map((output) => [output.path, output]))
  const view = (path) => byPath.get(path)?.bytes ?? readBuffer(path)
  const virtualGroup = { ...group, records }
  const sourceCache = new Map()
  const readSourceBuffer = (pin) => {
    const key = `${pin.revision}:${pin.path}`
    if (!sourceCache.has(key)) sourceCache.set(key, readGitDocumentSnapshot(root, pin))
    return sourceCache.get(key)
  }
  for (const binding of currentNativeControlAdmissions) {
    const row = records.get(binding.reviewRecord).entries[binding.index]
    const actual = inspectCurrentNativeControl(binding.path, view)
    if (
      !binding.role.startsWith('registry-') &&
      row.evidence.structureSha256 === actual.structureSha256 &&
      row.evidence.membershipSha256 === actual.membershipSha256
    )
      continue
    const expected = incrementalControlProjection(
      binding.path,
      {
        root,
        readBuffer: view,
        readSourceBuffer,
        reviewGroupReader: () => virtualGroup,
      },
      inspectCurrentNativeControl,
    )
    demand(
      expected &&
        expected.structureSha256 === actual.structureSha256 &&
        expected.membershipSha256 === actual.membershipSha256,
      `unapproved control projection: ${binding.path}`,
    )
    row.maintenanceDeltas ??= []
    row.maintenanceDeltas.push(expected)
  }
  for (const repair of admission.inputPinRepairs) {
    const row = records.get(repair.owner).entries[repair.index]
    demand(
      row.path === repair.path &&
        row.afterSha256 === repair.beforeSha256 &&
        hash(readBuffer(repair.path)) === repair.afterSha256,
      `fixed integration pin differs: ${repair.path}`,
    )
    row.afterSha256 = repair.afterSha256
    row.maintenanceDeltas ??= []
    row.maintenanceDeltas.push({
      kind: 'fixed-main-S75-integration-observation',
      sourceRevision: repair.sourceRevision,
      beforeSha256: repair.beforeSha256,
      afterSha256: repair.afterSha256,
      interpretation:
        'Earlier accepted semantic scope retained; fixed-source integration delta observed separately, not new runtime acceptance.',
      newSemanticCredit: 0,
      runtimeCredit: false,
    })
  }
  return finalizeIncrementalPlan({
    root,
    baseRevision,
    group,
    records,
    outputs,
    acceptedRows: granted.length,
  })
}

/** Append only the existing task/board/evidence stream; never re-grant or rewrite accepted content. */
export function prepareIncrementalMaintenance({ root, baseRevision, updates }) {
  root = resolve(root)
  demand(
    Array.isArray(updates) && updates.length > 0 && updates.length <= 3,
    'bounded administrative updates required',
  )
  const allowed = new Set([
    'docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md',
    'docs/ops/board.md',
    'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/s22-validation.log.gz',
  ])
  const seen = new Set(),
    outputs = []
  for (const update of updates) {
    demand(
      allowed.has(update.path) && !seen.has(update.path) && Buffer.isBuffer(update.bytes),
      'unknown, duplicate or non-byte administrative update',
    )
    seen.add(update.path)
    const before = readFileSync(join(root, update.path))
    const source = update.path.endsWith('.gz') ? gunzipSync(before) : before
    const after = update.path.endsWith('.gz') ? gunzipSync(update.bytes) : update.bytes
    demand(
      after.length > source.length &&
        after.length - source.length <= 16 * 1024 * 1024 &&
        after.subarray(0, source.length).equals(source),
      'administrative update must preserve the complete original prefix',
    )
    outputs.push({ path: update.path, kind: 'administrative', bytes: Buffer.from(update.bytes) })
  }
  const group = loadReviewRecords({ root })
  demand(
    inspectIncrementalCohort(group.records),
    'already accepted cohort required for maintenance',
  )
  const records = new Map(
    [...group.records].map(([path, record]) => [path, structuredClone(record)]),
  )
  return finalizeIncrementalPlan({ root, baseRevision, group, records, outputs, acceptedRows: 0 })
}

function finalizeIncrementalPlan({ root, baseRevision, group, records, outputs, acceptedRows }) {
  const dirty = new Set()
  const byPath = new Map(outputs.map((output) => [output.path, output]))
  for (const [owner, record] of records)
    if (!same(record, group.records.get(owner))) dirty.add(owner)
  let previous = -1
  while (previous !== dirty.size) {
    previous = dirty.size
    for (const [owner, record] of records)
      if (record.entries.some((row) => dirty.has(row.path) || byPath.has(row.path)))
        dirty.add(owner)
  }
  const built = new Set(),
    building = new Set(),
    retired = [],
    edges = []
  const build = (owner) => {
    if (built.has(owner)) return
    demand(!building.has(owner), 'review dependency cycle')
    building.add(owner)
    const record = records.get(owner)
    for (const [index, row] of record.entries.entries()) {
      if (dirty.has(row.path)) build(row.path)
      const target = byPath.get(row.path)
      if (!target || hash(target.bytes) === row.afterSha256) continue
      const beforeSha256 = row.afterSha256
      row.afterSha256 = hash(target.bytes)
      row.maintenanceDeltas ??= []
      row.maintenanceDeltas.push({
        kind: 'incremental-publication-after-pin',
        date: '2026-10-31',
        beforeSha256,
        afterSha256: row.afterSha256,
        runtimeCredit: false,
        newSemanticCredit: 0,
      })
      edges.push({ owner, index, path: row.path, beforeSha256, afterSha256: row.afterSha256 })
    }
    const storage = group.storages.get(owner)
    const sourcePin =
      storage?.source ?? (owner === incrementalReviewPath ? admission.sourcePin : undefined)
    let generated
    if (sourcePin) {
      generated = packReviewStorageRecord({
        logicalPath: owner,
        record,
        sourcePin,
        context: { repoRoot: root },
      }).outputs
      if (storage)
        retired.push(...storage.shards.map((part) => `docs/phase-governance/reviews/${part.path}`))
    } else {
      const bytes = biomeFormat(record, owner, { repoRoot: root })
      // Existing flat owners retain the original loader's 1 MiB limit; newly
      // generated immutable shards/manifests remain limited to 512 KiB.
      demand(
        bytes.length < 1048576 && same(parseTerminalJson(bytes), record),
        `flat review format/cap mismatch: ${owner} (${bytes.length} bytes)`,
      )
      generated = [{ path: owner, kind: 'review', bytes }]
    }
    for (const output of generated) {
      outputs.push(output)
      byPath.set(output.path, output)
    }
    building.delete(owner)
    built.add(owner)
  }
  for (const owner of [...dirty].sort()) build(owner)
  assertReviewRecordSourceUnchanged(group.loadedSource)
  const transaction = prepareCurrentReviewTransaction({
    root,
    baseRevision,
    group,
    records,
    outputs,
    retired,
    sourceProfile: 'main-incremental-v1',
  })
  const handle = {
    kind: 'incremental-document-publication/1.0.0',
    baseRevision,
    acceptedRows,
    logicalOwners: records.size,
    totalAfterPins: 4351,
    outputFiles: transaction.outputs,
    retired: transaction.retired,
    edges,
    maxNewShardBytes: Math.max(
      ...outputs
        .filter(
          (o) =>
            o.kind === 'shard' ||
            o.kind === 'manifest' ||
            admission.registryPartitions.some((part) => o.path.endsWith(part.path)),
        )
        .map((o) => o.bytes.length),
    ),
    pendingRuntimeCredit: false,
  }
  plans.set(handle, { transaction, snapshot: structuredClone(handle) })
  return handle
}

export function publishIncrementalPublication(handle, { allowWrite = false } = {}) {
  const plan = plans.get(handle)
  demand(
    plan && same(handle, plan.snapshot),
    'unmodified in-process publication capability required',
  )
  demand(allowWrite === true, 'explicit Owner publish mode required')
  const result = publishCurrentReviewTransaction(plan.transaction, { allowWrite: true })
  plans.delete(handle)
  return { ...result, semanticGrants: plan.snapshot.acceptedRows, runtimeCredit: 0 }
}
