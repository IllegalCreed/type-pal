/**
 * TEST-KIMI-CURRENT-CONTINUATION-MEDIUM-1 mutation counter-evidence runner (r2 strict judge).
 *
 * One declared execution scope per needle: the exact non-zero file×fullName multiset sampled
 * from the control run, re-required identically at variant and restored. Product mutations live
 * only inside a private mkdtemp copy; the repository is hash-pinned read-only. After each
 * variant the pristine file is restored and the same scope reruns green. The single judge
 * (judgedRun) is shared by the runner and the selftest. Raw stdout/stderr bytes are kept as
 * .raw.txt so they survive git (no *.log ignore reliance).
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

const mutations = [
  {
    id: 'machine-id-cursor',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (cursor.kind !== 'state' || cursor.machine !== executable.flow.machine.id)",
    to: "if (cursor.kind !== 'state')",
    test: NEW_FILES[0],
    title: 'K1 machine executable refuses a cursor from a foreign machine id',
    scope: [...NEW_FILES, OLD_AUTO],
    sensitivity: true,
  },
  {
    id: 'battle-none-arm',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (control?.kind !== 'startBattle' || control.arm === 'none')",
    to: "if (control?.kind !== 'startBattle')",
    test: NEW_FILES[0],
    title: 'K2 a startBattle child without an outcome arm rejects',
    scope: [...NEW_FILES, OLD_AUTO],
    sensitivity: true,
  },
  {
    id: 'none-explicit-self',
    source: 'packages/reforge/src/script-continuation.ts',
    from: "if (script.self === 'none' && command.self)",
    to: 'if (false && command.self)',
    test: NEW_FILES[0],
    title: 'K3 a none-self shared script refuses an explicit command self',
    scope: [...NEW_FILES, OLD_AUTO],
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
    scope: [...NEW_FILES, OLD_STAGES],
    sensitivity: true,
  },
]

const clean = (value) => stripVTControlCharacters(value)
const identity = (entry) => `${entry.file}::${entry.fullName}`

/** Strict judge shared by runner and selftest.
 * run: { exit, signal, log, suiteMessages, todo, entries: [{file, fullName, status, failureMessages}] }
 * scope: { identities: string[] } exact non-zero file×fullName multiset declared from control.
 * expectation: { kind: 'allGreen' } | { kind: 'singleRed', file, fullName }
 * Every state (control/variant/restored) must satisfy the same scope and the same status rules:
 * entries only passed, plus exactly the declared red target in a variant; no pending/skipped/
 * todo/duplicate leaves, no collection/runtime error, exit 0 for green and 1 for the red. */
function judgedRun(run, scope, expectation) {
  if (!Number.isInteger(run.exit) || run.signal !== null) return false
  if (expectation.kind === 'allGreen' && run.exit !== 0) return false
  if (expectation.kind === 'singleRed' && run.exit !== 1) return false
  if (/Unhandled Errors?|Unhandled Rejection|Uncaught Exception/i.test(clean(run.log))) return false
  if (run.suiteMessages.some((message) => message)) return false
  if (run.todo !== 0) return false
  if (scope.identities.length === 0) return false
  const statuses = new Map()
  for (const entry of run.entries) {
    const id = identity(entry)
    if (!statuses.has(id)) statuses.set(id, [])
    statuses.get(id).push(entry)
  }
  const expected = new Map()
  for (const id of scope.identities) expected.set(id, (expected.get(id) ?? 0) + 1)
  if (statuses.size !== expected.size) return false
  for (const [id, count] of expected) if (statuses.get(id)?.length !== count) return false
  const failed = run.entries.filter((entry) => entry.status === 'failed')
  if (run.entries.some((entry) => !['passed', 'failed'].includes(entry.status))) return false
  if (expectation.kind === 'allGreen') return failed.length === 0
  if (failed.length !== 1) return false
  const [red] = failed
  if (red.file !== expectation.file || red.fullName !== expectation.fullName) return false
  return (
    red.failureMessages.length > 0 &&
    red.failureMessages.every(
      (message) =>
        /^AssertionError(?:\b|:)/.test(clean(message).trimStart()) &&
        !/(?:\btimeout\b|\btimed out\b|unhandled|(?:^|\n)\s*(?:Error|TypeError|RangeError):)/i.test(
          clean(message),
        ),
    )
  )
}

// Selftest: the judge must accept the two honest shapes and reject every dishonest one.
const scope2 = { identities: ['/t/a.test.ts::case-a', '/t/a.test.ts::case-b'] }
const greenRun = {
  exit: 0,
  signal: null,
  log: 'ok',
  suiteMessages: [''],
  todo: 0,
  entries: [
    { file: '/t/a.test.ts', fullName: 'case-a', status: 'passed', failureMessages: [] },
    { file: '/t/a.test.ts', fullName: 'case-b', status: 'passed', failureMessages: [] },
  ],
}
const redTarget = {
  file: '/t/a.test.ts',
  fullName: 'case-a',
  status: 'failed',
  failureMessages: ['AssertionError: business difference'],
}
const redRun = { ...greenRun, exit: 1, entries: [redTarget, greenRun.entries[1]] }
assert(judgedRun(greenRun, scope2, { kind: 'allGreen' }))
assert(judgedRun(redRun, scope2, { kind: 'singleRed', file: redTarget.file, fullName: 'case-a' }))
const rejections = [
  [{ ...redRun, exit: 0 }, 'wrong exit for red'],
  [{ ...redRun, exit: 2 }, 'collection exit for red'],
  [{ ...redRun, signal: 'SIGTERM' }, 'signaled'],
  [{ ...redRun, log: 'Unhandled Rejection: boom' }, 'runtime marker in log'],
  [{ ...redRun, suiteMessages: ['collection exploded'] }, 'suite message'],
  [{ ...redRun, todo: 1 }, 'todo'],
  [
    {
      ...redRun,
      entries: [...redRun.entries, { ...redTarget, status: 'pending', failureMessages: [] }],
    },
    'declared file×fullName red overlaid with a pending duplicate leaf',
  ],
  [{ ...redRun, entries: [redTarget] }, 'missing declared leaf'],
  [
    {
      ...redRun,
      entries: [
        ...redRun.entries,
        { file: '/t/a.test.ts', fullName: 'case-c', status: 'passed', failureMessages: [] },
      ],
    },
    'extra leaf outside the declared scope',
  ],
  [
    { ...redRun, entries: [{ ...redTarget, fullName: 'case-b' }, greenRun.entries[1]] },
    'red with wrong identity',
  ],
  [{ ...redRun, entries: [redTarget, redTarget] }, 'two reds'],
  [
    {
      ...redRun,
      entries: [
        { ...redTarget, failureMessages: ['Error: not an assertion'] },
        greenRun.entries[1],
      ],
    },
    'non-AssertionError red',
  ],
  [
    {
      ...redRun,
      entries: [
        { ...redTarget, failureMessages: ['AssertionError: bad\nTypeError: nested'] },
        greenRun.entries[1],
      ],
    },
    'embedded runtime error inside the red message',
  ],
  [
    {
      ...redRun,
      entries: [redTarget, { ...greenRun.entries[1], status: 'pending' }],
    },
    'pending leaf inside the declared scope',
  ],
  [{ ...greenRun, entries: [redTarget, greenRun.entries[1]] }, 'red inside a green expectation'],
  [{ ...redRun, exit: 1, entries: [] }, 'zero execution'],
]
for (const [run, why] of rejections)
  assert(
    !judgedRun(run, scope2, { kind: 'singleRed', file: redTarget.file, fullName: 'case-a' }) &&
      !judgedRun(run, scope2, { kind: 'allGreen' }),
    `judge accepted a dishonest run: ${why}`,
  )

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const repoPinned = [
  ...new Set([...mutations.map((m) => m.source), ...mutations.flatMap((m) => m.scope)]),
].map((f) => (f.startsWith('packages/') ? f : `packages/reforge/${f}`))
const repoHashes = Object.fromEntries(repoPinned.map((f) => [f, hash(resolve(root, f))]))

const copy = mkdtempSync(join(tmpdir(), 'type-pal-kimi-mid-1-copy-'))
const rows = []
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

  const scopeStateFiles = (m) => [m.source, ...m.scope.map((f) => `packages/reforge/${f}`)]
  const stateHashes = (m) =>
    Object.fromEntries(scopeStateFiles(m).map((f) => [f, hash(resolve(copy, f))]))

  const run = (id, files) => {
    const report = resolve(output, `${id}.json`)
    const child = spawnSync(
      'node',
      [
        resolve(copy, 'node_modules/vitest/vitest.mjs'),
        'run',
        '--reporter=json',
        `--outputFile=${report}`,
        ...files,
      ],
      {
        cwd: resolve(copy, 'packages/reforge'),
        env: { ...process.env, FORCE_COLOR: '0' },
        encoding: 'utf8',
      },
    )
    const log = `${child.stdout ?? ''}${child.stderr ?? ''}`
    writeFileSync(resolve(output, `${id}.raw.txt`), log)
    const data = JSON.parse(readFileSync(report, 'utf8'))
    return {
      exit: child.status,
      signal: child.signal,
      log,
      suiteMessages: data.testResults.map((file) => file.message),
      todo: data.numTodoTests,
      entries: data.testResults.flatMap((file) =>
        file.assertionResults.map((entry) => ({ ...entry, file: file.name })),
      ),
    }
  }

  for (const m of mutations) {
    assert.equal(
      readFileSync(resolve(copy, m.source), 'utf8').split(m.from).length,
      2,
      `${m.id}: unique needle`,
    )
    const target = resolve(copy, m.source)
    const pristine = readFileSync(target, 'utf8')
    const targetFile = realpathSync(resolve(copy, 'packages/reforge', m.test))

    const control = run(`${m.id}.control`, m.scope)
    const declared = control.entries.map(identity)
    assert(
      judgedRun(control, { identities: declared }, { kind: 'allGreen' }),
      `${m.id}: control not strictly green; ${output}`,
    )
    const controlHash = stateHashes(m)

    writeFileSync(target, pristine.replace(m.from, m.to))
    const variantHash = stateHashes(m)
    assert.notEqual(variantHash[m.source], controlHash[m.source], `${m.id}: no drift`)
    const variant = run(`${m.id}.variant`, m.scope)
    assert(
      judgedRun(
        variant,
        { identities: declared },
        { kind: 'singleRed', file: targetFile, fullName: m.title },
      ),
      `${m.id}: variant not strictly one declared red; ${output}`,
    )

    writeFileSync(target, pristine)
    const restoredHash = stateHashes(m)
    assert.deepEqual(restoredHash, controlHash, `${m.id}: restore drift`)
    const restored = run(`${m.id}.restored`, m.scope)
    assert(
      judgedRun(restored, { identities: declared }, { kind: 'allGreen' }),
      `${m.id}: restored not strictly green; ${output}`,
    )

    const oldExecuted = m.sensitivity
      ? control.entries.filter((entry) =>
          m.scope.some((f) => !NEW_FILES.includes(f) && entry.file.endsWith(f)),
        )
      : []
    if (m.sensitivity)
      assert(oldExecuted.length > 0, `${m.id}: sensitivity scope ran zero old leaves`)
    rows.push({
      id: m.id,
      source: m.source,
      needle: { from: m.from, to: m.to },
      target: { file: m.test, fullName: m.title },
      scope: {
        files: m.scope,
        declaredLeaves: declared.length,
        identitiesSha256: createHash('sha256').update(declared.join('\n')).digest('hex'),
        sameAcrossStates: ['control', 'variant', 'restored'],
      },
      sensitivity: m.sensitivity
        ? {
            oldFiles: m.scope.filter((f) => !NEW_FILES.includes(f)),
            oldLeavesExecuted: oldExecuted.length,
            oldAllGreenVariant: variant.entries
              .filter((entry) => oldExecuted.some((old) => identity(old) === identity(entry)))
              .every((entry) => entry.status === 'passed'),
            onlyNewRed: m.title,
          }
        : null,
      states: {
        control: { exit: control.exit, sha256: controlHash },
        variant: { exit: variant.exit, sha256: variantHash },
        restored: { exit: restored.exit, sha256: restoredHash },
      },
      artifacts: {
        json: [`${m.id}.control.json`, `${m.id}.variant.json`, `${m.id}.restored.json`],
        raw: [`${m.id}.control.raw.txt`, `${m.id}.variant.raw.txt`, `${m.id}.restored.raw.txt`],
      },
    })
    console.log(
      `${m.id}: scope ${declared.length} leaves x3 states; variant strictly one AssertionError; restored green`,
    )
  }
} finally {
  rmSync(copy, { recursive: true, force: true })
}
for (const [file, expected] of Object.entries(repoHashes))
  assert.equal(hash(resolve(root, file)), expected, `repository drift: ${file}`)
writeFileSync(
  resolve(output, 'summary.json'),
  `${JSON.stringify(
    { repoHashes, judge: { accepted: 2, rejected: rejections.length }, rows },
    null,
    2,
  )}\n`,
)
console.log(`Evidence: ${output}`)
