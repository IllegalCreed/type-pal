// @vitest-environment node
/** E-01: run the real resource suites under isolated FS inputs, never touch raw/extracted files. */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { expect, test } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const game = join(root, 'packages/game')
const logs = mkdtempSync(join(tmpdir(), 'snapshot-input-boundaries-'))

function assertionCounts(output: string): number[] {
  // Vitest's ordinary CI reporter colors numeric console arguments; Agent mode does not.
  // Normalize only this parsing view. The child process's raw log remains untouched on disk.
  return [
    ...stripVTControlCharacters(output).matchAll(/SNAPSHOT_ASSERTIONS [^\n]* (\d+)\s*\n/g),
  ].map((match) => Number(match[1]))
}

function assertAssertionEvidence(output: string, passedTests: number, log: string): void {
  const counts = assertionCounts(output)
  expect(counts.length, log).toBe(passedTests)
  expect(
    counts.every((count) => count > 0),
    log,
  ).toBe(true)
}

test.each([
  ['plain', 'SNAPSHOT_ASSERTIONS one 6\nSNAPSHOT_ASSERTIONS two 1\n'],
  [
    'ANSI',
    '\u001b[22m\u001b[39mSNAPSHOT_ASSERTIONS one \u001b[33m6\u001b[39m\r\nSNAPSHOT_ASSERTIONS two \u001b[33m1\u001b[39m\n',
  ],
])('assertion evidence %s preserves the real counts', (_mode, output) => {
  expect(assertionCounts(output)).toEqual([6, 1])
  expect(() => assertAssertionEvidence(output, 2, 'parser control')).not.toThrow()
})

test.each([
  ['missing', '', 1, []],
  ['zero', '\u001b[22mSNAPSHOT_ASSERTIONS empty \u001b[33m0\u001b[39m\n', 1, [0]],
  ['partial', 'SNAPSHOT_ASSERTIONS one 6\n', 2, [6]],
] as const)('assertion evidence %s still rejects invalid proof', (_mode, output, passedTests, expectedCounts) => {
  expect(assertionCounts(output)).toEqual(expectedCounts)
  expect(() => assertAssertionEvidence(output, passedTests, 'invalid proof')).toThrow()
})

const cases = [
  { mode: 'effect-control', file: 'sprite', title: 'magic effect:', result: 'pass' },
  { mode: 'missing-effect', file: 'sprite', title: 'magic effect:', result: 'fail' },
  { mode: 'empty-enemy', file: 'sprite', title: 'battle enemy:', result: 'fail' },
  { mode: 'empty-player', file: 'sprite', title: 'battle player:', result: 'fail' },
  { mode: 'empty-fire', file: 'sprite', title: 'magic fire:', result: 'fail' },
  { mode: 'empty-npc', file: 'sprite', title: 'npc:', result: 'fail' },
  { mode: 'absent-sprite', file: 'sprite', result: 'skip' },
  { mode: 'absent-sprite-extracted', file: 'sprite', result: 'skip' },
  { mode: 'absent-rng', file: 'rng', result: 'skip' },
  { mode: 'absent-rng-directory', file: 'rng', result: 'skip' },
  { mode: 'absent-tileset', file: 'tileset', result: 'skip' },
  { mode: 'absent-tileset-directory', file: 'tileset', result: 'skip' },
  { mode: 'rng-control', file: 'rng', result: 'pass' },
  { mode: 'missing-rng-blob', file: 'rng', result: 'fail' },
  { mode: 'empty-rng-chunk', file: 'rng', result: 'pass' },
  { mode: 'zero-rng-chunks', file: 'rng', result: 'fail' },
  { mode: 'tileset-control', file: 'tileset', title: 'mapNum=1:', result: 'pass' },
  { mode: 'missing-tileset', file: 'tileset', title: 'mapNum=1:', result: 'fail' },
  { mode: 'denied-rng', file: 'rng', result: 'denied' },
  { mode: 'denied-tileset', file: 'tileset', title: 'mapNum=1:', result: 'denied' },
] as const

test.each(cases)('$mode → $result (real resource test runner)', (item) => {
  const config = join(logs, `${item.mode}.config.mjs`)
  const json = join(logs, `${item.mode}.json`)
  writeFileSync(
    config,
    `export default {
    root:${JSON.stringify(game)},
    test:{environment:'node',include:['src/assets/${item.file}-blob-snapshot.test.ts'],
      setupFiles:[${JSON.stringify(join(game, 'src/assets/__tests__/snapshot-input.setup.ts'))}],
      maxWorkers:1,fileParallelism:false,coverage:{enabled:false}}
  };`,
  )
  const run = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--config',
      config,
      ...('title' in item ? ['-t', item.title] : []),
      '--reporter=default',
      '--reporter=json',
      '--outputFile.json',
      json,
    ],
    {
      cwd: game,
      env: { ...process.env, TYPE_PAL_SNAPSHOT_INPUT_CASE: item.mode },
      encoding: 'utf8',
      timeout: 20_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  )
  const output = (run.stdout ?? '') + (run.stderr ?? '')
  const log = join(logs, `${item.mode}.log`)
  writeFileSync(log, output)
  expect(run.error, log).toBeUndefined()
  expect(run.signal, log).toBeNull()
  expect(output, log).toContain(`SNAPSHOT_INPUT_CASE ${item.mode}`)
  expect(output, log).not.toMatch(
    /TypeError|ReferenceError|SyntaxError|Test timed out|Unhandled Errors/,
  )
  const report = JSON.parse(readFileSync(json, 'utf8')) as {
    numPassedTests: number
    numPendingTests: number
    numFailedTestSuites: number
    testResults: Array<{
      assertionResults: Array<{ status: string; title: string; failureMessages: string[] }>
    }>
  }
  const assertions = report.testResults.flatMap((suite) => suite.assertionResults)
  if (item.result === 'skip') {
    expect(run.status, log).toBe(0)
    expect(report.numFailedTestSuites, log).toBe(0)
    expect(report.numPassedTests, log).toBe(0)
    expect(report.numPendingTests, log).toBeGreaterThan(0)
    expect(output, log).not.toContain('SNAPSHOT_READ')
  } else if (item.result === 'pass') {
    expect(run.status, log).toBe(0)
    expect(report.numPassedTests, log).toBeGreaterThan(0)
    assertAssertionEvidence(output, report.numPassedTests, log)
    expect(output, log).toContain('SNAPSHOT_READ')
  } else if (item.result === 'denied') {
    expect(run.status, log).toBe(1)
    expect(output, log).toContain('SNAPSHOT_PERMISSION_DENIED')
    expect(report.numPassedTests, log).toBe(0)
  } else {
    expect(run.status, log).toBe(1)
    const failures = assertions.filter((entry) => entry.status === 'failed')
    expect(failures.length, log).toBeGreaterThan(0)
    expect(failures.flatMap((entry) => entry.failureMessages).join('\n'), log).toContain(
      'AssertionError',
    )
    expect(output, log).not.toContain('SNAPSHOT_UNEXPECTED_MISSING_READ')
  }
}, 30_000)
