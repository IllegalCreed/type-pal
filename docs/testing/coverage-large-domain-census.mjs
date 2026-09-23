// Read-only planning census: reject stale reports; never generate coverage or write a baseline.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const productionFreeze = '57dda7ed2376fc25f07756be117bb4a058d09915'
const reportRoot = process.argv[2]
if (!reportRoot)
  throw new Error('Usage: node docs/testing/coverage-large-domain-census.mjs REPORT_ROOT')
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const baselinePath = resolve(root, 'scripts/coverage/baseline.fast.json')
const baseline = readJson(baselinePath)
const report = readJson(resolve(reportRoot, 'summary.json'))
// Runtime reports additionally contain per-test identities. Compare every persisted field,
// including nested execution digests, not a blanket deepEqual of the wider runtime shape.
function projectPersisted(actual, expected) {
  if (Array.isArray(expected)) {
    assert.equal(actual.length, expected.length)
    return expected.map((value, index) => projectPersisted(actual[index], value))
  }
  if (expected && typeof expected === 'object') {
    return Object.fromEntries(
      Object.entries(expected).map(([key, value]) => [key, projectPersisted(actual[key], value)]),
    )
  }
  return actual
}
assert.equal(report.testCount, baseline.testCount, 'stale coverage report testCount')
for (const key of Object.keys(baseline).filter((key) => key !== 'generatedAt')) {
  assert.deepEqual(projectPersisted(report[key], baseline[key]), baseline[key], key)
}
const dimensions = ['lines', 'statements', 'functions', 'branches']
const rows = []
for (const [pkg, scope] of Object.entries(baseline.packages)) {
  const summary = readJson(resolve(reportRoot, pkg, 'coverage-summary.json'))
  const files = Object.entries(summary).filter(([file]) => file !== 'total')
  const paths = files.map(([file]) => `packages/${file.split('/packages/').at(-1)}`).sort()
  assert.deepEqual(paths, [...scope.sourceFiles].sort(), `${pkg} source set`)
  for (const dimension of dimensions) {
    for (const field of ['total', 'covered']) {
      assert.equal(
        summary.total[dimension][field],
        scope.metrics[dimension][field],
        `${pkg}/${dimension}/${field}`,
      )
      assert.equal(
        files.reduce((sum, [, metrics]) => sum + metrics[dimension][field], 0),
        scope.metrics[dimension][field],
        `${pkg}/${dimension}/${field}/sum`,
      )
    }
  }
  for (const [file, metrics] of files) {
    rows.push({
      file: `packages/${file.split('/packages/').at(-1)}`,
      lines: { covered: metrics.lines.covered, total: metrics.lines.total },
      branches: { covered: metrics.branches.covered, total: metrics.branches.total },
      missingLines: metrics.lines.total - metrics.lines.covered,
      missingBranches: metrics.branches.total - metrics.branches.covered,
    })
  }
}
const selections = {
  'TEST-BATTLE-WORKFLOWS-1': [
    'battle/battle-session.ts',
    'battle/battle-core.ts',
    'battle/battle-anim.ts',
    'battle/enemy-hook-runtime.ts',
  ],
  'TEST-RUNTIME-SHELL-COVERAGE-1': [
    'main.ts',
    'opening-menu.ts',
    'menu/menu-box.ts',
    'menu/save-browser-box.ts',
    'menu/magic-box.ts',
    'dialog/dialog-box.ts',
  ],
}
const batches = Object.fromEntries(
  Object.entries(selections).map(([id, files]) => {
    const selected = files.map((file) => {
      const path = `packages/reforge/src/${file}`
      const row = rows.find((entry) => entry.file === path)
      assert.ok(row, `missing target ${path}`)
      const bytes = readFileSync(resolve(root, path))
      const frozen = execFileSync('git', ['show', `${productionFreeze}:${path}`], { cwd: root })
      assert.ok(bytes.equals(frozen), `production target drifted: ${path}`)
      return { ...row, sha256: createHash('sha256').update(bytes).digest('hex') }
    })
    return [
      id,
      {
        files: selected,
        wholeFileMissingLines: selected.reduce((n, row) => n + row.missingLines, 0),
        wholeFileMissingBranches: selected.reduce((n, row) => n + row.missingBranches, 0),
      },
    ]
  }),
)
console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      productionFreeze,
      baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
      baselineSha256: createHash('sha256').update(readFileSync(baselinePath)).digest('hex'),
      tests: baseline.testCount,
      productionFiles: baseline.sourceFileCount,
      total: baseline.total,
      interpretation:
        'Whole-file missing counters are a prioritization ceiling, not promised reachable gains. No coverage/exclusions/thresholds changed.',
      top20: rows
        .sort((a, b) => b.missingLines - a.missingLines || a.file.localeCompare(b.file))
        .slice(0, 20),
      batches,
    },
    null,
    2,
  ),
)
