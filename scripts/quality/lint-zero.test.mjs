import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { biomeCli, inspectLintResult, runLintZero } from './lint-zero.mjs'

function cleanReport() {
  return {
    command: 'check',
    summary: {
      errors: 0,
      warnings: 0,
      infos: 0,
      skipped: 0,
      diagnosticsNotPrinted: 0,
      changed: 0,
      unchanged: 1,
    },
    diagnostics: [],
  }
}
const run = (report) => ({ status: 0, signal: null, stdout: JSON.stringify(report) })

test('accepts a complete, zero-diagnostic report', () =>
  assert.equal(inspectLintResult(run(cleanReport())).ok, true))
for (const key of ['errors', 'warnings', 'infos', 'skipped', 'diagnosticsNotPrinted', 'changed']) {
  test(`rejects nonzero ${key} even when CLI exits zero`, () => {
    const report = cleanReport()
    report.summary[key] = 1
    assert.equal(inspectLintResult(run(report)).ok, false)
  })
  test(`rejects missing ${key}`, () => {
    const report = cleanReport()
    delete report.summary[key]
    assert.equal(inspectLintResult(run(report)).ok, false)
  })
}
for (const count of [-1, NaN, Infinity, 1.5, '0', null])
  test(`rejects invalid count ${String(count)}`, () => {
    const report = cleanReport()
    report.summary.errors = count
    assert.equal(inspectLintResult(run(report)).ok, false)
  })
test('rejects diagnostics even if summary hides them', () => {
  const report = cleanReport()
  report.diagnostics.push({ severity: 'info', category: 'new-rule' })
  assert.equal(inspectLintResult(run(report)).ok, false)
})
test('rejects empty scan', () => {
  const report = cleanReport()
  report.summary.unchanged = 0
  assert.equal(inspectLintResult(run(report)).ok, false)
})
test('rejects unknown or malformed report shapes', () => {
  for (const report of [
    null,
    {},
    [],
    { ...cleanReport(), command: 'lint' },
    { ...cleanReport(), summary: null },
    { ...cleanReport(), diagnostics: null },
  ])
    assert.equal(inspectLintResult(run(report)).ok, false)
  assert.equal(inspectLintResult({ status: 0, signal: null, stdout: 'truncated' }).ok, false)
})
test('rejects process errors regardless of a clean report', () => {
  for (const extra of [
    { status: 1 },
    { status: 2 },
    { status: null },
    { signal: 'SIGTERM' },
    { error: new Error('spawn failed') },
  ])
    assert.equal(inspectLintResult({ ...run(cleanReport()), ...extra }).ok, false)
})

for (const sample of [
  { name: 'clean', source: 'export const value = 1\n', ok: true },
  { name: 'warning', source: 'const unused = 1\n', ok: false, counter: 'warnings' },
  {
    name: 'info',
    source: "export const label = (value) => 'item ' + value\n",
    ok: false,
    counter: 'infos',
  },
  { name: 'syntax', source: 'export {\n', ok: false, counter: 'errors' },
])
  test(`real Biome process: ${sample.name}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'type-pal-zero-lint-'))
    try {
      // Same lint/formatter rules; only VCS discovery is disabled inside this disposable non-git fixture.
      const config = JSON.parse(readFileSync(new URL('../../biome.json', import.meta.url), 'utf8'))
      config.vcs = { enabled: false }
      const configPath = join(directory, 'biome.json')
      writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
      assert.equal(
        spawnSync(process.execPath, [biomeCli, 'format', '--write', configPath], {
          cwd: directory,
          encoding: 'utf8',
        }).status,
        0,
      )
      writeFileSync(join(directory, 'fixture.mjs'), sample.source)
      const result = runLintZero(directory)
      assert.equal(result.ok, sample.ok, JSON.stringify(result))
      if (sample.counter) assert.ok(result.report.summary[sample.counter] > 0)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
