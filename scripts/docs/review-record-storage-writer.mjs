// review-record-storage-writer.mjs — prepare/publish for review-record-storage/1.0.0.
// Pure prepare over readBuffer providers; publish targets an explicit output tree only.
// S28 never publishes into the repository: rehearsal trees only.
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseTerminalJson } from './terminal-json.mjs'
import { materializeReviewRecord, reviewDirRelative, reviewStorageMarker } from './review-record-storage.mjs'

const require = createRequire(import.meta.url)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const demand = (condition, message) => {
  if (!condition) throw new Error(`review-record-storage-writer: ${message}`)
}
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const biomeFormat = (value, path, context) => {
  const input = `${JSON.stringify(value, null, 2)}\n`
  demand(Buffer.byteLength(input) < 1_048_576, `unformatted file reaches 1 MiB: ${path}`)
  const run = context.format
    ? context.format(input, path)
    : execFileSync(
        process.execPath,
        [context.biomePath ?? require.resolve('@biomejs/biome/bin/biome'), 'format', '--stdin-file-path', path],
        { cwd: context.repoRoot ?? process.cwd(), input, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
      )
  return Buffer.from(run, 'utf8')
}

/**
 * Prepare the full 8-record migration group. Inputs are repo-relative readBuffer providers
 * plus the fixed source identities (revision per record) and R92/R94 buffers.
 * Returns the complete output set (manifests, shards, R92/R94 replacements) without writing.
 */
export function prepareReviewStorageGroup({ records, r92Buffer, r94Buffer, readBuffer, context = {} }) {
  demand(Array.isArray(records) && records.length === 8, 'exactly 8 source records required')
  const outputs = []
  const r92 = parseTerminalJson(r92Buffer)
  const r94 = parseTerminalJson(r94Buffer)
  const r92Edges = []
  const shardsAll = []

  for (const source of records) {
    const logicalPath = source.path
    demand(typeof logicalPath === 'string' && logicalPath.startsWith(reviewDirRelative + '/'), `bad path: ${logicalPath}`)
    const flatBuffer = readBuffer(logicalPath)
    demand(flatBuffer !== undefined, `source missing: ${logicalPath}`)
    const flat = parseTerminalJson(flatBuffer)
    demand(isObject(flat) && Array.isArray(flat.entries), `unsupported flat shape: ${logicalPath}`)
    demand(!Object.hasOwn(flat, reviewStorageMarker), `already a manifest: ${logicalPath}`)
    demand(
      digest(flatBuffer) === source.beforeSHA256 && flat.entries.length === source.entryCount,
      `source identity drift: ${logicalPath}`,
    )
    const logicalKeys = Object.keys(flat)
    const entriesPosition = logicalKeys.indexOf('entries')
    demand(entriesPosition !== -1, `entries key missing: ${logicalPath}`)
    const logicalSha256 = digest(Buffer.from(JSON.stringify(flat)))

    const stem = logicalPath.split('/').pop().replace(/\.json$/, '')
    const shardDir = `shards/${stem}/${logicalSha256}`
    // Pack entries into shards bounded by formatted size; measure with real entry sizes.
    const shardSpecs = []
    let current = []
    let currentBytes = 0
    const headerOverhead = 260
    for (const entry of flat.entries) {
      const entryBytes = Buffer.byteLength(JSON.stringify(entry, null, 2)) + 12
      const total = currentBytes + entryBytes + headerOverhead
      if (current.length > 0 && total > 420_000) {
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
      demand(formatted.length <= 524_288, `shard exceeds 512 KiB after formatting: ${shardPath} (${formatted.length})`)
      outputs.push({ kind: 'shard', path: `${reviewDirRelative}/${shardPath}`, bytes: formatted })
      shardsAll.push({ logicalPath, path: `${reviewDirRelative}/${shardPath}`, sha256: digest(formatted) })
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
    manifestValue[reviewStorageMarker] = {
      schemaVersion: 1,
      producer: 'review-record-storage/1.0.0',
      logicalPath,
      logicalKeys,
      source: {
        revision: source.sourceRevision,
        path: logicalPath,
        gitObject: source.sourceGitObject,
        sha256: source.beforeSHA256,
      },
      logicalSha256,
      totalEntries: flat.entries.length,
      entryOrderSha256: digest(
        Buffer.from('[' + flat.entries.map((e) => JSON.stringify(e.path)).join(',') + ']'),
      ),
      orderedEntriesSha256: digest(
        Buffer.from('[' + flat.entries.map((e) => JSON.stringify(e)).join(',') + ']'),
      ),
      shards: storageShards,
    }
    const formattedManifest = biomeFormat(manifestValue, logicalPath.split('/').pop(), context)
    demand(formattedManifest.length <= 524_288, `manifest exceeds 512 KiB: ${logicalPath}`)
    outputs.push({ kind: 'manifest', path: logicalPath, bytes: formattedManifest })

    // R92 edge for this record
    const stemShort = stem
    const edgeIndex = r92EdgeIndex(stemShort)
    const edge = r92.entries[edgeIndex]
    demand(edge.path === logicalPath, `R92 edge target mismatch at ${edgeIndex}: ${edge.path}`)
    r92Edges.push({ index: edgeIndex, target: logicalPath, before: edge.afterSha256 })
    edge.afterSha256 = digest(formattedManifest)
  }

  const formattedR92 = biomeFormat(r92, '20261017-r92-phase-governance-artifacts.json', context)
  demand(formattedR92.length <= 524_288, 'R92 exceeds 512 KiB after group formatting')
  const r94Edge = r94.entries[6]
  demand(
    r94Edge.path === `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`,
    'R94[6] edge target mismatch',
  )
  const r94EdgeBefore = r94Edge.afterSha256
  r94Edge.afterSha256 = digest(formattedR92)
  const formattedR94 = biomeFormat(r94, '20261017-r94-final-machine-artifacts.json', context)
  demand(formattedR94.length <= 524_288, 'R94 exceeds 512 KiB after group formatting')
  outputs.push({ kind: 'review', path: `${reviewDirRelative}/20261017-r92-phase-governance-artifacts.json`, bytes: formattedR92 })
  outputs.push({ kind: 'review', path: `${reviewDirRelative}/20261017-r94-final-machine-artifacts.json`, bytes: formattedR94 })

  return {
    outputs,
    group: {
      manifests: 8,
      shards: shardsAll,
      r92Edges: r92Edges.map((edge) => ({ ...edge, after: undefined })),
      r94Edge: { index: 6, before: r94EdgeBefore },
      totalEntries: 599,
    },
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

/** Publish a prepared group into an explicit output tree (rehearsal only in S28). */
export function publishReviewStorageGroup(prepared, targetRoot) {
  demand(Array.isArray(prepared.outputs) && prepared.outputs.length > 0, 'prepared outputs required')
  const base = resolve(targetRoot)
  const written = []
  const lockPath = join(base, reviewDirRelative, '.storage.lock')
  mkdirSync(join(base, reviewDirRelative), { recursive: true })
  writeFileSync(lockPath, `${new Date().toISOString()}\n`, { flag: 'wx' })
  try {
    for (const output of prepared.outputs) {
      const target = join(base, output.path)
      mkdirSync(join(target, '..'), { recursive: true })
      writeFileSync(target, output.bytes)
      demand(digest(readFileSync(target)) === digest(output.bytes), `write drift: ${output.path}`)
      written.push(output.path)
    }
  } catch (error) {
    // interrupted publication keeps the lock and recovery material; readers must refuse
    throw error
  }
  for (const output of prepared.outputs) {
    demand(
      digest(readFileSync(join(base, output.path))) === digest(output.bytes),
      `post-write verification failed: ${output.path}`,
    )
  }
  rmSync(lockPath)
  return { written: written.length, lockReleased: true }
}
