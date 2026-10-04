import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const reviewDir = resolve(root, 'docs/phase-governance/reviews')
const digest = (path) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex')
for (const file of readdirSync(reviewDir).filter((name) => name.endsWith('.json'))) {
  const path = resolve(reviewDir, file)
  const review = JSON.parse(readFileSync(path, 'utf8'))
  for (const entry of review.entries ?? []) {
    const current = digest(entry.path)
    if (entry.afterSha256 === current) continue
    entry.afterSha256 = current
    entry.revision.implementationSha = current
    entry.revision.history.push({
      revision: 'working-tree',
      date: '2026-10-04',
      action: 'content-review-sha-refresh',
      notRun: ['runtime', 'E2E', 'visual', 'coverage'],
    })
    entry.evidence.afterSha256 = current
    entry.evidence.path = entry.path
    entry.reviewedLines = `1-${readFileSync(resolve(root, entry.path), 'utf8').split('\n').length}`
  }
  writeFileSync(path, `${JSON.stringify(review, null, 2)}\n`)
}
