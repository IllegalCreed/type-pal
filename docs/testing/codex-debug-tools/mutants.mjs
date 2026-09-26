import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const needles = [
  {
    id: 'money-delta',
    group: 'commands',
    from: 'const delta = n - ctx.world().money',
    to: 'const delta = n',
    fullName:
      'Debug console public commands money 20 reaches the real runtime with exact effect arguments',
  },
  {
    id: 'operation-removal',
    group: 'failures',
    from: '.finally(() => panelOperations.delete(controller))',
    to: '.finally(() => undefined)',
    fullName: 'Debug operation failures completed operation is removed from disposal abort set',
  },
  {
    id: 'hook-channel',
    group: 'triggers',
    from: "runtime.runSceneHook(scene, item.id as 'onEnter' | 'onTeleport',",
    to: "runtime.runSceneHook(scene, 'onEnter',",
    fullName:
      'Debug trigger current runtime a onTeleport runs its actual channel and removes only its temporary running button',
  },
  {
    id: 'preset-hp',
    group: 'battle',
    from: '...(hp !== undefined ? { hp } : {})',
    to: '...(hp ? { hp } : {})',
    fullName:
      'Debug battle request construction existing team uses real preset construction without changing live world or project',
  },
  {
    id: 'poison-inspect',
    group: 'inspect',
    from: 'poisons: c.poisons?.map((p) => p.poisonId)',
    to: 'poisons: c.poisons?.map(() => 0)',
    fullName:
      'Debug inspection projections state refresh projects statuses, poison and script counts from one actual world without mutation',
  },
  {
    id: 'layer-owner',
    group: 'navigation',
    from: 'ctx.layers.collision = collisionCb.checked',
    to: 'ctx.layers.collision = !collisionCb.checked',
    fullName:
      'Debug layer and navigation actions console and checkbox layer toggles share one model and do not enable frame stepping implicitly',
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
    resolve(root, `packages/reforge/src/debug-tools.${needle.group}.test.ts`),
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
  const output = mkdtempSync(join(tmpdir(), 'codex-debug-tools-mutants-'))
  const target = resolve(root, 'packages/reforge/src/debug-tools.ts')
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
        DEBUG_TOOLS_NEEDLE: needle.id,
        DEBUG_TOOLS_RED: String(red),
        DEBUG_TOOLS_REPORT: report,
        DEBUG_TOOLS_HIT: hit,
      }
      delete env.NODE_COMPILE_CACHE
      const run = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          'docs/testing/codex-debug-tools/mutants.config.mjs',
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
