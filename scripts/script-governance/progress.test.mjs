import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertAppendOnly,
  byteHash,
  entryKey,
  filterProgress,
  inventoryScenes,
  previewFingerprint,
  reportProgress,
  validateLedger,
} from './progress.mjs'
import { parseArguments } from './progress-report.mjs'

const flow = (...ids) => ({
  kind: 'stages',
  initial: ids[0],
  stages: ids.map((id) => ({ id, body: [] })),
})
const scene = () => ({
  id: 's001',
  entities: [
    {
      id: 'e10',
      pos: { col: 60, row: -23, height: 0 },
      behaviors: { auto: { leave: { flow: flow('start', 'repeat') } } },
    },
  ],
  hooks: {
    onEnter: { initial: 'default', variants: { default: { flow: flow('initial') } } },
    onTeleport: { initial: 'default', variants: { default: { flow: flow('exit') } } },
  },
})
const entry = {
  sceneId: 's001',
  entityId: 'e10',
  channel: 'auto',
  schemeId: 'leave',
  stageId: 'start',
}
const library = () => ({
  states: [
    {
      id: 'door',
      sceneId: 's001',
      name: 'At the door',
      entities: [{ entityId: 'e10', pos: { col: 60, row: -12.875, height: 0 } }],
    },
  ],
  bindings: [{ entry, stateId: 'door' }],
})
const files = new Map([
  ['runtime.js', Buffer.from('runtime-v1')],
  ['receipt.json', Buffer.from('{"before":[60,-12.875,0]}')],
])
const ledger = (...events) => ({
  kind: 'type-pal-script-progress',
  version: 1,
  project: 'pal',
  scope: 'scene-hooks-and-entity-behavior-steps',
  events,
})
function event(overrides = {}) {
  return {
    id: 'door-review',
    at: '2026-11-04T00:00:00Z',
    actor: 'author',
    reviewer: 'independent',
    entry,
    context: {
      id: '001-first-departure',
      description: 'first command after the foreground releases e10',
    },
    axis: 'review',
    from: 'unreviewed',
    to: 'verified',
    sourceFingerprint: inventoryScenes([scene()]).get(entryKey(entry)).sourceFingerprint,
    dependencies: [{ path: 'runtime.js', sha256: byteHash(files.get('runtime.js')) }],
    evidence: [
      {
        path: 'receipt.json',
        sha256: byteHash(files.get('receipt.json')),
        selector: 'command order 6454',
      },
    ],
    note: 'Checked actual command-entry position.',
    ...overrides,
  }
}
const report = (events, options = {}) =>
  reportProgress({
    scenes: [scene()],
    library: library(),
    ledger: ledger(...events),
    readReference: async (ref) => files.get(ref.path) ?? null,
    ...options,
  })
const doorRow = (result) => result.rows.find((row) => entryKey(row.entry) === entryKey(entry))

test('inventory includes unvisited and empty steps in both entity and scene channels', async () => {
  const result = await report([])
  assert.deepEqual(
    result.rows.map((row) => [row.entry.channel, row.entry.stageId]),
    [
      ['auto', 'start'],
      ['auto', 'repeat'],
      ['onEnter', 'initial'],
      ['onTeleport', 'exit'],
    ],
  )
  assert.equal(result.totalEntries, 4)
  assert(
    result.rows.every(
      (row) =>
        row.statuses.initialState.current === 'unreviewed' &&
        row.statuses.optimization.current === 'unassessed',
    ),
  )
  const duplicate = scene()
  duplicate.entities[0].behaviors.auto.leave.flow.stages.push({ id: 'repeat', body: [] })
  assert.throws(() => inventoryScenes([duplicate]), /duplicate step/)
})

test('linear events keep review, saved initial state, optimization and invocation contexts independent', async () => {
  const preview = { stateId: 'door', selection: 'default' }
  const result = await report([
    event(),
    event({
      id: 'door-saved',
      axis: 'initialState',
      to: 'saved',
      preview,
      previewFingerprint: previewFingerprint(entry, preview, library()),
    }),
    event({
      id: 'repeat-review',
      context: { id: 'revisit', description: 'later visit requires its own prestate' },
      to: 'in-review',
    }),
  ])
  const rows = filterProgress(result, { entity: 'e10' })
  const first = rows.find((row) => row.context?.id === '001-first-departure')
  assert.equal(first.statuses.review.current, 'verified')
  assert.equal(first.statuses.initialState.current, 'saved')
  assert.equal(first.statuses.optimization.current, 'unassessed')
  const revisit = rows.find((row) => row.context?.id === 'revisit')
  assert.equal(revisit.statuses.review.current, 'in-review')
  assert.equal(revisit.statuses.initialState.current, 'unreviewed')
  assert.equal(filterProgress(result, { pending: true }).length, result.rows.length)
})

test('reopening/play/reset acceptance requires independent review and cannot be inferred from a saved binding', () => {
  const preview = { stateId: 'door', selection: 'default' }
  const accepted = event({
    axis: 'initialState',
    to: 'verified',
    preview,
    previewFingerprint: previewFingerprint(entry, preview, library()),
  })
  validateLedger(ledger(accepted))
  assert.throws(
    () => validateLedger(ledger({ ...accepted, reviewer: 'author' })),
    /independent reviewer/,
  )
  assert.throws(
    () => validateLedger(ledger({ ...accepted, preview: undefined })),
    /selection fingerprint/,
  )
})

test('changing only the final stage field invalidates prior source acceptance while preserving recorded status', async () => {
  const changed = scene()
  changed.entities[0].behaviors.auto.leave.flow.stages[1].body.push({ kind: 'wait', ms: 100 })
  const row = doorRow(await report([event()], { scenes: [changed] }))
  assert.equal(row.statuses.review.recorded, 'verified')
  assert.equal(row.statuses.review.current, 'needs-review')
  assert.deepEqual(row.statuses.review.issues, ['source-changed'])
})

test('dependency changes and unavailable evidence invalidate only the corresponding recorded axis', async () => {
  const changed = await report([event()], {
    readReference: async (ref) => (ref.path === 'runtime.js' ? Buffer.from('runtime-v2') : null),
  })
  const row = doorRow(changed)
  assert.deepEqual(row.statuses.review.issues, [
    'dependency-changed:runtime.js',
    'evidence-missing:receipt.json',
  ])
  assert.equal(row.statuses.initialState.current, 'unreviewed')
})

test('a changed saved default invalidates that context without claiming a manually selected alternate changed', async () => {
  const preview = { stateId: 'door', selection: 'default' }
  const manual = { stateId: 'door', selection: 'manual' }
  const changed = library()
  changed.bindings = []
  const events = [
    event({
      id: 'default',
      axis: 'initialState',
      to: 'saved',
      preview,
      previewFingerprint: previewFingerprint(entry, preview, library()),
    }),
    event({
      id: 'manual',
      axis: 'initialState',
      to: 'saved',
      context: { id: 'alternate', description: 'explicit selection' },
      preview: manual,
      previewFingerprint: previewFingerprint(entry, manual, library()),
    }),
  ]
  const result = await report(events, { library: changed })
  assert.equal(doorRow(result).statuses.initialState.current, 'needs-review')
  assert.equal(
    result.rows.find((row) => row.context?.id === 'alternate').statuses.initialState.current,
    'saved',
  )
  changed.states[0].entities[0].pos.row = -23
  const altered = await report(events, { library: changed })
  assert.equal(
    altered.rows.find((row) => row.context?.id === 'alternate').statuses.initialState.current,
    'needs-review',
  )
})

test('unknown deleted entries remain explicit orphaned history', async () => {
  const deleted = scene()
  deleted.entities = []
  const result = await report([event()], { scenes: [deleted] })
  assert.equal(result.orphaned.length, 1)
  assert.equal(result.orphaned[0].reason, 'entry-not-in-current-canonical')
  assert.equal(result.totalEntries, 2)
})

test('ledger rejects ambiguous or unsupported claims instead of silently skipping them', () => {
  for (const [change, message] of [
    [{ to: 'done' }, /invalid axis\/status/],
    [{ from: 'verified' }, /previous status mismatch/],
    [{ evidence: [] }, /evidence required/],
    [{ dependencies: [] }, /declare relevant dependencies/],
    [{ context: { id: 'x' } }, /invocation context/],
    [{ evidence: [{ path: '../outside', sha256: byteHash('x') }] }, /within repository/],
  ])
    assert.throws(() => validateLedger(ledger(event(change))), message)
  assert.throws(() => validateLedger(ledger(event(), event())), /duplicate\/missing event/)
  assert.throws(
    () =>
      validateLedger(
        ledger(
          event({ axis: 'optimization', from: 'unassessed', to: 'accepted', reviewer: undefined }),
        ),
      ),
    /independent reviewer/,
  )
})

test('append-only comparison uses the complete event and catches tail changes', () => {
  const first = event()
  const next = event({ id: 'second', from: 'verified', note: 'Independent recheck.' })
  assertAppendOnly(ledger(first), ledger(first, next))
  assert.throws(() => assertAppendOnly(ledger(first, next), ledger(first)), /shortened/)
  assert.throws(
    () =>
      assertAppendOnly(ledger(first, next), ledger(first, { ...next, note: 'Rewritten history' })),
    /history changed at 1/,
  )
})

test('read-only report arguments expose scope filters and reject accidental write flags', () => {
  assert.deepEqual(parseArguments(['--scene', 's001', '--entity', 'e10', '--pending', '--json']), {
    limit: 40,
    scene: 's001',
    entity: 'e10',
    pending: true,
    json: true,
  })
  assert.throws(() => parseArguments(['--write']), /unknown argument/)
  assert.throws(() => parseArguments(['--scene']), /missing value/)
  assert.throws(() => parseArguments(['--limit', '0']), /positive integer/)
})
