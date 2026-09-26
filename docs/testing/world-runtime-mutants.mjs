/** Real-module single-point mutations for A3 motion/presentation owners; repository stays read-only. */
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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-world-runtime-mutants-'))
const files = ['world-motion-runtime', 'world-scene-presentation']
const mutations = [
  {
    id: 'frozen-cadence',
    source: 'world-motion-runtime',
    test: 'world-motion-runtime',
    title:
      'WorldMotionRuntime ownership owns the one-tick cadence, carry remainder and frozen-frame reset',
    from: 'if (frozen) return false',
    to: 'if (false) return false',
  },
  {
    id: 'party-abort',
    source: 'world-motion-runtime',
    test: 'world-motion-runtime',
    title:
      'WorldMotionRuntime ownership party move replacement wakes the old waiter while abort rejects only the current waiter',
    from: "if (this.partySlot === entry) this.partySlot = null\n        signal?.removeEventListener('abort', abort)\n        reject(asyncIntentAbortError('队伍走位所属 runner 已取消'))",
    to: "void entry\n        signal?.removeEventListener('abort', abort)\n        reject(asyncIntentAbortError('队伍走位所属 runner 已取消'))",
  },
  {
    id: 'slot-registry',
    source: 'world-motion-runtime',
    test: 'world-motion-runtime',
    title:
      'WorldMotionRuntime ownership script and auto durable slots coexist and commit before their deferred wake-up',
    from: "signal?.throwIfAborted()\n      const registry =\n        source === 'script' ? this.coordinator.scriptSlots : this.coordinator.autoSlots",
    to: 'signal?.throwIfAborted()\n      const registry = this.coordinator.scriptSlots',
  },
  {
    id: 'gait-owner',
    source: 'world-motion-runtime',
    test: 'world-motion-runtime',
    title:
      'WorldMotionRuntime ownership gait and explicit animation have one owner with expected-epoch clearing',
    from: 'this.explicitAnimations.delete(id)\n    this.walkPhases.set',
    to: 'void id\n    this.walkPhases.set',
  },
  {
    id: 'frame-priority',
    source: 'world-scene-presentation',
    test: 'world-scene-presentation',
    title:
      'WorldScenePresentation sprite ownership entity frame override keeps the exact priority, per-frame anchor and layer geometry',
    from: 'const hasOverride = this.entityFrames.has(entity.id)',
    to: 'const hasOverride = false',
  },
  {
    id: 'current-frame-anchor',
    source: 'world-scene-presentation',
    test: 'world-scene-presentation',
    title:
      'WorldScenePresentation sprite ownership entity frame override keeps the exact priority, per-frame anchor and layer geometry',
    from: 'anchorX: Math.floor(frame.width / 2),\n        anchorY: frame.height,\n        coverILayer: effectiveLayer',
    to: 'anchorX: 0,\n        anchorY: frame.height,\n        coverILayer: effectiveLayer',
  },
  {
    id: 'follower-depth',
    source: 'world-scene-presentation',
    test: 'world-scene-presentation',
    title:
      'WorldScenePresentation sprite ownership party, party followers and extra followers retain source order and depth tie-breaks',
    from: 'baseYBias: layer - 0.01 * partyIndex',
    to: 'baseYBias: layer',
  },
  {
    id: 'shake-phase',
    source: 'world-scene-presentation',
    test: 'world-scene-presentation',
    title:
      'WorldScenePresentation world painter shake samples frame time before the unchanged ordinary scene pass and expires at boundary',
    from: 'input.camera.y +\n            (Math.floor(input.now / 40) % 2 === 0',
    to: 'input.camera.y -\n            (Math.floor(input.now / 40) % 2 === 0',
  },
  {
    id: 'wave-overlay',
    source: 'world-scene-presentation',
    test: 'world-scene-presentation',
    title:
      'WorldScenePresentation world painter wave draws background offscreen, applies rows, then overlays static sprites without clearing',
    from: 'skipBase: true,',
    to: 'skipBase: false,',
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
const selected = process.env.WORLD_RUNTIME_MUTANT
assert(!selected || mutations.some(({ id }) => id === selected), 'unknown WORLD_RUNTIME_MUTANT')
const rows = []
let controls
for (const mutation of [null, ...mutations.filter(({ id }) => !selected || id === selected)]) {
  const id = mutation?.id ?? 'control'
  const report = resolve(output, `${id}.json`)
  const config = resolve(output, `${id}.config.mjs`)
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
      `${id}: exact passing control`,
    )
  }
  const pattern = mutation
    ? `^${mutation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    : undefined
  writeFileSync(
    config,
    `import {readFileSync,writeFileSync} from 'node:fs';
const item=${JSON.stringify(mutation)},target=${JSON.stringify(target)};
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:item?[{name:'world-runtime-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify((mutation ? [mutation.test] : files).map((file) => `src/${file}.test.ts`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert.equal(entries.length, 15)
    assert.equal(data.numPassedTests, 15)
    assert.equal(data.numPendingTests, 0)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 15)
    controls = entries
  } else {
    assert(
      businessRed(run.status, entries, testFile, mutation.title),
      `${id}: not business red; ${output}`,
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
  `${JSON.stringify({ hashes, judge: { positive: 1, rejected: 9 }, rows }, null, 2)}\n`,
)
console.log(`Evidence: ${output}`)
