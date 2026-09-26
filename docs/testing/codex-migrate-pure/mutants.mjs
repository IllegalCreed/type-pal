import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'actor-alias',
    group: 'records',
    from: 'leveling: { expTable: [...expTable] }',
    to: 'leveling: { expTable }',
    fullName:
      'self-contained migration records actor copies experience/equipment/magic; absence and resolver omissions do not synthesize resources',
  },
  {
    id: 'status-gate',
    group: 'skill-effects',
    from: "out.effects.push({ kind: 'gate', magicResist: true })",
    to: 'void 0',
    fullName:
      'self-contained skill effect translation status application preserves zero-resistance gate',
  },
  {
    id: 'item-cost-default',
    group: 'skills',
    from: 'const amount = remove.operands?.[1] || 1',
    to: 'const amount = remove.operands?.[1] ?? 1',
    fullName:
      'self-contained skill record assembly item-cost recognition requires complete remove/end shape and preserves default count of one',
  },
  {
    id: 'last-form',
    group: 'equipment',
    from: "out.effects = out.effects.filter((effect) => effect.kind !== 'battleSprite')",
    to: 'void 0',
    fullName:
      'self-contained equipment translation last battle form assignment replaces only earlier form effects across all equipable actors',
  },
  {
    id: 'placement-alias',
    group: 'item-use',
    from: 'target: structuredClone(target)',
    to: 'target',
    fullName:
      'self-contained item use translation place-entity copies the resolved stable address and signed state, leaving legacy input intact',
  },
  {
    id: 'throw-gameplay',
    group: 'throw',
    from: 'if (b !== 0 || d !== 0)',
    to: 'if (false)',
    fullName:
      'self-contained thrown item translation simulated magic with gameplay parameters 1/0 is never downgraded to presentation',
  },
]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export function judge(run, data, needle, red) {
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
    resolve(root, `packages/migrate/src/migrate-${needle.group}.pure.test.ts`),
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
  const output = mkdtempSync(join(tmpdir(), 'codex-migrate-pure-mutants-'))
  const target = resolve(root, 'packages/migrate/src/migrate-content.ts')
  const hash = () => createHash('sha256').update(readFileSync(target)).digest('hex')
  const original = hash()
  const summary = []
  for (const needle of needles)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const report = join(output, `${id}.json`)
      const hit = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        PURE_NEEDLE: needle.id,
        PURE_RED: String(red),
        PURE_REPORT: report,
        PURE_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-migrate-pure/mutants.config.mjs',
          '-t',
          `^${needle.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        ],
        {
          cwd: root,
          env,
          encoding: 'utf8',
          timeout: 60000,
        },
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
