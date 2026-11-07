import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertAppendOnly,
  byteHash,
  entryKey,
  filterProgress,
  inventoryScenes,
  parseProgressDocument,
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
  kind: 'type-pal-script-preview',
  version: 3,
  schemeDefaults: [],
  states: [
    {
      id: 'door',
      name: 'At the door',
      scenes: [
        {
          sceneId: 's001',
          entities: [{ entityId: 'e10', pos: { col: 60, row: -12.875, height: 0 } }],
        },
      ],
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

test('document parser consumes only the explicitly named ledger block', () => {
  const source = [
    '# Script progress',
    '```json',
    '{"example":"not the ledger"}',
    '```',
    '```json script-progress-ledger',
    JSON.stringify(ledger(event())),
    '```',
    'Current status remains derived from the events.',
  ].join('\r\n')
  const parsed = parseProgressDocument(source)
  assert.equal(parsed.events[0].id, 'door-review')
  assert.equal(parsed.events[0].to, 'verified')
})

test('document parser rejects missing, repeated, unclosed, malformed or invalid ledger blocks', () => {
  const block = `\`\`\`json script-progress-ledger\n${JSON.stringify(ledger())}\n\`\`\``
  assert.throws(() => parseProgressDocument('```json\n{}\n```'), /exactly one named/)
  assert.throws(() => parseProgressDocument(`${block}\n${block}`), /exactly one named/)
  assert.throws(() => parseProgressDocument('```json script-progress-ledger\n{}'), /not closed/)
  assert.throws(() => parseProgressDocument('```json script-progress-ledger\n{\n```'), SyntaxError)
  assert.throws(
    () => parseProgressDocument('```json script-progress-ledger\n{}\n```'),
    /ERR_ASSERTION/,
  )
})

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

test('recipe steps retain stable progress identities and invalidate evidence when parameters change', () => {
  const source = scene()
  source.entities[0].behaviors.trigger = {
    search: {
      flow: {
        kind: 'acquisition',
        recipe: 'builtin/item/search',
        stages: { available: { id: 'first' }, collected: { id: 'empty' } },
        rewards: [{ kind: 'item', itemId: '99', count: 1 }],
        notice: { kind: 'silent' },
        afterCollect: 'repeat',
        empty: { kind: 'silent' },
      },
    },
  }
  const inventory = inventoryScenes([source])
  const first = [...inventory.values()].filter((row) => row.entry.channel === 'trigger')
  assert.deepEqual(
    first.map((row) => row.entry.stageId),
    ['first', 'empty'],
  )
  const recipe = source.entities[0].behaviors.trigger.search.flow
  recipe.rewards[0].count = 2
  const changed = inventoryScenes([source])
  for (const row of first) {
    const after = changed.get(entryKey(row.entry))
    assert.deepEqual(after.entry, row.entry)
    assert.notEqual(after.sourceFingerprint, row.sourceFingerprint)
  }
  recipe.stages.collected.id = 'first'
  assert.throws(() => inventoryScenes([source]), /duplicate step/)
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

test('one invocation context cannot change its description across review axes', () => {
  const review = event()
  const optimization = event({
    id: 'optimization-other-visit',
    axis: 'optimization',
    from: 'unassessed',
    to: 'planned',
    context: { ...review.context, description: 'a different later visit' },
  })
  assert.throws(() => validateLedger(ledger(review, optimization)), /context identity changed/)
  validateLedger(
    ledger(review, { ...optimization, context: { ...optimization.context, id: 'later-visit' } }),
  )
})

test('configured candidates stay unsaved until a matching persisted selection exists', async () => {
  const preview = { stateId: 'door', selection: 'default' }
  const configured = event({
    axis: 'initialState',
    to: 'configured',
    preview,
    previewFingerprint: previewFingerprint(entry, preview, library()),
    note: 'Candidate configured in UI; save has not succeeded.',
  })
  const disk = { ...library(), states: [], bindings: [] }
  const result = await report([configured], { library: disk })
  assert.equal(doorRow(result).statuses.initialState.current, 'configured')
  const saved = event({ ...configured, id: 'save-claim', from: 'configured', to: 'saved' })
  const absent = doorRow(await report([configured, saved], { library: disk }))
  assert.equal(absent.statuses.initialState.current, 'needs-review')
  assert.deepEqual(absent.statuses.initialState.issues, ['preview-selection-changed-or-missing'])
  assert.equal(doorRow(await report([configured, saved])).statuses.initialState.current, 'saved')
  const missingEvidence = await report([configured], {
    library: disk,
    readReference: async (ref) => (ref.path === 'receipt.json' ? null : files.get(ref.path)),
  })
  assert.deepEqual(doorRow(missingEvidence).statuses.initialState.issues, [
    'evidence-missing:receipt.json',
  ])
  assert.throws(
    () => validateLedger(ledger({ ...configured, preview: { ...preview, selection: 'unknown' } })),
    /invalid selection/,
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
  changed.states[0].scenes[0].entities[0].pos.row = -23
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

test('v3 preview fingerprints resolve scheme inheritance, preserve explicit scene defaults and reject older envelopes', async () => {
  const current = library()
  const { stageId: _stageId, ...schemeEntry } = entry
  current.schemeDefaults = [{ entry: schemeEntry, stateId: 'door' }]
  current.bindings = []
  const preview = { stateId: 'door', selection: 'default' }
  assert.equal(
    previewFingerprint(entry, preview, current),
    previewFingerprint(entry, preview, library()),
  )
  current.bindings = [{ entry, stateId: null }]
  assert.equal(previewFingerprint(entry, preview, current), null)
  assert.notEqual(previewFingerprint(entry, { stateId: null, selection: 'default' }, current), null)
  assert.notEqual(
    previewFingerprint(entry, { stateId: 'door', selection: 'manual' }, current),
    null,
  )
  current.bindings = []
  current.schemeDefaults[0].stateId = 'missing'
  assert.equal(previewFingerprint(entry, preview, current), null)
  await assert.rejects(
    reportProgress({
      scenes: [scene()],
      library: { ...current, version: 1 },
      ledger: ledger(),
      readReference: async () => null,
    }),
    /version 3/,
  )
  assert.throws(
    () => previewFingerprint(entry, preview, { ...current, schemeDefaults: undefined }),
    /schemeDefaults/,
  )
})

test('the report rejects an editor-invalid unselected state instead of crediting another saved context', async () => {
  const preview = { stateId: 'door', selection: 'default' }
  const saved = event({
    axis: 'initialState',
    to: 'saved',
    preview,
    previewFingerprint: previewFingerprint(entry, preview, library()),
  })
  const invalid = library()
  invalid.states.push({
    id: 'unselected',
    name: 'Other start',
    scenes: [{ sceneId: 's001', entities: [] }],
    motion: {},
  })
  await assert.rejects(
    reportProgress({
      scenes: [scene()],
      library: invalid,
      ledger: ledger(saved),
      readReference: async (ref) => files.get(ref.path) ?? null,
    }),
    /motion/,
  )
})

test('cross-scene fingerprints cover every slice even when the source scene has no slice', async () => {
  const current = library()
  current.states[0].scenes = [
    { sceneId: 'elsewhere', entities: [{ entityId: 'e10', hidden: true }] },
  ]
  const preview = { stateId: 'door', selection: 'default' }
  const before = previewFingerprint(entry, preview, current)
  assert.notEqual(before, null)
  const saved = event({ axis: 'initialState', to: 'saved', preview, previewFingerprint: before })
  const scenes = [scene(), { ...scene(), id: 'elsewhere' }]
  const unchanged = await report([saved], { library: current, scenes })
  assert.equal(doorRow(unchanged).statuses.initialState.current, 'saved')
  current.states[0].scenes[0].entities[0].hidden = false
  const changed = await report([saved], { library: current, scenes })
  assert.equal(doorRow(changed).statuses.initialState.current, 'needs-review')
})
