import assert from 'node:assert/strict'
import test from 'node:test'
import { installErrandObserver } from './errand-observer.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import {
  decodeLongEvidence,
  encodeLongEvidence,
  longEvidenceArtifact,
  readLongEvidenceArchive,
} from './long-evidence.mjs'
import { createScriptCausalObserver } from './script-causal-observer.mjs'
import { createSnapshotGraph } from './snapshot-graph.mjs'

test('real long collector preserves pre-encoding causal facts, historical snapshots, progress and draw payloads', async () => {
  const host = { addEventListener() {} },
    expected = []
  const causal = new Function('globalThis', `return (${createScriptCausalObserver})`)(host)
  new Function(
    'globalThis',
    'causal',
    'recorder',
    'graph',
    `(${installErrandObserver})(causal, recorder, graph)`,
  )(
    host,
    (options) =>
      causal({
        ...options,
        append: (list, value, limit) => {
          const event = options.append(list, value, limit)
          if (event) {
            const { snapshotRefs: _, ...envelope } = event
            expected.push(
              JSON.parse(
                JSON.stringify({ ...envelope, ...value, order: event.order, seq: event.seq }),
              ),
            )
          }
          return event
        },
      }),
    new Function('globalThis', `return (${createEvidenceRecorder})`)(host),
    createSnapshotGraph,
  )
  const world = { script: { ordered: { z: 1, a: 2 } }, party: [{ id: 'hero' }] },
    actor = { position: [3, 4, 0], facing: 'left', visible: true },
    state = {
      scene: 's004',
      control: true,
      actors: { e83: actor },
      persistent: { e83: { value: 1 } },
      hooks: {},
      money: 550,
    }
  host.__openingCauseSnapshot = () => {
    host.__errandPoint('observe:causal', state)
    host.__openingCauseWorld(world)
  }
  host.__errandPoint('commit:initial', state)
  const runner = {},
    signal = {}
  host.__openingCauseBinding(runner, {
    kind: 'entity-behavior',
    scene: 's004',
    entity: 'e83',
    channel: 'auto',
    behavior: 'default',
  })
  host.__openingCauseRun(runner, signal, { self: { scene: 's004', entity: 'e83' } })
  const resource = host.__e2eRecordSpriteFrame({ width: 1, height: 1, pixels: [7], opaque: [1] })
  for (const value of [1, 2, 1]) {
    world.script.ordered.a = value
    state.persistent.e83.value = value
    actor.position = [value, 4, 0]
    host.__errandPoint('commit:move', state)
    host.__openingCauseStep(runner, {
      command: { kind: 'leaf', command: { kind: 'wait', ms: 1 } },
      path: ['routine', value],
    })
    host.__openingCauseLeafCompleted(runner)
    host.__openingCauseRuntimeConsume(
      signal,
      null,
      {},
      {
        kind: 'command',
        entity: 'e83',
        durationMs: 0,
        remainingMs: 0,
      },
    )
    state.renderEvidence = {
      actors: {
        e83: { position: actor.position, facing: 'left', frame: value, frameResourceId: resource },
      },
    }
    host.__errandPoint('render:world', state)
  }
  host.__openingCauseEnded(runner, { aborted: false, resolved: true })
  state.scene = 's005'
  host.__errandPoint('commit:scene-ready', state)
  const logical = JSON.parse(JSON.stringify(host.__readErrandEvidence())),
    wire = JSON.parse(JSON.stringify(host.__readErrandArchive())),
    decoded = decodeLongEvidence(structuredClone(wire))
  assert.deepEqual(decoded, logical)
  assert.deepEqual(decoded.causes, expected)
  assert(
    decoded.causes.some(
      (event) => event.kind === 'command' && event.phase === 'runtime-wait-consumed',
    ),
  )
  assert.equal(JSON.stringify(decoded.causes[0].world.script.ordered), '{"z":1,"a":2}')
  assert.equal(
    decoded.causes[0].world.script.ordered.a,
    2,
    'later in-place writes must not change old snapshots',
  )
  assert(decoded.events.some((e) => e.kind === 'scene' && e.sceneVisit === 2))
  assert.deepEqual(decoded.resources[0].pixels, [7])
  assert.deepEqual(
    encodeLongEvidence(decoded),
    wire,
    'physical re-export must not expand snapshots/progress',
  )
  assert.throws(() => {
    decoded.causes[0].world.party[0].id = 'mutated'
  }, TypeError)
  assert.throws(() => {
    decoded.causes[0].author.behavior = 'mutated'
  }, TypeError)
  const page = {
    evaluate: (fn, name) => new Function('window', 'name', `return (${fn})(name)`)(host, name),
  }
  assert.deepEqual(await readLongEvidenceArchive(page), logical)
  const archive = longEvidenceArtifact(decoded)
  assert.deepEqual(decodeLongEvidence(JSON.parse(archive.bytes)), logical)
  assert.throws(() => longEvidenceArtifact(decoded, archive.byteLength - 1), /byte budget/)
})

test('long collector keeps state commits beyond the shared short-list ceiling', () => {
  const host = { addEventListener() {} }
  new Function(
    'globalThis',
    'causal',
    'recorder',
    'graph',
    `(${installErrandObserver})(causal, recorder, graph)`,
  )(
    host,
    new Function('globalThis', `return (${createScriptCausalObserver})`)(host),
    new Function('globalThis', `return (${createEvidenceRecorder})`)(host),
    createSnapshotGraph,
  )
  for (let position = 0; position < 16_001; position++)
    host.__errandPoint('commit:move', {
      scene: 's004',
      control: true,
      money: 0,
      persistent: {},
      hooks: {},
      actors: { e83: { position: [position, 0, 0] } },
    })
  const trace = host.__readErrandEvidence()
  assert.equal(trace.overflow, false)
  assert.deepEqual(trace.errors, [])
  const commits = trace.events.filter((event) => event.kind === 'actor')
  assert.equal(commits.length, 16_001)
  assert.deepEqual(commits.at(-1).state.position, [16_000, 0, 0])
})

test('snapshot graph is lossless JSON with structural sharing, bounded storage and rejecting malformed references', () => {
  const graph = createSnapshotGraph(),
    records = []
  const shared = { ordered: { z: 1, a: 2 }, nested: ['ref', { ref: 0 }, null, false, 2, '中文'] }
  for (let i = 0; i < 1000; i++)
    records.push({ order: i, world: { shared, changed: i }, poses: { shared } })
  const packed = records.map(graph.pack),
    decoded = graph.unpack(packed, graph.nodes)
  assert.deepEqual(decoded, records)
  assert.equal(decoded[0].world.shared, decoded[999].world.shared)
  assert(graph.stats().nodes < 2100)
  assert(
    JSON.stringify({ packed, nodes: graph.nodes }).length < JSON.stringify(records).length * 0.7,
  )
  for (const nodes of [
    [['a', [{ ref: 0 }]]],
    [['o', [['x', { ref: 1 }]]]],
    [['unknown', []]],
    [
      [
        'o',
        [
          ['x', 1],
          ['x', 2],
        ],
      ],
    ],
    [['o', [[3, false]]]],
  ])
    assert.throws(() => graph.unpack([], nodes))
  assert.throws(() => graph.unpack([{ snapshotRefs: { poses: { ref: 0 } } }], []), /reference/)
  assert.throws(
    () => graph.unpack([{ poses: {}, snapshotRefs: { poses: null } }], []),
    /conflicting/,
  )
  assert.throws(() => decodeLongEvidence({ evidenceFormat: 'unknown' }), /current snapshot format/)
  assert.throws(() => createSnapshotGraph({ maxBytes: 2 }).pack({ world: shared }), /capacity/)
  assert.throws(() => createSnapshotGraph({ maxNodes: 1 }).pack({ world: shared }), /capacity/)
  assert.throws(
    () => graph.compactProgress([{ kind: 'progress', before: null, state: { inventory: [] } }]),
    /unsupported progress field/,
  )
  for (const budget of [{ maxBytes: 1 }, { maxNodes: 0 }])
    assert.throws(
      () =>
        createSnapshotGraph(budget).unpack(
          [{ snapshotRefs: { world: { ref: 0 } } }],
          [['o', [['a', 1]]]],
        ),
      /capacity/,
    )
})
