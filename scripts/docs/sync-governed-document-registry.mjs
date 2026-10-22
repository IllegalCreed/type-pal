import { resolve } from 'node:path'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { assertReviewRecordSourceUnchanged, loadReviewRecords } from './review-record-storage.mjs'

const root = resolve(new URL('../..', import.meta.url).pathname)
const registryPath = resolve(root, 'docs/phase-governance/document-registry.json')
const { registry, loadedSource } = loadDocumentRegistry({ manifestPath: registryPath })
const reviews = new Map()
const reviewGroup = loadReviewRecords({ root })
for (const [path, document] of reviewGroup.records)
  for (const entry of document.entries)
    reviews.set(entry.path, { file: path.split('/').pop(), entry })
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
assertReviewRecordSourceUnchanged(reviewGroup.loadedSource)
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
