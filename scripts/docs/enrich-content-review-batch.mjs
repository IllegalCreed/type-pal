import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const reviewPath = resolve(
  repoRoot,
  'docs/phase-governance/reviews/20261004-lore-phase3-batch1.json',
)
const review = JSON.parse(readFileSync(reviewPath, 'utf8'))
const revision = '6a5675efade246f0332fa9333b0729532a5545d8'
const digest = (path) =>
  createHash('sha256')
    .update(readFileSync(resolve(repoRoot, path)))
    .digest('hex')
for (const entry of review.entries) {
  entry.phase = entry.path.split('/')[1]
  entry.module = entry.path.split('/')[2] ?? 'canon'
  entry.capability = entry.path
    .replace(/^docs\//, '')
    .replace(/\.md$/, '')
    .replaceAll('/', '-')
  entry.owner = 'Codex'
  entry.provenance = ['source-document', 'repository-history']
  entry.sourceSha256 = digest(entry.path)
  entry.afterSha256 = entry.sourceSha256
  entry.publicCallers = ['docs navigation']
  entry.legalInputs = ['current repository documentation', entry.path]
  entry.businessOracle = {
    type: 'content-review',
    assertions: [
      'core conclusion is grounded in the read body',
      'unresolved claims remain explicitly blocked',
    ],
  }
  entry.dedupe = {
    result: 'reviewed',
    against: ['docs/phase-governance/catalog.json', entry.path],
    notes: 'Content review record; no runtime/E2E/coverage credit.',
  }
  entry.revision = {
    currentSha: revision,
    implementationSha: entry.sourceSha256,
    contentVersion: 22,
    minimumSaveVersion: 11,
    history: [
      {
        revision,
        date: '2026-10-04',
        action: 'content-deep-review-batch-1',
        notRun: ['runtime', 'E2E', 'coverage'],
      },
    ],
  }
  entry.evidence = { kind: 'content-reading', path: entry.path, sourceSha256: entry.sourceSha256 }
  entry.history = [
    { revision, action: 'read-and-reviewed', contentReviewStatus: entry.contentReviewStatus },
  ]
  entry.supersedes = []
  entry.stopLine = entry.unresolved?.length
    ? 'do not promote unresolved or source-questioned claims to canonical truth without author/primary-source decision'
    : 'future edits must update this review record and governance catalog'
  entry.userVisibleBeforeAfter = null
  entry.reviewedLines = `1-${readFileSync(resolve(repoRoot, entry.path), 'utf8').split('\n').length}`
}
writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`)
console.log(`content review entries enriched: ${review.entries.length}`)
