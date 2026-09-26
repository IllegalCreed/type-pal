/** Isolated real-module mutations for E1 translation and scene-source planning owners. */
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
const packageRoot = resolve(root, 'packages/migrate')
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-migration-phase-owners-mutants-'))
const tests = {
  motion: 'src/translate-event-motion.test.ts',
  sources: 'src/scene-migration-source-plan.test.ts',
}
const titles = {
  speed:
    'PAL motion opcode translation owner keeps entity destination projection and all four speed variants',
  party:
    'PAL motion opcode translation owner maps party destinations, speed, and ordered nonzero role slots',
  trail:
    'PAL motion opcode translation owner distinguishes entity mount, detached global no-op, and missing owner',
  nudge:
    'PAL motion opcode translation owner resolves 1-based and self entity nudges and preserves walk animation order',
  chase:
    'PAL motion opcode translation owner marks chase as a same-instruction terminal and rejects unrelated opcodes',
  sources:
    'scene migration source planning owner normalizes first-seen inputs and owns arrivals, labels, addresses, owners, and roots',
  mismatch:
    'scene migration source planning owner rejects an explicit all.json label that disagrees with its array address',
}
const mutations = [
  {
    id: 'motion-speed',
    source: 'src/translate-event-motion.ts',
    test: tests.motion,
    title: titles.speed,
    from: "  3: 'normal',",
    to: "  3: 'slow',",
  },
  {
    id: 'party-role-index',
    source: 'src/translate-event-motion.ts',
    test: tests.motion,
    title: titles.party,
    from: '      .map((value) => ROLE_SLUGS[value - 1])',
    to: '      .map((value) => ROLE_SLUGS[value])',
  },
  {
    id: 'global-trail-policy',
    source: 'src/translate-event-motion.ts',
    test: tests.motion,
    title: titles.trail,
    from: "    if (owner?.startsWith('global/'))",
    to: "    if (owner === 'global/')",
  },
  {
    id: 'nudge-entity-identity',
    source: 'src/translate-event-motion.ts',
    test: tests.motion,
    title: titles.nudge,
    from: '  return word === 0 || word === 0xffff ? owner : legacyEventObjectEntityId(word)',
    to: '  return word === 0 || word === 0xffff ? owner : legacyEventObjectEntityId(word + 1)',
  },
  {
    id: 'walk-animation-order',
    source: 'src/translate-event-motion.ts',
    test: tests.motion,
    title: titles.nudge,
    from: "      commands: opcode === 0x6c ? [nudge, { kind: 'animEntity', entity }] : [nudge],",
    to: "      commands: opcode === 0x6c ? [{ kind: 'animEntity', entity }, nudge] : [nudge],",
  },
  {
    id: 'chase-terminal',
    source: 'src/translate-event-motion.ts',
    test: tests.motion,
    title: titles.chase,
    from: "      terminal: 'end',",
    to: '',
  },
  {
    id: 'event-source-priority',
    source: 'src/scene-migration-source-plan.ts',
    test: tests.sources,
    title: titles.sources,
    from: '    sceneId >= 0 ? 0 : sceneId === -1 ? 1 : sceneId === -2 ? 2 : 3',
    to: '    sceneId >= 0 ? 4 : sceneId === -1 ? 1 : sceneId === -2 ? 2 : 3',
  },
  {
    id: 'arrival-gap-boundary',
    source: 'src/scene-migration-source-plan.ts',
    test: tests.sources,
    title: titles.sources,
    from: '        if (last && index - last.at <= 4) {',
    to: '        if (last && index - last.at < 4) {',
  },
  {
    id: 'arrival-reset',
    source: 'src/scene-migration-source-plan.ts',
    test: tests.sources,
    title: titles.sources,
    from: '        last = null',
    to: '',
  },
  {
    id: 'indexed-arrival-isolation',
    source: 'src/scene-migration-source-plan.ts',
    test: tests.sources,
    title: titles.sources,
    from: '          if (srcId === -2) {',
    to: '          if (false) {',
  },
  {
    id: 'all-label-address-check',
    source: 'src/scene-migration-source-plan.ts',
    test: tests.sources,
    title: titles.mismatch,
    from: '      if (command.label !== undefined && command.label !== expected)',
    to: '      if (false && command.label !== undefined && command.label !== expected)',
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
  [1, [{ ...sample, fullName: 'other' }]],
  [1, [{ ...sample, failureMessages: ['Error: embedded AssertionError'] }]],
  [1, [{ ...sample, failureMessages: ['AssertionError: timed out'] }]],
])
  assert(!businessRed(exit, entries, sample.file, sample.fullName))

const productFiles = [
  'packages/migrate/src/migrate-content.ts',
  'packages/migrate/src/scene-migration-source-plan.ts',
  'packages/migrate/src/translate-event-motion.ts',
  'packages/migrate/src/translate-events.ts',
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
  const target = mutation ? resolve(packageRoot, mutation.source) : ''
  const testFile = mutation ? resolve(packageRoot, mutation.test) : ''
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
export default {root:${JSON.stringify(packageRoot)},plugins:item?[{name:'migration-phase-owner-single-point',enforce:'pre',load(id){if(id!==target&&id!==target+'?raw')return;const source=readFileSync(target,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));const changed=source.replace(item.from,item.to);return id.endsWith('?raw')?'export default '+JSON.stringify(changed):changed}}]:[],test:{include:${JSON.stringify(Object.values(tests))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
