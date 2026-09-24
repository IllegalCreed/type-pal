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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-frame-mutants-'))
const files = ['runtime-frame-session', 'runtime-input-router', 'main.dialog-flows']
const mutations = [
  {
    id: 'modal-before-clock',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title:
      'modal activation freezes the current frame while key consumption and world presentation continue',
    from: 'ports.activateConfirm()\n    ports.resumeScriptGates()\n    const frozen = ports.gameplayFrozen()',
    to: 'const frozen = ports.gameplayFrozen()\n    ports.activateConfirm()\n    ports.resumeScriptGates()',
  },
  {
    id: 'step-consumed-once',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title: 'single step is consumed once and advances world but not fade or entity presentation',
    from: 'const requested = this.#stepRequested\n    this.#stepRequested = false',
    to: 'const requested = this.#stepRequested',
  },
  {
    id: 'step-no-presentation',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title: 'single step is consumed once and advances world but not fade or entity presentation',
    from: 'if (!stepping) ports.advanceFade(this.#now)',
    to: 'ports.advanceFade(this.#now)',
  },
  {
    id: 'world-phase-order',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title: 'frame phases preserve synchronous order and route once after world advancement',
    from: 'ports.tickHostiles(dt)\n    ports.advanceMoves(dt, pressed)',
    to: 'ports.advanceMoves(dt, pressed)\n    ports.tickHostiles(dt)',
  },
  {
    id: 'battle-exclusive',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title: 'battle ownership is sampled after world advancement and consumes rendering and input',
    from: 'if (ports.presentBattle(clock.gameplayDt, pressed, clock.gameplayNow)) return',
    to: 'ports.presentBattle(clock.gameplayDt, pressed, clock.gameplayNow)',
  },
  {
    id: 'wait-abort-protocol',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title:
      'aborted wait rejects with the existing protocol while unrelated pending wait can finish',
    from: "timer.settle(asyncIntentAbortError('脚本等待所属 runner 已取消'))",
    to: 'timer.settle()',
  },
  {
    id: 'wait-detach',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title:
      'waits settle once in reverse registration order at the gameplay deadline and detach abort listeners',
    from: "signal.removeEventListener('abort', abort)",
    to: 'void signal',
  },
  {
    id: 'clear-waits-policy',
    source: 'runtime-frame-session',
    test: 'runtime-frame-session',
    title:
      'clear resolves remaining waits without waiting for time and never replaces an existing abort error',
    from: 'for (const timer of this.#waits.splice(0)) timer.settle()',
    to: "for (const timer of this.#waits.splice(0)) timer.settle(new Error('wrong policy'))",
  },
  {
    id: 'input-shop-priority',
    source: 'runtime-input-router',
    test: 'runtime-input-router',
    title: 'all 128 active-layer combinations give the complete frame to exactly the highest owner',
    from: '} else if (ports.consumeShop(pressed)) {',
    to: '} else if (false) {',
  },
  {
    id: 'live-debug-gate',
    source: 'runtime-input-router',
    test: 'runtime-input-router',
    title: 'opening a menu or dialogue immediately blocks same-frame debug navigation',
    from: '!ports.menu.active() &&\n      !ports.dialogue.active() &&',
    to: 'true &&',
  },
  {
    id: 'main-frame-wiring',
    source: 'main',
    test: 'main.dialog-flows',
    title: 'H4 wait resumes from gameplay frames and ignored menu input cannot bypass the wait',
    from: 'frames.tick(t, framePorts)',
    to: 'void t',
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
const selected = process.env.FRAME_MUTANT
assert(!selected || mutations.some(({ id }) => id === selected), 'unknown FRAME_MUTANT')
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
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:item?[{name:'frame-single-point',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));return source.replace(item.from,item.to)}}]:[],test:{include:${JSON.stringify((mutation ? [mutation.test] : files).map((file) => `src/${file}.test.ts`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert.equal(entries.length, 44)
    assert.equal(data.numPassedTests, 44)
    assert.equal(data.numPendingTests, 0)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 44)
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
