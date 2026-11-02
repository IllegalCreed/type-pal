import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditDocuments } from './check.mjs'
import { generatedTextIssues, reviewCreditIssues } from './document-integrity.mjs'

test('generated successor corruption is rejected by the real document audit', () => {
  const text = `# Plan\n\n## 继任文档\n\n- ${[...'docs/phase1/status/feature-status.md'].join('；')}`
  assert.equal(generatedTextIssues(text).length, 1)
  const result = auditDocuments({
    documents: new Map([['docs/README.md', text]]),
    exists: () => true,
    expectedVersions: { content: 22, save: 12 },
    sectionRules: [],
    exceptions: [],
  })
  assert(result.issues.some((issue) => issue.message.includes('semicolon corruption')))
  assert.deepEqual(generatedTextIssues(text.replaceAll('；', '')), [])
})

test('ordinary punctuation and immutable quoted corruption retain their historical bytes', () => {
  assert.deepEqual(generatedTextIssues('- 下一入口：docs/a.md；随后核对来源；保留原文。'), [])
  const quoted =
    '<!-- original-source-quote:start -->\n> ' +
    [...'historical bytes'].join('；') +
    '\n<!-- original-source-quote:end -->'
  assert.deepEqual(generatedTextIssues(quoted), [])
})

test('matching hashes or artifact flags cannot reapprove a withdrawn semantic review', () => {
  const entry = {
    reviewStatus: 'content-reviewed',
    templateCompliance: 'template-compliant',
    artifactOnly: true,
  }
  const review = {
    contentReviewStatus: 'content-reviewed',
    templateCompliance: 'template-compliant',
    claimCorrection: { date: '2026-10-18' },
  }
  assert(
    reviewCreditIssues(entry, review).includes(
      'withdrawn/mechanical review cannot grant content-reviewed',
    ),
  )
  review.contentReviewStatus = 'partial-review-unknown'
  review.templateCompliance = 'needs-migration'
  assert.equal(reviewCreditIssues(entry, review).length, 2)
  entry.reviewStatus = 'partial-review-unknown'
  entry.templateCompliance = 'needs-migration'
  assert.deepEqual(reviewCreditIssues(entry, review), [])
})
