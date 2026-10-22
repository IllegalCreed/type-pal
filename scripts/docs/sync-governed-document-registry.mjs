import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { readReviewRecordObject } from './review-record-storage.mjs'

const root = resolve(new URL('../..', import.meta.url).pathname)
const registryPath = resolve(root, 'docs/phase-governance/document-registry.json')
const { registry, loadedSource } = loadDocumentRegistry({ manifestPath: registryPath })
const reviews = new Map()
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
const reviewNames = readdirSync(reviewDir).filter((name) => name.endsWith('.json'))
// C04: sync always checks the review storage lock first (manifest or not), then
// fully validates every review by materialization (flat or manifest) before any registry write.
const reviewSelection = reviewNames.map((name) => `docs/phase-governance/reviews/${name}`)
const { reviewStorageGuardIssues } = await import('./review-record-storage-guards.mjs')
const lockIssues = reviewStorageGuardIssues(reviewSelection, {
  readBuffer: (p) => readFileSync(resolve(root, p)),
  resolve: (p) => resolve(root, p),
})
const blockingLockIssues = lockIssues.filter((issue) => issue.includes('lock present'))
if (blockingLockIssues.length > 0) {
  throw new Error(
    `sync: refusing to write registry — review storage lock present:\n${blockingLockIssues.join('\n')}`,
  )
}
// Full materialization validates every review (flat or manifest) before the first registry write
for (const name of reviewNames) {
  readReviewRecordObject(`docs/phase-governance/reviews/${name}`, {
    readBuffer: (p) => readFileSync(resolve(root, p)),
  })
}
for (const file of reviewNames) {
  const document = readReviewRecordObject(`docs/phase-governance/reviews/${file}`, {
    readBuffer: (p) => readFileSync(resolve(root, p)),
  })
  for (const entry of document.entries ?? []) reviews.set(entry.path, { file, entry })
}
for (const entry of registry.entries) {
  const review = reviews.get(entry.path)
  entry.reviewStatus = review?.entry.contentReviewStatus ?? 'unread'
  entry.reviewDepth = review?.entry.reviewDepth ?? 'missing'
  entry.reviewRecord = review?.file ?? null
  entry.templateCompliance = review?.entry.templateCompliance ?? entry.templateCompliance
}
registry.summary.reviewStatus = Object.fromEntries(
  [...new Set(registry.entries.map((entry) => entry.reviewStatus))]
    .sort()
    .map((status) => [
      status,
      registry.entries.filter((entry) => entry.reviewStatus === status).length,
    ]),
)
registry.summary.templateCompliance = Object.fromEntries(
  [...new Set(registry.entries.map((entry) => entry.templateCompliance))]
    .sort()
    .map((status) => [
      status,
      registry.entries.filter((entry) => entry.templateCompliance === status).length,
    ]),
)
writeDocumentRegistry({ registry, loadedSource })
console.log(
  JSON.stringify(
    {
      total: registry.entries.length,
      reviewStatus: registry.summary.reviewStatus,
      templateCompliance: registry.summary.templateCompliance,
    },
    null,
    2,
  ),
)
