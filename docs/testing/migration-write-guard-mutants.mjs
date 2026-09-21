import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = mkdtempSync(join(tmpdir(), 'type-pal-mwg-mutants-'))
const files = [
  'migration-write-plan.ts',
  'migration-transaction.ts',
  'migration-path.ts',
  'pal-assets.ts',
]
const hashes = () =>
  files.map((file) =>
    createHash('sha256')
      .update(readFileSync(join(root, 'packages/migrate/src', file)))
      .digest('hex'),
  )
const before = hashes()
const businessFailure = (messages) =>
  messages.length > 0 &&
  messages.every((message) =>
    /^AssertionError(?: \[ERR_ASSERTION\])?:/.test(stripVTControlCharacters(message).trimStart()),
  )
assert.equal(businessFailure(['AssertionError: expected success']), true)
assert.equal(businessFailure(['Error: wrapped AssertionError: expected success']), false)
assert.equal(businessFailure(['AssertionError: expected success', 'TypeError: bad fixture']), false)
assert.equal(businessFailure([]), false)
const cases = [
  ['control', null],
  ['resample', 'planned write rejects later author bytes before any staging'],
  ['late-preflight', 'a late conflicting operation prevents even the first staging write'],
  [
    'no-path-guard',
    'rejects native parent links before resource mutation and preserves the whole fixture',
  ],
  ['no-pre-mkdir-check', 'a directory swap while reading the old target is rejected before mkdir'],
  ['cleanup-foreign-inode', 'cleanup does not delete a replacement inode after failure'],
]
const results = []
for (const [variant, title] of cases) {
  const json = join(output, `${variant}.json`)
  const args = [
    '--filter',
    '@type-pal/migrate',
    'exec',
    'vitest',
    'run',
    '--config',
    join(root, 'docs/testing/migration-write-guard.config.mjs'),
    '--reporter=json',
    `--outputFile=${json}`,
  ]
  if (title) args.push('-t', `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
  const run = spawnSync('pnpm', args, {
    cwd: root,
    env: { ...process.env, MWG_MUTANT: variant },
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const log = `${run.stdout ?? ''}${run.stderr ?? ''}`
  writeFileSync(join(output, `${variant}.log`), log)
  assert.equal(run.signal, null, `${variant} interrupted`)
  assert.equal(run.status, title ? 1 : 0, `${variant}: ${output}`)
  assert.doesNotMatch(
    log,
    /Unhandled Errors|Test timed out|No test files found|Failed to load url|Cannot find module/,
  )
  const report = JSON.parse(readFileSync(json, 'utf8'))
  assert.equal(report.numRuntimeErrorTestSuites ?? 0, 0)
  const assertions = report.testResults.flatMap((suite) => suite.assertionResults)
  const failed = assertions.filter((item) => item.status === 'failed')
  if (title) {
    assert.ok(log.includes(`MWG_MUTATION_HIT ${variant}`), `${variant} not loaded`)
    assert.equal(failed.length, 1)
    assert.equal(failed[0].fullName, title)
    assert.ok(
      businessFailure(failed[0].failureMessages),
      `${variant} is not an AssertionError: ${output}`,
    )
  } else {
    assert.equal(failed.length, 0)
    assert.ok(report.numPassedTests >= 36)
  }
  assert.deepEqual(hashes(), before, 'production files must never be rewritten')
  results.push({
    variant,
    title,
    exit: run.status,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    report: json,
  })
  console.log(`${variant}: ${title ? 'detected' : 'green'}`)
}
writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2))
console.log(output)
