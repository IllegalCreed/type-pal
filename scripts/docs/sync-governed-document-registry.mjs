import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { readReviewRecordObject } from './review-record-storage.mjs'
import { assertWritableReviewSelection } from './review-record-storage-guards.mjs'

const root = resolve(new URL('../..', import.meta.url).pathname)
const registryPath = resolve(root, 'docs/phase-governance/document-registry.json')
const { registry, loadedSource } = loadDocumentRegistry({ manifestPath: registryPath })
const reviews = new Map()
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
const reviewNames = readdirSync(reviewDir).filter((name) => name.endsWith('.json'))
// C04: legacy flat files pass the write guard; thin manifests are read-only for this sync
// (the storage writer owns manifest mutations). Both shapes are materialized below.
const reviewSelection = reviewNames.map((name) => `docs/phase-governance/reviews/${name}`)
const manifestPaths = reviewSelection.filter((p) => {
  const bytes = readFileSync(resolve(root, p))
  return bytes.includes(Buffer.from('_reviewStorage'))
})
// sync fully validates by materializing every review (flat or manifest) below; the write guard
// applies only to flat files that would be mutated by registry sync
if (manifestPaths.length === 0) {
  assertWritableReviewSelection(reviewSelection, {
    readBuffer: (p) => readFileSync(resolve(root, p)),
    resolve: (p) => resolve(root, p),
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
