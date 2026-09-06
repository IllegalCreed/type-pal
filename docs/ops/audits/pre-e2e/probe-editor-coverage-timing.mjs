// Historical diagnostic, not a product regression gate. No checkout/stash/baseline writes.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../../../scripts/coverage/config.mjs'

const flags = process.argv.slice(2)
if (flags.some((flag) => flag !== '--full'))
  throw new Error('Usage: node probe-editor-coverage-timing.mjs [--full]')
const full = flags.includes('--full')
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const config = fileURLToPath(new URL('./probe-editor-coverage-timing.config.mts', import.meta.url))
const evidence = mkdtempSync(resolve(tmpdir(), 'type-pal-editor-coverage-timing.'))
const cfg = coveragePackages.find((p) => p.id === 'editor')
const selection = testSelection(cfg, 'fast')
const source = 'packages/editor/src/ui/design-system/reorder.tsx'
const testFile = 'packages/editor/src/ui/design-system/reorder.test.tsx'
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const baselinePath = resolve(root, 'scripts/coverage/baseline.fast.json')
const baseline = JSON.parse(readFileSync(baselinePath))
const productionStatus = () =>
  git('status', '--porcelain', '--', 'packages/', 'scripts/', 'pnpm-lock.yaml')
assert.equal(
  productionStatus(),
  '',
  'Run against a clean product/test/config tree; never restore other work',
)
const provenance = {
  sha: git('rev-parse', 'HEAD'),
  node: process.version,
  full,
  vitest: JSON.parse(readFileSync(resolve(root, 'node_modules/vitest/package.json'))).version,
  provider: JSON.parse(readFileSync(resolve(root, 'node_modules/@vitest/coverage-v8/package.json')))
    .version,
  sourceHash: digest(resolve(root, source)),
  testHash: digest(resolve(root, testFile)),
  baselineHash: digest(baselinePath),
  diagnosticConfigHash: digest(config),
  note: 'Only test scheduling is transformed in memory. --full means editor fast scope, not seven-package full coverage.',
}
writeFileSync(resolve(evidence, 'provenance.json'), JSON.stringify(provenance, null, 2))
console.log('Evidence:', evidence)
const reports = []
for (const timing of ['hold', 'flush']) {
  const out = resolve(evidence, timing)
  mkdirSync(out)
  const args = [
    '--filter',
    cfg.name,
    'exec',
    'vitest',
    'run',
    ...(full ? [] : ['src/ui/design-system/reorder.test.tsx']),
    ...selection.args,
    ...selection.excludes.flatMap((p) => ['--exclude', p]),
    '--config',
    config,
    '--coverage',
    '--coverage.provider=v8',
    `--coverage.reportsDirectory=${out}/coverage`,
    '--coverage.reporter=json',
    '--coverage.reporter=json-summary',
    '--reporter=default',
    '--reporter=json',
    `--outputFile.json=${out}/tests.json`,
    ...(full ? cfg.include : ['src/ui/design-system/reorder.tsx']).flatMap((p) => [
      '--coverage.include',
      p,
    ]),
    ...coverageExcludes.flatMap((p) => ['--coverage.exclude', p]),
  ]
  const env = {
    ...process.env,
    TYPE_PAL_COVERAGE: '1',
    TYPE_PAL_COVERAGE_PROFILE: 'fast',
    COV_DET_TIMING: timing,
  }
  writeFileSync(
    resolve(out, 'command.json'),
    JSON.stringify({ command: 'pnpm', args, timing }, null, 2),
  )
  const log = createWriteStream(resolve(out, 'run.log'))
  const child = spawn('pnpm', args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })
  const code = await new Promise((res, rej) => {
    child.once('error', rej)
    child.once('close', res)
  })
  await new Promise((res) => log.end(res))
  assert.equal(code, 0, `${timing} failed; inspect ${out}/run.log`)
  const tests = JSON.parse(readFileSync(resolve(out, 'tests.json')))
  const expected = full ? baseline.packages.editor.fastTests.testCount : 23
  assert.equal(tests.numTotalTests, expected)
  assert.equal(tests.numPassedTests, expected)
  const report = JSON.parse(readFileSync(resolve(out, 'coverage/coverage-summary.json')))
  reports.push(report)
  console.log(timing, 'tests:', expected, 'metrics:', JSON.stringify(report.total))
}
assert.deepEqual(Object.keys(reports[0]).sort(), Object.keys(reports[1]).sort())
const differences = []
for (const [file, metrics] of Object.entries(reports[0])) {
  for (const metric of ['statements', 'branches', 'functions', 'lines']) {
    const before = metrics[metric],
      after = reports[1][file][metric]
    assert.equal(before.total, after.total, 'Coverage denominator changed')
    if (before.covered !== after.covered)
      differences.push({ file, metric, before: before.covered, after: after.covered })
  }
}
writeFileSync(resolve(evidence, 'difference.json'), JSON.stringify(differences, null, 2))
assert.equal(git('rev-parse', 'HEAD'), provenance.sha)
assert.equal(productionStatus(), '')
assert.equal(digest(resolve(root, source)), provenance.sourceHash)
assert.equal(digest(resolve(root, testFile)), provenance.testHash)
assert.equal(digest(baselinePath), provenance.baselineHash)
assert.equal(
  differences.length,
  4,
  'Expected only total + reorder statement/branch deltas; audit premise may have changed',
)
for (const d of differences) {
  assert(d.file === 'total' || d.file === resolve(root, source))
  assert(d.metric === 'statements' || d.metric === 'branches')
  assert.equal(d.after - d.before, 1)
}
console.log(
  'CONFIRMED: same passing tests; only the no-scroll-owner frame changes statement/branch coverage by +1.',
)
