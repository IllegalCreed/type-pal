import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadDocumentRegistry, writeDocumentRegistry } from './document-registry.mjs'
import { readReviewRecordObject } from './review-record-storage.mjs'

const root = resolve(new URL('../..', import.meta.url).pathname)
const registryPath = resolve(root, 'docs/phase-governance/document-registry.json')
const { registry, loadedSource } = loadDocumentRegistry({ manifestPath: registryPath })
const reviews = new Map()
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
const reviewNames = readdirSync(reviewDir).filter((name) => name.endsWith('.json'))

// C04: single complete safe read of all reviews (lock check + materialization),
// then recheck the lock before the first registry write — no prefix write possible.
const lockPath = resolve(root, 'docs/phase-governance/reviews/.storage.lock')
const checkLock = () => {
  try {
    lstatSync(lockPath)
    return true
  } catch {
    return false
  }
}
if (checkLock()) throw new Error('sync: review storage lock present; refusing registry write')

// Single materialization validates every review (flat or manifest) once
const materialized = new Map()
for (const name of reviewNames) {
  const logical = `docs/phase-governance/reviews/${name}`
  const record = readReviewRecordObject(logical, {
    readBuffer: (p) => readFileSync(resolve(root, p)),
  })
  materialized.set(name, record)
}

// Recheck lock before the first registry write (C04: no prefix write on concurrent lock)
if (checkLock())
  throw new Error('sync: review storage lock appeared during read; refusing registry write')

for (const file of reviewNames) {
  const document = materialized.get(file)
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
  JSON.stringify({
    reviewsRead: materialized.size,
    registryEntries: registry.entries.length,
  }),
)
