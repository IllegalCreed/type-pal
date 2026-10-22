// migrate-review-record-storage.mjs — S28 rehearsal CLI for the 8-record storage group.
// C05: no /tmp packet dependency; uses bounded versioned frozen-source constants
// and real Git for deterministic identity derivation. Default dry-run; --publish <dir>.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadReviewRecord } from './review-record-storage.mjs'
import {
  FROZEN_REVIEW_SOURCE_REVISION,
  FROZEN_REVIEW_STORAGE_SOURCES,
  prepareReviewStorageGroup,
  publishReviewStorageGroup,
} from './review-record-storage-writer.mjs'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const args = process.argv.slice(2)
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

const prepared = prepareReviewStorageGroup({
  records,
  r92Buffer: readBuffer(
    'docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json',
  ),
  r94Buffer: readBuffer('docs/phase-governance/reviews/20261017-r94-final-machine-artifacts.json'),
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
    const loaded = loadReviewRecord({ root: publishDir, logicalPath: record.path })
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
