/** Isolated single-point business controls; never edits production or coverage/fast. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-content-boundaries-mutants-'))
const modules = [
  'actor-condition',
  'project-map',
  'battle-sprite',
  'rewards',
  'runtime-script',
  'scene-index',
]
const tests = modules.map((name) => `src/${name}.boundaries.test.ts`)
const mutations = [
  {
    id: 'status-clear',
    module: 'actor-condition',
    from: 'previous.filter((entry) => entry.status !== condition.status)',
    to: 'previous.filter((entry) => entry.status === condition.status)',
    title:
      'status refresh preserves unrelated entries and clearing is idempotent without materializing absent fields',
  },
  {
    id: 'poison-noop',
    module: 'actor-condition',
    from: 'return before !== JSON.stringify({ hp: carrier.hp, poisons: carrier.poisons ?? [] })',
    to: 'return true',
    title: 'poison add and selective clear preserve the other poison tick cursor',
  },
  {
    id: 'visual-owner',
    module: 'project-map',
    from: 'const owner = visualOwners.get(key)',
    to: 'const owner = undefined',
    title: 'map rejects cross-group visual owner while preserving the entire rejected input',
  },
  {
    id: 'collision-owner',
    module: 'project-map',
    from: 'const owner = collisionOwners.get(key)',
    to: 'const owner = undefined',
    title: 'map rejects cross-group collision owner while preserving the entire rejected input',
  },
  {
    id: 'map-input-alias',
    module: 'project-map',
    from: 'return { row, col }',
    to: 'return value',
    title:
      'map authoring sorts identities and owned slots deterministically without sorting the actual input',
  },
  {
    id: 'enemy-magic-gap',
    module: 'battle-sprite',
    from: 'if (magic.start !== idle.start + idle.count)',
    to: 'if (false)',
    title: 'battle sprite rejects magic gap without mutating the submitted profile',
  },
  {
    id: 'enemy-idle-empty',
    module: 'battle-sprite',
    from: 'if (idle.count === 0)',
    to: 'if (false)',
    title: 'battle sprite rejects idle empty without mutating the submitted profile',
  },
  {
    id: 'reward-level-cap',
    module: 'rewards',
    from: 'if (c.level >= MAX_LEVEL) continue',
    to: 'if (false) continue',
    title:
      'reward level cap still consumes thresholds without growth, skill grants or random calls',
  },
  {
    id: 'hidden-round-order',
    module: 'rewards',
    from: 'Math.trunc((expGained * count) / total) * 2',
    to: 'Math.trunc((expGained * count * 2) / total)',
    title:
      'hidden exp floors before doubling and preserves existing pools without input-count mutation',
  },
  {
    id: 'runtime-options',
    module: 'runtime-script',
    from: '...options,',
    to: '',
    title: 'runtime forwards the same cue and full nested path to the supplied dialogue validator',
  },
  {
    id: 'lifecycle-extra-field',
    module: 'runtime-script',
    from: "exactKeys(value, ['kind', 'target'], path)",
    to: "exactKeys(value, ['kind', 'target', 'ticks'], path)",
    title:
      'runtime shared-script explicit path and scene-hook wrappers preserve recursive lifecycle validation',
  },
  {
    id: 'scene-path-collision',
    module: 'scene-index',
    from: '!ids.has(id) && !paths.has(path)',
    to: '!ids.has(id)',
    title:
      'scene identity fallback avoids normalized path collisions and custom index self-overwrite',
  },
  {
    id: 'scene-input-mutation',
    module: 'scene-index',
    from: 'return { id: raw.id, name: raw.name.trim(), path }',
    to: 'raw.path = path; return { id: raw.id, name: raw.name.trim(), path }',
    title:
      'scene identity fallback avoids normalized path collisions and custom index self-overwrite',
  },
]
const sourcePath = (name) => resolve(root, `packages/content/src/${name}.ts`)
const hash = (name) =>
  createHash('sha256')
    .update(readFileSync(sourcePath(name)))
    .digest('hex')
const hashes = Object.fromEntries(modules.map((name) => [name, hash(name)]))
const assertionOnly = (entry) =>
  entry.status === 'failed' &&
  entry.failureMessages.length > 0 &&
  entry.failureMessages.every((message) => /^AssertionError(?:\b|:)/.test(message.trimStart()))
assert(assertionOnly({ status: 'failed', failureMessages: ['AssertionError: expected'] }))
for (const messages of [
  ['Error: embeds AssertionError'],
  ['AssertionError: expected', 'TypeError: fixture'],
  ['Error: Test timed out'],
])
  assert(!assertionOnly({ status: 'failed', failureMessages: messages }))
assert(!assertionOnly({ status: 'pending', failureMessages: [] }))
const evidence = []
for (const mutation of [null, ...mutations]) {
  const id = mutation?.id ?? 'control'
  if (mutation)
    assert.equal(
      readFileSync(sourcePath(mutation.module), 'utf8').split(mutation.from).length - 1,
      1,
      `${id}: unique needle required`,
    )
  const report = join(output, `${id}.json`)
  const config = join(output, `${id}.config.mjs`)
  writeFileSync(
    config,
    `import {readFileSync} from 'node:fs';
const mutation=${JSON.stringify(mutation)}, target=${JSON.stringify(mutation ? sourcePath(mutation.module) : '')};
export default {root:${JSON.stringify(resolve(root, 'packages/content'))},
plugins:mutation?[{name:'isolated-content-boundary',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(mutation.from).length!==2)throw Error('needle not unique');return source.replace(mutation.from,mutation.to)}}]:[],
test:{include:${JSON.stringify(tests)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};\n`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    encoding: 'utf8',
  })
  writeFileSync(join(output, `${id}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  assert.equal(run.signal, null, `${id}: terminated`)
  assert(
    !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/.test(
      stripVTControlCharacters(`${run.stdout ?? ''}\n${run.stderr ?? ''}`),
    ),
    `${id}: unhandled runtime error`,
  )
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert.equal(data.numTotalTests, 77, `${id}: wrong scope`)
  assert.equal(data.numPendingTests, 0)
  assert.equal(data.numTodoTests, 0)
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite-level failure`,
  )
  const assertions = data.testResults.flatMap((file) => file.assertionResults)
  assert.equal(assertions.length, 77)
  assert.equal(new Set(assertions.map((entry) => entry.fullName)).size, 77)
  const failed = assertions.filter((entry) => entry.status === 'failed')
  assert.equal(run.status, mutation ? 1 : 0, `${id}: unexpected exit; see ${output}`)
  assert.equal(data.success, !mutation)
  if (mutation) {
    assert(failed.length > 0 && failed.every(assertionOnly), `${id}: non-business failure`)
    assert.equal(
      failed.filter((entry) => entry.fullName === mutation.title).length,
      1,
      `${id}: exact intended case not red`,
    )
  } else {
    assert.equal(failed.length, 0)
    assert.equal(data.numPassedTests, 77)
  }
  for (const [name, before] of Object.entries(hashes))
    assert.equal(hash(name), before, `${id}: production modified`)
  evidence.push({
    id,
    exitCode: run.status,
    tests: data.numTotalTests,
    failed: failed.map((entry) => entry.fullName),
  })
  console.log(`${id}: ${mutation ? 'business red' : 'green'}`)
}
writeFileSync(join(output, 'summary.json'), `${JSON.stringify({ hashes, evidence }, null, 2)}\n`)
console.log(`Content boundary oracles passed: 1 control + ${mutations.length} mutations. ${output}`)
