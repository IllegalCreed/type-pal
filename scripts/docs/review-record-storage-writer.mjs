// review-record-storage-writer.mjs — prepare/publish for review-record-storage/1.0.0.
// C01: closed complete-group publish with expected snapshots, lock-then-recheck,
// owned staging, reload-verify-599/9edges/artifact-set before final placement.
// C02: prepare verifies fixed Git identity (100644/blob/SHA bytes) via real Git reader;
// validates unique frozen 8-source/counts/orders/total599/9-edges; after real biome
// format enforces strict JSON + deepStrictEqual + Unicode preservation.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  hasLossyJsonValue,
  materializeReviewRecord,
  reviewDirRelative,
  reviewStorageContractId,
  reviewStorageFlatCap,
  reviewStorageMarker,
  reviewStorageShardCap,
} from './review-record-storage.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const require = createRequire(import.meta.url)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-storage-writer: ${message}`)
}
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

// C05: frozen 8-source identities as bounded versioned constants (no /tmp packet dependency)
export const FROZEN_REVIEW_STORAGE_SOURCES = Object.freeze(
  [
    ['20261017-r73-testing-archive.json', 50],
    ['20261017-r74-testing-archive.json', 50],
    ['20261017-r75-testing-archive.json', 50],
    ['20261017-r76-testing-archive.json', 50],
    ['20261017-r85-testing-archive.json', 100],
    ['20261017-r86-ops-evidence-artifacts.json', 100],
    ['20261017-r87-ops-evidence-artifacts.json', 100],
    ['20261017-r88-ops-evidence-artifacts.json', 99],
  ].map(([name, count]) => ({
    path: `${reviewDirRelative}/${name}`,
    entryCount: count,
  })),
)
export const FROZEN_REVIEW_STORAGE_TOTAL = 599
export const FROZEN_REVIEW_SOURCE_REVISION = '8cbf0dafba1a8a96914a322719dfeca1e5d58873'

// C02: prepare production boundary — verify Git identity of the source via real reader
function verifySourceGitIdentity(repoRoot, logicalPath, revision) {
  const snap = readGitDocumentSnapshot(repoRoot, { revision, path: logicalPath })
  demand(snap !== undefined, `Git snapshot missing for ${logicalPath} at ${revision}`)
  demand(snap.mode === '100644', `source mode ${snap.mode} not 100644: ${logicalPath}`)
  demand(/^[a-f\d]{40}$/.test(snap.gitObject ?? ''), `source gitObject invalid: ${logicalPath}`)
  const sha256 = digest(snap.buffer)
  return { gitObject: snap.gitObject, sha256, buffer: snap.buffer }
}

const biomeFormat = (value, path, context) => {
  const input = `${JSON.stringify(value, null, 2)}\n`
  demand(Buffer.byteLength(input) < reviewStorageFlatCap, `unformatted file reaches 1 MiB: ${path}`)
  const run = context.format
    ? context.format(input, path)
    : execFileSync(
        process.execPath,
        [
          context.biomePath ?? require.resolve('@biomejs/biome/bin/biome'),
          'format',
          '--stdin-file-path',
          path,
        ],
        {
          cwd: context.repoRoot ?? process.cwd(),
          input,
          encoding: 'utf8',
          maxBuffer: 16 * 1024 * 1024,
        },
      )
  return Buffer.from(run, 'utf8')
}

// C02: post-format strict validation — reparse, deepEqual, Unicode, lossy check
function validateFormattedOutput(formatted, expectedValue, label, path) {
  demand(
    formatted.length <= reviewStorageShardCap,
    `formatted output exceeds 512 KiB: ${path} (${formatted.length})`,
  )
  let reparsed
  try {
    reparsed = parseTerminalJson(formatted)
  } catch (error) {
    throw new Error(`formatted output is not strict JSON (${error.message}): ${path}`)
  }
  // C02: actual deepStrictEqual (not just stringify comparison)
  demand(
    isDeepStrictEqual(reparsed, expectedValue),
    `formatted output deepStrictEqual mismatch (${label}): ${path}`,
  )
  demand(
    !hasLossyJsonValue(reparsed),
    `formatted output contains lossy values after format (${label}): ${path}`,
  )
  const originalJson = JSON.stringify(expectedValue)
  const reparsedJson = JSON.stringify(reparsed)
  demand(originalJson === reparsedJson, `formatted output loses logical value (${label}): ${path}`)
  demand(
    digest(Buffer.from(reparsedJson)) === digest(Buffer.from(originalJson)),
    `formatted output Unicode/value fingerprint mismatch: ${path}`,
  )
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
    const flat = parseTerminalJson(flatBuffer)
    demand(isObject(flat) && Array.isArray(flat.entries), `unsupported flat shape: ${logicalPath}`)
    demand(!Object.hasOwn(flat, reviewStorageMarker), `already a manifest: ${logicalPath}`)
    demand(flat.entries.length === source.entryCount, `entry count mismatch: ${logicalPath}`)
    demand(!hasLossyJsonValue(flat), `source contains lossy JSON values: ${logicalPath}`)
    expectedSourceSnapshot[logicalPath] = digest(flatBuffer)
    const logicalKeys = Object.keys(flat)
    demand(logicalKeys.includes('entries'), `entries key missing: ${logicalPath}`)
    const logicalSha256 = digest(Buffer.from(JSON.stringify(flat)))
    entryOrderFingerprints[logicalPath] = digest(
      Buffer.from(`[${flat.entries.map((e) => JSON.stringify(e.path)).join(',')}]`),
    )
    orderedEntriesFingerprints[logicalPath] = digest(
      Buffer.from(`[${flat.entries.map((e) => JSON.stringify(e)).join(',')}]`),
    )

    const stem = logicalPath
      .split('/')
      .pop()
      .replace(/\.json$/, '')
    const shardDir = `shards/${stem}/${logicalSha256}`
    const shardSpecs = []
    let current = []
    let currentBytes = 0
    for (const entry of flat.entries) {
      const entryBytes = Buffer.byteLength(JSON.stringify(entry, null, 2)) + 12
      if (current.length > 0 && currentBytes + entryBytes + 260 > 420_000) {
        shardSpecs.push(current)
        current = []
        currentBytes = 0
      }
      current.push(entry)
      currentBytes += entryBytes
    }
    if (current.length) shardSpecs.push(current)
    demand(shardSpecs.length > 0, `no shards packed: ${logicalPath}`)

    const storageShards = []
    const materializedEntries = new Array(flat.entries.length)
    shardSpecs.forEach((entries, shardIndex) => {
      const key = `part-${String(shardIndex + 1).padStart(3, '0')}`
      const positions = entries.map((entry) => flat.entries.indexOf(entry))
      demand(new Set(positions).size === positions.length, `position collision: ${logicalPath}`)
      const shardValue = {
        schemaVersion: 1,
        logicalPath,
        generation: logicalSha256,
        key,
        positions,
        entries,
      }
      const shardPath = `${shardDir}/${key}.json`
      const formatted = biomeFormat(shardValue, shardPath.split('/').pop(), context)
      // C02: post-format strict validation
      validateFormattedOutput(formatted, shardValue, 'shard', shardPath)
      outputs.push({ kind: 'shard', path: `${reviewDirRelative}/${shardPath}`, bytes: formatted })
      shardsAll.push({
        logicalPath,
        path: `${reviewDirRelative}/${shardPath}`,
        sha256: digest(formatted),
      })
      storageShards.push({ key, path: shardPath, total: entries.length, sha256: digest(formatted) })
      entries.forEach((entry, i) => {
        materializedEntries[positions[i]] = entry
      })
    })
    demand(
      materializedEntries.every((entry) => entry !== undefined),
      `shard positions do not cover all entries: ${logicalPath}`,
    )

    const manifestValue = {}
    for (const key of logicalKeys) if (key !== 'entries') manifestValue[key] = flat[key]
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
    manifestValue[reviewStorageMarker] = {
      schemaVersion: 1,
      producer: reviewStorageContractId,
      logicalPath,
      logicalKeys,
      source: sourcePin,
      logicalSha256,
      totalEntries: flat.entries.length,
      entryOrderSha256: entryOrderFingerprints[logicalPath],
      orderedEntriesSha256: orderedEntriesFingerprints[logicalPath],
      shards: storageShards,
    }
    const formattedManifest = biomeFormat(manifestValue, logicalPath.split('/').pop(), context)
    validateFormattedOutput(formattedManifest, manifestValue, 'manifest', logicalPath)
    outputs.push({ kind: 'manifest', path: logicalPath, bytes: formattedManifest })

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

  return {
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

// C01: closed complete-group publish
// Binds to expected source snapshot, validates safe paths + owned root, stages in
// owned temp dir, rechecks inputs under exclusive lock, reloads 599+9edges before
// final atomic rename into target. No foreign overwrite or unknown generation reuse.
export function publishReviewStorageGroup(prepared, targetRoot, options = {}) {
  demand(prepared?.outputs && prepared.outputs.length > 0, 'prepared outputs required')
  demand(prepared.expectedSourceSnapshot, 'expected source snapshot required (C01)')
  const base = resolve(targetRoot)
  const sourceReader = options.sourceReadBuffer
  demand(typeof sourceReader === 'function', 'source readBuffer required for input recheck (C01)')
  // C02: pure-fixture prepared results cannot claim Git-verified provenance
  demand(
    prepared.provenance !== undefined,
    'prepared result must declare provenance (git-verified or pure-fixture)',
  )

  // C01: validate all output paths are safe and within the owned target root
  const targetFiles = new Set()
  for (const output of prepared.outputs) {
    demand(
      typeof output.path === 'string' && output.path.startsWith(`${reviewDirRelative}/`),
      `output path outside review directory: ${output.path}`,
    )
    const segments = output.path.split('/')
    demand(
      !segments.some((s) => s === '' || s === '.' || s === '..'),
      `unsafe output path: ${output.path}`,
    )
    demand(
      output.bytes !== undefined && output.bytes.length > 0,
      `empty output bytes: ${output.path}`,
    )
    demand(!targetFiles.has(output.path), `duplicate output path: ${output.path}`)
    targetFiles.add(output.path)
  }

  // C01: recheck all expected source inputs still match the prepare snapshot
  for (const [path, expectedSha] of Object.entries(prepared.expectedSourceSnapshot)) {
    const current = sourceReader(path)
    demand(current !== undefined, `source went missing during prepare→publish: ${path}`)
    demand(digest(current) === expectedSha, `source changed during prepare→publish: ${path}`)
  }

  // C01: validate all parent directories are ordinary directories (not symlinks)
  const targetReviewDir = join(base, reviewDirRelative)
  mkdirSync(targetReviewDir, { recursive: true })
  const targetShardsDir = join(targetReviewDir, 'shards')
  if (statIfExists(targetShardsDir)) {
    demand(
      statSync(targetShardsDir).isDirectory() && !statSync(targetShardsDir).isSymbolicLink(),
      'target shards/ exists but is not an ordinary directory',
    )
    for (const stem of new Set(
      prepared.outputs.filter((o) => o.kind === 'shard').map((o) => o.path.split('/')[4]),
    )) {
      const stemDir = join(targetShardsDir, stem)
      if (statIfExists(stemDir))
        demand(statSync(stemDir).isDirectory(), `target stem dir not ordinary: ${stem}`)
    }
  }
  // C01: verify target manifest/R92/R94 absent or byte-identical to expected outputs
  for (const output of prepared.outputs) {
    if (output.kind === 'shard') continue
    const targetPath = join(base, output.path)
    if (statIfExists(targetPath)) {
      const existing = readFileSync(targetPath)
      demand(existing.equals(output.bytes), `target already has different bytes: ${output.path}`)
    }
  }

  // C01: stage in owned temp directory
  const stagingDir = mkdtempSync(join(tmpdir(), 'rrs-publish-'))
  const lockPath = join(targetReviewDir, '.storage.lock')

  // C01: exclusive lock then full recheck
  try {
    writeFileSync(lockPath, `${new Date().toISOString()}\n`, { flag: 'wx' })
  } catch (error) {
    rmSync(stagingDir, { recursive: true, force: true })
    if (error.code === 'EEXIST')
      throw new Error('review-record-storage-writer: publication lock already present')
    throw error
  }

  try {
    // recheck sources under lock
    for (const [path, expectedSha] of Object.entries(prepared.expectedSourceSnapshot)) {
      const current = sourceReader(path)
      demand(current !== undefined, `source went missing under lock: ${path}`)
      demand(digest(current) === expectedSha, `source changed under lock: ${path}`)
    }
    // stage all outputs to the owned temp dir
    for (const output of prepared.outputs) {
      const staged = join(stagingDir, output.path)
      mkdirSync(dirname(staged), { recursive: true })
      writeFileSync(staged, output.bytes)
      demand(
        digest(readFileSync(staged)) === digest(output.bytes),
        `staged output drift: ${output.path}`,
      )
    }
    // C01: reload-verify 599 entries + 9 edges + artifact set from the staged tree
    const reloadCheck = verifyStagedGroup(stagingDir, prepared)
    demand(
      reloadCheck.totalEntries === FROZEN_REVIEW_STORAGE_TOTAL,
      `reload found ${reloadCheck.totalEntries} entries != 599`,
    )
    demand(reloadCheck.edgeCount === 9, `reload found ${reloadCheck.edgeCount} edges != 9`)

    // C01: check no unknown generation directories / foreign content in target shards root
    for (const output of prepared.outputs) {
      if (output.kind !== 'shard') continue
      const stem = output.path.split('/')[4]
      const generation = output.path.split('/')[5]
      const shardsRoot = join(base, reviewDirRelative, 'shards', stem)
      const genDir = join(shardsRoot, generation)
      if (statIfExists(genDir)) {
        // immutable generation reuse: only if every file is byte-identical to what we'd write
        for (const name of readdirSync(genDir)) {
          const existing = readFileSync(join(genDir, name))
          const staged = readFileSync(
            join(stagingDir, reviewDirRelative, 'shards', stem, generation, name),
          )
          demand(
            existing.equals(staged),
            `immutable generation has foreign bytes: ${stem}/${generation}/${name}`,
          )
        }
      } else if (statIfExists(shardsRoot)) {
        for (const name of readdirSync(shardsRoot)) {
          if (name !== generation) {
            demand(false, `unknown generation directory: ${stem}/${name} (expected ${generation})`)
          }
        }
      }
    }

    // final placement from staging into target
    for (const output of prepared.outputs) {
      const staged = join(stagingDir, output.path)
      const target = join(base, output.path)
      mkdirSync(dirname(target), { recursive: true })
      renameSync(staged, target)
      demand(
        digest(readFileSync(target)) === digest(output.bytes),
        `final placement drift: ${output.path}`,
      )
    }
  } catch (error) {
    // C01: leave lock AND staging in place on failure — recovery materials preserved
    throw new Error(
      `review-record-storage-writer: publish failed (lock+staging preserved at ${stagingDir}): ${error.message}`,
    )
  }

  // C01: post-publish full group verification
  const postCheck = verifyStagedGroup(base, prepared)
  demand(postCheck.totalEntries === FROZEN_REVIEW_STORAGE_TOTAL, 'post-publish 599 check failed')
  demand(postCheck.edgeCount === 9, 'post-publish 9-edge check failed')

  rmSync(lockPath)
  rmSync(stagingDir, { recursive: true, force: true })
  return {
    written: prepared.outputs.length,
    lockReleased: true,
    totalEntries: postCheck.totalEntries,
    edgeCount: postCheck.edgeCount,
  }
}

function verifyStagedGroup(treeRoot, prepared) {
  let totalEntries = 0
  let edgeCount = 0
  const treeReadBuffer = (p) => {
    try {
      return readFileSync(join(treeRoot, p))
    } catch {
      return undefined
    }
  }
  for (const output of prepared.outputs) {
    if (output.kind === 'manifest') {
      const { record } = materializeReviewRecord(output.path, { readBuffer: treeReadBuffer })
      totalEntries += record.entries.length
    }
    if (output.path.includes('r92-phase-governance')) {
      const r92 = parseTerminalJson(readFileSync(join(treeRoot, output.path)))
      for (const idx of [4, 5, 6, 7, 16, 17, 18, 19]) {
        const target = r92.entries[idx].path
        const targetSha = digest(readFileSync(join(treeRoot, target)))
        demand(r92.entries[idx].afterSha256 === targetSha, `R92 edge ${idx} not refreshed`)
        edgeCount++
      }
    }
    if (output.path.includes('r94-final-machine')) {
      const r94 = parseTerminalJson(readFileSync(join(treeRoot, output.path)))
      const r92Sha = digest(
        readFileSync(
          join(treeRoot, `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`),
        ),
      )
      demand(r94.entries[6].afterSha256 === r92Sha, 'R94[6] edge not refreshed')
      edgeCount++
    }
  }
  return { totalEntries, edgeCount }
}

function statIfExists(path) {
  try {
    return statSync(path)
  } catch {
    return null
  }
}
