// One-shot S29 current-generation update. Packing/storage schema stay shared with S28.
// A prepare handle binds exact input bytes, admitted row deltas and immutable outputs.
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { checkMigratedDocument } from './document-model.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { historicalVitestAdmission, historicalVitestCohort } from './historical-vitest-cohort.mjs'
import {
  assertReviewRecordSourceUnchanged,
  FROZEN_REVIEW_STORAGE_SOURCES,
  hasLossyJsonValue,
  loadReviewRecordFromGit,
  loadReviewRecords,
  materializeReviewRecord,
  reviewDirRelative,
} from './review-record-storage.mjs'
import { checkOrdinaryPath, fileState, inspectShardInventory } from './review-record-storage-io.mjs'
import {
  biomeFormat,
  packReviewStorageRecord,
  validateFormattedOutput,
} from './review-record-storage-packing.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const digest = (value) => createHash('sha256').update(value).digest('hex')
const canonical = (value) => digest(JSON.stringify(value))
const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-semantic-writer: ${message}`)
}
const r92Path = `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`
const r94Path = `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`
const plans = new WeakMap()
const mutable = new Set([
  'docType',
  'templateId',
  'template',
  'templateVersion',
  'templateVariant',
  'historyOverlay',
  'templateCompliance',
  'contentReviewStatus',
  'readMethod',
  'reviewDepth',
  'coreConclusion',
  'truthAnchors',
  'unresolved',
  'nextStep',
  'owner',
  'provenance',
  'publicCallers',
  'legalInputs',
  'businessOracle',
  'dedupe',
  'revision',
  'evidence',
  'history',
  'supersedes',
  'stopLine',
  'userVisibleBeforeAfter',
  'reviewedLines',
  'artifactOnly',
  'artifactFormat',
  'documentStatus',
  'sourceGitRevision',
  'primarySource',
  'phaseAnchors',
  'dependencies',
  'versionScope',
  'counterReworkBlocked',
  'claimCorrection',
  'readDomain',
  'nativeWitnesses',
  'contextReferences',
  'fieldRoles',
  'currentQualification',
])

function validateChange(change, previous) {
  const binding = historicalVitestAdmission(change.path)
  demand(
    binding && binding.reviewRecord === change.reviewRecord && binding.reviewIndex === change.index,
    `unapproved row binding: ${change.path}`,
  )
  demand(
    canonical(previous) === binding.beforeEntrySha256 &&
      change.beforeEntrySha256 === binding.beforeEntrySha256,
    `original row fingerprint differs: ${change.path}`,
  )
  const after = change.after
  demand(
    ['partial-review-unknown', 'unread', 'blocked', 'content-reviewed'].includes(
      after?.contentReviewStatus,
    ),
    `invalid semantic status: ${change.path}`,
  )
  demand(
    ['needs-migration', 'template-compliant'].includes(after?.templateCompliance),
    `invalid template compliance: ${change.path}`,
  )
  demand(
    ['structured-content', 'partial-semantic'].includes(after?.reviewDepth),
    `this cohort cannot claim deep-semantic read: ${change.path}`,
  )
  demand(!hasLossyJsonValue(after), `lossy JSON values: ${change.path}`)
  demand(
    after?.path === change.path && !isDeepStrictEqual(previous, after),
    `missing/unchanged after row: ${change.path}`,
  )
  for (const key of new Set([...Object.keys(previous), ...Object.keys(after)]))
    if (!mutable.has(key))
      demand(
        isDeepStrictEqual(after[key], previous[key]),
        `immutable row field ${key}: ${change.path}`,
      )
  for (const key of ['history', 'provenance'])
    demand(
      Array.isArray(after[key]) &&
        isDeepStrictEqual(after[key].slice(0, previous[key].length), previous[key]),
      `original ${key} not preserved: ${change.path}`,
    )
  demand(
    Array.isArray(after.revision?.history) &&
      isDeepStrictEqual(
        after.revision.history.slice(0, previous.revision.history.length),
        previous.revision.history,
      ),
    `revision history not preserved: ${change.path}`,
  )
  if (
    after.contentReviewStatus === 'content-reviewed' &&
    previous.contentReviewStatus !== 'content-reviewed'
  ) {
    const q = after.currentQualification
    demand(
      q?.nonAuthorReviewer === true &&
        q.decision === 'accept' &&
        q.grantsNewSemanticAcceptance === true &&
        q.path === change.path &&
        typeof q.reviewer === 'string' &&
        q.reviewer.length > 0 &&
        /^[a-f\d]{64}$/.test(q.evidenceSha256 ?? ''),
      `semantic promotion lacks explicit per-document acceptance: ${change.path}`,
    )
    demand(
      !after.claimCorrection,
      `withdrawal cannot be silently retained as reviewed: ${change.path}`,
    )
  }
}

function validateNativeContent(changes, records, readBuffer, git) {
  for (const pin of historicalVitestCohort.protectedNative)
    demand(
      digest(readBuffer(pin.path)) === pin.sha256,
      `protected native carrier changed: ${pin.path}`,
    )
  const templates = parseTerminalJson(readBuffer('docs/phase-governance/templates/registry.json'))
  for (const change of changes) {
    const row = records.get(change.reviewRecord).entries[change.index]
    const issues = checkMigratedDocument(
      {
        path: change.path,
        templateId: row.templateId,
        variant: row.templateVariant,
        historyOverlay: row.historyOverlay,
      },
      templates,
      (p) => readBuffer(p)?.toString('utf8'),
      {
        readBuffer,
        readSourceBuffer: git,
        readSource: (pin) => git(pin)?.buffer.toString('utf8'),
        reviewReader: (path) => records.get(path),
      },
    )
    demand(issues.length === 0, `${change.path}: ${issues.join('; ')}`)
  }
}

export function prepareReviewSemanticDelta({ root, baseRevision, changes, changesSha256 }) {
  const base = resolve(root)
  demand(
    !process.env.BIOME_BINARY,
    'custom formatter binary is not admitted for semantic publication',
  )
  demand(/^[a-f\d]{40}$/.test(baseRevision ?? ''), 'full current source commit required')
  demand(
    Array.isArray(changes) &&
      changes.length > 0 &&
      changes.length <= historicalVitestCohort.entries.length,
    'bounded nonempty row changes required',
  )
  demand(canonical(changes) === changesSha256, 'approved changes fingerprint differs')
  const logicalPaths = [...FROZEN_REVIEW_STORAGE_SOURCES.map((e) => e.path), r92Path, r94Path]
  const group = loadReviewRecords({ root: base, logicalPaths }),
    records = new Map(),
    states = new Map(),
    parents = new Map(),
    extras = new Map(),
    gitCache = new Map()
  demand(
    group.records.size === logicalPaths.length &&
      [...group.records.keys()].every((path) => logicalPaths.includes(path)),
    'unexpected sharded owner outside this ten-source transaction',
  )
  const git = (pin) => {
    const key = `${pin.revision}:${pin.path}`
    if (!gitCache.has(key)) gitCache.set(key, readGitDocumentSnapshot(base, pin))
    return gitCache.get(key)
  }
  for (const file of group.loadedSource.files) {
    const state = fileState(base, file.path, parents)
    const snapshot = git({ revision: baseRevision, path: file.path })
    demand(
      snapshot?.mode === '100644' && state.buffer?.equals(snapshot.buffer),
      `current source differs from fixed commit: ${file.path}`,
    )
    states.set(file.path, state)
  }
  for (const { path, entryCount } of FROZEN_REVIEW_STORAGE_SOURCES) {
    demand(
      group.storages.get(path) && group.records.get(path).entries.length === entryCount,
      `current sharded source required: ${path}`,
    )
    records.set(path, structuredClone(group.records.get(path)))
  }
  const seen = new Set()
  for (const change of changes) {
    demand(!seen.has(change.path), `duplicate change: ${change.path}`)
    seen.add(change.path)
    const record = records.get(change.reviewRecord)
    demand(
      record?.entries[change.index]?.path === change.path,
      `row position differs: ${change.path}`,
    )
    validateChange(change, record.entries[change.index])
    record.entries[change.index] = structuredClone(change.after)
  }
  const readBuffer = (path) => {
    demand(typeof path === 'string' && path.startsWith('docs/'), 'non-document validation input')
    if (!extras.has(path)) extras.set(path, fileState(base, path, parents, 'docs/'))
    return extras.get(path).buffer
  }
  validateNativeContent(changes, records, readBuffer, git)
  const outputs = []
  for (const [path, record] of records)
    outputs.push(
      ...packReviewStorageRecord({
        logicalPath: path,
        record,
        sourcePin: group.storages.get(path).source,
        context: { repoRoot: base },
      }).outputs,
    )
  const r92 = structuredClone(group.records.get(r92Path)),
    r94 = structuredClone(group.records.get(r94Path)),
    edges = []
  for (const { path } of FROZEN_REVIEW_STORAGE_SOURCES) {
    const matches = r92.entries.map((e, i) => (e.path === path ? i : -1)).filter((i) => i >= 0)
    demand(matches.length === 1, `R92 unique edge required: ${path}`)
    const index = matches[0],
      edge = r92.entries[index]
    demand(edge.afterSha256 === digest(states.get(path).buffer), `R92 before pin mismatch: ${path}`)
    const bytes = outputs.find((o) => o.path === path).bytes
    edges.push({ record: r92Path, index, path, before: edge.afterSha256, after: digest(bytes) })
    edge.afterSha256 = digest(bytes)
  }
  const r92Bytes = biomeFormat(r92, r92Path, { repoRoot: base })
  validateFormattedOutput(r92Bytes, r92, 'R92', r92Path)
  demand(
    r94.entries[6]?.path === r92Path &&
      r94.entries[6].afterSha256 === digest(states.get(r92Path).buffer),
    'R94[6] before pin mismatch',
  )
  edges.push({
    record: r94Path,
    index: 6,
    path: r92Path,
    before: r94.entries[6].afterSha256,
    after: digest(r92Bytes),
  })
  r94.entries[6].afterSha256 = digest(r92Bytes)
  const r94Bytes = biomeFormat(r94, r94Path, { repoRoot: base })
  validateFormattedOutput(r94Bytes, r94, 'R94', r94Path)
  outputs.push(
    { kind: 'review', path: r92Path, bytes: r92Bytes },
    { kind: 'review', path: r94Path, bytes: r94Bytes },
  )
  const expected = new Map(outputs.map((o) => [o.path, o])),
    retired = [...states.keys()].filter(
      (p) => p.startsWith(`${reviewDirRelative}/shards/`) && !expected.has(p),
    )
  const targets = new Map(states)
  for (const output of outputs)
    if (!targets.has(output.path)) targets.set(output.path, fileState(base, output.path, parents))
  assertReviewRecordSourceUnchanged(group.loadedSource)
  const plan = {
    kind: 'review-record-semantic-delta/1.0.0',
    baseRevision,
    changesSha256,
    changedPaths: [...seen],
    outputs: outputs.map((o) => ({ ...o, bytes: Buffer.from(o.bytes) })),
    retiredFiles: retired.map((path) => ({
      path,
      sha256: digest(states.get(path).buffer),
      sourceRevision: baseRevision,
      reason:
        'Replaced by validated current logical generation; prior physical bytes recoverable from fixed Git and retained transaction recovery on failure',
    })),
    edges,
    totalEntries: 599,
  }
  plans.set(plan, {
    root: base,
    public: {
      ...structuredClone({ ...plan, outputs: [] }),
      outputs: plan.outputs.map((o) => ({ ...o, bytes: Buffer.from(o.bytes) })),
    },
    outputs,
    states,
    targets,
    parents,
    extras,
    records,
    expected,
    retired,
  })
  return plan
}

/** Read-only restart/idempotency check: exact expected logical objects and nine current byte pins. */
export function inspectPublishedReviewSemanticDelta({
  root,
  baseRevision,
  changes,
  changesSha256,
}) {
  const base = resolve(root)
  demand(/^[a-f\d]{40}$/.test(baseRevision ?? ''), 'full current source commit required')
  demand(
    Array.isArray(changes) &&
      changes.length > 0 &&
      changes.length <= historicalVitestCohort.entries.length &&
      canonical(changes) === changesSha256,
    'bounded approved changes fingerprint required',
  )
  const paths = [...FROZEN_REVIEW_STORAGE_SOURCES.map((e) => e.path), r92Path, r94Path],
    group = loadReviewRecords({ root: base, logicalPaths: paths })
  demand(
    group.records.size === paths.length &&
      [...group.records.keys()].every((p) => paths.includes(p)),
    'unexpected sharded owner outside this ten-source transaction',
  )
  const expected = new Map(),
    originalStorage = new Map(),
    seen = new Set()
  for (const path of paths) {
    const saved = loadReviewRecordFromGit({ root: base, revision: baseRevision, logicalPath: path })
    expected.set(path, structuredClone(saved.record))
    originalStorage.set(path, saved.storage)
  }
  for (const change of changes) {
    demand(!seen.has(change.path), `duplicate change: ${change.path}`)
    seen.add(change.path)
    const record = expected.get(change.reviewRecord)
    demand(
      record?.entries[change.index]?.path === change.path,
      `row position differs: ${change.path}`,
    )
    validateChange(change, record.entries[change.index])
    record.entries[change.index] = structuredClone(change.after)
  }
  for (const { path } of FROZEN_REVIEW_STORAGE_SOURCES) {
    if (
      !isDeepStrictEqual(group.records.get(path), expected.get(path)) ||
      JSON.stringify(group.records.get(path)) !== JSON.stringify(expected.get(path))
    )
      return undefined
    demand(
      isDeepStrictEqual(group.storages.get(path)?.source, originalStorage.get(path)?.source),
      `published original source pin changed: ${path}`,
    )
  }
  const states = new Map(),
    parents = new Map(),
    readBuffer = (path) => {
      if (!states.has(path)) states.set(path, fileState(base, path, parents, 'docs/'))
      return states.get(path).buffer
    },
    r92 = expected.get(r92Path),
    r94 = expected.get(r94Path)
  for (const { path } of FROZEN_REVIEW_STORAGE_SOURCES) {
    const matches = r92.entries.filter((e) => e.path === path)
    demand(matches.length === 1, `unique R92 edge required: ${path}`)
    const before = readGitDocumentSnapshot(base, { revision: baseRevision, path })
    demand(
      before?.mode === '100644' && matches[0].afterSha256 === digest(before.buffer),
      `original R92 before pin mismatch: ${path}`,
    )
    matches[0].afterSha256 = digest(readBuffer(path))
  }
  demand(r94.entries[6]?.path === r92Path, 'R94[6] target mismatch')
  const beforeR92 = readGitDocumentSnapshot(base, { revision: baseRevision, path: r92Path })
  demand(
    beforeR92?.mode === '100644' && r94.entries[6].afterSha256 === digest(beforeR92.buffer),
    'original R94[6] before pin mismatch',
  )
  r94.entries[6].afterSha256 = digest(readBuffer(r92Path))
  for (const path of [r92Path, r94Path])
    demand(
      isDeepStrictEqual(group.records.get(path), expected.get(path)) &&
        JSON.stringify(group.records.get(path)) === JSON.stringify(expected.get(path)) &&
        readBuffer(path).length <= 524288,
      `published control object mismatch: ${path}`,
    )
  const gitCache = new Map(),
    git = (pin) => {
      const key = `${pin.revision}:${pin.path}`
      if (!gitCache.has(key)) gitCache.set(key, readGitDocumentSnapshot(base, pin))
      return gitCache.get(key)
    }
  validateNativeContent(changes, expected, readBuffer, git)
  assertReviewRecordSourceUnchanged(group.loadedSource)
  assertStates(base, states, parents)
  return {
    mode: 'already-published',
    written: 0,
    retired: 0,
    totalEntries: 599,
    changedRows: changes.length,
    dependencyPins: 9,
    logicalObjectsExact: true,
    originalSourcePinsPreserved: true,
  }
}

function assertStates(root, states, parents) {
  for (const [path, state] of parents) {
    const s = lstatSync(path)
    demand(
      s.isDirectory() &&
        !s.isSymbolicLink() &&
        isDeepStrictEqual(state, { dev: s.dev, ino: s.ino, mode: s.mode }),
      `parent changed: ${path}`,
    )
  }
  for (const [path, state] of states) {
    const current = fileState(root, path, undefined, 'docs/')
    demand(
      isDeepStrictEqual(current.identity, state.identity) &&
        (state.buffer ? current.buffer?.equals(state.buffer) : !current.buffer),
      `input changed: ${path}`,
    )
  }
}
function verifyOutputs(root, plan, inventory = true) {
  const readBuffer = (path) => fileState(root, path).buffer
  for (const [path, expected] of plan.records) {
    const actual = materializeReviewRecord(path, { readBuffer }).record
    demand(
      isDeepStrictEqual(actual, expected) && JSON.stringify(actual) === JSON.stringify(expected),
      `logical readback mismatch: ${path}`,
    )
  }
  for (const output of plan.outputs)
    demand(
      readBuffer(output.path)?.equals(output.bytes),
      `output readback mismatch: ${output.path}`,
    )
  if (inventory) inspectShardInventory(root, plan.expected)
}

export function publishReviewSemanticDelta(handle, { allowWrite = false } = {}) {
  const plan = plans.get(handle)
  demand(
    plan && isDeepStrictEqual(handle, plan.public),
    'actual unmodified semantic prepare handle required',
  )
  demand(allowWrite === true, 'explicit Owner publication mode required')
  const root = plan.root,
    lock = join(root, reviewDirRelative, '.storage.lock'),
    expected = plan.expected
  try {
    lstatSync(lock)
    throw new Error('review-record-semantic-writer: publication lock already present')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const published =
    plan.outputs.every((o) => fileState(root, o.path).buffer?.equals(o.bytes)) &&
    plan.retired.every((path) => !fileState(root, path).buffer)
  if (!published) assertStates(root, plan.targets, plan.parents)
  assertStates(root, plan.extras, plan.parents)
  const transitional = new Map(
    [...plan.states]
      .filter(([path]) => path.startsWith(`${reviewDirRelative}/shards/`))
      .map(([path, state]) => [path, { kind: 'shard', path, bytes: state.buffer }]),
  )
  for (const [path, output] of expected) transitional.set(path, output)
  inspectShardInventory(root, published ? expected : transitional)
  const stage = mkdtempSync(join(root, reviewDirRelative, '.semantic-stage-'))
  try {
    writeFileSync(
      lock,
      `${JSON.stringify({ kind: handle.kind, stage, baseRevision: handle.baseRevision, changesSha256: handle.changesSha256, outputs: plan.outputs.map((output) => ({ path: output.path, sha256: digest(output.bytes) })), retiredFiles: handle.retiredFiles })}\n`,
      { flag: 'wx' },
    )
  } catch (error) {
    rmSync(stage, { recursive: true })
    throw error
  }
  const recovery = {
    kind: handle.kind,
    baseRevision: handle.baseRevision,
    changesSha256: handle.changesSha256,
    root,
    written: [],
    retired: [],
    state: 'locked',
  }
  const save = () =>
    writeFileSync(join(stage, 'recovery.json'), `${JSON.stringify(recovery, null, 2)}\n`)
  const live = new Map(),
    ownedLock = new Map([
      [`${reviewDirRelative}/.storage.lock`, fileState(root, `${reviewDirRelative}/.storage.lock`)],
    ])
  const guard = () => {
    assertStates(root, ownedLock, plan.parents)
    assertStates(root, live, plan.parents)
    assertStates(root, plan.extras, plan.parents)
  }
  try {
    save()
    for (const path of new Set([...plan.states.keys(), ...expected.keys()]))
      live.set(path, fileState(root, path, plan.parents))
    if (published) {
      verifyOutputs(root, plan)
      guard()
    } else {
      assertStates(root, plan.targets, plan.parents)
      guard()
      inspectShardInventory(root, transitional)
      for (const output of plan.outputs) {
        const path = join(stage, 'after', output.path)
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, output.bytes, { flag: 'wx' })
      }
      for (const [path, state] of plan.states) {
        const dest = join(stage, 'before', path)
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, state.buffer, { flag: 'wx' })
      }
      verifyOutputs(join(stage, 'after'), plan)
      guard()
      inspectShardInventory(root, transitional)
      const order = [...plan.outputs].sort(
        (a, b) =>
          ({ shard: 0, manifest: 1, review: 2 })[a.kind] -
          { shard: 0, manifest: 1, review: 2 }[b.kind],
      )
      for (const output of order) {
        guard()
        if (live.get(output.path)?.buffer?.equals(output.bytes)) continue
        mkdirSync(dirname(join(root, output.path)), { recursive: true })
        checkOrdinaryPath(root, dirname(output.path), 'directory', plan.parents)
        renameSync(join(stage, 'after', output.path), join(root, output.path))
        live.set(output.path, fileState(root, output.path, plan.parents))
        recovery.written.push(output.path)
        save()
      }
      // New manifests and every dependent pin must read back before old fragments exit.
      verifyOutputs(root, plan, false)
      guard()
      inspectShardInventory(root, transitional)
      for (const path of plan.retired) {
        guard()
        const dest = join(stage, 'retired', path)
        mkdirSync(dirname(dest), { recursive: true })
        renameSync(join(root, path), dest)
        live.set(path, { identity: null, buffer: null })
        recovery.retired.push(path)
        save()
      }
      for (const dir of new Set(plan.retired.map((path) => dirname(path)))) {
        checkOrdinaryPath(root, dir, 'directory', plan.parents)
        demand(readdirSync(join(root, dir)).length === 0, `old generation has new files: ${dir}`)
        rmdirSync(join(root, dir))
        plan.parents.delete(join(root, dir))
      }
      verifyOutputs(root, plan)
      guard()
    }
    recovery.state = 'verified'
    save()
  } catch (error) {
    throw new Error(
      `review-record-semantic-writer: publication failed (lock+recovery preserved at ${stage}): ${error.message}`,
    )
  }
  // Readback is committed before cleanup. Keep the lock if staging cleanup fails;
  // the lock itself carries output/retirement identities even after stage removal.
  try {
    rmSync(stage, { recursive: true })
  } catch (error) {
    throw new Error(
      `review-record-semantic-writer: readback verified; cleanup incomplete with lock held at ${lock}: ${error.message}`,
    )
  }
  assertStates(root, ownedLock, plan.parents)
  rmSync(lock)
  return {
    written: recovery.written.length,
    retired: published ? 0 : plan.retired.length,
    totalEntries: 599,
    idempotent: published,
    lockReleased: true,
  }
}
