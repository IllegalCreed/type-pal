import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'arrival-priority',
    group: 'entries',
    from: 'sceneArrivals.find((arrival) => arrival.src >= 0)?.pos ??',
    to: 'sceneArrivals.find((arrival) => arrival.src === -1)?.pos ??',
    title: 'local arrivals use sorted source identity rather than Map insertion order',
  },
  {
    id: 'explicit-south',
    group: 'entities',
    from: 'const dir = autoDir ?? eo.direction ?? 0',
    to: 'const dir = autoDir || eo.direction || 0',
    title:
      'shared auto head skips waits and animation, ignores sentinel direction and allows explicit south',
  },
  {
    id: 'story-tail',
    group: 'encounters',
    from: 'if (!flat.every((c) => encounterKinds.has(c.kind))) return undefined',
    to: 'if (false) return undefined',
    title: 'non-template suffix keeps executable pages instead of discarding story commands',
  },
  {
    id: 'author-metadata',
    group: 'bindings',
    from: '...(oldPage.trigger ?? newPage.trigger),',
    to: '...newPage.trigger,',
    title:
      'script synchronization preserves authored metadata and replaces only the fresh script ports',
  },
  {
    id: 'session-body-alias',
    group: 'sessions',
    from: 'structuredClone(session.registry.bodyFor(record.id) ?? []),',
    to: 'session.registry.bodyFor(record.id) ?? [],',
    title: 'session finish owns locale report registry bodies and new sprite deltas',
  },
  {
    id: 'ambiguous-default',
    group: 'defaults',
    from: 'if (vals.size === 1) {',
    to: 'if (vals.size >= 1) {',
    title: 'ambiguous fields stay unresolved while a unique music value may still propagate',
  },
].map((n) => ({ ...n, fullName: `current scene migration ${n.group} ${n.title}` }))
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
    resolve(root, `packages/migrate/src/migrate-scenes.${needle.group}.test.ts`),
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
  const output = mkdtempSync(join(tmpdir(), 'codex-migrate-scenes-mutants-'))
  const target = resolve(root, 'packages/migrate/src/migrate-content.ts')
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
        SCENES_NEEDLE: needle.id,
        SCENES_RED: String(red),
        SCENES_REPORT: report,
        SCENES_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-migrate-scenes/mutants.config.mjs',
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
