// One current-generation publication over the existing owner set. Packing and
// transactional IO stay shared; this layer owns the closed content admission.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { loadDocumentRegistry } from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { rehearseRollforwardStorage } from './rehearse-rollforward-storage.mjs'
import {
  prepareCurrentReviewTransaction,
  publishCurrentReviewTransaction,
} from './review-current-generation-transaction.mjs'
import { packReviewDependencyClosure } from './review-dependency-packing.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'
import { fileState } from './review-record-storage-io.mjs'
import {
  grantRollforwardPlan,
  inspectRollforwardCohort,
  rollforwardPublication,
} from './rollforward-review.mjs'
import { reviewPlanHash } from './rollforward-review-plan.mjs'
import {
  assertRollforwardFixedInput,
  assertRollforwardNativeInputs,
  rollforwardAdministrativePaths,
  rollforwardRetirements,
} from './rollforward-transaction-boundary.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const capabilities = new WeakMap()
const phaseRoot = 'docs/phase-governance/'
export function prepareRollforwardPublication({ root, baseRevision, changes }) {
  root = resolve(root)
  assert.equal(
    reviewPlanHash(changes),
    rollforwardPublication.normalizedChangesSha256,
    'exact accepted plan required',
  )
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  assert.equal(
    git('rev-parse', 'HEAD').toString().trim(),
    baseRevision,
    'current full base commit required',
  )
  const readBuffer = (path) => fileState(root, path, undefined, 'docs/').buffer
  const group = loadReviewRecords({ root }),
    registry = loadDocumentRegistry({
      manifestPath: join(root, `${phaseRoot}document-registry.json`),
    })
  assert(!inspectRollforwardCohort(group.records), 'already published; inspect instead')
  assertRollforwardFixedInput(
    root,
    [
      ...group.loadedSource.files.map((f) => f.path),
      ...registry.loadedSource.files.map((f) => `${phaseRoot}${f.path.split('/').at(-1)}`),
      `${phaseRoot}routing.json`,
    ],
    readBuffer,
  )
  const planned = new Map(
    [...group.records].map(([owner, record]) => [owner, structuredClone(record)]),
  )
  for (const change of changes) {
    const entries = planned.get(change.owner)?.entries
    assert(
      entries &&
        (change.beforeSha256 === null
          ? change.index === entries.length
          : reviewPlanHash(entries[change.index]) === change.beforeSha256),
      'prior owner/index/row differs',
    )
    assert.equal(
      hash(readBuffer(change.path)),
      change.after.afterSha256,
      `accepted body changed: ${change.path}`,
    )
    entries[change.index] = structuredClone(change.after)
  }
  const records = grantRollforwardPlan({ changes, records: planned })
  const observations = []
  for (const path of rollforwardAdministrativePaths) {
    const hits = [...records].flatMap(([owner, record]) =>
      record.entries.flatMap((row, index) => (row.path === path ? [{ owner, index, row }] : [])),
    )
    assert.equal(hits.length, 1, 'unique Owner observation subject required')
    const { owner, index, row } = hits[0]
    const entries = git('ls-tree', '--full-tree', '-z', baseRevision, '--', path)
      .toString()
      .split('\0')
      .filter(Boolean)
    const match = entries.length === 1 && /^100644 blob ([a-f\d]{40})\t(.+)$/u.exec(entries[0])
    assert(match && match[2] === path, 'real ordinary Owner control Git source required')
    const source = git('cat-file', 'blob', match[1]),
      current = readBuffer(path)
    assert(source.equals(current), 'uncommitted Owner control changes rejected')
    const afterSha256 = hash(current)
    assert.notEqual(row.afterSha256, afterSha256, 'four known observations required')
    const event = {
      kind: 'rollforward-owner-control-observation',
      sourceRevision: baseRevision,
      sourceGitObject: match[1],
      beforeSha256: row.afterSha256,
      afterSha256,
      originalSemanticClaimUnchanged: true,
      newSemanticCredit: 0,
      runtimeCredit: false,
    }
    row.maintenanceDeltas ??= []
    row.maintenanceDeltas.push(event)
    row.afterSha256 = afterSha256
    observations.push({ owner, index, path, ...event })
  }
  const scratch = mkdtempSync(join(tmpdir(), 'rollforward-publication-'))
  try {
    const directory = join(scratch, 'packed')
    const qualifiedChanges = changes.map((change) => ({
      ...change,
      after: records.get(change.owner).entries[change.index],
    }))
    const rehearsal = rehearseRollforwardStorage({
      root,
      directory,
      baseRevision,
      group,
      plan: { changes: qualifiedChanges, records },
      pinKind: 'rollforward-publication-after-pin',
    })
    const staged = loadReviewRecords({
      root: directory,
      readSourceSnapshot: (pin) => readGitDocumentSnapshot(root, pin),
    })
    const stagedRegistry = loadDocumentRegistry({
      manifestPath: join(directory, `${phaseRoot}document-registry.json`),
    })
    const candidates = [
      ...staged.loadedSource.files.map((f) => f.path),
      ...stagedRegistry.loadedSource.files.map((f) => `${phaseRoot}${f.path.split('/').at(-1)}`),
      `${phaseRoot}routing.json`,
    ]
    const outputs = []
    for (const path of new Set(candidates)) {
      const bytes = readFileSync(join(directory, path)),
        old = readBuffer(path)
      if (old?.equals(bytes)) continue
      outputs.push({
        path,
        bytes,
        kind: path.includes('/reviews/shards/')
          ? 'shard'
          : path.startsWith(`${phaseRoot}reviews/`)
            ? staged.storages.get(path)
              ? 'manifest'
              : 'review'
            : 'control',
      })
    }
    const retained = new Set(staged.loadedSource.files.map((f) => f.path))
    const retired = group.loadedSource.files.filter((f) => !retained.has(f.path)).map((f) => f.path)
    assert(
      retired.every((path) => path.includes('/shards/')),
      'only prior immutable shards may exit',
    )
    const transaction = prepareCurrentReviewTransaction({
      root,
      baseRevision,
      group,
      records: staged.records,
      outputs,
      retired,
      sourceProfile: 'main-rollforward-v1',
    })
    const handle = {
      kind: rollforwardPublication.kind,
      baseRevision,
      grants: 205,
      added: 179,
      amended: 26,
      reused: 2,
      observations,
      rehearsal,
      outputs: transaction.outputs,
      retired: transaction.retired,
      runtimeCredit: 0,
    }
    capabilities.set(handle, { transaction, snapshot: structuredClone(handle) })
    assertReviewRecordSourceUnchanged(group.loadedSource)
    return handle
  } finally {
    rmSync(scratch, { recursive: true })
  }
}
export function publishRollforwardPublication(handle, { allowWrite = false } = {}) {
  const plan = capabilities.get(handle)
  assert(
    plan && reviewPlanHash(handle) === reviewPlanHash(plan.snapshot),
    'original unmodified publication capability required',
  )
  assert.equal(allowWrite, true, 'explicit Owner write required')
  const result = publishCurrentReviewTransaction(plan.transaction, { allowWrite: true })
  capabilities.delete(handle)
  return {
    ...result,
    semanticGrants: plan.snapshot.grants,
    added: plan.snapshot.grants ? 179 : 0,
    amended: plan.snapshot.grants ? 26 : 0,
    reused: 2,
    runtimeCredit: 0,
  }
}
export function prepareRollforwardMaintenance({ root, baseRevision, updates }) {
  root = resolve(root)
  inspectRollforwardPublication({ root })
  const group = loadReviewRecords({ root }),
    dependencies = new Map(),
    outputs = []
  const allowed = new Set([
    'docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md',
    'docs/ops/board.md',
    'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/s22-validation.log.gz',
  ])
  assert(
    Array.isArray(updates) && updates.length > 0 && updates.length <= 3,
    'bounded administrative append required',
  )
  for (const update of updates) {
    assert(
      allowed.has(update.path) && !dependencies.has(update.path) && Buffer.isBuffer(update.bytes),
      'unknown, duplicate or non-byte administrative update',
    )
    const before = readFileSync(join(root, update.path)),
      after = update.bytes
    assert(
      after.length > before.length &&
        after.length - before.length <= 16 * 1024 * 1024 &&
        after.subarray(0, before.length).equals(before),
      'complete administrative byte prefix must remain exact',
    )
    if (update.path.endsWith('.gz'))
      assert(
        gunzipSync(after).subarray(0, gunzipSync(before).length).equals(gunzipSync(before)),
        'complete decompressed prefix must remain exact',
      )
    dependencies.set(update.path, after)
    outputs.push({ path: update.path, kind: 'administrative', bytes: after })
  }
  const packed = packReviewDependencyClosure({
    root,
    baseRevision,
    group,
    records: group.records,
    dependencies,
    pinKind: 'rollforward-publication-after-pin',
  })
  const generated = [...packed.built.values()].flat(),
    generatedPaths = new Set(generated.map((o) => o.path)),
    retired = []
  for (const owner of packed.dirty)
    for (const shard of group.storages.get(owner)?.shards ?? []) {
      const path = `${phaseRoot}reviews/${shard.path}`
      if (!generatedPaths.has(path)) retired.push(path)
    }
  for (const output of generated)
    if (!fileState(root, output.path, undefined, 'docs/').buffer?.equals(output.bytes))
      outputs.push(output)
  const transaction = prepareCurrentReviewTransaction({
    root,
    baseRevision,
    group,
    records: packed.records,
    outputs,
    retired,
    sourceProfile: 'main-rollforward-v1',
  })
  const handle = {
    kind: rollforwardPublication.kind,
    baseRevision,
    grants: 0,
    outputs: transaction.outputs,
    retired: transaction.retired,
    administrativeAppends: updates.length,
    runtimeCredit: 0,
  }
  capabilities.set(handle, { transaction, snapshot: structuredClone(handle) })
  return handle
}
export function inspectRollforwardPublication({ root }) {
  const readBuffer = (path) => fileState(root, path, undefined, 'docs/').buffer
  const group = loadReviewRecords({ root }),
    cohort = inspectRollforwardCohort(group.records)
  assert(cohort, 'publication missing')
  const retired = rollforwardRetirements(root, group.records, readBuffer),
    gone = new Map(retired.map((r) => [r.path, r]))
  const { registry } = loadDocumentRegistry({
    manifestPath: join(root, `${phaseRoot}document-registry.json`),
  })
  const seen = new Set()
  for (const record of group.records.values())
    for (const row of record.entries) {
      assert(!seen.has(row.path), 'duplicate current review')
      seen.add(row.path)
      const bytes = readBuffer(row.path)
      if (gone.has(row.path))
        assert(bytes === null && row.afterSha256 === gone.get(row.path).sha256)
      else assert.equal(hash(bytes), row.afterSha256, `published after pin changed: ${row.path}`)
    }
  assert.equal(seen.size, 4530)
  assert.deepEqual([...seen].sort(), registry.entries.map((r) => r.path).sort())
  assertRollforwardNativeInputs(readBuffer, group.records, retired)
  assertReviewRecordSourceUnchanged(group.loadedSource)
  return {
    mode: 'already-published',
    writes: 0,
    semanticGrants: 0,
    acceptedCurrentDocuments: cohort.byPath.size,
    registered: 4530,
    active: 4524,
    retired: 6,
    runtimeCredit: 0,
  }
}
