// review-record-storage.mjs — review-record-storage/1.0.0 loader core.
// C03: descriptor SHA enforcement, exact field/path/generation binding, size caps,
// entry uniqueness, ordinary-file/parent checks, snapshot+lock before/after every path,
// flat and Git-flat first-class support, orphan/unknown/missing detection.
import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export const reviewStorageContractId = 'review-record-storage/1.0.0'
export const reviewStorageMarker = '_reviewStorage'
export const reviewDirRelative = 'docs/phase-governance/reviews'
export const reviewStorageShardCap = 524_288
export const reviewStorageFlatCap = 1_048_576

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-storage: ${message}`)
}
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const canonicalEntryFingerprint = (entries) =>
  digest(Buffer.from(`[${entries.map((e) => JSON.stringify(e)).join(',')}]`))
const canonicalOrderFingerprint = (entries) =>
  digest(Buffer.from(`[${entries.map((e) => JSON.stringify(e.path)).join(',')}]`))

// C02: reject -0 and other lossy values before any format/write attempt
export function hasLossyJsonValue(value, seen = new WeakSet()) {
  if (typeof value === 'number') return Object.is(value, -0) || !Number.isFinite(value)
  if (
    typeof value === 'bigint' ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    value === undefined
  )
    return true
  if (value === null || typeof value !== 'object') return false
  if (seen.has(value)) return false
  seen.add(value)
  if (Array.isArray(value)) return value.some((v) => hasLossyJsonValue(v, seen))
  return Object.values(value).some((v) => hasLossyJsonValue(v, seen))
}

// ---------- manifest shape validation (C03: exact fields + order + binding) ----------
const MANIFEST_STORAGE_KEYS = [
  'schemaVersion',
  'producer',
  'logicalPath',
  'logicalKeys',
  'source',
  'logicalSha256',
  'totalEntries',
  'entryOrderSha256',
  'orderedEntriesSha256',
  'shards',
]
const SHARD_DESCRIPTOR_KEYS = ['key', 'path', 'total', 'sha256']

function validateManifestShape(buffer, logicalPath) {
  let manifest
  try {
    manifest = parseTerminalJson(buffer)
  } catch (error) {
    throw new Error(`manifest is not strict JSON (${error.message}): ${logicalPath}`)
  }
  demand(isObject(manifest), `manifest is not an object: ${logicalPath}`)
  demand(
    Object.hasOwn(manifest, reviewStorageMarker),
    `legacy flat record without ${reviewStorageMarker}: ${logicalPath}`,
  )
  const storage = manifest[reviewStorageMarker]
  demand(isObject(storage), `${reviewStorageMarker} is not an object: ${logicalPath}`)
  demand(storage.producer === reviewStorageContractId, `unknown producer: ${storage.producer}`)
  demand(
    storage.schemaVersion === 1,
    `unsupported manifest schemaVersion: ${storage.schemaVersion}`,
  )
  demand(
    storage.logicalPath === logicalPath,
    `manifest logicalPath mismatch: ${storage.logicalPath}`,
  )
  const storageKeys = Object.keys(storage)
  demand(
    JSON.stringify(storageKeys) === JSON.stringify(MANIFEST_STORAGE_KEYS),
    `manifest storage keys differ from frozen contract: got [${storageKeys}] expected [${MANIFEST_STORAGE_KEYS}]`,
  )
  demand(
    Array.isArray(storage.logicalKeys) && storage.logicalKeys.length > 0,
    'logicalKeys missing',
  )
  demand(
    !storage.logicalKeys.includes(reviewStorageMarker),
    'logicalKeys must not include the storage marker',
  )
  demand(
    storage.logicalKeys.includes('entries'),
    'logicalKeys must record the original entries position',
  )
  // manifest top-level: original keys minus entries plus marker at end
  const manifestTopKeys = Object.keys(manifest)
  const expectedTopKeys = [
    ...storage.logicalKeys.filter((k) => k !== 'entries'),
    reviewStorageMarker,
  ]
  demand(
    JSON.stringify(manifestTopKeys) === JSON.stringify(expectedTopKeys),
    `manifest top-level keys [${manifestTopKeys}] differ from expected [${expectedTopKeys}]`,
  )
  const source = storage.source
  demand(
    isObject(source) &&
      Object.keys(source).length === 4 &&
      Object.keys(source).every((k) => ['revision', 'path', 'gitObject', 'sha256'].includes(k)) &&
      /^[a-f\d]{40}$/.test(source.revision ?? '') &&
      source.path === logicalPath &&
      /^[a-f\d]{40}$/.test(source.gitObject ?? '') &&
      /^[a-f\d]{64}$/.test(source.sha256 ?? ''),
    'source pin must have exactly 4 keys (revision/path/gitObject/sha256) with valid values',
  )
  demand(
    Number.isSafeInteger(storage.totalEntries) && storage.totalEntries >= 0,
    'totalEntries invalid',
  )
  demand(/^[a-f\d]{64}$/.test(storage.entryOrderSha256 ?? ''), 'entryOrderSha256 invalid')
  demand(/^[a-f\d]{64}$/.test(storage.orderedEntriesSha256 ?? ''), 'orderedEntriesSha256 invalid')
  demand(/^[a-f\d]{64}$/.test(storage.logicalSha256 ?? ''), 'logicalSha256 invalid')
  demand(Array.isArray(storage.shards) && storage.shards.length > 0, 'shards missing')
  const seenKeys = new Set()
  const seenPaths = new Set()
  const entryPaths = new Set()
  let totals = 0
  const stem = logicalPath
    .split('/')
    .pop()
    .replace(/\.json$/, '')
  for (const descriptor of storage.shards) {
    demand(isObject(descriptor), 'shard descriptor must be an object')
    const dKeys = Object.keys(descriptor)
    demand(
      JSON.stringify(dKeys) === JSON.stringify(SHARD_DESCRIPTOR_KEYS),
      `shard descriptor keys differ from frozen contract: got [${dKeys}]`,
    )
    demand(/^part-\d{3}$/.test(descriptor.key ?? ''), `invalid shard key: ${descriptor.key}`)
    demand(!seenKeys.has(descriptor.key), `duplicate shard key: ${descriptor.key}`)
    seenKeys.add(descriptor.key)
    demand(typeof descriptor.path === 'string', 'shard path must be a string')
    const expectedPrefix = `shards/${stem}/${storage.logicalSha256}/`
    demand(
      descriptor.path.startsWith(expectedPrefix) &&
        descriptor.path.endsWith('.json') &&
        descriptor.path.slice(expectedPrefix.length, -5).length > 0,
      `shard path outside its own generation: ${descriptor.path}`,
    )
    demand(
      !descriptor.path.includes('\\') &&
        !descriptor.path.split('').some((ch) => ch.charCodeAt(0) < 32 || ch === ':'),
      `illegal characters in shard path: ${descriptor.path}`,
    )
    const segments = descriptor.path.split('/')
    demand(
      !segments.some((s) => s === '' || s === '.' || s === '..'),
      `empty/dot segment: ${descriptor.path}`,
    )
    demand(!seenPaths.has(descriptor.path), `duplicate shard path: ${descriptor.path}`)
    seenPaths.add(descriptor.path)
    demand(
      Number.isSafeInteger(descriptor.total) && descriptor.total >= 0,
      `invalid shard total: ${descriptor.key}`,
    )
    demand(
      /^[a-f\d]{64}$/.test(descriptor.sha256 ?? ''),
      `invalid descriptor SHA: ${descriptor.key}`,
    )
    totals += descriptor.total
  }
  demand(
    totals === storage.totalEntries,
    `shard totals ${totals} != totalEntries ${storage.totalEntries}`,
  )
  return { manifest, storage, entryPaths }
}

function readShard(buffer, descriptor, logicalPath, generation) {
  demand(
    typeof buffer?.equals === 'function' && buffer.length > 0,
    `shard missing or empty: ${descriptor.path}`,
  )
  demand(digest(buffer) === descriptor.sha256, `shard SHA drift: ${descriptor.path}`)
  demand(
    buffer.length <= reviewStorageShardCap,
    `shard exceeds 512 KiB cap: ${descriptor.path} (${buffer.length})`,
  )
  let shard
  try {
    shard = parseTerminalJson(buffer)
  } catch (error) {
    throw new Error(`shard is not strict JSON (${error.message}): ${descriptor.path}`)
  }
  demand(isObject(shard), `shard is not an object: ${descriptor.path}`)
  const expectedShardKeys = [
    'schemaVersion',
    'logicalPath',
    'generation',
    'key',
    'positions',
    'entries',
  ]
  const sKeys = Object.keys(shard)
  demand(
    JSON.stringify(sKeys) === JSON.stringify(expectedShardKeys),
    `shard keys differ from frozen contract: got [${sKeys}] expected [${expectedShardKeys}]`,
  )
  demand(shard.schemaVersion === 1, `shard schemaVersion: ${descriptor.path}`)
  demand(shard.logicalPath === logicalPath, `shard logicalPath mismatch: ${descriptor.path}`)
  demand(shard.generation === generation, `shard generation mismatch: ${descriptor.path}`)
  demand(shard.key === descriptor.key, `shard key mismatch: ${descriptor.path}`)
  demand(
    Array.isArray(shard.positions) && Array.isArray(shard.entries),
    `shard arrays missing: ${descriptor.path}`,
  )
  demand(
    shard.positions.length === shard.entries.length,
    `positions/entries length mismatch: ${descriptor.path}`,
  )
  demand(shard.entries.length === descriptor.total, `descriptor total mismatch: ${descriptor.key}`)
  return shard
}

/** Pure materialization over a readBuffer provider. Returns the complete logical record. */
export function materializeReviewRecord(logicalPath, context = {}) {
  const readBuffer = context.readBuffer
  demand(typeof readBuffer === 'function', 'readBuffer provider required')
  demand(
    typeof logicalPath === 'string' &&
      logicalPath.startsWith(`${reviewDirRelative}/`) &&
      logicalPath.endsWith('.json') &&
      !logicalPath.split('/').some((s) => s === '..' || s === ''),
    `not a review logical path: ${logicalPath}`,
  )
  const buffer = readBuffer(logicalPath)
  demand(buffer !== undefined && buffer !== null, `manifest missing: ${logicalPath}`)
  const { manifest, storage, entryPaths } = validateManifestShape(buffer, logicalPath)
  const generation = storage.logicalSha256
  const entries = new Array(storage.totalEntries)
  const positionSeen = new Set()
  for (const descriptor of storage.shards) {
    const shardBuffer = readBuffer(`${reviewDirRelative}/${descriptor.path}`)
    const shard = readShard(shardBuffer, descriptor, logicalPath, generation)
    shard.entries.forEach((entry, i) => {
      const position = shard.positions[i]
      demand(
        Number.isSafeInteger(position) && position >= 0 && position < storage.totalEntries,
        `position out of range: ${descriptor.path}`,
      )
      demand(!positionSeen.has(position), `duplicate position ${position}`)
      positionSeen.add(position)
      demand(
        isObject(entry) && typeof entry.path === 'string' && entry.path.length > 0,
        `entry not an object with path: ${descriptor.path}`,
      )
      demand(!entryPaths.has(entry.path), `duplicate entry path across shards: ${entry.path}`)
      entryPaths.add(entry.path)
      entries[position] = entry
    })
  }
  demand(positionSeen.size === storage.totalEntries, 'missing global positions')
  demand(
    canonicalEntryFingerprint(entries) === storage.orderedEntriesSha256,
    'materialized entries fingerprint mismatch',
  )
  demand(
    canonicalOrderFingerprint(entries) === storage.entryOrderSha256,
    'entry order fingerprint mismatch',
  )
  const record = {}
  for (const key of storage.logicalKeys) {
    if (key === 'entries') {
      record.entries = entries
      continue
    }
    demand(Object.hasOwn(manifest, key), `manifest lost logical key: ${key}`)
    record[key] = manifest[key]
  }
  demand(Array.isArray(record.entries), 'entries not restored at its logical position')
  demand(
    JSON.stringify(Object.keys(record)) === JSON.stringify(storage.logicalKeys),
    'materialized key order differs from logicalKeys',
  )
  demand(
    digest(Buffer.from(JSON.stringify(record))) === generation,
    'materialized logical fingerprint != generation',
  )
  return { record, storage, manifest, entryPaths }
}

// C03: descriptor-to-physical reconciliation with orphan detection
export function reconcileShardDirectories(logicalPath, storage, context = {}) {
  const listDir = context.readdir ?? ((p) => readdirSync(p))
  const lstat = context.lstat ?? ((p) => lstatSync(p))
  const resolveFn = context.resolve ?? ((p) => resolve(p))
  const stem = logicalPath
    .split('/')
    .pop()
    .replace(/\.json$/, '')
  const shardsRoot = resolveFn(`${reviewDirRelative}/shards/${stem}`)
  const described = new Set(storage.shards.map((s) => s.path.split('/').pop()))
  const artifacts = []
  const issues = []
  if (listDirSafe(shardsRoot, lstat)) {
    for (const generation of listDir(shardsRoot)) {
      const genDir = join(shardsRoot, generation)
      if (!lstat(genDir).isDirectory()) {
        issues.push(`non-directory in shard root: ${generation}`)
        continue
      }
      if (generation === storage.logicalSha256) {
        for (const name of listDir(genDir)) {
          if (!described.has(name)) issues.push(`orphan shard: ${stem}/${generation}/${name}`)
          else
            artifacts.push({
              path: `shards/${stem}/${generation}/${name}`,
              owner: logicalPath,
              generation,
            })
        }
        for (const name of described) {
          if (!listDir(genDir).includes(name))
            issues.push(`missing shard: ${stem}/${generation}/${name}`)
        }
      } else {
        issues.push(
          `unknown generation directory: ${stem}/${generation} (expected ${storage.logicalSha256})`,
        )
      }
    }
  }
  return { artifacts, issues }
}
function listDirSafe(path, lstat) {
  try {
    return lstat(path).isDirectory()
  } catch {
    return false
  }
}

// ---------- production worktree loader (C03: snapshot+lock before/after) ----------
function checkLock(lockPath) {
  try {
    lstatSync(lockPath)
    throw new Error(
      'review-record-storage: publication lock present; refusing to read a half-published group',
    )
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

export function loadReviewRecord({ root, logicalPath }) {
  const base = resolve(root)
  const absolute = (rel) => join(base, rel)
  const readBuffer = (rel) => {
    try {
      return readFileSync(absolute(rel))
    } catch (error) {
      if (error.code === 'ENOENT') return undefined
      throw error
    }
  }
  const lockPath = absolute(`${reviewDirRelative}/.storage.lock`)
  checkLock(lockPath)
  const inputSnapshot = snapshotPath(absolute(logicalPath))
  demand(inputSnapshot, `logical record is not an ordinary file: ${logicalPath}`)
  const raw = readBuffer(logicalPath)
  demand(raw !== undefined && raw !== null, `review missing: ${logicalPath}`)
  // C03: dispatch by parsed own key, not raw byte search; flat/Git-flat are first-class
  const parsed = parseTerminalJson(raw)
  demand(isObject(parsed), `review is not an object: ${logicalPath}`)
  if (!Object.hasOwn(parsed, reviewStorageMarker)) {
    demand(raw.length <= reviewStorageFlatCap, `flat review exceeds 1 MiB cap: ${logicalPath}`)
    const flat = parsed
    demand(
      isObject(flat) && Array.isArray(flat.entries),
      `unsupported flat review shape: ${logicalPath}`,
    )
    checkLock(lockPath)
    demand(
      JSON.stringify(snapshotPath(absolute(logicalPath))) === JSON.stringify(inputSnapshot),
      `flat review changed during read: ${logicalPath}`,
    )
    return {
      record: flat,
      storage: null,
      loadedSource: Object.freeze({
        manifestPath: absolute(logicalPath),
        files: Object.freeze([{ path: logicalPath, sha256: digest(raw) }]),
      }),
    }
  }
  // C03: materialize from the same readBuffer but also check every leaf is an ordinary file
  const { record, storage } = materializeReviewRecord(logicalPath, { readBuffer })
  // C03: loadedSource from the same materialization read — no second sampling pass
  const files = [{ path: logicalPath, sha256: digest(raw) }]
  for (const d of storage.shards) {
    const shardPath = `${reviewDirRelative}/${d.path}`
    const bytes = readBuffer(shardPath)
    demand(bytes !== undefined, `shard went missing during read: ${shardPath}`)
    // C03: every shard leaf must be an ordinary file (not symlink/dir)
    const leafStat = lstatSync(absolute(shardPath))
    demand(leafStat.isFile(), `shard is not an ordinary file: ${shardPath}`)
    files.push({ path: shardPath, sha256: digest(bytes) })
  }
  checkLock(lockPath)
  demand(
    JSON.stringify(snapshotPath(absolute(logicalPath))) === JSON.stringify(inputSnapshot),
    `manifest changed during read: ${logicalPath}`,
  )
  // C03: reconcile physical shard directories against descriptor set
  const { artifacts, issues: reconcileIssues } = reconcileShardDirectories(logicalPath, storage, {
    resolve: (p) => join(base, p),
  })
  if (reconcileIssues.length > 0) {
    throw new Error(
      `review-record-storage: shard reconciliation failed for ${logicalPath}: ${reconcileIssues.join('; ')}`,
    )
  }
  return {
    record,
    storage,
    loadedSource: Object.freeze({
      manifestPath: absolute(logicalPath),
      files: Object.freeze(files),
      artifactSet: Object.freeze(artifacts),
    }),
  }
}

function snapshotPath(path) {
  try {
    const stat = lstatSync(path)
    if (!stat.isFile()) return null
    return { isFile: true, size: stat.size, mtime: stat.mtimeMs }
  } catch {
    return null
  }
}

/** Flat-or-manifest tolerant helper: returns the complete logical record object. */
export function readReviewRecordObject(logicalPath, context = {}) {
  const readBuffer = context.readBuffer
  demand(typeof readBuffer === 'function', 'readBuffer provider required')
  const buffer = readBuffer(logicalPath)
  demand(buffer !== undefined && buffer !== null, `review missing: ${logicalPath}`)
  const parsed = parseTerminalJson(buffer)
  demand(isObject(parsed), `review not an object: ${logicalPath}`)
  if (Object.hasOwn(parsed, reviewStorageMarker)) {
    return materializeReviewRecord(logicalPath, { readBuffer }).record
  }
  demand(Array.isArray(parsed.entries), `unsupported review shape: ${logicalPath}`)
  return parsed
}

// ---------- Git loader (C03: same-revision, Git-flat first-class) ----------
export function loadReviewRecordFromGit({ root, revision, logicalPath }) {
  demand(/^[a-f\d]{40}$/.test(revision ?? ''), 'revision must be a full 40-hex commit')
  const readBuffer = (path) => {
    const snap = readGitDocumentSnapshot(root, { revision, path })
    return snap?.buffer
  }
  const raw = readBuffer(logicalPath)
  demand(raw !== undefined, `Git review missing at ${revision}: ${logicalPath}`)
  const parsed = parseTerminalJson(raw)
  demand(isObject(parsed), `Git review is not an object: ${logicalPath}`)
  if (!Object.hasOwn(parsed, reviewStorageMarker)) {
    // Git-flat: legacy flat records at a fixed revision are first-class
    demand(
      isObject(parsed) && Array.isArray(parsed.entries),
      `unsupported Git-flat shape: ${logicalPath}`,
    )
    return { record: parsed, storage: null }
  }
  const { record, storage } = materializeReviewRecord(logicalPath, { readBuffer })
  return { record, storage }
}
