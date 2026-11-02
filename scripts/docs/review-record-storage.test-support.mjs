// review-record-storage.test-support.mjs — self-contained small sharded-record fixture builder.
// Builds a valid thin-manifest + shards group from a synthetic flat record without
// copying any real 599-source payloads. Returns {logicalPath, logical, files, shardCount}.
import { createHash } from 'node:crypto'

const digest = (b) => createHash('sha256').update(b).digest('hex')
const CONTRACT = 'review-record-storage/1.0.0'

export function buildSmallShardedRecord(entryCount, stem = 'test-small-record') {
  const logicalPath = `docs/phase-governance/reviews/${stem}.json`
  const entries = Array.from({ length: entryCount }, (_, i) => ({
    path: `docs/example-${i}.md`,
    contentReviewStatus: 'partial-review-unknown',
    docType: 'test-machine-evidence',
    afterSha256: digest(Buffer.from(`entry-${i}`)),
  }))
  const logical = {
    schemaVersion: 1,
    id: stem,
    reviewer: 'test-fixture',
    reviewDate: '2026-01-01',
    policy: 'synthetic fixture',
    entries,
  }
  const logicalKeys = Object.keys(logical)
  const logicalSha256 = digest(Buffer.from(JSON.stringify(logical)))
  const entryOrderSha256 = digest(
    Buffer.from(`[${entries.map((e) => JSON.stringify(e.path)).join(',')}]`),
  )
  const orderedEntriesSha256 = digest(
    Buffer.from(`[${entries.map((e) => JSON.stringify(e)).join(',')}]`),
  )
  // split into 2 shards
  const mid = Math.ceil(entryCount / 2)
  const halves = [entries.slice(0, mid), entries.slice(mid)].filter((h) => h.length > 0)
  const shards = halves.map((half, i) => ({
    key: `part-${String(i + 1).padStart(3, '0')}`,
    path: `shards/${stem}/${logicalSha256}/part-${String(i + 1).padStart(3, '0')}.json`,
    total: half.length,
    sha256: null, // filled after serialization
  }))
  const files = []
  halves.forEach((half, i) => {
    const shardValue = {
      schemaVersion: 1,
      logicalPath,
      generation: logicalSha256,
      key: shards[i].key,
      positions: half.map((e) => entries.indexOf(e)),
      entries: half,
    }
    const shardJson = `${JSON.stringify(shardValue, null, 2)}\n`
    shards[i].sha256 = digest(Buffer.from(shardJson))
    files.push([`docs/phase-governance/reviews/${shards[i].path}`, Buffer.from(shardJson)])
  })
  const manifestValue = {}
  for (const key of logicalKeys) if (key !== 'entries') manifestValue[key] = logical[key]
  manifestValue._reviewStorage = {
    schemaVersion: 1,
    producer: CONTRACT,
    logicalPath,
    logicalKeys,
    source: {
      revision: '0'.repeat(40),
      path: logicalPath,
      gitObject: '1'.repeat(40),
      sha256: digest(Buffer.from(JSON.stringify(logical))),
    },
    logicalSha256,
    totalEntries: entryCount,
    entryOrderSha256,
    orderedEntriesSha256,
    shards,
  }
  const manifestJson = `${JSON.stringify(manifestValue, null, 2)}\n`
  files.push([logicalPath, Buffer.from(manifestJson)])
  return { logicalPath, logical, files, shardCount: halves.length }
}
