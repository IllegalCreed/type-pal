// review-record-storage-writer.mjs — prepare/publish for review-record-storage/1.0.0.
// C01: closed complete-group publish with expected snapshots, lock-then-recheck,
// owned staging, reload-verify-599/9edges/artifact-set before final placement.
// C02: prepare verifies fixed Git identity (100644/blob/SHA bytes) via real Git reader;
// validates unique frozen 8-source/counts/orders/total599/9-edges; after real biome
// format enforces strict JSON + deepStrictEqual + Unicode preservation.
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  FROZEN_REVIEW_SOURCE_REVISION,
  FROZEN_REVIEW_STORAGE_SOURCES,
  FROZEN_REVIEW_STORAGE_TOTAL,
  hasLossyJsonValue,
  materializeReviewRecord,
  reviewDirRelative,
  reviewStorageMarker,
} from './review-record-storage.mjs'
import {
  checkOrdinaryPath,
  directoryIdentity,
  fileState,
  inspectShardInventory,
} from './review-record-storage-io.mjs'
import {
  biomeFormat,
  packReviewStorageRecord,
  validateFormattedOutput,
} from './review-record-storage-packing.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-storage-writer: ${message}`)
}
const preparedPlans = new WeakMap()
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

export { FROZEN_REVIEW_SOURCE_REVISION, FROZEN_REVIEW_STORAGE_SOURCES, FROZEN_REVIEW_STORAGE_TOTAL }

// C02: prepare production boundary — verify Git identity of the source via real reader
function verifySourceGitIdentity(repoRoot, logicalPath, revision) {
  const snap = readGitDocumentSnapshot(repoRoot, { revision, path: logicalPath })
  demand(snap !== undefined, `Git snapshot missing for ${logicalPath} at ${revision}`)
  demand(snap.mode === '100644', `source mode ${snap.mode} not 100644: ${logicalPath}`)
  demand(/^[a-f\d]{40}$/.test(snap.gitObject ?? ''), `source gitObject invalid: ${logicalPath}`)
  const sha256 = digest(snap.buffer)
  return { gitObject: snap.gitObject, sha256, buffer: snap.buffer }
}

export function prepareReviewStorageGroup({
  records,
  r92Buffer,
  r94Buffer,
  readBuffer,
  context = {},
}) {
  demand(Array.isArray(records) && records.length === 8, 'exactly 8 source records required')
  demand(typeof readBuffer === 'function', 'readBuffer provider required')
  demand(r92Buffer !== undefined && r94Buffer !== undefined, 'R92/R94 buffers required')

  // C02: unique frozen 8-source paths / counts / total
  const paths = records.map((r) => r.path)
  demand(new Set(paths).size === 8, 'duplicate source paths')
  for (const record of records) {
    const frozen = FROZEN_REVIEW_STORAGE_SOURCES.find((f) => f.path === record.path)
    demand(frozen !== undefined, `source not in frozen list: ${record.path}`)
    demand(record.entryCount === frozen.entryCount, `entry count mismatch for ${record.path}`)
  }
  const totalEntries = records.reduce((n, r) => n + r.entryCount, 0)
  demand(
    totalEntries === FROZEN_REVIEW_STORAGE_TOTAL,
    `total entries ${totalEntries} != ${FROZEN_REVIEW_STORAGE_TOTAL}`,
  )

  // C02: verify source Git identities if repoRoot provided (production boundary)
  let gitVerifiedSources = null
  if (context.repoRoot) {
    gitVerifiedSources = {}
    for (const record of records) {
      gitVerifiedSources[record.path] = verifySourceGitIdentity(
        context.repoRoot,
        record.path,
        FROZEN_REVIEW_SOURCE_REVISION,
      )
    }
  }

  // C02: reject lossy values (-0, NaN, Infinity, undefined, bigint, symbol, function) before formatting
  const r92 = parseTerminalJson(r92Buffer)
  const r94 = parseTerminalJson(r94Buffer)
  demand(isObject(r92) && Array.isArray(r92.entries), 'R92 buffer not a valid review record')
  demand(isObject(r94) && Array.isArray(r94.entries), 'R94 buffer not a valid review record')
  for (const value of [r92, r94]) {
    demand(!hasLossyJsonValue(value), 'R92/R94 contains lossy JSON values (-0/NaN/undefined)')
  }

  const sourceBuffers = new Map()
  const originalRecords = new Map()
  const outputs = []
  const r92Edges = []
  const shardsAll = []
  const expectedSourceSnapshot = {}
  const entryOrderFingerprints = {}
  const orderedEntriesFingerprints = {}

  for (const source of records) {
    const logicalPath = source.path
    const flatBuffer = readBuffer(logicalPath)
    demand(flatBuffer !== undefined, `source missing: ${logicalPath}`)
    // C02: hard-bind to Git-verified bytes when available; otherwise verify against manifest SHA
    if (gitVerifiedSources) {
      const verified = gitVerifiedSources[logicalPath]
      demand(
        digest(flatBuffer) === verified.sha256,
        `source bytes differ from Git-verified identity: ${logicalPath}`,
      )
    }
    demand(digest(flatBuffer) === source.beforeSHA256, `source identity drift: ${logicalPath}`)
    sourceBuffers.set(logicalPath, Buffer.from(flatBuffer))
    const flat = parseTerminalJson(flatBuffer)
    originalRecords.set(logicalPath, parseTerminalJson(flatBuffer))
    demand(isObject(flat) && Array.isArray(flat.entries), `unsupported flat shape: ${logicalPath}`)
    demand(!Object.hasOwn(flat, reviewStorageMarker), `already a manifest: ${logicalPath}`)
    demand(flat.entries.length === source.entryCount, `entry count mismatch: ${logicalPath}`)
    demand(!hasLossyJsonValue(flat), `source contains lossy JSON values: ${logicalPath}`)
    expectedSourceSnapshot[logicalPath] = digest(flatBuffer)
    const stem = logicalPath
      .split('/')
      .pop()
      .replace(/\.json$/, '')
    const sourcePin = gitVerifiedSources
      ? {
          revision: FROZEN_REVIEW_SOURCE_REVISION,
          path: logicalPath,
          gitObject: gitVerifiedSources[logicalPath].gitObject,
          sha256: gitVerifiedSources[logicalPath].sha256,
        }
      : {
          revision: source.sourceRevision,
          path: logicalPath,
          gitObject: source.sourceGitObject,
          sha256: source.beforeSHA256,
        }
    const packed = packReviewStorageRecord({ logicalPath, record: flat, sourcePin, context })
    outputs.push(...packed.outputs)
    for (const output of packed.outputs)
      if (output.kind === 'shard')
        shardsAll.push({ logicalPath, path: output.path, sha256: digest(output.bytes) })
    entryOrderFingerprints[logicalPath] = packed.entryOrderSha256
    orderedEntriesFingerprints[logicalPath] = packed.orderedEntriesSha256
    const formattedManifest = packed.outputs.find((output) => output.kind === 'manifest').bytes

    // R92 edge — C02: validate the BEFORE pin matches actual source bytes before overwriting
    const stemShort = stem
    const edgeIndex = r92EdgeIndex(stemShort)
    const edge = r92.entries[edgeIndex]
    demand(edge.path === logicalPath, `R92 edge target mismatch at ${edgeIndex}: ${edge.path}`)
    const expectedBefore = digest(flatBuffer)
    demand(
      edge.afterSha256 === expectedBefore,
      `R92 edge ${edgeIndex} before-pin ${edge.afterSha256} != actual source SHA ${expectedBefore}`,
    )
    r92Edges.push({ index: edgeIndex, target: logicalPath, before: edge.afterSha256 })
    edge.afterSha256 = digest(formattedManifest)
  }

  const formattedR92 = biomeFormat(r92, '20261017-r92-phase-governance-artifacts.json', context)
  validateFormattedOutput(formattedR92, r92, 'R92', 'R92')
  const r94Edge = r94.entries[6]
  demand(
    r94Edge.path === `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`,
    'R94[6] edge target mismatch',
  )
  const r94EdgeBefore = r94Edge.afterSha256
  // C02: validate R94[6] before-pin matches actual R92 buffer SHA before overwriting
  demand(
    r94EdgeBefore === digest(r92Buffer),
    `R94[6] before-pin ${r94EdgeBefore} != actual R92 buffer SHA ${digest(r92Buffer)}`,
  )
  r94Edge.afterSha256 = digest(formattedR92)
  const formattedR94 = biomeFormat(r94, '20261017-r94-final-machine-artifacts.json', context)
  validateFormattedOutput(formattedR94, r94, 'R94', 'R94')
  outputs.push({
    kind: 'review',
    path: `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`,
    bytes: formattedR92,
  })
  outputs.push({
    kind: 'review',
    path: `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`,
    bytes: formattedR94,
  })

  // C01: snapshot must include R92/R94 source buffers for publish-time recheck
  const R92_LOGICAL = `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`
  const R94_LOGICAL = `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`
  expectedSourceSnapshot[R92_LOGICAL] = digest(r92Buffer)
  expectedSourceSnapshot[R94_LOGICAL] = digest(r94Buffer)

  const prepared = {
    outputs,
    group: {
      manifests: 8,
      shards: shardsAll,
      r92Edges,
      r94Edge: { index: 6, before: r94EdgeBefore },
      totalEntries: FROZEN_REVIEW_STORAGE_TOTAL,
    },
    expectedSourceSnapshot,
    provenance: gitVerifiedSources ? 'git-verified' : 'pure-fixture',
  }
  sourceBuffers.set(R92_LOGICAL, Buffer.from(r92Buffer))
  sourceBuffers.set(R94_LOGICAL, Buffer.from(r94Buffer))
  preparedPlans.set(prepared, {
    outputs: outputs.map((output) => ({ ...output, bytes: Buffer.from(output.bytes) })),
    sourceBuffers,
    originalRecords,
    snapshot: { ...expectedSourceSnapshot },
    sourceRoot: context.repoRoot ? resolve(context.repoRoot) : undefined,
    provenance: prepared.provenance,
    actualFormatter: !context.format && !context.biomePath && !process.env.BIOME_BINARY,
  })
  return prepared
}

const R92_EDGE_INDEX = {
  '20261017-r73-testing-archive': 4,
  '20261017-r74-testing-archive': 5,
  '20261017-r75-testing-archive': 6,
  '20261017-r76-testing-archive': 7,
  '20261017-r85-testing-archive': 16,
  '20261017-r86-ops-evidence-artifacts': 17,
  '20261017-r87-ops-evidence-artifacts': 18,
  '20261017-r88-ops-evidence-artifacts': 19,
}
function r92EdgeIndex(stem) {
  const index = R92_EDGE_INDEX[stem]
  demand(index !== undefined, `no frozen R92 edge for stem: ${stem}`)
  return index
}

// Only real prepare results carry a plan. The handle never exempts IO rechecks:
// private original bytes, exact descriptors and target states are verified again.
export function publishReviewStorageGroup(prepared, targetRoot, options = {}) {
  const plan = preparedPlans.get(prepared)
  demand(plan, 'publication requires an actual prepare result, not a shaped token')
  demand(
    isDeepStrictEqual(prepared.expectedSourceSnapshot, plan.snapshot),
    'expected source set changed',
  )
  demand(prepared.provenance === plan.provenance, 'source provenance changed')
  demand(
    prepared.outputs.length === plan.outputs.length &&
      prepared.outputs.every(
        (o, i) =>
          o.kind === plan.outputs[i].kind &&
          o.path === plan.outputs[i].path &&
          Buffer.isBuffer(o.bytes) &&
          o.bytes.equals(plan.outputs[i].bytes),
      ),
    'complete prepared output set changed',
  )
  const base = resolve(targetRoot),
    sourceReader = options.sourceReadBuffer
  demand(typeof sourceReader === 'function', 'source readBuffer required')
  const inPlace = base === plan.sourceRoot
  demand(
    !inPlace ||
      (options.allowInPlace === true && plan.provenance === 'git-verified' && plan.actualFormatter),
    'in-place publication requires explicit Owner mode and verified Git sources',
  )
  const expected = new Map(plan.outputs.map((output) => [output.path, output]))
  let inPlaceInputMode
  const sourceCheck = () => {
    const modes = []
    for (const [path, before] of plan.sourceBuffers) {
      const current = sourceReader(path)
      demand(Buffer.isBuffer(current), `source missing: ${path}`)
      if (!inPlace) demand(before.equals(current), `source changed: ${path}`)
      if (plan.sourceRoot)
        demand(
          current.equals(fileState(plan.sourceRoot, path).buffer),
          `source filesystem changed: ${path}`,
        )
      if (inPlace)
        modes.push(
          before.equals(current)
            ? 'original'
            : current.equals(expected.get(path).bytes)
              ? 'published'
              : 'foreign',
        )
    }
    if (inPlace) {
      // Exact prior outputs are a legitimate no-op replay, but a mixed/foreign
      // source group needs explicit recovery rather than implicit completion.
      demand(
        modes.every((mode) => mode === modes[0]) && modes[0] !== 'foreign',
        'partial or foreign in-place source group',
      )
      inPlaceInputMode ??= modes[0]
      demand(inPlaceInputMode === modes[0], 'source changed under publication lock')
    }
  }
  sourceCheck()
  const states = new Map(),
    parents = new Map()
  for (const output of plan.outputs) {
    const state = fileState(base, output.path, parents)
    if (state.buffer) {
      const before = plan.sourceBuffers.get(output.path)
      demand(
        state.buffer.equals(output.bytes) || before?.equals(state.buffer),
        `target has foreign bytes: ${output.path}`,
      )
    }
    states.set(output.path, state)
  }
  inspectShardInventory(base, expected)
  const assertTargets = () => {
    for (const [path, state] of parents)
      demand(
        isDeepStrictEqual(state, directoryIdentity(lstatSync(path))),
        `target parent changed: ${path}`,
      )
    for (const [path, state] of states) {
      const current = fileState(base, path)
      demand(
        isDeepStrictEqual(state.identity, current.identity) &&
          (state.buffer ? current.buffer?.equals(state.buffer) : !current.buffer),
        `target changed under publication lock: ${path}`,
      )
    }
  }
  assertTargets()
  const reviewDir = join(base, reviewDirRelative)
  mkdirSync(reviewDir, { recursive: true })
  checkOrdinaryPath(base, reviewDirRelative, 'directory', parents)
  const stagingDir = mkdtempSync(join(tmpdir(), 'rrs-publish-')),
    lock = join(reviewDir, '.storage.lock')
  try {
    writeFileSync(lock, `${new Date().toISOString()}\n`, { flag: 'wx' })
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true })
    throw error
  }
  const recovery = { source: plan.snapshot, targetRoot: base, written: [], state: 'locked' }
  const saveRecovery = () =>
    writeFileSync(join(stagingDir, 'recovery.json'), `${JSON.stringify(recovery, null, 2)}\n`)
  try {
    saveRecovery()
    sourceCheck()
    assertTargets()
    inspectShardInventory(base, expected)
    for (const output of plan.outputs) {
      const staged = join(stagingDir, output.path)
      mkdirSync(dirname(staged), { recursive: true })
      writeFileSync(staged, output.bytes)
      const before = states.get(output.path).buffer
      if (before) {
        const backup = join(stagingDir, 'before', output.path)
        mkdirSync(dirname(backup), { recursive: true })
        writeFileSync(backup, before)
      }
    }
    saveRecovery()
    verifyStagedGroup(stagingDir, plan)
    sourceCheck()
    assertTargets()
    inspectShardInventory(base, expected)
    // Shards first, then all manifests, R92 and R94. Readers refuse the whole locked group.
    const order = [...plan.outputs].sort(
      (a, b) =>
        ({ shard: 0, manifest: 1, review: 2 })[a.kind] -
        { shard: 0, manifest: 1, review: 2 }[b.kind],
    )
    for (const output of order) {
      assertTargets()
      mkdirSync(dirname(join(base, output.path)), { recursive: true })
      checkOrdinaryPath(base, output.path.split('/').slice(0, -1).join('/'), 'directory', parents)
      renameSync(join(stagingDir, output.path), join(base, output.path))
      states.set(output.path, fileState(base, output.path, parents))
      demand(
        states.get(output.path).buffer.equals(output.bytes),
        `final placement drift: ${output.path}`,
      )
      recovery.written.push(output.path)
      saveRecovery()
    }
    verifyStagedGroup(base, plan)
    assertTargets()
    inspectShardInventory(base, expected)
    if (!inPlace) sourceCheck()
    recovery.state = 'verified'
    saveRecovery()
  } catch (error) {
    throw new Error(
      `review-record-storage-writer: publish failed (lock+staging preserved at ${stagingDir}): ${error.message}`,
    )
  }
  rmSync(lock)
  rmSync(stagingDir, { recursive: true, force: true })
  return {
    written: expected.size,
    lockReleased: true,
    totalEntries: FROZEN_REVIEW_STORAGE_TOTAL,
    edgeCount: 9,
  }
}
function verifyStagedGroup(root, plan) {
  const readBuffer = (path) => readFileSync(join(root, path))
  for (const [path, original] of plan.originalRecords) {
    const { record } = materializeReviewRecord(path, { readBuffer })
    demand(
      isDeepStrictEqual(record, original) && JSON.stringify(record) === JSON.stringify(original),
      `logical content changed: ${path}`,
    )
  }
  const r92Path = `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`
  const r94Path = `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`
  const r92 = parseTerminalJson(readBuffer(r92Path)),
    r94 = parseTerminalJson(readBuffer(r94Path))
  for (const index of Object.values(R92_EDGE_INDEX)) {
    const edge = r92.entries[index]
    demand(edge.afterSha256 === digest(readBuffer(edge.path)), `R92 edge ${index} drift`)
  }
  demand(r94.entries[6].afterSha256 === digest(readBuffer(r92Path)), 'R94[6] drift')
  for (const output of plan.outputs)
    demand(readBuffer(output.path).equals(output.bytes), `output drift: ${output.path}`)
  inspectShardInventory(root, new Map(plan.outputs.map((o) => [o.path, o])))
}
