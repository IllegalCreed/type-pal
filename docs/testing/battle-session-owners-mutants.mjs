/** Isolated real-module mutations for C1 BattleSession ownership boundaries. */
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
const packageRoot = resolve(root, 'packages/reforge')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-battle-session-owners-mutants-'))
const tests = {
  action: 'battle/battle-action-presentation-scheduler.test.ts',
  selection: 'battle/battle-command-selection.test.ts',
  settlement: 'battle/battle-settlement-presentation.test.ts',
  readiness: 'battle/battle-turn-readiness.test.ts',
}
const mutations = [
  {
    id: 'readiness-sync-entry',
    source: 'battle/battle-turn-readiness.ts',
    test: tests.readiness,
    title:
      'BattleTurnReadinessGate without a prepare callback enters the action phase synchronously',
    from: `    if (!prepare) {
      port.enterActionPhase()
      return
    }`,
    to: '    if (!prepare) return',
  },
  {
    id: 'readiness-invalidate-token',
    source: 'battle/battle-turn-readiness.ts',
    test: tests.readiness,
    title:
      'BattleTurnReadinessGate invalidate makes a late resolution inert while retaining read-only phase evidence',
    from: '    this.serial++',
    to: '    this.serial += 0',
  },
  {
    id: 'readiness-fatal-classification',
    source: 'battle/battle-turn-readiness.ts',
    test: tests.readiness,
    title:
      'BattleTurnReadinessGate holds an unknown failure in the fatal phase and preserves the original error',
    from: `    const fatal =
      normalized instanceof SfxReadinessFatalError ||
      !(normalized instanceof SfxReadinessResourceError)`,
    to: '    const fatal = false',
  },
  {
    id: 'settlement-confirm-boundary',
    source: 'battle/battle-settlement-presentation.ts',
    test: tests.settlement,
    title:
      'BattleSettlementPresentation builds victory screens once and enforces 300ms before each synchronous advance',
    from: 'const SETTLEMENT_CONFIRM_MIN_MS = 300',
    to: 'const SETTLEMENT_CONFIRM_MIN_MS = 301',
  },
  {
    id: 'settlement-terminated-immediate',
    source: 'battle/battle-settlement-presentation.ts',
    test: tests.settlement,
    title:
      'BattleSettlementPresentation completes terminated in the same admitted tick without building reward screens',
    from: "    if (result === 'playerFled' || result === 'enemyFled' || result === 'terminated') return result",
    to: "    if (result === 'playerFled' || result === 'enemyFled') return result",
  },
  {
    id: 'selection-retract-lifo',
    source: 'battle/battle-command-selection.ts',
    test: tests.selection,
    title:
      'BattleCommandSelection Escape retracts the most recently submitted player in LIFO order',
    from: '        const previous = this.submitOrder.pop()',
    to: '        const previous = this.submitOrder.shift()',
  },
  {
    id: 'selection-round-sticky-clear',
    source: 'battle/battle-command-selection.ts',
    test: tests.selection,
    title:
      'BattleCommandSelection F is round-sticky, A survives beginRound, and Escape cancels the active shortcut',
    from: `  beginRound(): void {
    this.currentPhase = 'menu'
    this.stickyForce = false`,
    to: `  beginRound(): void {
    this.currentPhase = 'menu'
    this.stickyForce = true`,
  },
  {
    id: 'selection-repeat-retarget',
    source: 'battle/battle-command-selection.ts',
    test: tests.selection,
    title:
      'BattleCommandSelection R retains the prior action but repairs a dead enemy target from the current sample',
    from: `      if (!context.aliveEnemyIndices.includes(action.targetEnemyIdx)) {
        const target = context.aliveEnemyIndices[0]`,
    to: `      if (!context.aliveEnemyIndices.includes(action.targetEnemyIdx)) {
        const target = context.aliveEnemyIndices.at(-1)`,
  },
  {
    id: 'action-cadence-boundary',
    source: 'battle/battle-action-presentation-scheduler.ts',
    test: tests.action,
    title:
      'BattleActionPresentationScheduler the 240ms action cadence consumes synchronously and drops overflow like the former timer',
    from: 'const ACTION_INTERVAL_MS = 240',
    to: 'const ACTION_INTERVAL_MS = 241',
  },
  {
    id: 'action-first-frame-sample',
    source: 'battle/battle-action-presentation-scheduler.ts',
    test: tests.action,
    title:
      'BattleActionPresentationScheduler enters the first timeline frame synchronously and finishes at the exact sampled boundary',
    from: '    this.player.tick(0)',
    to: '    this.player.tick(1)',
  },
  {
    id: 'action-script-cleanup',
    source: 'battle/battle-action-presentation-scheduler.ts',
    test: tests.action,
    title:
      'BattleActionPresentationScheduler script consumption clears both player and scripted flag',
    from: '    this.scripted = false',
    to: '    this.scripted = true',
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

const productFiles = [
  'packages/reforge/src/battle/battle-session.ts',
  'packages/reforge/src/battle/battle-action-presentation-scheduler.ts',
  'packages/reforge/src/battle/battle-command-selection.ts',
  'packages/reforge/src/battle/battle-settlement-presentation.ts',
  'packages/reforge/src/battle/battle-turn-readiness.ts',
]
const hash = (file) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, file)))
    .digest('hex')
const hashes = Object.fromEntries(productFiles.map((file) => [file, hash(file)]))
const rows = []
let controls

for (const mutation of [null, ...mutations]) {
  const id = mutation?.id ?? 'control'
  const report = resolve(output, `${id}.json`)
  const config = resolve(output, `${id}.config.mjs`)
  const target = mutation ? resolve(packageRoot, 'src', mutation.source) : ''
  const testFile = mutation ? resolve(packageRoot, 'src', mutation.test) : ''
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
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'battle-session-owner-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify(Object.values(tests).map((file) => `src/${file}`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
  )
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', config], {
    cwd: packageRoot,
    env: preciseCoverageEnvironment(),
    encoding: 'utf8',
  })
  const log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
  writeFileSync(resolve(output, `${id}.log`), log)
  assert.equal(run.signal, null)
  assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(log)))
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
    assert.equal(data.numPendingTests, 0)
    controls = entries
  } else {
    assert(businessRed(run.status, entries, testFile, mutation.title), `${id}: ${output}`)
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target })
    assert.equal(data.numPendingTests, controls.length - 1)
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
  console.log(`${id}: ${mutation ? 'detected' : `${entries.length} passing`}`)
}

const summary = resolve(output, 'summary.json')
writeFileSync(summary, JSON.stringify({ output, productFiles, hashes, rows }, null, 2))
console.log(summary)
