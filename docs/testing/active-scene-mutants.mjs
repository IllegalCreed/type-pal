/** Real-module single-point mutations; only temporary loader output changes. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { preciseCoverageEnvironment } from '../../scripts/coverage/environment.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-active-scene-mutants-'))
const files = ['active-scene', 'world-camera']
const mutations = [
  {
    id: 'baseline-clear',
    source: 'active-scene',
    test: 'active-scene',
    title:
      'ActiveScene prepared-state ownership next scene clears old actions, baseline and wave cache and settles the actual old waiter',
    from: 'this.entityStaticBaseline.clear()',
    to: 'void 0',
  },
  {
    id: 'wave-reset',
    source: 'active-scene',
    test: 'active-scene',
    title:
      'ActiveScene prepared-state ownership next scene clears old actions, baseline and wave cache and settles the actual old waiter',
    from: 'this.wave = null\n    this.sprites = plan.entityDefs',
    to: 'void 0\n    this.sprites = plan.entityDefs',
  },
  {
    id: 'action-seed',
    source: 'active-scene',
    test: 'active-scene',
    title:
      'ActiveScene prepared-state ownership map replacement changes only map-owned resources, retaining action time, scene and current bounds timing',
    from: 'this.actions.replaceScene(plan.pageActions)',
    to: 'void plan.pageActions',
  },
  {
    id: 'pan-rounding',
    source: 'world-camera',
    test: 'world-camera',
    title:
      'WorldCamera ownership pan advances on render steps, retaining the minimum step and rounded elapsed time',
    from: 'Math.round(dt / 16)',
    to: 'Math.floor(dt / 16)',
  },
  {
    id: 'relative-offset',
    source: 'world-camera',
    test: 'world-camera',
    title:
      'WorldCamera ownership snap uses target-minus-player and preserves the offset during subsequent player motion',
    from: 'pp.x - PARTY_OX + this.displacement.x',
    to: 'pp.x - PARTY_OX',
  },
  {
    id: 'reset-sampling',
    source: 'world-camera',
    test: 'world-camera',
    title:
      'WorldCamera ownership reset resolves the waiter and clears offset but leaves pixel position until host update',
    from: 'this.displacement.y = 0\n  }\n}',
    to: 'this.displacement.y = 0\n    this.update()\n  }\n}',
  },
  {
    id: 'pre-abort',
    source: 'world-camera',
    test: 'world-camera',
    title:
      'WorldCamera ownership pre-aborted request rejects without settling or replacing the running pan',
    from: "if (signal.aborted) throw asyncIntentAbortError('相机移动所属 runner 已取消')",
    to: 'void signal',
  },
]

const clean = (value) => stripVTControlCharacters(value)
function businessRed(exit, entries, file, title) {
  const executed = entries.filter((entry) => ['passed', 'failed'].includes(entry.status))
  if (exit !== 1 || executed.length !== 1) return false
  const [entry] = executed
  return (
    entry.file === file &&
    entry.fullName === title &&
    entry.status === 'failed' &&
    entry.failureMessages.length > 0 &&
    entry.failureMessages.every(
      (message) =>
        /^AssertionError(?:\b|:)/.test(clean(message).trimStart()) &&
        !/(?:\btimeout\b|\btimed out\b|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
          clean(message),
        ),
    )
  )
}
const sample = {
  file: '/candidate.test.ts',
  fullName: 'exact',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
assert(businessRed(1, [sample], sample.file, sample.fullName))
assert(
  businessRed(
    1,
    [
      {
        ...sample,
        failureMessages: ['AssertionError: business\n    at runWithTimeout (runner.js:1:1)'],
      },
    ],
    sample.file,
    sample.fullName,
  ),
)
for (const [exit, entries] of [
  [0, [sample]],
  [2, [sample]],
  [null, [sample]],
  [1, []],
  [1, [sample, sample]],
  [1, [{ ...sample, file: '/other.test.ts' }]],
  [1, [{ ...sample, fullName: 'other' }]],
  [1, [{ ...sample, status: 'pending' }]],
  [1, [{ ...sample, failureMessages: ['Error: embedded AssertionError'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: business', 'TypeError: host'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: business\nError: host'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const { coveragePackages, listProductionSources } = await import(
  '../../scripts/coverage/config.mjs'
)
const sourceFiles = (await Promise.all(coveragePackages.map(listProductionSources)))
  .flat()
  .map((file) => file.slice(root.length + 1))
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(sourceFiles.map((file) => [file, hash(file)]))
const selected = process.env.ACTIVE_SCENE_MUTANT
assert(!selected || mutations.some(({ id }) => id === selected), 'unknown ACTIVE_SCENE_MUTANT')
const rows = []
let controls
for (const mutation of [null, ...mutations.filter(({ id }) => !selected || id === selected)]) {
  const id = mutation?.id ?? 'control'
  const report = resolve(output, `${id}.json`),
    config = resolve(output, `${id}.config.mjs`)
  const target = mutation ? resolve(root, `packages/reforge/src/${mutation.source}.ts`) : ''
  const testFile = mutation ? resolve(root, `packages/reforge/src/${mutation.test}.test.ts`) : ''
  const marker = resolve(output, `${id}.entered`)
  if (mutation) {
    assert.equal(
      readFileSync(target, 'utf8').split(mutation.from).length,
      2,
      `${id}: unique needle`,
    )
    assert.equal(
      controls.filter((entry) => entry.file === testFile && entry.fullName === mutation.title)
        .length,
      1,
      'exact passing control',
    )
  }
  const pattern = mutation
    ? `^${mutation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    : undefined
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(mutation)}, target=${JSON.stringify(target)};
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:item?[{name:'scene-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify((mutation ? [mutation.test] : files).map((file) => `src/${file}.test.ts`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: root,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  const log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  writeFileSync(resolve(output, `${id}.log`), log)
  assert.equal(run.signal, null)
  assert(
    !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(log)),
    `${id}: runtime error`,
  )
  const data = JSON.parse(readFileSync(report, 'utf8'))
  assert(
    data.testResults.every((file) => !file.message),
    `${id}: suite error`,
  )
  assert.equal(data.numTodoTests, 0)
  const entries = data.testResults.flatMap((file) =>
    file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
  )
  if (!mutation) {
    assert.equal(run.status, 0, `control: ${output}`)
    assert.equal(entries.length, 17)
    assert.equal(data.numPassedTests, 17)
    assert.equal(data.numPendingTests, 0)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 17)
    controls = entries
  } else {
    assert(
      businessRed(run.status, entries, testFile, mutation.title),
      `${id}: not candidate business red; ${output}`,
    )
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target })
    assert.equal(
      data.numPendingTests,
      controls.filter((entry) => entry.file === testFile).length - 1,
    )
  }
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(hash(file), expected, `${id}: changed product`)
  rows.push({
    id,
    exit: run.status,
    executed: entries
      .filter((entry) => ['passed', 'failed'].includes(entry.status))
      .map(({ file, fullName, status, failureMessages }) => ({
        file,
        fullName,
        status,
        failureMessages,
      })),
  })
  console.log(
    `${id}: ${mutation ? 'detected (candidate AssertionError)' : `${data.numPassedTests} passing`}`,
  )
}
writeFileSync(
  resolve(output, 'summary.json'),
  `${JSON.stringify({ hashes, judge: { positive: 2, rejected: 12 }, rows }, null, 2)}\n`,
)
console.log(`Evidence: ${output}`)
