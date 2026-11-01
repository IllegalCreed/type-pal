// Closed semantic proposal, shared DAG packing and shared physical transaction.
// This controller never edits product/tests or silently promotes pending rows.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { inspectCurrentNativeControl } from './current-native-control.mjs'
import { currentNativeControlAdmissions } from './current-native-control-admission.mjs'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { mainSuccessorAdmission as admission } from './main-successor-admission.mjs'
import { projectMainSuccessorControls } from './main-successor-control.mjs'
import { readMainSuccessorSources } from './main-successor-document.mjs'
import {
  grantMainSuccessorReviews,
  inspectMainSuccessor,
  prepareMainSuccessorReviews,
} from './main-successor-review.mjs'
import {
  prepareCurrentReviewTransaction,
  publishCurrentReviewTransaction,
} from './review-current-generation-transaction.mjs'
import { packReviewDependencyClosure } from './review-dependency-packing.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'
import { fileState } from './review-record-storage-io.mjs'
import { biomeFormat } from './review-record-storage-packing.mjs'
import { rollforwardControlProjection } from './rollforward-control-view.mjs'
import { verifyRollforwardHistoryPublication } from './rollforward-history-publication.mjs'
import { repairRollforwardPublicationHistory } from './rollforward-review.mjs'
import { reviewPlanHash } from './rollforward-review-plan.mjs'
import {
  assertRollforwardNativeInputs,
  rollforwardRetirements,
} from './rollforward-transaction-boundary.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const capabilities = new WeakMap()
const phase = 'docs/phase-governance/'
const administrative = [
  'docs/ops/board.md',
  'docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md',
  'docs/ops/tasks/index.md',
  'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/s22-validation.log.gz',
]

export function inspectMainSuccessorPublication({ root }) {
  root = resolve(root)
  const group = loadReviewRecords({ root }),
    cohort = inspectMainSuccessor(group.records)
  assert(cohort, 'main successor publication missing')
  const readBuffer = (path) =>
    fileState(root, path, undefined, ['AGENTS.md', 'CLAUDE.md'].includes(path) ? '' : 'docs/')
      .buffer
  const retired = rollforwardRetirements(root, group.records, readBuffer)
  const registry = loadDocumentRegistry({
    manifestPath: join(root, `${phase}document-registry.json`),
  }).registry
  const seen = new Set()
  for (const record of group.records.values())
    for (const row of record.entries) {
      assert(!seen.has(row.path), 'duplicate successor current review identity')
      seen.add(row.path)
      const bytes = readBuffer(row.path),
        historical = retired.find((item) => item.path === row.path)
      if (historical) assert(bytes === null && historical.sha256 === row.afterSha256)
      else
        assert(
          Buffer.isBuffer(bytes) &&
            createHash('sha256').update(bytes).digest('hex') === row.afterSha256,
          `successor observed after pin differs: ${row.path}`,
        )
    }
  assert.equal(seen.size, admission.registeredRows)
  assert.equal(registry.shards.length, 11)
  assert.deepEqual([...seen].sort(), registry.entries.map((row) => row.path).sort())
  assertRollforwardNativeInputs(readBuffer, group.records, retired)
  const source = readMainSuccessorSources(root, cohort)
  for (const { row } of cohort.byPath.values())
    assert(
      readBuffer(row.path).equals(source(row.primarySource[0]).buffer),
      'successor fixed body changed',
    )
  assertReviewRecordSourceUnchanged(group.loadedSource)
  return {
    mode: 'already-present',
    state: cohort.state,
    registered: seen.size,
    currentSuccessorDocuments: cohort.byPath.size,
    writes: 0,
    semanticGrants: 0,
    runtimeCredit: 0,
  }
}

function packSuccessor({ root, directory, baseRevision, group, records }) {
  const ordinary = (path) =>
    fileState(root, path, undefined, ['AGENTS.md', 'CLAUDE.md'].includes(path) ? '' : 'docs/')
      .buffer
  mkdirSync(directory)
  const put = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), bytes, { flag: 'wx' })
  }
  const cohort = inspectMainSuccessor(records)
  const original = loadDocumentRegistry({
    manifestPath: join(root, `${phase}document-registry.json`),
  })
  const projected = projectMainSuccessorControls({
    registry: original.registry,
    routing: parseTerminalJson(readFileSync(join(root, `${phase}routing.json`))),
    cohort,
  })
  for (const file of original.loadedSource.files)
    put(`${phase}${file.path.split('/').at(-1)}`, readFileSync(file.path))
  const copied = loadDocumentRegistry({
    manifestPath: join(directory, `${phase}document-registry.json`),
  })
  const written = writeDocumentRegistry({
    registry: projected.registry,
    loadedSource: copied.loadedSource,
  })
  assert.deepEqual(written.registry.entries, projected.registry.entries)
  const dependencies = new Map(
    written.loadedSource.files.map((file) => [
      `${phase}${file.path.split('/').at(-1)}`,
      readFileSync(file.path),
    ]),
  )
  const routeBytes = biomeFormat(projected.routing, `${phase}routing.json`, { repoRoot: root })
  put(`${phase}routing.json`, routeBytes)
  dependencies.set(`${phase}routing.json`, routeBytes)
  const next = new Map([...records].map(([owner, record]) => [owner, structuredClone(record)]))
  for (const path of administrative)
    dependencies.set(path, fileState(root, path, undefined, 'docs/').buffer)
  for (const binding of currentNativeControlAdmissions) {
    const expected = rollforwardControlProjection(
      binding.path,
      {
        root,
        readBuffer: (path) => dependencies.get(path) ?? ordinary(path),
        readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
        reviewGroupReader: () => ({ ...group, records: next }),
      },
      inspectCurrentNativeControl,
    )
    if (!expected) continue
    const row = next.get(binding.reviewRecord).entries[binding.index]
    assert(
      !(row.maintenanceDeltas ?? []).some((event) => event.kind === expected.kind),
      'successor projection observation already present',
    )
    row.maintenanceDeltas ??= []
    row.maintenanceDeltas.push(expected)
  }
  const packed = packReviewDependencyClosure({
    root,
    baseRevision,
    group,
    records: next,
    dependencies,
    pinKind: 'main-successor-publication-after-pin',
  })
  assert.deepEqual(packed.upgrades, [], 'successor must preserve all existing source pins')
  const replaced = new Set()
  for (const owner of packed.dirty) {
    replaced.add(owner)
    for (const shard of group.storages.get(owner)?.shards ?? [])
      replaced.add(`${phase}reviews/${shard.path}`)
  }
  for (const file of group.loadedSource.files)
    if (!replaced.has(file.path)) put(file.path, readFileSync(join(root, file.path)))
  for (const outputs of packed.built.values())
    for (const output of outputs) put(output.path, output.bytes)
  const staged = loadReviewRecords({
    root: directory,
    readSourceSnapshot: (pin) => readGitDocumentSnapshot(root, pin),
  })
  assert.deepEqual(staged.records, packed.records, 'successor public storage readback differs')
  assertReviewRecordSourceUnchanged(group.loadedSource)
  assertReviewRecordSourceUnchanged(staged.loadedSource)
  return { group: staged, registry: written, pinDeltas: packed.pinDeltas }
}

export function prepareMainSuccessorPublication({ root, baseRevision, rows, grant = false }) {
  root = resolve(root)
  assert(/^[a-f\d]{40}$/u.test(baseRevision), 'full actual successor base required')
  assert.equal(
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    baseRevision,
  )
  const group = loadReviewRecords({ root })
  assert(!inspectMainSuccessor(group.records), 'successor is already present')
  verifyRollforwardHistoryPublication(root, group.records)
  const repaired = repairRollforwardPublicationHistory(group.records)
  const planned = prepareMainSuccessorReviews(repaired.records, rows)
  let records = planned.records
  if (grant) records = grantMainSuccessorReviews(records)
  const cohort = inspectMainSuccessor(records)
  const sourceReader = readMainSuccessorSources(root, cohort)
  for (const { row } of cohort.byPath.values()) {
    const source = sourceReader(row.primarySource[0])
    assert(
      source?.gitObject === row.primarySource[0].gitObject &&
        source.revision === admission.carrierRevision,
      'successor actual carrier Git object differs',
    )
    assert(
      fileState(root, row.path, undefined, 'docs/').buffer?.equals(source.buffer),
      `successor carrier/body changed: ${row.path}`,
    )
  }
  const scratch = mkdtempSync(join(tmpdir(), 'main-successor-prepare-'))
  let completed = false
  try {
    const directory = join(scratch, 'packed')
    const packed = packSuccessor({ root, directory, baseRevision, group, records })
    const candidates = new Map([
      ...packed.group.loadedSource.files.map((file) => [
        file.path,
        {
          kind: file.path.includes('/shards/')
            ? 'shard'
            : packed.group.storages.get(file.path)
              ? 'manifest'
              : 'review',
        },
      ]),
      ...packed.registry.loadedSource.files.map((file) => [
        `${phase}${file.path.split('/').at(-1)}`,
        { kind: 'control' },
      ]),
      [`${phase}routing.json`, { kind: 'control' }],
    ])
    const outputs = [...candidates].flatMap(([path, { kind }]) => {
      const bytes = readFileSync(join(directory, path))
      return fileState(root, path, undefined, 'docs/').buffer?.equals(bytes)
        ? []
        : [{ path, kind, bytes }]
    })
    const keep = new Set(packed.group.loadedSource.files.map((file) => file.path))
    const retired = group.loadedSource.files
      .filter((file) => !keep.has(file.path))
      .map((file) => file.path)
    assert(
      retired.every((path) => path.includes('/shards/')),
      'successor may retire only whole old shard generations',
    )
    const transaction = prepareCurrentReviewTransaction({
      root,
      baseRevision,
      group,
      records: packed.group.records,
      outputs,
      retired,
      sourceProfile: 'main-successor-v1',
    })
    const handle = {
      kind: admission.kind,
      baseRevision,
      mode: grant ? 'publication' : 'candidate',
      semanticGrants: grant ? admission.changes : 0,
      historyObservations: repaired.repaired,
      outputs: transaction.outputs,
      retired: transaction.retired,
      pinDeltas: packed.pinDeltas,
      registered: admission.registeredRows,
      runtimeCredit: 0,
    }
    capabilities.set(handle, { transaction, publicSha256: reviewPlanHash(handle) })
    assertReviewRecordSourceUnchanged(group.loadedSource)
    completed = true
    return handle
  } catch (error) {
    throw new Error(
      `main successor prepare failed; diagnostic staging retained at ${scratch}: ${error.message}`,
    )
  } finally {
    if (completed) rmSync(scratch, { recursive: true })
  }
}

export function publishMainSuccessor(handle, { allowWrite = false } = {}) {
  const plan = capabilities.get(handle)
  assert(
    plan && reviewPlanHash(handle) === plan.publicSha256,
    'original unmodified successor capability required',
  )
  assert.equal(allowWrite, true, 'explicit successor write mode required')
  const result = publishCurrentReviewTransaction(plan.transaction, { allowWrite: true })
  capabilities.delete(handle)
  return {
    ...result,
    semanticGrants: handle.semanticGrants,
    publicationHistoryObservations: handle.historyObservations,
    runtimeCredit: 0,
  }
}
