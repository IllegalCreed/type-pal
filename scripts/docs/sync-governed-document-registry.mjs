import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const registryPath = resolve(root, 'docs/phase-governance/document-registry.json')
const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
const reviews = new Map()
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
for (const file of readdirSync(reviewDir).filter((name) => name.endsWith('.json'))) {
  for (const entry of JSON.parse(readFileSync(resolve(reviewDir, file), 'utf8')).entries ?? [])
    reviews.set(entry.path, { file, entry })
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
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`)
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
