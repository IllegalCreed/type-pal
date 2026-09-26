import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'teleport-height',
    group: 'movement',
    from: 'onChange={(n) => set({ pos: { ...cmd.pos, col: n } })}',
    to: 'onChange={(n) => set({ pos: { ...cmd.pos, col: n, height: 0 } })}',
    fullName:
      "Current command motion aggregate 'teleport col' commits exact sibling-preserving command",
  },
  {
    id: 'retarget-entry',
    group: 'scene',
    from: "return makeLoadScene(scene, { mode: 'default' }, command.facing, command.transition)",
    to: "return makeLoadScene(scene, { mode: 'entry', entryId: 'back' }, command.facing, command.transition)",
    fullName:
      'Current scene destination aggregate retargeting through the dialog clears old entry and preserves facing and source timing',
  },
  {
    id: 'flag-bool',
    group: 'data',
    from: "onChange={(v) => set({ value: v === 'true' })}",
    to: "onChange={(v) => set({ value: v !== 'true' })}",
    fullName:
      'Current command data references flag reference and boolean are edited together with no intermediate parent commit',
  },
  {
    id: 'appearance-clear',
    group: 'identity',
    from: 'onChange={(battleSprite) => set({ battleSprite: battleSprite || undefined })}',
    to: 'onChange={(battleSprite) => set({ battleSprite: battleSprite || cmd.battleSprite })}',
    fullName:
      'Current command actor appearance battle appearance can be cleared while world sprite remains explicit',
  },
  {
    id: 'auto-zero',
    group: 'dialog',
    from: 'autoAdvance: e.target.checked ? 0 : undefined',
    to: 'autoAdvance: e.target.checked ? 40 : undefined',
    fullName:
      'Current author dialogue aggregate fields automatic advance permits zero and a configured delay before one aggregate commit',
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
    resolve(root, `packages/editor/src/ui/CommandForm.current-${needle.group}.test.tsx`),
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
  const output = mkdtempSync(join(tmpdir(), 'codex-command-forms-mutants-'))
  const target = resolve(root, 'packages/editor/src/ui/CommandForm.tsx')
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
        CURRENT_FORMS_NEEDLE: needle.id,
        CURRENT_FORMS_RED: String(red),
        CURRENT_FORMS_REPORT: report,
        CURRENT_FORMS_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-command-forms/mutants.config.mjs',
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
