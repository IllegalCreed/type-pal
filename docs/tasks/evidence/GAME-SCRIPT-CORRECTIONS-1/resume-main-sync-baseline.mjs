import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { adjustApprovedBaseline } from '../../../../scripts/coverage/approved-baseline-adjustments.mjs'
import { isApprovedTestRetirement } from '../../../../scripts/coverage/approved-test-retirements.mjs'
import { auditScope } from '../../../../scripts/coverage/inventory.mjs'
import { compareCoverage } from '../../../../scripts/coverage/metrics.mjs'

// Resume only the failed terminal scope acknowledgment. All seven package runs
// already succeeded; keep their native summary and the original exit1 intact.
const result = JSON.parse(readFileSync('coverage/fast/summary.json', 'utf8'))
const baselinePath = 'scripts/coverage/baseline.fast.json'
const before = JSON.parse(readFileSync(baselinePath, 'utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const expectedBase = execFileSync('git', ['show', `origin/main:${baselinePath}`])
assert.equal(
  sha(readFileSync(baselinePath)),
  sha(expectedBase),
  'input must be exact main baseline',
)
assert.equal(result.profile, 'fast')
assert.deepEqual(result.provider, before.provider)
assert.equal(result.testCount, 20094)
assert.equal(result.sourceFileCount, 760)
const adjusted = await adjustApprovedBaseline(before, (path) => readFileSync(path))
const comparison = compareCoverage(result, adjusted.baseline, { allowNewPackages: true })
assert.deepEqual(comparison.regressions, [])
const scope = auditScope(result, before)
assert.equal(scope.removals.length, 1)
const removal = scope.removals[0]
assert.equal(removal.kind, 'test-count')
assert.equal(removal.value, 'packages/game/src/core/event-system.test.ts')
assert(existsSync(removal.value))
const entry = (snapshot) =>
  Object.values(snapshot.packages)
    .flatMap((item) => item.fastTests.fileEntries)
    .find((item) => item.file === removal.value)
assert(
  isApprovedTestRetirement({
    removal,
    previous: entry(before),
    current: entry(result),
    fileSha256: sha(readFileSync(removal.value)),
  }),
)
// Use the unchanged official projection, pinned in the receipt below. This
// adapter does not change the runner, thresholds, selection or approval guard.
const runner = readFileSync('scripts/coverage/run.mjs', 'utf8')
const expression = runner.slice(
  runner.indexOf('const baselineView = ') + 'const baselineView = '.length,
  runner.indexOf('\nasync function writeBaseline'),
)
const project = new Function(`return (${expression})`)()
const next = project(result)
const temporary = resolve('scripts/coverage/baseline.script-corrections.tmp.json')
writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`)
execFileSync('pnpm', ['exec', 'biome', 'format', '--write', temporary], { stdio: 'pipe' })
assert.deepEqual(JSON.parse(readFileSync(temporary, 'utf8')), next)
renameSync(temporary, baselinePath)
assert.deepEqual(JSON.parse(readFileSync(baselinePath, 'utf8')), next)
console.log(
  JSON.stringify({
    kind: 'resumed-ratchet-terminal-scope-acknowledgment',
    status: 'passed',
    originalCommandExit: 1,
    reason:
      'Original command omitted --allow-scope-removal for the already approved 326->324 retirement; no product/test/threshold change or repeated run.',
    runnerSha256: sha(Buffer.from(runner)),
    inputBaselineSha256: sha(expectedBase),
    resultSha256: sha(readFileSync('coverage/fast/summary.json')),
    outputBaselineSha256: sha(readFileSync(baselinePath)),
    approvedRemoval: removal,
    comparison,
    scope,
    tests: result.testCount,
    sources: result.sourceFileCount,
  }),
)
