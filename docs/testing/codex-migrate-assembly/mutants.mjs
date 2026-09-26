import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'address-guard',
    group: 'records',
    from: '\n    if (command.label !== undefined && command.label !== expected)',
    to: '\n    if (false)',
    title: 'mismatched source label is rejected before any sound resolution or source mutation',
  },
  {
    id: 'equipment-flag',
    group: 'equipment',
    from: 'if (srcItem.flags.equipable) {',
    to: 'if (true) {',
    title: 'equipable flag controls assembly even when an equipment script is present',
  },
  {
    id: 'pool-store',
    group: 'use',
    from: 'src.stores?.find((store) => store.id === 0)?.items',
    to: 'src.stores?.[0]?.items',
    title: 'resource pool uses Store zero rather than the first store and owns its reward records',
  },
  {
    id: 'object-magic-link',
    group: 'throw',
    from: 'const magic = object ? magicById.get(object.magicNumber) : undefined',
    to: 'const magic = object ? magicById.get(objectId) : undefined',
    title:
      'actual OBJECT to MAGIC lookup preserves signed offsets, sound and layer in presentation',
  },
  {
    id: 'hook-closure',
    group: 'enemies',
    from: "command.kind === 'setFallback' && command.fallback?.action.kind === 'cast'",
    to: 'false',
    title:
      'fallback and hook casts close over missing skills once in numeric order through real enemy translation',
  },
  {
    id: 'partial-use',
    group: 'diagnostics',
    from: '} else if (u.pendingReason) {',
    to: '} else if (false) {',
    title: 'unsupported command rejects the entire use instead of publishing the successful prefix',
  },
].map((n) => ({ ...n, fullName: `current migration assembly ${n.group} ${n.title}` }))

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
    resolve(root, `packages/migrate/src/migrate-all.${needle.group}.test.ts`),
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
  const output = mkdtempSync(join(tmpdir(), 'codex-migrate-assembly-mutants-'))
  const target = resolve(root, 'packages/migrate/src/migrate-content.ts')
  const hash = () => createHash('sha256').update(readFileSync(target)).digest('hex')
  const original = hash()
  const summary = []
  for (const needle of needles)
    for (const red of [false, true]) {
      const id = `${needle.id}-${red ? 'red' : 'green'}`
      const report = join(output, `${id}.json`),
        hit = join(output, `${id}.hit.json`)
      const env = {
        ...process.env,
        ASSEMBLY_NEEDLE: needle.id,
        ASSEMBLY_RED: String(red),
        ASSEMBLY_REPORT: report,
        ASSEMBLY_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-migrate-assembly/mutants.config.mjs',
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
