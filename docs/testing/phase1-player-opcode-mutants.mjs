/** Isolated real-module mutations for the D2-a player opcode owner. */
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
const packageRoot = resolve(root, 'packages/game')
const source = resolve(packageRoot, 'src/core/event-opcode-player.ts')
const testFile = resolve(packageRoot, 'src/core/event-opcode-player.test.ts')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-phase1-player-opcode-mutants-'))
const mutations = [
  {
    id: 'hp-delta',
    title:
      'player opcode family ownership HP/MP and status mutations keep the supplied role sample and synchronous success rules',
    from: `    if (hp) {
      const current = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
      const next = Math.max(0, Math.min(max, current + delta))`,
    to: `    if (hp) {
      const current = gs.PlayerRolesRuntime.rgwHP[roleId] ?? 0
      const max = gs.PlayerRolesRuntime.rgwMaxHP[roleId] ?? 0
      const next = Math.max(0, Math.min(max, current + delta + 1))`,
  },
  {
    id: 'equipment-in-place',
    title:
      'player opcode family ownership equipment swap preserves the one-item in-place replacement and current-slot sampling',
    from: 'if (newEntry && newEntry.count === 1 && oldItem !== 0 && !oldInInventory)',
    to: 'if (newEntry && newEntry.count === 2 && oldItem !== 0 && !oldInInventory)',
  },
  {
    id: 'poison-resistance',
    title:
      'player opcode family ownership poison resistance samples once before the existing poison owner and runs its entry synchronously',
    from: 'if (Math.floor(Math.random() * 100) + 1 <= getPlayerPoisonResistance(gs, roleId)) continue',
    to: 'if (Math.floor(Math.random() * 100) + 1 >= getPlayerPoisonResistance(gs, roleId)) continue',
  },
  {
    id: 'level-growth',
    title:
      'player opcode family ownership level-up retains seven random samples, stat increments, caps and primary-exp reset',
    from: 'runtime.rgwMaxHP[role] = (runtime.rgwMaxHP[role] ?? 0) + 10 + randomInclusive(7)',
    to: 'runtime.rgwMaxHP[role] = (runtime.rgwMaxHP[role] ?? 0) + 11 + randomInclusive(7)',
  },
  {
    id: 'battle-only-consumed',
    title:
      'player opcode family ownership magic slots stay single-owned and battle-only enemy opcodes remain consumed no-ops',
    from: `    case OP_SET_ENEMY_STATUS:
      // BattleState-owned variants remain handled by battle-opcodes.
      return true`,
    to: `    case OP_SET_ENEMY_STATUS:
      // BattleState-owned variants remain handled by battle-opcodes.
      return false`,
  },
  {
    id: 'magic-deduplication',
    title:
      'player opcode family ownership magic slots stay single-owned and battle-only enemy opcodes remain consumed no-ops',
    from: '  for (const slot of magic) if (slot?.[roleId] === spellObjectId) return',
    to: '  for (const slot of magic) if (slot?.[roleId] === spellObjectId) break',
  },
]

const clean = (value) => stripVTControlCharacters(value)
function businessRed(exit, entries, title) {
  const executed = entries.filter((entry) => ['passed', 'failed'].includes(entry.status))
  if (exit !== 1 || executed.length !== 1) return false
  const [entry] = executed
  return (
    entry.file === testFile &&
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
  file: testFile,
  fullName: 'exact',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
assert(businessRed(1, [sample], sample.fullName))
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
  assert(!businessRed(exit, entries, sample.fullName))

const productFiles = [
  'packages/game/src/core/event-system.ts',
  'packages/game/src/core/event-opcode-player.ts',
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
  const marker = resolve(output, `${id}.entered`)
  if (mutation) {
    assert.equal(
      readFileSync(source, 'utf8').split(mutation.from).length,
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
const item=${JSON.stringify(mutation)},target=${JSON.stringify(source)};
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'phase1-player-opcode-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:['src/core/event-opcode-player.test.ts'],testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert(businessRed(run.status, entries, mutation.title), `${id}: ${output}`)
    assert.deepEqual(JSON.parse(readFileSync(marker, 'utf8')), { id, target: source })
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
