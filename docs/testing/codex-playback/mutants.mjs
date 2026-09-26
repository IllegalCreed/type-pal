import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'resume-dialog',
    group: 'controls',
    from: "this.mode = 'running'\n    for (const r of this.gateQueue",
    to: "this.mode = 'running'\n    this.confirmDialog()\n    for (const r of this.gateQueue",
    fullName:
      'Canonical preview controls resume releases the gate but never accepts an open dialogue',
  },
  {
    id: 'move-threshold',
    group: 'motion',
    from: 'while (mv.acc >= mv.stepMs)',
    to: 'while (mv.acc >= mv.stepMs / 2)',
    fullName:
      "Canonical preview movement party speed 'normal' accumulates partial ticks and finishes at exact endpoint",
  },
  {
    id: 'restore-frame',
    group: 'entities',
    from: 'overlay.frame = 0',
    to: 'overlay.frame = 1',
    fullName:
      'Canonical preview entity overlays current lifecycle hide/restore/suspend/remove preserves scene definitions',
  },
  {
    id: 'fade-alpha',
    group: 'presentation',
    from: "this.view.fadeBlack = f.dir === 'out' ? t : 1 - t",
    to: "this.view.fadeBlack = f.dir === 'out' ? t : 0",
    fullName:
      "Canonical preview presentation clock entry 'fade' finishes preparation before blocking reveal and body",
  },
  {
    id: 'lost-count',
    group: 'effects',
    from: `loseItem: (itemId, count) => this.log(\`📤 失 \${this.itemLabel(itemId)} ×\${count}\`)`,
    to: `loseItem: (itemId, count) => this.log(\`📤 失 \${this.itemLabel(itemId)} ×1\`)`,
    fullName:
      'Canonical preview effect boundaries item labels, default counts and signed money are logs without modifying authored data',
  },
  {
    id: 'query-ownership',
    group: 'queries',
    from: 'ownsItem: () => false',
    to: 'ownsItem: () => true',
    fullName:
      "Canonical preview query and scratch boundaries stub query 'ownership' selects the explicit arm",
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
    resolve(root, `packages/editor/src/core/playback.${needle.group}.test.ts`),
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
  const output = mkdtempSync(join(tmpdir(), 'codex-playback-mutants-'))
  const target = resolve(root, 'packages/editor/src/core/playback.ts')
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
        PLAYBACK_NEEDLE: needle.id,
        PLAYBACK_RED: String(red),
        PLAYBACK_REPORT: report,
        PLAYBACK_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-playback/mutants.config.mjs',
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
