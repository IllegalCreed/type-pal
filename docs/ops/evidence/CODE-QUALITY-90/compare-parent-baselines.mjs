import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isApprovedTestRetirement } from '../../../../scripts/coverage/approved-test-retirements.mjs'
import { auditScope } from '../../../../scripts/coverage/inventory.mjs'
import { compareCoverage } from '../../../../scripts/coverage/metrics.mjs'

const root = resolve(new URL('../../../../', import.meta.url).pathname)
const path = 'scripts/coverage/baseline.fast.json'
const bytes = readFileSync(resolve(root, path))
const candidate = JSON.parse(bytes)
const hash = (value) => createHash('sha256').update(value).digest('hex')
const refs = ['d7e9831f4', '588790383ac4f8692019acd7f94dc292b0acd640']
const testEntry = (snapshot, file) =>
  Object.values(snapshot.packages)
    .flatMap((item) => item.fastTests.fileEntries)
    .find((item) => item.file === file)
const results = []
for (const ref of refs) {
  const parentBytes = execFileSync('git', ['show', `${ref}:${path}`], { cwd: root })
  const parent = JSON.parse(parentBytes)
  const comparison = compareCoverage(candidate, parent, { allowNewPackages: true })
  const scope = auditScope(candidate, parent)
  const providerMatched = JSON.stringify(candidate.provider) === JSON.stringify(parent.provider)
  const unsafeSourceRemovals = scope.removals.filter(
    (entry) => ['source', 'package'].includes(entry.kind) && existsSync(resolve(root, entry.value)),
  )
  const unsafeTestRemovals = scope.removals.filter((removal) => {
    if (!['test-file', 'test-count'].includes(removal.kind)) return false
    const file = resolve(root, removal.value)
    if (!existsSync(file)) return false
    return !isApprovedTestRetirement({
      removal,
      previous: testEntry(parent, removal.value),
      current: testEntry(candidate, removal.value),
      fileSha256: hash(readFileSync(file)),
    })
  })
  results.push({
    ref,
    parentSha256: hash(parentBytes),
    candidateSha256: hash(bytes),
    providerMatched,
    comparison,
    scope,
    unsafeSourceRemovals,
    unsafeTestRemovals,
    passed:
      providerMatched &&
      comparison.regressions.length === 0 &&
      unsafeSourceRemovals.length === 0 &&
      unsafeTestRemovals.length === 0,
  })
}
writeFileSync(
  new URL('./parent-baseline-comparison.json', import.meta.url),
  `${JSON.stringify(results, null, 2)}\n`,
)
for (const result of results)
  console.log(
    `${result.ref}: ${result.passed ? 'PASS' : 'FAIL'}; regressions=${result.comparison.regressions.length}; unsafe source/test removals=${result.unsafeSourceRemovals.length}/${result.unsafeTestRemovals.length}`,
  )
if (results.some((result) => !result.passed)) process.exitCode = 1
