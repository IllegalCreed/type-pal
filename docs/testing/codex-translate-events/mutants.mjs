import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'fractional-offset',
    group: 'motion',
    suite: 'motion',
    from: "push({ kind: 'setEntityPosRelParty', entity: ent, dcol, drow })",
    to: "push({ kind: 'setEntityPosRelParty', entity: ent, dcol: Math.round(dcol), drow })",
    title:
      'absolute and party-relative positions preserve selector identity and signed fractional offsets',
    fullName:
      'current translation motion boundaries absolute and party-relative positions preserve selector identity and signed fractional offsets',
  },
  {
    id: 'equipment-slot',
    group: 'state',
    suite: 'state',
    from: "slot: (o[1] ?? 0) === 0 ? 'all' : (o[1] ?? 1) - 1,",
    to: "slot: (o[1] ?? 0) === 0 ? 'all' : (o[1] ?? 1),",
    title: 'party resource pools, resurrection and equipment slots retain distinct fields',
    fullName:
      'current translation state boundaries party resource pools, resurrection and equipment slots retain distinct fields',
  },
  {
    id: 'money-debit',
    group: 'branches',
    suite: 'branch',
    from: "body.push({ kind: 'giveMoney', delta: amt })\n          } else {",
    to: "body.push({ kind: 'giveMoney', delta: -amt })\n          } else {",
    title: 'insufficient money jumps before debit and positive awards do not spuriously branch',
    fullName:
      'current translation branch boundaries insufficient money jumps before debit and positive awards do not spuriously branch',
  },
  {
    id: 'pending-auto',
    group: 'bindings',
    suite: 'binding',
    from: 'ctx.pendingAuto = false',
    to: 'ctx.pendingAuto = true',
    title: 'pending auto-battle is consumed once while failure targets retain their own bodies',
    fullName:
      'current translation binding boundaries pending auto-battle is consumed once while failure targets retain their own bodies',
  },
  {
    id: 'origin-alias',
    group: 'registry',
    suite: 'registry',
    from: '...(origin ? { origin: structuredClone(origin) } : {}),',
    to: '...(origin ? { origin } : {}),',
    title: 'registerRoot clones origin and returned audit records without aliasing caller metadata',
    fullName:
      'current translation registry boundaries registerRoot clones origin and returned audit records without aliasing caller metadata',
  },
  {
    id: 'fade-duration',
    group: 'folds',
    suite: 'fold',
    from: 'outMs: absorbedFade.ms ?? 300,',
    to: 'outMs: 300,',
    title:
      'real loadScene source evidence becomes a bounded transition and never leaks the private address',
    fullName:
      'current translation fold boundaries real loadScene source evidence becomes a bounded transition and never leaks the private address',
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
    resolve(root, `packages/migrate/src/translate-events.${needle.group}.test.ts`),
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
  const output = mkdtempSync(join(tmpdir(), 'codex-translate-events-mutants-'))
  const target = resolve(root, 'packages/migrate/src/translate-events.ts')
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
        TRANSLATE_NEEDLE: needle.id,
        TRANSLATE_RED: String(red),
        TRANSLATE_REPORT: report,
        TRANSLATE_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-translate-events/mutants.config.mjs',
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
