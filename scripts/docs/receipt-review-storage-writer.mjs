// S32 changes physical storage only. The control root is packed after its R92 pin,
// while S28/S29 retain their own closed admissions and historical source pins.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { historicalVitestCohort } from './historical-vitest-cohort.mjs'
import {
  assertReviewRecordSourceUnchanged,
  FROZEN_REVIEW_STORAGE_SOURCES,
  loadReviewRecords,
  readReviewRecordObject,
  reviewDirRelative,
} from './review-record-storage.mjs'
import { checkOrdinaryPath, fileState, inspectShardInventory } from './review-record-storage-io.mjs'
import {
  biomeFormat,
  packReviewStorageRecord,
  validateFormattedOutput,
} from './review-record-storage-packing.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`receipt-review-storage: ${message}`)
}
const review = (name) => `${reviewDirRelative}/20261017-${name}.json`
export const receiptReviewSources = Object.freeze(
  [
    ['r89-ops-evidence-artifacts', 94],
    ['r90-ops-evidence-artifacts', 50],
    ['r91-ops-evidence-artifacts', 94],
    ['r94-final-machine-artifacts', 37],
  ].map(([name, entryCount]) => Object.freeze({ path: review(name), entryCount })),
)
const r92Path = review('r92-phase-governance-artifacts')
const r94Path = receiptReviewSources[3].path
const beforePaths = [...receiptReviewSources.map((entry) => entry.path), r92Path]
export const receiptReadbackPaths = Object.freeze([
  ...FROZEN_REVIEW_STORAGE_SOURCES.map((entry) => entry.path),
  ...beforePaths,
])
const handles = new WeakMap()

function sameLogical(actual, expected, path) {
  demand(
    isDeepStrictEqual(actual, expected) && JSON.stringify(actual) === JSON.stringify(expected),
    `logical readback mismatch: ${path}`,
  )
}

function assertStates(root, states, parents) {
  for (const [path, identity] of parents) {
    const stat = lstatSync(path)
    demand(
      stat.isDirectory() &&
        !stat.isSymbolicLink() &&
        isDeepStrictEqual(identity, { dev: stat.dev, ino: stat.ino, mode: stat.mode }),
      `parent changed: ${path}`,
    )
  }
  for (const [path, state] of states) {
    const current = fileState(root, path, undefined, 'docs/')
    demand(
      isDeepStrictEqual(state.identity, current.identity) &&
        (state.buffer ? current.buffer?.equals(state.buffer) : !current.buffer),
      `input changed: ${path}`,
    )
  }
}

// All source identities are derived from ordinary Git blobs, never caller-supplied SHA fields.
function fixedGroup(root, sourceRevision) {
  demand(/^[a-f\d]{40}$/.test(sourceRevision ?? ''), 'full source revision required')
  const snapshots = new Map()
  const source = (path) => {
    if (!snapshots.has(path)) {
      const snapshot = readGitDocumentSnapshot(root, { revision: sourceRevision, path })
      demand(snapshot?.mode === '100644', `ordinary fixed Git source missing: ${path}`)
      snapshots.set(path, snapshot)
    }
    return snapshots.get(path)
  }
  const readBuffer = (path) => source(path).buffer
  const records = new Map()
  for (const path of receiptReadbackPaths)
    records.set(path, readReviewRecordObject(path, { readBuffer }))
  for (const entry of receiptReviewSources) {
    const parsed = parseTerminalJson(readBuffer(entry.path))
    demand(
      !Object.hasOwn(parsed, '_reviewStorage') &&
        parsed.entries?.length === entry.entryCount &&
        new Set(parsed.entries.map((row) => row.path)).size === entry.entryCount,
      `fixed flat source/count/identity required: ${entry.path}`,
    )
  }
  demand(
    !Object.hasOwn(parseTerminalJson(readBuffer(r92Path)), '_reviewStorage'),
    'R92 must remain the flat control member',
  )
  for (const { path, entryCount } of FROZEN_REVIEW_STORAGE_SOURCES)
    demand(
      Object.hasOwn(parseTerminalJson(readBuffer(path)), '_reviewStorage') &&
        records.get(path).entries.length === entryCount,
      `protected S29 stored owner/count required: ${path}`,
    )
  return { records, snapshots, source }
}

function readback(root, plan, publicLoader = false) {
  const readBuffer = (path) => fileState(root, path).buffer
  const group = publicLoader
    ? loadReviewRecords({
        root,
        logicalPaths: receiptReadbackPaths,
        readSourceSnapshot: (pin) => readGitDocumentSnapshot(plan.root, pin),
      })
    : null
  if (group) demand(group.records.size === 13, 'unexpected sharded owner in current group')
  for (const [path, record] of plan.records)
    sameLogical(
      group ? group.records.get(path) : readReviewRecordObject(path, { readBuffer }),
      record,
      path,
    )
  for (const [path, expected] of plan.expected)
    demand(readBuffer(path)?.equals(expected.bytes), `physical readback mismatch: ${path}`)
  inspectShardInventory(root, plan.expected)
  if (group) assertReviewRecordSourceUnchanged(group.loadedSource)
}

/** Creates a closed, in-process publication capability; JSON copies are not write authority. */
export function prepareReceiptReviewStorage({ root, sourceRevision }) {
  const base = resolve(root)
  demand(!process.env.BIOME_BINARY, 'custom formatter binary is not admitted')
  const fixed = fixedGroup(base, sourceRevision)
  const current = loadReviewRecords({ root: base, logicalPaths: receiptReadbackPaths })
  demand(
    current.records.size === 13 &&
      [...current.records.keys()].every((path) => receiptReadbackPaths.includes(path)),
    'unexpected sharded owner in current group',
  )
  const parents = new Map(),
    states = new Map()
  const state = (path) => {
    if (!states.has(path)) states.set(path, fileState(base, path, parents, 'docs/'))
    return states.get(path)
  }
  // The old eight physical units/generations are immutable, including their source pins.
  const expected = new Map()
  for (const [path, snapshot] of fixed.snapshots) {
    if (beforePaths.includes(path)) continue
    demand(state(path).buffer?.equals(snapshot.buffer), `protected S29 source changed: ${path}`)
    expected.set(path, {
      path,
      kind: path.includes('/shards/') ? 'shard' : 'manifest',
      bytes: snapshot.buffer,
    })
  }
  demand(
    expected.size === 31 && [...expected.values()].filter((o) => o.kind === 'shard').length === 23,
    'protected S29 physical inventory must be eight manifests and 23 shards',
  )
  for (const entry of historicalVitestCohort.protectedNative) {
    const bytes = state(entry.path).buffer
    demand(bytes && sha(bytes) === entry.sha256, `protected native changed: ${entry.path}`)
  }
  // Validate before pins against the original group, not against this transaction's future bytes.
  for (const path of beforePaths)
    for (const row of fixed.records.get(path).entries) {
      const bytes = fixed.snapshots.get(row.path)?.buffer ?? state(row.path).buffer
      demand(bytes && sha(bytes) === row.afterSha256, `before pin mismatch: ${path} -> ${row.path}`)
    }
  const records = new Map([...fixed.records].map(([path, value]) => [path, structuredClone(value)]))
  const outputs = [],
    controlEdges = []
  const pack = (path) => {
    const original = fixed.source(path)
    const packed = packReviewStorageRecord({
      logicalPath: path,
      record: records.get(path),
      sourcePin: {
        revision: sourceRevision,
        path,
        gitObject: original.gitObject,
        sha256: sha(original.buffer),
      },
      context: { repoRoot: base },
    })
    outputs.push(...packed.outputs)
    return packed.outputs.find((output) => output.kind === 'manifest')
  }
  const updateEdge = (owner, index, target, bytes) => {
    const record = records.get(owner),
      original = fixed.source(target)
    demand(
      record.entries[index]?.path === target &&
        record.entries.filter((row) => row.path === target).length === 1 &&
        record.entries[index].afterSha256 === sha(original.buffer),
      `unique before pin mismatch: ${owner}[${index}]`,
    )
    const after = sha(bytes)
    controlEdges.push({ owner, index, target, before: record.entries[index].afterSha256, after })
    record.entries[index].afterSha256 = after
  }
  for (const [index, entry] of receiptReviewSources.slice(0, 3).entries()) {
    const manifest = pack(entry.path)
    updateEdge(r92Path, 20 + index, entry.path, manifest.bytes)
  }
  const r92Bytes = biomeFormat(records.get(r92Path), r92Path, { repoRoot: base })
  validateFormattedOutput(r92Bytes, records.get(r92Path), 'flat control', r92Path)
  outputs.push({ path: r92Path, kind: 'control', bytes: r92Bytes })
  updateEdge(r94Path, 6, r92Path, r92Bytes)
  pack(r94Path)
  // All fragments first; the root manifest is last, after the R92 byte chain is final.
  const rank = (output) =>
    output.kind === 'shard' ? 0 : output.path === r94Path ? 3 : output.kind === 'control' ? 2 : 1
  outputs.sort((a, b) => rank(a) - rank(b))
  for (const output of outputs) {
    demand(!expected.has(output.path), `duplicate output: ${output.path}`)
    expected.set(output.path, output)
    state(output.path)
  }
  demand(outputs.length === 12 && expected.size === 43, 'four-source physical group differs')
  const original = beforePaths.every((path) =>
    state(path).buffer?.equals(fixed.source(path).buffer),
  )
  const published = outputs.every((output) => state(output.path).buffer?.equals(output.bytes))
  demand(original || published, 'mixed or foreign publication state')
  if (original)
    demand(
      outputs.filter((o) => o.kind === 'shard').every((o) => !state(o.path).buffer),
      'new shard generation already exists before publication',
    )
  for (const file of current.loadedSource.files) state(file.path)
  const publicHandle = {
    kind: 'receipt-review-storage/1.0.0',
    sourceRevision,
    state: published ? 'published' : 'original',
    logicalRecords: 13,
    totalEntries: 275,
    manifestCount: published ? 12 : 8,
    shardCount: published ? 30 : 23,
    controlEdges,
    outputs: outputs.map((o) => ({
      kind: o.kind,
      path: o.path,
      sha256: sha(o.bytes),
      bytes: o.bytes.length,
    })),
    beforeSources: beforePaths.map((path) => ({
      path,
      sha256: sha(fixed.source(path).buffer),
      gitObject: fixed.source(path).gitObject,
    })),
    retiredShards: 0,
    creditGranted: 0,
  }
  const plan = {
    root: base,
    sourceRevision,
    fixed,
    records,
    outputs,
    expected,
    states,
    parents,
    public: structuredClone(publicHandle),
  }
  if (published) readback(base, plan)
  assertReviewRecordSourceUnchanged(current.loadedSource)
  assertStates(base, states, parents)
  handles.set(publicHandle, plan)
  return publicHandle
}

/** Actual production loader readback, including source-Git checks and all physical owners. */
export function inspectReceiptReviewStorage(options) {
  const handle = prepareReceiptReviewStorage(options),
    plan = handles.get(handle)
  if (handle.state === 'published') readback(plan.root, plan, true)
  return structuredClone(handle)
}

/** Only this closed handle may mutate its captured root; publication grants no semantic credit. */
export function publishReceiptReviewStorage(handle, { allowWrite = false } = {}) {
  const plan = handles.get(handle)
  demand(
    plan && isDeepStrictEqual(handle, plan.public),
    'actual unmodified prepare handle required',
  )
  demand(allowWrite === true, 'explicit Owner publication mode required')
  const { root, states, parents } = plan
  assertStates(root, states, parents)
  const published = plan.outputs.every((o) => fileState(root, o.path).buffer?.equals(o.bytes))
  if (published) {
    readback(root, plan, true)
    assertStates(root, states, parents)
    return { written: 0, retired: 0, idempotent: true, totalEntries: 275, lockReleased: true }
  }
  const activeShards = new Map(
    [...states]
      .filter(([path, s]) => path.includes('/shards/') && s.buffer)
      .map(([path, s]) => [path, { kind: 'shard', path, bytes: s.buffer }]),
  )
  inspectShardInventory(root, activeShards)
  const lockPath = `${reviewDirRelative}/.storage.lock`
  demand(!fileState(root, lockPath, parents).buffer, 'publication lock already present')
  const stage = mkdtempSync(join(root, reviewDirRelative, '.receipt-stage-'))
  try {
    writeFileSync(
      join(root, lockPath),
      `${JSON.stringify({ kind: handle.kind, sourceRevision: handle.sourceRevision, stage, outputs: handle.outputs, before: handle.beforeSources, retired: [] })}\n`,
      { flag: 'wx' },
    )
  } catch (error) {
    rmSync(stage, { recursive: true })
    throw error
  }
  const lock = new Map([[lockPath, fileState(root, lockPath, parents)]])
  const recovery = {
    kind: handle.kind,
    sourceRevision: handle.sourceRevision,
    state: 'locked',
    written: [],
    retired: [],
    before: handle.beforeSources,
    outputs: handle.outputs,
  }
  const save = () =>
    writeFileSync(join(stage, 'recovery.json'), `${JSON.stringify(recovery, null, 2)}\n`)
  const guard = () => {
    assertStates(root, lock, parents)
    assertStates(root, states, parents)
    inspectShardInventory(root, activeShards)
  }
  try {
    save()
    guard()
    for (const path of beforePaths) {
      const dest = join(stage, 'before', path)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, plan.fixed.source(path).buffer, { flag: 'wx' })
    }
    for (const output of plan.expected.values()) {
      const dest = join(stage, 'after', output.path)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, output.bytes, { flag: 'wx' })
    }
    // Public loader is safe on this separate, unlocked tree with real fixed-Git providers.
    readback(join(stage, 'after'), plan, true)
    guard()
    for (const output of plan.outputs) {
      guard()
      const temp = join(stage, 'install', output.path)
      mkdirSync(dirname(temp), { recursive: true })
      writeFileSync(temp, output.bytes, { flag: 'wx' })
      checkOrdinaryPath(root, dirname(output.path), 'directory', parents)
      mkdirSync(dirname(join(root, output.path)), { recursive: true })
      checkOrdinaryPath(root, dirname(output.path), 'directory', parents)
      renameSync(temp, join(root, output.path))
      states.set(output.path, fileState(root, output.path, parents))
      if (output.kind === 'shard') activeShards.set(output.path, output)
      recovery.written.push(output.path)
      save()
    }
    // The live owner holds the lock: pure materialization + exact bytes/inventory,
    // never bypass the public loader's refusal of a locked production tree.
    readback(root, plan)
    guard()
    recovery.state = 'verified'
    save()
  } catch (error) {
    throw new Error(
      `receipt-review-storage: publication failed (lock+recovery preserved at ${stage}): ${error.message}`,
    )
  }
  // Readback precedes cleanup. If cleanup is incomplete the lock still carries
  // the fixed Git before-identities and every intended output for recovery.
  try {
    rmSync(stage, { recursive: true })
  } catch (error) {
    throw new Error(
      `receipt-review-storage: readback verified; cleanup incomplete with lock held: ${stage}: ${error.message}`,
    )
  }
  assertStates(root, lock, parents)
  assertStates(root, states, parents)
  rmSync(join(root, lockPath))
  return {
    written: recovery.written.length,
    retired: 0,
    idempotent: false,
    totalEntries: 275,
    lockReleased: true,
  }
}
