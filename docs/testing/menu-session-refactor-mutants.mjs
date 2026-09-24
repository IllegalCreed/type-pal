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
const output = mkdtempSync(resolve(tmpdir(), 'type-pal-menu-session-mutants-'))
const files = [
  'menu/menu-session',
  'menu/item-use-session',
  'main.menu-flows',
  'main.item-flows',
  'main.equipment-flows',
  'main.save-flows',
  'main.menu-storage-flows',
]
const mutations = [
  {
    id: 'manual-slot-write-route',
    source: 'main',
    test: 'main.menu-storage-flows',
    title:
      'menu storage ports write the selected real slot, retain rejected load UI, then restore and close on success',
    from: 'writeSlot: browserWrite',
    to: 'writeSlot: browserLoad',
  },
  {
    id: 'rejected-load-menu',
    source: 'main',
    test: 'main.menu-storage-flows',
    title:
      'menu storage ports write the selected real slot, retain rejected load UI, then restore and close on success',
    from: "if ((await doLoad(slotId)) === 'loaded') {",
    to: "if ((await doLoad(slotId)) !== 'absent') {",
  },
  {
    id: 'host-input-route',
    source: 'main',
    test: 'main.equipment-flows',
    title: 'H7 equip empty slot commits only selected equipment and removes exactly one bag item',
    from: 'menus.input(pressed)',
    to: 'void pressed',
  },
  {
    id: 'equip-writeback',
    source: 'menu/menu-session',
    test: 'main.equipment-flows',
    title: 'H7 equip empty slot commits only selected equipment and removes exactly one bag item',
    from: 'this.ports.replaceWorld(r.world)',
    to: 'void r.world',
  },
  {
    id: 'item-scene-close',
    source: 'menu/menu-session',
    test: 'menu/menu-session',
    title: 'scene-changing item result closes the old menu even when executor requested keep',
    from: "if (this.ports.sceneId() !== sceneBefore) outcome = { ...outcome, menu: 'close' }",
    to: "if (false) outcome = { ...outcome, menu: 'close' }",
  },
  {
    id: 'item-cancel',
    source: 'menu/item-use-session',
    test: 'menu/item-use-session',
    title:
      'item operation owns the pending slot through cancellation and consumes exactly the original promise',
    from: 'this.#controller?.abort()',
    to: 'void this.#controller',
  },
  {
    id: 'item-exclusive',
    source: 'menu/item-use-session',
    test: 'menu/item-use-session',
    title:
      'item operation owns the pending slot through cancellation and consumes exactly the original promise',
    from: 'if (this.#pending) return',
    to: 'void this.#pending',
  },
  {
    id: 'load-error-feedback',
    source: 'menu/menu-session',
    test: 'menu/menu-session',
    title:
      'load request rejection remains visible; successful close is owned by the storage completion callback',
    from: "this.ports.showToast('读档失败')",
    to: "this.ports.showToast('wrong feedback')",
  },
  {
    id: 'closed-input-gate',
    source: 'menu/menu-session',
    test: 'menu/menu-session',
    title:
      'closed menu ignores input; independent sessions retain independent panel and cursor state',
    from: 'if (!this.active) return',
    to: 'void this.active',
  },
  {
    id: 'late-browser-refresh',
    source: 'menu/menu-session',
    test: 'menu/menu-session',
    title:
      'save browser paging and refresh retain captured mode/cursor; a closed browser stays closed',
    from: 'if (this.#saveBrowser.active) this.#saveBrowser = openSaveBrowser(mode, metas, cursor)',
    to: 'this.#saveBrowser = openSaveBrowser(mode, metas, cursor)',
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
const selected = process.env.MENU_SESSION_MUTANT
assert(!selected || mutations.some(({ id }) => id === selected), 'unknown MENU_SESSION_MUTANT')
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
export default {root:${JSON.stringify(resolve(root, 'packages/reforge'))},plugins:item?[{name:'menu-session-single-point',enforce:'pre',load(id){if(id!==target)return;const source=readFileSync(id,'utf8');if(source.split(item.from).length!==2)throw Error('needle drift');writeFileSync(${JSON.stringify(marker)},JSON.stringify({id:item.id,target}));return source.replace(item.from,item.to)}}]:[],test:{include:${JSON.stringify((mutation ? [mutation.test] : files).map((file) => `src/${file}.test.ts`))},testNamePattern:${JSON.stringify(pattern)},maxWorkers:2,reporters:['json'],outputFile:${JSON.stringify(report)}}};`,
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
    assert.equal(entries.length, 55)
    assert.equal(data.numPassedTests, 55)
    assert.equal(data.numPendingTests, 0)
    assert.equal(new Set(entries.map((entry) => `${entry.file}::${entry.fullName}`)).size, 55)
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
  console.log(`${id}: ${mutation ? 'detected (candidate AssertionError)' : '55 passing'}`)
}
writeFileSync(
  resolve(output, 'summary.json'),
  `${JSON.stringify({ hashes, judge: { positive: 2, rejected: 12 }, rows }, null, 2)}\n`,
)
console.log(`Evidence: ${output}`)
