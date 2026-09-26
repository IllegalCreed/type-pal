/** Isolated real-module mutations for D2 battle/bootstrap ownership boundaries. */
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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-phase1-main-owners-mutants-'))
const tests = {
  finalization: 'core/battle/battle-finalization.test.ts',
  levelup: 'core/battle/__tests__/battle-levelup.test.ts',
  resources: 'core/battle/battle-runtime-context.test.ts',
  startup: 'shell/bootstrap-resources.test.ts',
}
const mutations = [
  {
    id: 'resource-identity',
    source: 'core/battle/battle-runtime-context.ts',
    test: tests.resources,
    title:
      'battle runtime context ownership keeps the exact resource and live-role identities installed by startBattle',
    from: `export function getBattleResources(gs: GameState): BattleResources | undefined {
  return getBattleRuntimeStash(gs)[BATTLE_RESOURCES_KEY]
}`,
    to: `export function getBattleResources(gs: GameState): BattleResources | undefined {
  const resources = getBattleRuntimeStash(gs)[BATTLE_RESOURCES_KEY]
  return resources ? { ...resources } : undefined
}`,
  },
  {
    id: 'runner-priority',
    source: 'core/battle/battle-runtime-context.ts',
    test: tests.resources,
    title:
      'battle runtime context ownership prefers the injected runner and preserves it when no new override is supplied',
    from: '  return getBattleRuntimeStash(gs)[BATTLE_RUN_SCRIPT_KEY] ?? fallback',
    to: '  return fallback',
  },
  {
    id: 'runner-release',
    source: 'core/battle/battle-runtime-context.ts',
    test: tests.resources,
    title:
      'battle runtime context ownership releases resources and runner with the historical hidden-field semantics',
    from: '  delete stash[BATTLE_RUN_SCRIPT_KEY]',
    to: '  stash[BATTLE_RUN_SCRIPT_KEY] = undefined',
  },
  {
    id: 'temporary-status-threshold',
    source: 'core/battle/battle-finalization.ts',
    test: tests.finalization,
    title:
      'battle finalization ownership restores world state, clears per-battle state, then releases runtime resources',
    from: '      if ((row[i] ?? 0) <= 999) row[i] = 0',
    to: '      if ((row[i] ?? 0) < 999) row[i] = 0',
  },
  {
    id: 'resume-outcome',
    source: 'core/battle/battle-finalization.ts',
    test: tests.finalization,
    title:
      'battle finalization ownership resumes a 0x07 event only after battle state and resources have been released',
    from: '  resumePostBattleScript(gs, outcome)',
    to: "  resumePostBattleScript(gs, 'won')",
  },
  {
    id: 'level-growth',
    source: 'core/battle/battle-progression.ts',
    test: tests.levelup,
    title:
      'battleWonLevelUp —— D11 战斗胜利升级 exp 进阈值 → 升 1 级 + stat 成长 + HP/MP 满 + exp 余数(user mock 场景)',
    from: '      rt.rgwMaxHP[roleId] = (rt.rgwMaxHP[roleId] ?? 0) + 10 + rng.rangeInclusive(0, 7)',
    to: '      rt.rgwMaxHP[roleId] = (rt.rgwMaxHP[roleId] ?? 0) + 11 + rng.rangeInclusive(0, 7)',
  },
  {
    id: 'startup-scene-sample',
    source: 'shell/bootstrap-resources.ts',
    test: tests.startup,
    title:
      'bootstrap resource lifecycle starts soundfont first and all resource loaders before awaiting any result',
    from: '    ports.loadAssets(sceneId),',
    to: '    ports.loadAssets(sceneId + 1),',
  },
  {
    id: 'glyph-degradation',
    source: 'shell/bootstrap-resources.ts',
    test: tests.startup,
    title:
      'bootstrap resource lifecycle degrades a glyph failure without blocking the other initial resources',
    from: '      return undefined',
    to: '      return null',
  },
  {
    id: 'soundfont-rejection',
    source: 'shell/bootstrap-resources.ts',
    test: tests.startup,
    title:
      'bootstrap resource lifecycle keeps the original soundfont rejection while its settle barrier still resolves',
    from: '  const soundfontData = ports.fetchSoundfont()',
    to: '  const soundfontData = ports.fetchSoundfont().catch(() => new ArrayBuffer(0))',
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
  'packages/game/src/core/battle/battle-finalization.ts',
  'packages/game/src/core/battle/battle-progression.ts',
  'packages/game/src/core/battle/battle-runtime-context.ts',
  'packages/game/src/core/battle/battle-settlement.ts',
  'packages/game/src/core/battle/battle-system.ts',
  'packages/game/src/shell/bootstrap-resources.ts',
  'packages/game/src/shell/bootstrap.ts',
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
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'phase1-main-owner-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify(Object.values(tests).map((file) => `src/${file}`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
