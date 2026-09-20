/** Rebuildable in-memory controls: never edit product files or official coverage baselines. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-simulator-runtime-nc-'))
const cases = [
  {
    id: 'fourth-member',
    pkg: 'editor',
    path: 'packages/reforge/src/battle-trial-config.ts',
    needle: 'TRIAL_MAX_PARTY_MEMBERS = 3',
    replacement: 'TRIAL_MAX_PARTY_MEMBERS = 4',
    file: 'src/core/battle-trial-workflow.test.ts',
    title: 'fourth party member is rejected before runtime construction',
  },
  {
    id: 'source-bytes',
    pkg: 'editor',
    path: 'packages/reforge/src/battle-trial-assets.ts',
    needle: 'const retained = bytes.slice(0)',
    replacement: 'const retained = bytes',
    file: 'scripts/battle-trial-assets.test.ts',
    title: 'frozen bytes detach the source and every consumer; seal forbids uncached project IO',
  },
  {
    id: 'late-admission',
    pkg: 'editor',
    path: 'packages/editor/src/core/battle-trial-launch.ts',
    needle: '    await options.assertCanLaunch()\n    active()\n    const sourceToken',
    replacement: '    await options.assertCanLaunch()\n    const sourceToken',
    file: 'scripts/battle-trial-launch.test.ts',
    title: 'closing while admission is suspended prevents late project IO and delivery',
  },
  {
    id: 'save-hotkey',
    pkg: 'editor',
    path: 'packages/reforge/src/battle-trial-host.ts',
    needle: '    event.preventDefault()',
    replacement: '    if (!event.key.startsWith("F")) event.preventDefault()',
    file: 'scripts/battle-trial-host.test.ts',
    title:
      'real host enters BattleSession, rejects F5/F9 and releases its run without constructing any SaveStore',
  },
  {
    id: 'skill-injection',
    pkg: 'editor',
    path: 'packages/editor/src/core/battle-simulator-state.ts',
    needle: 'ids: [...new Set([...known, subject.id])]',
    replacement: 'ids: [...known]',
    file: 'scripts/battle-simulator-ui.test.tsx',
    title:
      'quick skill launch adds only the selected skill, preserves MP and original plan, and handles launch failure',
  },
  {
    id: 'music-release',
    pkg: 'reforge',
    path: 'packages/reforge/src/audio/bgm.ts',
    needle: 'disposal = Promise.resolve().then(() => runtime.dispose?.())',
    replacement: 'disposal = Promise.resolve()',
    file: 'src/audio/bgm.dispose.test.ts',
    title: 'dispose is idempotent and a late initialized backend never reads or plays a song',
  },
]
const businessFailure = (message) =>
  /^AssertionError:/.test(message) &&
  !/(?:^|\n)(?:TypeError|ReferenceError|SyntaxError|Error):|timed out/i.test(message)
assert.equal(businessFailure('AssertionError: expected 1 to be 0\n at test'), true)
for (const text of [
  'Error: nested AssertionError: nope',
  'TypeError: not a function',
  'AssertionError: test timed out',
  'AssertionError: x\nError: infrastructure',
])
  assert.equal(businessFailure(text), false)
const hash = (path) =>
  createHash('sha256')
    .update(readFileSync(join(root, path)))
    .digest('hex')
const before = new Map(cases.map((c) => [c.path, hash(c.path)]))
try {
  for (const c of cases) {
    assert.equal(
      readFileSync(join(root, c.path), 'utf8').split(c.needle).length - 1,
      1,
      `${c.id}: unique needle`,
    )
    for (const mutate of [false, true]) {
      const name = `${c.id}-${mutate ? 'mutant' : 'control'}`,
        config = join(output, `${name}.config.mjs`),
        report = join(output, `${name}.json`)
      writeFileSync(
        config,
        `import {defineConfig} from ${JSON.stringify(join(root, 'node_modules/vitest/dist/config.js'))};
export default defineConfig({root:${JSON.stringify(join(root, 'packages', c.pkg))},plugins:[{name:'runtime-negative-control',enforce:'pre',transform(code,id){if(${mutate} && id.split('?')[0]===${JSON.stringify(join(root, c.path))}) return code.replace(${JSON.stringify(c.needle)},${JSON.stringify(c.replacement)});}}],test:{include:[${JSON.stringify(c.file)}],maxWorkers:1}});`,
      )
      const result = spawnSync(
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--config',
          config,
          '-t',
          c.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          '--reporter=json',
          '--outputFile',
          report,
        ],
        { cwd: root, encoding: 'utf8' },
      )
      writeFileSync(join(output, `${name}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}`)
      const json = JSON.parse(readFileSync(report, 'utf8'))
      const executed = json.testResults
        .flatMap((f) => f.assertionResults)
        .filter((a) => a.title === c.title)
      assert.equal(executed.length, 1, `${name}: exact execution witness`)
      assert.equal(json.numRuntimeErrorTestSuites ?? 0, 0)
      assert.equal(result.status, mutate ? 1 : 0, `${name}: exit code`)
      assert.equal(executed[0].status, mutate ? 'failed' : 'passed')
      if (mutate) {
        assert.equal(json.numFailedTests, 1)
        assert.ok(executed[0].failureMessages.length > 0)
        assert.ok(
          executed[0].failureMessages.every(businessFailure),
          `${name}: must fail through its business assertion`,
        )
      } else assert.equal(json.numPassedTests, 1)
      console.log(`${name}: ${mutate ? 'detected (AssertionError)' : 'PASS'}`)
    }
  }
} finally {
  for (const [path, digest] of before) assert.equal(hash(path), digest, `product changed: ${path}`)
  console.log(`evidence: ${output}`)
}
