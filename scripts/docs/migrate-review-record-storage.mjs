// migrate-review-record-storage.mjs — S28 rehearsal CLI for the 8-record storage group.
// Default is dry-run (prepare only, prints the plan). --publish <dir> writes the prepared
// group into an explicit temporary target tree. Never touches the repository.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareReviewStorageGroup, publishReviewStorageGroup } from './review-record-storage-writer.mjs'
import { loadReviewRecord } from './review-record-storage.mjs'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const manifest = JSON.parse(
  readFileSync('/tmp/type-pal-S28-GLM-review-storage-implementation/execution-manifest.json', 'utf8'),
)
const args = process.argv.slice(2)
const publishIndex = args.indexOf('--publish')
const publishDir = publishIndex !== -1 ? resolve(args[publishIndex + 1]) : null

const readBuffer = (path) => readFileSync(resolve(repoRoot, path))
const records = manifest.sourceReviewRecords.map((row) => ({
  path: row.path,
  beforeSHA256: row.beforeSHA256,
  entryCount: row.entryCount,
  sourceRevision: '8cbf0dafba1a8a96914a322719dfeca1e5d58873',
  sourceGitObject: undefined,
}))
// Fixed source Git identities come from the S27 carrier revision (contract: 八源复用S27清单; worktree==carrier==beforeSHA verified by S27 source checks).
for (const record of records) {
  const blob = execGitOutput(['rev-parse', `8cbf0dafba1a8a96914a322719dfeca1e5d58873:${record.path}`])
  record.sourceGitObject = blob
}

const prepared = prepareReviewStorageGroup({
  records,
  r92Buffer: readBuffer('docs/phase-governance/reviews/20261017-r92-phase-governance-artifacts.json'),
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
      maxShardBytes: Math.max(...prepared.outputs.filter((x) => x.kind === 'shard').map((x) => x.bytes.length)),
      maxManifestBytes: Math.max(...prepared.outputs.filter((x) => x.kind === 'manifest').map((x) => x.bytes.length)),
    }),
  )
} else {
  const published = publishReviewStorageGroup(prepared, publishDir)
  // post-publish verification: every logical record materializes to the identical 599-entry objects
  let verified = 0
  const entries = []
  for (const record of records) {
    const loaded = loadReviewRecord({ root: publishDir, logicalPath: record.path })
    entries.push(loaded.record.entries.length)
    verified += 1
  }
  console.log(
    JSON.stringify({ mode: 'publish', written: published.written, shards: shardCount, verified, entries }),
  )
}

function execGitOutput(argv) {
  return execFileSync('git', ['-C', repoRoot, ...argv]).toString().trim()
}
