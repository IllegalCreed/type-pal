// review-record-storage.mjs — review-record-storage/1.0.0 loader core.
// Pure materialization over a readBuffer provider, plus production worktree and Git loaders.
// Contract: docs/ops/tasks/DOCS-NATIVE-JSON-1.md#s28 (frozen 2026-10-22).

import { createHash } from 'node:crypto'
import { lstatSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export const reviewStorageContractId = 'review-record-storage/1.0.0'
export const reviewStorageMarker = '_reviewStorage'
export const reviewDirRelative = 'docs/phase-governance/reviews'
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-storage: ${message}`)
}
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const canonicalEntryFingerprint = (entries) =>
  digest(Buffer.from(`[${entries.map((entry) => JSON.stringify(entry)).join(',')}]`))
const canonicalOrderFingerprint = (entries) =>
  digest(Buffer.from(`[${entries.map((entry) => JSON.stringify(entry.path)).join(',')}]`))

// ---------- pure materialization ----------

function readManifestShape(buffer, logicalPath) {
  let manifest
  try {
    manifest = parseTerminalJson(buffer)
  } catch (error) {
    throw new Error(
      `review-record-storage: manifest is not strict JSON (${error.message}): ${logicalPath}`,
    )
  }
  demand(isObject(manifest), `manifest is not an object: ${logicalPath}`)
  demand(
    Object.hasOwn(manifest, reviewStorageMarker),
    `file is a legacy flat record without ${reviewStorageMarker}; use the flat object directly: ${logicalPath}`,
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
  demand(
    Array.isArray(storage.logicalKeys) && storage.logicalKeys.length > 0,
    'logicalKeys missing',
  )
  demand(
    !storage.logicalKeys.includes(reviewStorageMarker),
    'logicalKeys must not include the storage marker',
  )
  const index = storage.logicalKeys.indexOf('entries')
  demand(index !== -1, 'logicalKeys must record the original entries position')
  const source = storage.source
  demand(
    isObject(source) &&
      /^[a-f\d]{40}$/.test(source.revision ?? '') &&
      typeof source.path === 'string' &&
      source.path === logicalPath &&
      /^[a-f\d]{40}$/.test(source.gitObject ?? '') &&
      /^[a-f\d]{64}$/.test(source.sha256 ?? ''),
    'source pin must be the fixed flat Git carrier identity',
  )
  demand(
    Number.isSafeInteger(storage.totalEntries) && storage.totalEntries >= 0,
    'totalEntries invalid',
  )
  demand(/^[a-f\d]{64}$/.test(storage.entryOrderSha256 ?? ''), 'entryOrderSha256 invalid')
  demand(/^[a-f\d]{64}$/.test(storage.orderedEntriesSha256 ?? ''), 'orderedEntriesSha256 invalid')
  demand(Array.isArray(storage.shards) && storage.shards.length > 0, 'shards missing')
  const seenKeys = new Set()
  const seenPaths = new Set()
  const _positionMax = -1
  const _positionSeen = new Set()
  let totals = 0
  for (const descriptor of storage.shards) {
    demand(isObject(descriptor), 'shard descriptor must be an object')
    demand(
      typeof descriptor.key === 'string' && /^part-\d{3}$/.test(descriptor.key),
      `invalid shard key: ${descriptor.key}`,
    )
    demand(!seenKeys.has(descriptor.key), `duplicate shard key: ${descriptor.key}`)
    seenKeys.add(descriptor.key)
    demand(typeof descriptor.path === 'string', 'shard path must be a string')
    const expectedPrefix = `shards/${logicalPath
      .split('/')
      .pop()
      .replace(/\.json$/, '')}/${storage.logicalSha256}/`
    demand(
      descriptor.path.startsWith(expectedPrefix) && descriptor.path.endsWith('.json'),
      `shard path outside its own generation directory: ${descriptor.path}`,
    )
    demand(
      !descriptor.path.includes('\\') && !descriptor.path.split('').some((ch) => ch.charCodeAt(0) < 32 || ch === ':'),
      `illegal characters in shard path: ${descriptor.path}`,
    )
    const segments = descriptor.path.split('/')
    demand(
      !segments.includes('') && !segments.includes('.') && !segments.includes('..'),
      `empty/dot segment in shard path: ${descriptor.path}`,
    )
    demand(!seenPaths.has(descriptor.path), `duplicate shard path: ${descriptor.path}`)
    seenPaths.add(descriptor.path)
    demand(
      Number.isSafeInteger(descriptor.total) && descriptor.total >= 0,
      `invalid shard total: ${descriptor.key}`,
    )
    totals += descriptor.total
  }
  demand(
    totals === storage.totalEntries,
    `shard totals ${totals} != totalEntries ${storage.totalEntries}`,
  )
  return { manifest, storage, index }
}

function readShard(buffer, descriptor, logicalPath, generation) {
  let shard
  try {
    shard = parseTerminalJson(buffer)
  } catch (error) {
    throw new Error(`shard is not strict JSON (${error.message}): ${descriptor.path}`)
  }
  demand(isObject(shard), `shard is not an object: ${descriptor.path}`)
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

/** Materialize the complete logical record. readBuffer receives repo-relative paths. */
export function materializeReviewRecord(logicalPath, context = {}) {
  const readBuffer = context.readBuffer
  demand(typeof readBuffer === 'function', 'readBuffer provider required')
  demand(
    typeof logicalPath === 'string' &&
      logicalPath.startsWith(`${reviewDirRelative}/`) &&
      logicalPath.endsWith('.json'),
    `not a review logical path: ${logicalPath}`,
  )
  const buffer = readBuffer(logicalPath)
  demand(buffer !== undefined && buffer !== null, `manifest missing: ${logicalPath}`)
  const { manifest, storage } = readManifestShape(buffer, logicalPath)
  const generation = storage.logicalSha256
  demand(/^[a-f\d]{64}$/.test(generation ?? ''), 'logicalSha256 invalid')
  const entries = new Array(storage.totalEntries)
  const positionSeen = new Set()
  for (const descriptor of storage.shards) {
    const shardBuffer = readBuffer(`${reviewDirRelative}/${descriptor.path}`)
    demand(shardBuffer !== undefined && shardBuffer !== null, `shard missing: ${descriptor.path}`)
    const shard = readShard(shardBuffer, descriptor, logicalPath, generation)
    shard.entries.forEach((entry, i) => {
      const position = shard.positions[i]
      demand(
        Number.isSafeInteger(position) && position >= 0 && position < storage.totalEntries,
        `position out of range: ${descriptor.path}`,
      )
      demand(!positionSeen.has(position), `duplicate position ${position}`)
      positionSeen.add(position)
      entries[position] = entry
    })
  }
  demand(positionSeen.size === storage.totalEntries, 'missing global positions')
  const orderedFingerprint = canonicalEntryFingerprint(entries)
  demand(
    orderedFingerprint === storage.orderedEntriesSha256,
    `materialized entries fingerprint ${orderedFingerprint} != manifest ${storage.orderedEntriesSha256}`,
  )
  demand(
    canonicalOrderFingerprint(entries) === storage.entryOrderSha256,
    'materialized entry order fingerprint mismatch',
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
  const expectedKeys = [...storage.logicalKeys]
  demand(
    JSON.stringify(Object.keys(record)) === JSON.stringify(expectedKeys),
    'materialized key order differs from logicalKeys',
  )
  const logicalSha = digest(Buffer.from(JSON.stringify(record)))
  demand(
    logicalSha === generation,
    `materialized logical fingerprint ${logicalSha} != generation ${generation}`,
  )
  return { record, storage, manifest }
}

// ---------- production worktree loader ----------

export function loadReviewRecord({ root, logicalPath }) {
  const base = resolve(root)
  const absolute = (relative) => join(base, relative)
  const readBuffer = (relative) => {
    try {
      return readFileSync(absolute(relative))
    } catch (error) {
      if (error.code === 'ENOENT') return undefined
      throw error
    }
  }
  const lstat = (p) => lstatSync(p)
  const lockPath = absolute(`${reviewDirRelative}/.storage.lock`)
  try {
    lstat(lockPath)
    throw new Error(
      'review-record-storage: publication lock present; refusing to read a half-published group',
    )
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const stat = lstat(absolute(logicalPath))
  demand(stat.isFile(), `logical record is not an ordinary file: ${logicalPath}`)
  const raw = readBuffer(logicalPath)
  // Legacy flat records and not-yet-sharded current reviews are explicitly supported inputs.
  if (!raw.includes(Buffer.from(reviewStorageMarker))) {
    const flat = parseTerminalJson(raw)
    demand(
      isObject(flat) && Array.isArray(flat.entries),
      `unsupported flat review shape: ${logicalPath}`,
    )
    return {
      record: flat,
      loadedSource: Object.freeze({
        manifestPath: absolute(logicalPath),
        files: Object.freeze([{ path: logicalPath, sha256: digest(raw) }]),
      }),
    }
  }
  const { record, storage } = materializeReviewRecord(logicalPath, { readBuffer })
  const files = [logicalPath, ...storage.shards.map((d) => `${reviewDirRelative}/${d.path}`)].map(
    (path) => ({
      path,
      sha256: digest(readBuffer(path)),
    }),
  )
  try {
    lstat(lockPath)
    throw new Error('review-record-storage: publication lock appeared during read')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return {
    record,
    loadedSource: Object.freeze({
      manifestPath: absolute(logicalPath),
      files: Object.freeze(files),
    }),
  }
}

/** Flat-or-manifest tolerant helper for consumers: returns the complete logical record object. */
export function readReviewRecordObject(logicalPath, context = {}) {
  const readBuffer = context.readBuffer
  const buffer = readBuffer(logicalPath)
  demand(buffer !== undefined && buffer !== null, `review missing: ${logicalPath}`)
  if (buffer.includes(Buffer.from(reviewStorageMarker))) {
    return materializeReviewRecord(logicalPath, { readBuffer }).record
  }
  const flat = parseTerminalJson(buffer)
  demand(isObject(flat) && Array.isArray(flat.entries), `unsupported review shape: ${logicalPath}`)
  return flat
}

// ---------- Git loader ----------

export function loadReviewRecordFromGit({ root, revision, logicalPath }) {
  demand(/^[a-f\d]{40}$/.test(revision ?? ''), 'revision must be a full 40-hex commit')
  const readBuffer = (path) => readGitDocumentSnapshot(root, { revision, path })?.buffer
  const { record, storage } = materializeReviewRecord(logicalPath, { readBuffer })
  return { record, storage }
}
