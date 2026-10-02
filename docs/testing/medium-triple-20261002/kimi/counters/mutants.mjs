/**
 * TEST-KIMI-CURRENT-CONTINUATION-MEDIUM-1 mutation counter-evidence runner.
 * Real product mutations are applied inside a private mkdtemp copy only; the repository stays
 * read-only and is hash-pinned before/after. After each variant the pristine file is restored
 * and the union set reruns green. The single judge (businessRed) is shared by runner/selftest.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
const output = mkdtempSync(join(tmpdir(), 'type-pal-kimi-mid-1-mutants-'))

const NEW_FILES = [
  'src/script-continuation.kimi-mid-1.test.ts',
  'src/author-stage-organization.kimi-mid-1.test.ts',
]
const OLD_AUTO = 'src/runtime-auto-checkpoint.test.ts'
const OLD_STAGES = 'src/author-flow-stages.test.ts'
const UNION = [...NEW_FILES, OLD_AUTO, OLD_STAGES]

const mutations = [
  {
    id: 'machine-id-cursor',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (cursor.kind !== 'state' || cursor.machine !== executable.flow.machine.id)",
    to: "if (cursor.kind !== 'state')",
    test: NEW_FILES[0],
    title: 'K1 machine executable refuses a cursor from a foreign machine id',
    old: [OLD_AUTO],
    sensitivity: true,
  },
  {
    id: 'battle-none-arm',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (control?.kind !== 'startBattle' || control.arm === 'none')",
    to: "if (control?.kind !== 'startBattle')",
    test: NEW_FILES[0],
    title: 'K2 a startBattle child without an outcome arm rejects',
    old: [OLD_AUTO],
    sensitivity: true,
  },
  {
    id: 'none-explicit-self',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (script.self === 'none' && command.self)",
    to: 'if (false && command.self)',
    test: NEW_FILES[0],
    title: 'K3 a none-self shared script refuses an explicit command self',
    old: [OLD_AUTO],
    sensitivity: false,
  },
  {
    id: 'unreachable-tail',
    source: 'packages/content/src/author-flow-stages.ts',
    from: 'for (const [id, state] of entries) ordered.set(id, state)',
    to: 'for (const [id, state] of entries) { if (ordered.has(id)) ordered.set(id, state) }',
    test: NEW_FILES[1],
    title:
      'K6 a multi-state restart cycle stays in reachable order and the unreachable tail keeps its own id and stay mapping',
    old: [OLD_STAGES],
    sensitivity: true,
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

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const repoPinned = [...mutations.map((m) => m.source), ...UNION.map((f) => `packages/reforge/${f}`)]
const repoHashes = Object.fromEntries(repoPinned.map((f) => [f, hash(resolve(root, f))]))

const copy = mkdtempSync(join(tmpdir(), 'type-pal-kimi-mid-1-copy-'))
const rows = []
const controlState = {}
try {
  for (const item of ['package.json', 'pnpm-workspace.yaml', 'tsconfig.base.json'])
    cpSync(resolve(root, item), resolve(copy, item))
  for (const item of ['packages/reforge', 'packages/content', 'packages/shared'])
    cpSync(resolve(root, item), resolve(copy, item), { recursive: true, verbatimSymlinks: true })
  // PAL scene JSONs feed the legacy author-flow-stages.test.ts import.meta.glob (read-only data).
  cpSync(
    resolve(root, 'projects/pal/content/scenes'),
    resolve(copy, 'projects/pal/content/scenes'),
    {
      recursive: true,
    },
  )
  symlinkSync(resolve(root, 'node_modules'), join(copy, 'node_modules'), 'dir')

  const run = (id, files, namePattern) => {
    const report = resolve(output, `${id}.json`)
    const args = ['run', '--reporter=json', `--outputFile=${report}`, ...files]
    if (namePattern) args.push('--testNamePattern', namePattern)
    const child = spawnSync('node', [resolve(copy, 'node_modules/vitest/vitest.mjs'), ...args], {
      cwd: resolve(copy, 'packages/reforge'),
      env: { ...process.env, FORCE_COLOR: '0' },
      encoding: 'utf8',
    })
    const log = `${child.stdout ?? ''}\n${child.stderr ?? ''}`
    writeFileSync(resolve(output, `${id}.log`), log)
    assert.equal(child.signal, null, `${id}: signaled`)
    assert(
      !/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(log)),
      `${id}: runtime error`,
    )
    const data = JSON.parse(readFileSync(report, 'utf8'))
    assert(
      data.testResults.every((file) => !file.message),
      `${id}: suite error`,
    )
    assert.equal(data.numTodoTests, 0, `${id}: todo`)
    const entries = data.testResults.flatMap((file) =>
      file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
    )
    return { exit: child.status, entries, data }
  }
  const executed = (entries) => entries.filter((e) => ['passed', 'failed'].includes(e.status))
  const stateHashes = () => Object.fromEntries(repoPinned.map((f) => [f, hash(resolve(copy, f))]))

  // Positive control: the union set is green in the pristine copy.
  const control = run('control', UNION)
  assert.equal(control.exit, 0, `control red: ${output}`)
  assert.equal(executed(control.entries).length, control.data.numPassedTests)
  for (const m of mutations) {
    assert.equal(
      control.entries.filter((e) => e.file.endsWith(m.test) && e.fullName === m.title).length,
      1,
      `${m.id}: exact passing control`,
    )
    assert.equal(
      readFileSync(resolve(copy, m.source), 'utf8').split(m.from).length,
      2,
      `${m.id}: unique needle`,
    )
  }
  controlState.control = stateHashes()

  for (const m of mutations) {
    const target = resolve(copy, m.source)
    const pristine = readFileSync(target, 'utf8')
    writeFileSync(target, pristine.replace(m.from, m.to))
    const variantState = stateHashes()
    assert.notEqual(variantState[m.source], controlState.control[m.source], `${m.id}: no drift`)
    const pattern = `^${m.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
    const lane = run(`${m.id}.target`, [m.test], pattern)
    const targetFile = realpathSync(resolve(copy, 'packages/reforge', m.test))
    assert(
      businessRed(lane.exit, lane.entries, targetFile, m.title),
      `${m.id}: not business red; ${output}`,
    )
    let sensitivity = null
    if (m.sensitivity) {
      const both = run(`${m.id}.same-field`, [...NEW_FILES, ...m.old])
      const executedBoth = executed(both.entries)
      const failed = executedBoth.filter((e) => e.status === 'failed')
      assert.equal(both.exit, 1, `${m.id}: same-field exit`)
      assert.equal(failed.length, 1, `${m.id}: same-field not exactly one red`)
      assert.equal(failed[0].fullName, m.title, `${m.id}: same-field wrong red`)
      for (const old of m.old)
        assert(
          executedBoth.filter((e) => e.file.endsWith(old)).every((e) => e.status === 'passed'),
          `${m.id}: old suite not green`,
        )
      sensitivity = {
        files: [...NEW_FILES, ...m.old],
        exit: both.exit,
        executed: executedBoth.length,
        oldAllGreen: true,
        onlyNewRed: failed[0].fullName,
      }
    }
    writeFileSync(target, pristine)
    const restored = run(`${m.id}.restored`, UNION)
    assert.equal(restored.exit, 0, `${m.id}: restored red`)
    const restoredState = stateHashes()
    assert.deepEqual(restoredState, controlState.control, `${m.id}: restore drift`)
    rows.push({
      id: m.id,
      source: m.source,
      target: { file: m.test, fullName: m.title },
      states: {
        control: controlState.control[m.source],
        variant: variantState[m.source],
        restored: restoredState[m.source],
      },
      lane: {
        exit: lane.exit,
        executed: executed(lane.entries).map(({ file, fullName, status, failureMessages }) => ({
          file,
          fullName,
          status,
          failureMessages,
        })),
      },
      sensitivity,
      restoredExit: restored.exit,
    })
    console.log(`${m.id}: detected (exactly one AssertionError); restored green`)
  }
} finally {
  rmSync(copy, { recursive: true, force: true })
}
for (const [file, expected] of Object.entries(repoHashes))
  assert.equal(hash(resolve(root, file)), expected, `repository drift: ${file}`)
writeFileSync(
  resolve(output, 'summary.json'),
  `${JSON.stringify({ repoHashes, judge: { positive: 1, rejected: 10 }, rows }, null, 2)}\n`,
)
console.log(`Evidence: ${output}`)
