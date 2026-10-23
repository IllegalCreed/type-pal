// migrate-review-record-storage.mjs — S28 rehearsal CLI for the 8-record storage group.
// C05: no /tmp packet dependency; uses bounded versioned frozen-source constants
// and real Git for deterministic identity derivation. Default dry-run; --publish <dir>.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import {
  assertReviewRecordSourceUnchanged,
  loadReviewRecord,
  loadReviewRecords,
  reviewStorageMarker,
  reviewStorageShardCap,
} from './review-record-storage.mjs'
import {
  FROZEN_REVIEW_SOURCE_REVISION,
  FROZEN_REVIEW_STORAGE_SOURCES,
  prepareReviewStorageGroup,
  publishReviewStorageGroup,
} from './review-record-storage-writer.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const args = process.argv.slice(2)
if (!(args.length === 0 || (args.length === 2 && args[0] === '--publish' && args[1])))
  throw new Error(
    'Usage: migrate-review-record-storage.mjs [--publish <owned-rehearsal-directory>]',
  )
const publishIndex = args.indexOf('--publish')
const publishDir = publishIndex !== -1 ? resolve(args[publishIndex + 1]) : null

const readBuffer = (path) => {
  try {
    return readFileSync(resolve(repoRoot, path))
  } catch {
    return undefined
  }
}

const gitShow = (revision, path) => {
  try {
    return execFileSync('git', ['-C', repoRoot, 'cat-file', 'blob', `${revision}:${path}`], {
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch {
    return undefined
  }
}
const gitOid = (revision, path) => {
  try {
    return execFileSync('git', ['-C', repoRoot, 'rev-parse', `${revision}:${path}`])
      .toString()
      .trim()
  } catch {
    return undefined
  }
}

const records = FROZEN_REVIEW_STORAGE_SOURCES.map((frozen) => {
  const bytes = gitShow(FROZEN_REVIEW_SOURCE_REVISION, frozen.path)
  if (bytes === undefined) {
    throw new Error(
      `frozen source not found in Git at ${FROZEN_REVIEW_SOURCE_REVISION}: ${frozen.path}`,
    )
  }
  return {
    path: frozen.path,
    beforeSHA256: sha(bytes),
    entryCount: frozen.entryCount,
    sourceRevision: FROZEN_REVIEW_SOURCE_REVISION,
    sourceGitObject: gitOid(FROZEN_REVIEW_SOURCE_REVISION, frozen.path),
  }
})

const stored = records.map((record) =>
  Object.hasOwn(parseTerminalJson(readBuffer(record.path)), reviewStorageMarker),
)
if (stored.some(Boolean)) {
  if (!stored.every(Boolean)) throw new Error('review storage group is partially published')
  if (publishDir)
    throw new Error('review storage is already published; refusing another publication')
  const r92Path = 'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'
  const r94Path = 'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'
  const group = loadReviewRecords({
    root: repoRoot,
    logicalPaths: [...records.map((r) => r.path), r92Path, r94Path],
  })
  for (const record of records) {
    const original = parseTerminalJson(gitShow(FROZEN_REVIEW_SOURCE_REVISION, record.path))
    const current = group.records.get(record.path)
    if (
      !isDeepStrictEqual(current, original) ||
      JSON.stringify(current) !== JSON.stringify(original)
    )
      throw new Error(`stored logical record differs from the frozen S28 source: ${record.path}`)
  }
  const r92Bytes = readBuffer(r92Path),
    r94Bytes = readBuffer(r94Path)
  const r92 = parseTerminalJson(r92Bytes),
    r94 = group.records.get(r94Path)
  for (const { path } of records) {
    const pins = r92.entries.filter((entry) => entry.path === path)
    if (pins.length !== 1 || pins[0].afterSha256 !== sha(readBuffer(path)))
      throw new Error(`stored R92 pin drift: ${path}`)
  }
  if (r94.entries[6]?.path !== r92Path || r94.entries[6].afterSha256 !== sha(r92Bytes))
    throw new Error('stored R94[6] pin drift')
  if ([r92Bytes, r94Bytes].some((bytes) => bytes.length > reviewStorageShardCap))
    throw new Error('stored publication pin owner exceeds 512 KiB')
  assertReviewRecordSourceUnchanged(group.loadedSource)
  console.log(
    JSON.stringify({
      mode: 'dry-run',
      state: 'already-published',
      manifests: records.length,
      shards: group.loadedSource.artifactSet.length,
      totalEntries: records.reduce((n, r) => n + group.records.get(r.path).entries.length, 0),
      r92Edges: records.length,
      r94Edge: { index: 6, before: sha(r92Bytes) },
      maxShardBytes: Math.max(...group.loadedSource.artifactSet.map((r) => r.bytes)),
      maxManifestBytes: Math.max(...records.map((r) => readBuffer(r.path).length)),
    }),
  )
} else {
  const prepared = prepareReviewStorageGroup({
    records,
    r92Buffer: readBuffer(
      'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json',
    ),
    r94Buffer: readBuffer(
      'docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json',
    ),
    readBuffer,
    context: { repoRoot },
  })

  const shardCount = prepared.outputs.filter((x) => x.kind === 'shard').length
  if (!publishDir) {
    console.log(
      JSON.stringify({
        mode: 'dry-run',
        manifests: 8,
        shards: shardCount,
        totalEntries: prepared.group.totalEntries,
        r92Edges: prepared.group.r92Edges.length,
        r94Edge: prepared.group.r94Edge,
        maxShardBytes: Math.max(
          ...prepared.outputs.filter((x) => x.kind === 'shard').map((x) => x.bytes.length),
        ),
        maxManifestBytes: Math.max(
          ...prepared.outputs.filter((x) => x.kind === 'manifest').map((x) => x.bytes.length),
        ),
      }),
    )
  } else {
    const published = publishReviewStorageGroup(prepared, publishDir, {
      sourceReadBuffer: readBuffer,
    })
    const entries = []
    for (const record of records) {
      const loaded = loadReviewRecord({
        root: publishDir,
        logicalPath: record.path,
        readSourceSnapshot: (pin) => readGitDocumentSnapshot(repoRoot, pin),
      })
      entries.push(loaded.record.entries.length)
    }
    console.log(
      JSON.stringify({
        mode: 'publish',
        written: published.written,
        shards: shardCount,
        verified: entries.length,
        entries,
        totalEntries: published.totalEntries,
        edgeCount: published.edgeCount,
      }),
    )
  }
}
