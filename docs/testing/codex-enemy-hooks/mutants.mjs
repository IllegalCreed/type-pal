import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'reset-non-root',
    group: 'cfg',
    from: ': advanceTo(reset)',
    to: ": { kind: 'restart' }",
    fullName:
      'enemy hook CFG evidence reset to another block advances and does not restart the root',
  },
  {
    id: 'dialog-speed',
    group: 'dialog',
    from: 'decoded.speed !== LEGACY_DIALOG_DEFAULT_SPEED',
    to: 'false',
    fullName:
      'enemy hook dialogue boundaries speaker and controls produce canonical cues with exact locale and source mapping',
  },
  {
    id: 'music-fade',
    group: 'media',
    from: 'fade * 3_000',
    to: 'fade * 2_000',
    fullName:
      'enemy hook media boundaries music start, immediate stop and the two fade durations stay distinct',
  },
  {
    id: 'divide-count',
    group: 'effects',
    from: 'copies: Math.max(1, operands[0] ?? 1)',
    to: 'copies: Math.max(1, operands[0] ?? 1) + 1',
    fullName:
      'enemy hook effect boundaries divide failure uses the effect identity and preserves both exact continuations',
  },
  {
    id: 'growth-overwrite',
    group: 'growth',
    from: 'previous.delta[field] += action.delta[field]',
    to: 'previous.delta[field] = action.delta[field]',
    fullName:
      'enemy hook growth boundaries adjacent growth aggregates all eight signed fields without losing the initial delta',
  },
  {
    id: 'instruction-limit',
    group: 'errors',
    from: 'MAX_REACHABLE_INSTRUCTIONS = 2_048',
    to: 'MAX_REACHABLE_INSTRUCTIONS = 2_049',
    fullName:
      'enemy hook source admission the instruction limit accepts its boundary and rejects one additional reachable instruction',
  },
]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
function judge(run, data, needle, red) {
  assert.equal(run.status, red ? 1 : 0)
  assert.equal(run.signal, null)
  assert.doesNotMatch(
    `${run.stdout}\n${run.stderr}`,
    /Unhandled Errors?|Unhandled Rejection|Uncaught Exception/,
  )
  const executed = data.testResults.flatMap((r) => {
    assert.ok(!r.message, r.message)
    return r.assertionResults
      .filter((a) => a.status !== 'skipped')
      .map((a) => ({ ...a, file: r.name }))
  })
  assert.equal(executed.length, 1)
  const entry = executed[0]
  assert.equal(entry.fullName, needle.fullName)
  assert.equal(
    entry.file,
    resolve(root, `packages/migrate/src/translate-enemy-hook-flow.${needle.group}.test.ts`),
  )
  assert.equal(entry.status, red ? 'failed' : 'passed')
  assert.equal(data.numFailedTests, red ? 1 : 0)
  assert.equal(data.numPassedTests, red ? 0 : 1)
  if (red) {
    assert.ok(entry.failureMessages.length > 0)
    for (const message of entry.failureMessages) {
      assert.match(message.trimStart(), /^AssertionError\b/)
      assert.doesNotMatch(
        message,
        /(^|\n)\s*(?:Error|TypeError|RangeError|ReferenceError|SyntaxError):/,
      )
      assert.doesNotMatch(message, /timed[\s_-]+out|TimeoutError/i)
    }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = mkdtempSync(join(tmpdir(), 'codex-enemy-hooks-mutants-'))
  const target = resolve(root, 'packages/migrate/src/translate-enemy-hook-flow.ts')
  const hash = () => createHash('sha256').update(readFileSync(target)).digest('hex')
  const original = hash(),
    summary = []
  for (const needle of needles)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const report = join(output, `${id}.json`),
        hit = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        ENEMY_HOOK_NEEDLE: needle.id,
        ENEMY_HOOK_RED: String(red),
        ENEMY_HOOK_REPORT: report,
        ENEMY_HOOK_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-enemy-hooks/mutants.config.mjs',
          '-t',
          `^${needle.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        ],
        { cwd: root, env, encoding: 'utf8', timeout: 60000 },
      )
      writeFileSync(join(output, `${id}.log`), `${run.stdout}\n${run.stderr}`)
      const data = JSON.parse(readFileSync(report, 'utf8'))
      judge(run, data, needle, red)
      if (red) {
        assert.deepEqual(JSON.parse(readFileSync(hit, 'utf8')), { id: needle.id, target })
        for (const status of [0, 2, null])
          assert.throws(() => judge({ ...run, status }, data, needle, true))
        assert.throws(() => judge(run, data, { ...needle, fullName: 'wrong title' }, true))
        for (const message of [
          'Error: contains AssertionError',
          'AssertionError: mismatch\n TypeError: secondary',
          'AssertionError: timed out',
        ]) {
          const copy = structuredClone(data)
          copy.testResults
            .flatMap((r) => r.assertionResults)
            .find((a) => a.status === 'failed').failureMessages = [message]
          assert.throws(() => judge(run, copy, needle, true))
        }
      }
      assert.equal(hash(), original)
      summary.push({
        id,
        exit: run.status,
        passed: data.numPassedTests,
        failed: data.numFailedTests,
      })
      console.log(`${id}: ${red ? 'detected' : 'green'}`)
    }
  writeFileSync(join(output, 'summary.json'), JSON.stringify({ original, summary }, null, 2))
  console.log(output)
}
