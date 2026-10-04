import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const registry = JSON.parse(
  readFileSync(resolve(repoRoot, 'docs/phase-governance/document-registry.json'), 'utf8'),
)
const byPath = new Map(registry.entries.map((entry) => [entry.path, entry]))
const reviewDir = resolve(repoRoot, 'docs/phase-governance/reviews')
for (const file of readdirSync(reviewDir).filter((name) => name.endsWith('.json'))) {
  const path = resolve(reviewDir, file)
  const review = JSON.parse(readFileSync(path, 'utf8'))
  for (const entry of review.entries ?? []) {
    const classified = byPath.get(entry.path)
    if (!classified) continue
    entry.docType = classified.docType
    entry.templateId = classified.templateId
    entry.template = classified.template
    entry.templateCompliance =
      entry.templateCompliance === 'needs-migration' ||
      entry.templateCompliance === 'legacy-canonical'
        ? 'governed-legacy'
        : (entry.templateCompliance ?? 'governed-legacy')
    entry.readMethod = entry.readMethod ?? 'full-text-read'
    entry.reviewDepth =
      entry.reviewDepth ??
      (entry.contentReviewStatus === 'content-reviewed' ? 'deep-semantic' : 'partial-semantic')
  }
  writeFileSync(path, `${JSON.stringify(review, null, 2)}\n`)
}
