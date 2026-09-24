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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-scene-mutants-'))
const files = ['scene-resources', 'scene-preparer', 'scene-preflight.chain']
const mutations = [
  {
    id: 'entry-seed',
    source: 'scene-resources',
    test: 'scene-resources',
    title: 'scene resource owner seeds the real entry and caches successful canonical reads only',
    from: 'this.#scenes.set(entry.id, entry)',
    to: 'void entry',
  },
  {
    id: 'map-touch',
    source: 'scene-resources',
    test: 'scene-resources',
    title: 'map LRU touches hits and evicts the least recent key at the seventeenth completed map',
    from: 'this.#maps.delete(id)',
    to: 'void id',
  },
  {
    id: 'palette-memo',
    source: 'scene-resources',
    test: 'scene-resources',
    title: 'palette rejection keeps the existing memo policy and exact error',
    from: 'this.#palette ??= this.readers.loadPalette()',
    to: 'this.#palette = this.readers.loadPalette()',
  },
  {
    id: 'reference-memo',
    source: 'scene-resources',
    test: 'scene-resources',
    title: 'references rejection keeps the existing memo policy and exact error',
    from: 'this.#references ??= this.readers.loadAllScenes()',
    to: 'this.#references = this.readers.loadAllScenes()',
  },
  {
    id: 'world-freeze',
    source: 'scene-preparer',
    test: 'scene-preparer',
    title: 'world and explicit script are frozen before the first scene read can resume',
    from: 'const preparedWorld = structuredClone(worldView)',
    to: 'const preparedWorld = worldView',
  },
  {
    id: 'script-freeze',
    source: 'scene-preparer',
    test: 'scene-preparer',
    title: 'world and explicit script are frozen before the first scene read can resume',
    from: ': structuredClone(scriptState)',
    to: ': scriptState',
  },
  {
    id: 'override-freeze',
    source: 'scene-preparer',
    test: 'scene-preparer',
    title: 'actor override definitions are cloned on entry while the selected world can opt out',
    from: 'def: structuredClone(override.def)',
    to: 'def: override.def',
  },
  {
    id: 'dependency-guard',
    source: 'scene-preparer',
    test: 'scene-preparer',
    title: 'inventory changes invalidate only the captured dependency footprint',
    from: 'assertSceneSwitchDependenciesCurrent(\n      plan.dependencies,',
    to: '(() => undefined)(\n      plan.dependencies,',
  },
  {
    id: 'sounds-barrier',
    source: 'scene-preparer',
    test: 'scene-preparer',
    title:
      'sound readiness is awaited before plan publication, not detached from the scene barrier',
    from: 'this.ports.prepareSounds(def, preparedWorld),',
    to: 'Promise.resolve(),',
  },
  {
    id: 'main-sync-entry',
    source: 'main',
    test: 'scene-preflight.chain',
    title:
      'WORLD-ASYNC-COMMIT-1 real main preflight consumes frozen canonical state main wrapper freezes inputs synchronously before yielding to any caller mutation',
    from: 'return scenePreparation.prepare(sceneId, worldView, spawn, useActorOverrides, scriptState)',
    to: 'return Promise.resolve().then(() => scenePreparation.prepare(sceneId, worldView, spawn, useActorOverrides, scriptState))',
  },
  {
    id: 'main-dependency-wiring',
    source: 'main',
    test: 'scene-preflight.chain',
    title:
      'WORLD-ASYNC-COMMIT-1 real main preflight consumes frozen canonical state main wrapper freezes inputs synchronously before yielding to any caller mutation',
    from: 'scenePreparation.assertCurrent(plan, worldView)',
    to: 'void plan',
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
const selected = process.env.SCENE_MUTANT
assert(!selected || mutations.some(({ id }) => id === selected), 'unknown SCENE_MUTANT')
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
    assert.equal(entries.length, 36)
    assert.equal(data.numPassedTests, 36)
    assert.equal(data.numPendingTests, 0)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 36)
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
