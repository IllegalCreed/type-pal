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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-shell-wave2-mutants-'))
const files = [
  'main.equipment-flows',
  'main.item-flows',
  'main.battle-host-flows',
  'main.entity-host-flows',
]
const mutations = [
  {
    id: 'equipment-commit',
    test: files[0],
    source: 'main',
    title: 'H7 equip empty slot commits only selected equipment and removes exactly one bag item',
    from: 'replaceWorld(r.world)\n            equipMenu = r.state',
    to: 'void r.world\n            equipMenu = r.state',
  },
  {
    id: 'item-scene-close',
    test: files[1],
    source: 'main',
    title:
      'H8 item private script changes scene and closes the old menu while preserving its new world',
    from: "if (scene.id !== sceneBefore) outcome = { ...outcome, menu: 'close' }",
    to: "if (false) outcome = { ...outcome, menu: 'close' }",
  },
  {
    id: 'battle-inventory-writeback',
    test: files[2],
    source: 'main',
    title:
      'H9 thrown inventory is consumed by real battle and reaches the host world after victory',
    from: 'finishBattleWorldState(session, result, world, canonicalProject)',
    to: 'void session',
  },
  {
    id: 'battle-reward-cash',
    test: files[2],
    source: 'battle/battle-world-result',
    title:
      'H9 public battle runs actual settlement and onDefeated before resolving, preserving nonempty inventory',
    from: 'world.money += rewards.cash',
    to: 'world.money += rewards.cash + 1',
  },
  {
    id: 'battle-end-hook',
    test: files[2],
    source: 'main',
    title:
      'H9 public battle runs actual settlement and onDefeated before resolving, preserving nonempty inventory',
    from: 'const scripted = session.enemySlotDefs().filter((def) => def.onDefeated?.length)',
    to: 'const scripted = []',
  },
  {
    id: 'entity-projection',
    test: files[3],
    source: 'main',
    title:
      "H10 'absolute' entity position reaches both durable state and live projection before continuation",
    // Host effect and refresh both call this projection; removing just one caller is masked.
    from: 'entity.pos = { ...pos }',
    to: 'void pos',
  },
  {
    id: 'motion-endpoint',
    test: files[3],
    source: 'main',
    title:
      'H10 authored move waits for exact endpoint and persists it without mutating scene definition',
    from: 'command.to,\n        command.speed,',
    to: '{ ...command.to, col: command.to.col + 1 },\n        command.speed,',
  },
  {
    id: 'battle-intent',
    source: 'async-intent',
    test: files[2],
    title: 'H9 delayed battle sprite cannot commit a battle after the scene owner has changed',
    from: 'if (!this.isCurrent(token)) throw asyncIntentAbortError(message)',
    to: 'if (false && !this.isCurrent(token)) throw asyncIntentAbortError(message)',
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
        !/(?:timeout|timed out|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
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
  [1, [{ ...sample, failureMessages: ['AssertionError: business', 'TypeError: host'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: business\nError: host'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const baseline = JSON.parse(
  readFileSync(resolve(root, 'scripts/coverage/baseline.fast.json'), 'utf8'),
)
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(
  Object.values(baseline.packages)
    .flatMap((pkg) => pkg.sourceFiles)
    .map((file) => [file, hash(file)]),
)
const selected = process.env.SHELL_WAVE2_MUTANT
assert(!selected || mutations.some(({ id }) => id === selected), 'unknown SHELL_WAVE2_MUTANT')
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
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:item?[{name:'shell-wave2-single-point',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));return source.replace(item.from,item.to)}}]:[],test:{include:${JSON.stringify((mutation ? [mutation.test] : files).map((file) => `src/${file}.test.ts`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert.equal(entries.length, 28)
    assert.equal(data.numPassedTests, 28)
    assert.equal(data.numPendingTests, 0)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 28)
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
  console.log(`${id}: ${mutation ? 'detected (candidate AssertionError)' : '28 passing'}`)
}
writeFileSync(
  resolve(output, 'summary.json'),
  `${JSON.stringify({ hashes, judge: { positive: 1, rejected: 12 }, rows }, null, 2)}\n`,
)
console.log(`Evidence: ${output}`)
