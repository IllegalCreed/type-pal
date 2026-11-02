// review-record-storage.mjs — review-record-storage/1.0.0 loader core.
// C03: descriptor SHA enforcement, exact field/path/generation binding, size caps,
// entry uniqueness, ordinary-file/parent checks, snapshot+lock before/after every path,
// flat and Git-flat first-class support, orphan/unknown/missing detection.
import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export const reviewStorageContractId = 'review-record-storage/1.0.0'
export const reviewStorageMarker = '_reviewStorage'
export const reviewDirRelative = 'docs/phase-governance/reviews'
export const reviewStorageShardCap = 524_288
export const reviewStorageFlatCap = 1_048_576

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
  ].map(([name, count]) =>
    Object.freeze({
      path: `${reviewDirRelative}/${name}`,
      entryCount: count,
    }),
  ),
)
export const FROZEN_REVIEW_STORAGE_TOTAL = 599
export const FROZEN_REVIEW_SOURCE_REVISION = '8cbf0dafba1a8a96914a322719dfeca1e5d58873'

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
  demand(buffer.length <= reviewStorageShardCap, `manifest exceeds 512 KiB: ${logicalPath}`)
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
      descriptor.path === `${expectedPrefix}${descriptor.key}.json`,
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

// A loadedSource is only a handle to this read's saved bytes, never a caller-supplied
// assertion that files were validated. Writers must recheck the handle before writing.
const sourceChecks = new WeakMap()
const identity = (stat) => ({
  dev: stat.dev,
  ino: stat.ino,
  mode: stat.mode,
  size: stat.size,
  mtime: stat.mtimeMs,
  ctime: stat.ctimeMs,
})
function checkLock(root) {
  try {
    lstatSync(join(root, reviewDirRelative, '.storage.lock'))
    throw new Error(
      'review-record-storage: publication lock present; refusing half-published group',
    )
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
function relativeReviewPath(path) {
  demand(
    typeof path === 'string' &&
      path.startsWith(`${reviewDirRelative}/`) &&
      !path.includes('\\') &&
      !path.includes(':') &&
      !path.split('/').some((p) => !p || p === '.' || p === '..'),
    `unsafe review path: ${path}`,
  )
}
function worktreeSnapshot(root) {
  const files = new Map(),
    directories = new Map(),
    listings = new Map()
  const parents = (path) => {
    relativeReviewPath(path)
    const parts = path.split('/')
    for (let i = 0; i < parts.length; i++) {
      const dir = join(root, ...parts.slice(0, i))
      const stat = lstatSync(dir)
      demand(
        stat.isDirectory() && !stat.isSymbolicLink(),
        `parent not an ordinary directory: ${dir}`,
      )
      const state = { dev: stat.dev, ino: stat.ino, mode: stat.mode }
      if (directories.has(dir))
        demand(isDeepStrictEqual(directories.get(dir), state), `parent changed: ${dir}`)
      else directories.set(dir, state)
    }
  }
  const readBuffer = (path) => {
    if (files.has(path)) return files.get(path).buffer
    parents(path)
    const absolute = join(root, path),
      before = lstatSync(absolute)
    demand(before.isFile(), `not an ordinary file: ${path}`)
    demand(before.size <= reviewStorageFlatCap, `review input exceeds 1 MiB: ${path}`)
    const buffer = readFileSync(absolute),
      after = lstatSync(absolute)
    demand(
      isDeepStrictEqual(identity(before), identity(after)),
      `file changed during read: ${path}`,
    )
    files.set(path, { buffer, identity: identity(after) })
    return buffer
  }
  const list = (path) => {
    relativeReviewPath(`${path}/placeholder`)
    parents(`${path}/placeholder`)
    const names = readdirSync(join(root, path)).sort()
    if (listings.has(path))
      demand(isDeepStrictEqual(listings.get(path), names), `directory inventory changed: ${path}`)
    listings.set(path, names)
    return names
  }
  const assertUnchanged = () => {
    checkLock(root)
    for (const [path, state] of directories) {
      const stat = lstatSync(path)
      demand(
        stat.isDirectory() &&
          !stat.isSymbolicLink() &&
          isDeepStrictEqual(state, { dev: stat.dev, ino: stat.ino, mode: stat.mode }),
        `parent changed: ${path}`,
      )
    }
    for (const [path, saved] of files) {
      parents(path)
      const stat = lstatSync(join(root, path))
      demand(
        stat.isFile() &&
          isDeepStrictEqual(saved.identity, identity(stat)) &&
          saved.buffer.equals(readFileSync(join(root, path))),
        `input bytes or identity changed during read: ${path}`,
      )
    }
    for (const [path, names] of listings)
      demand(
        isDeepStrictEqual(names, readdirSync(join(root, path)).sort()),
        `directory inventory changed: ${path}`,
      )
    checkLock(root)
  }
  return { files, readBuffer, list, assertUnchanged }
}
function verifyOriginalSource(storage, readSourceSnapshot) {
  const pin = storage.source
  if (FROZEN_REVIEW_STORAGE_SOURCES.some((source) => source.path === pin.path))
    demand(
      pin.revision === FROZEN_REVIEW_SOURCE_REVISION,
      `original Git source revision changed: ${pin.path}`,
    )
  const original = readSourceSnapshot(pin)
  demand(
    original?.mode === '100644' &&
      original.revision === pin.revision &&
      original.path === pin.path &&
      original.gitObject === pin.gitObject &&
      Buffer.isBuffer(original.buffer) &&
      digest(original.buffer) === pin.sha256 &&
      createHash('sha1')
        .update(Buffer.from(`blob ${original.buffer.length}\0`))
        .update(original.buffer)
        .digest('hex') === pin.gitObject,
    `original Git source pin mismatch: ${pin.path}`,
  )
  const flat = parseTerminalJson(original.buffer)
  demand(
    isObject(flat) && Array.isArray(flat.entries) && !Object.hasOwn(flat, reviewStorageMarker),
    `original Git source must be a flat review: ${pin.path}`,
  )
}

/** Read the complete logical group once; snapshots include inventory and all raw bytes. */
export function loadReviewRecords({
  root,
  readSourceSnapshot = (pin) => readGitDocumentSnapshot(root, pin),
  logicalPaths,
}) {
  const base = resolve(root)
  checkLock(base)
  const snapshot = worktreeSnapshot(base)
  const selected =
    logicalPaths ??
    snapshot
      .list(reviewDirRelative)
      .filter((name) => name.endsWith('.json'))
      .map((name) => `${reviewDirRelative}/${name}`)
  const names = new Set(selected)
  const shardsRoot = `${reviewDirRelative}/shards`
  // Physical stems are navigation only: each must resolve to a validated manifest,
  // never an artifact classification inferred from the directory name.
  try {
    const stat = lstatSync(join(base, shardsRoot))
    demand(stat.isDirectory() && !stat.isSymbolicLink(), 'shards root not an ordinary directory')
    for (const stem of snapshot.list(shardsRoot)) {
      const owner = `${reviewDirRelative}/${stem}.json`
      try {
        demand(lstatSync(join(base, owner)).isFile(), `unknown or nonordinary shard owner: ${stem}`)
      } catch (error) {
        if (error.code === 'ENOENT')
          throw new Error(`review-record-storage: unknown shard stem: ${stem}`)
        throw error
      }
      names.add(owner)
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const records = new Map(),
    storages = new Map(),
    artifacts = [],
    expectedShards = new Map()
  for (const logicalPath of names) {
    const raw = snapshot.readBuffer(logicalPath),
      parsed = parseTerminalJson(raw)
    demand(isObject(parsed), `review is not an object: ${logicalPath}`)
    if (!Object.hasOwn(parsed, reviewStorageMarker)) {
      demand(
        raw.length <= reviewStorageFlatCap && Array.isArray(parsed.entries),
        `unsupported flat review: ${logicalPath}`,
      )
      records.set(logicalPath, parsed)
      storages.set(logicalPath, null)
      continue
    }
    const { record, storage } = materializeReviewRecord(logicalPath, snapshot)
    verifyOriginalSource(storage, readSourceSnapshot)
    records.set(logicalPath, record)
    storages.set(logicalPath, storage)
    for (const descriptor of storage.shards) {
      const path = `${reviewDirRelative}/${descriptor.path}`
      demand(!expectedShards.has(path), `shard has multiple owners: ${path}`)
      const bytes = snapshot.readBuffer(path),
        shard = parseTerminalJson(bytes)
      expectedShards.set(path, descriptor)
      artifacts.push(
        Object.freeze({
          path,
          kind: 'review-storage-artifact',
          owner: 'Codex',
          producer: reviewStorageContractId,
          caller: logicalPath,
          source: Object.freeze({ ...storage.source }),
          generation: storage.logicalSha256,
          sha256: digest(bytes),
          bytes: bytes.length,
          positions: Object.freeze([...shard.positions]),
          credit: 0,
        }),
      )
    }
  }
  const physical = new Set()
  try {
    const stat = lstatSync(join(base, shardsRoot))
    demand(stat.isDirectory() && !stat.isSymbolicLink(), 'shards root not an ordinary directory')
    for (const stem of snapshot.list(shardsRoot)) {
      const stemPath = `${shardsRoot}/${stem}`
      demand(
        [...expectedShards.keys()].some((path) => path.startsWith(`${stemPath}/`)),
        `unknown shard stem: ${stem}`,
      )
      for (const generation of snapshot.list(stemPath)) {
        const generationPath = `${stemPath}/${generation}`
        demand(
          [...expectedShards.keys()].some((path) => path.startsWith(`${generationPath}/`)),
          `unknown shard generation: ${generationPath}`,
        )
        for (const name of snapshot.list(generationPath)) {
          const path = `${generationPath}/${name}`
          demand(expectedShards.has(path), `orphan shard: ${path}`)
          snapshot.readBuffer(path)
          physical.add(path)
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT' || expectedShards.size) throw error
  }
  demand(physical.size === expectedShards.size, 'missing physical shards')
  snapshot.assertUnchanged()
  const loadedSource = Object.freeze({
    files: Object.freeze(
      [...snapshot.files].map(([path, saved]) =>
        Object.freeze({ path, sha256: digest(saved.buffer) }),
      ),
    ),
    artifactSet: Object.freeze(artifacts),
  })
  sourceChecks.set(loadedSource, snapshot.assertUnchanged)
  return { records, storages, loadedSource }
}

export function assertReviewRecordSourceUnchanged(loadedSource) {
  const check = sourceChecks.get(loadedSource)
  demand(check, 'loadedSource is not an actual protected read snapshot')
  check()
}

export function loadReviewRecord({ root, logicalPath, readSourceSnapshot }) {
  const group = loadReviewRecords({ root, readSourceSnapshot, logicalPaths: [logicalPath] })
  demand(group.records.has(logicalPath), `logical review missing: ${logicalPath}`)
  const storage = group.storages.get(logicalPath)
  const paths = new Set([
    logicalPath,
    ...(storage?.shards ?? []).map((d) => `${reviewDirRelative}/${d.path}`),
  ])
  const loadedSource = Object.freeze({
    manifestPath: join(resolve(root), logicalPath),
    files: Object.freeze(group.loadedSource.files.filter((file) => paths.has(file.path))),
    artifactSet: group.loadedSource.artifactSet,
  })
  sourceChecks.set(loadedSource, () => assertReviewRecordSourceUnchanged(group.loadedSource))
  return { record: group.records.get(logicalPath), storage, loadedSource }
}

/** Pure flat-or-manifest helper, deliberately without a worktree/Git fallback. */
export function readReviewRecordObject(logicalPath, { readBuffer } = {}) {
  demand(typeof readBuffer === 'function', 'readBuffer provider required')
  const bytes = readBuffer(logicalPath)
  demand(bytes !== undefined && bytes !== null, `review missing: ${logicalPath}`)
  const parsed = parseTerminalJson(bytes)
  demand(isObject(parsed), `review is not an object: ${logicalPath}`)
  if (!Object.hasOwn(parsed, reviewStorageMarker)) {
    demand(
      bytes.length <= reviewStorageFlatCap && Array.isArray(parsed.entries),
      `unsupported flat review: ${logicalPath}`,
    )
    return parsed
  }
  return materializeReviewRecord(logicalPath, { readBuffer }).record
}

export function loadReviewRecordFromGit({
  root,
  revision,
  logicalPath,
  readSourceSnapshot = (pin) => readGitDocumentSnapshot(root, pin),
}) {
  demand(/^[a-f\d]{40}$/.test(revision ?? ''), 'revision must be a full 40-hex commit')
  const readBuffer = (path) => {
    const snap = readGitDocumentSnapshot(root, { revision, path })
    demand(snap?.mode === '100644', `Git review missing at ${revision}: ${path}`)
    return snap.buffer
  }
  const raw = readBuffer(logicalPath)
  const parsed = parseTerminalJson(raw)
  demand(isObject(parsed), `Git review is not an object: ${logicalPath}`)
  if (!Object.hasOwn(parsed, reviewStorageMarker)) {
    demand(
      raw.length <= reviewStorageFlatCap && Array.isArray(parsed.entries),
      `unsupported Git-flat shape: ${logicalPath}`,
    )
    return { record: parsed, storage: null }
  }
  const result = materializeReviewRecord(logicalPath, { readBuffer })
  verifyOriginalSource(result.storage, readSourceSnapshot)
  return { record: result.record, storage: result.storage }
}
