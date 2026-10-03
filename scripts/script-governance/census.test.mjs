import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { buildCensus } from './census.mjs'
import { loadCanonicalScenes } from './run.mjs'
import { callerContexts, indexSource, sourceSegment } from './source.mjs'

const raw = (opcode, ...operands) => ({
  op: 'raw',
  opcode,
  operands: [...operands, 0, 0, 0].slice(0, 3),
})
const end = (extra = {}) => ({ op: 'end', ...extra })
const dialogue = (messageIndex) => ({
  op: 'showDialog',
  messageIndex,
  text: `line-${messageIndex}`,
})
const dialog = (...indices) => ({
  kind: 'dialog',
  cue: { rows: indices.map((index) => ({ text: `dlg.${index}` })) },
})
const behavior = (body, extra = {}) => ({
  flow: { kind: 'stages', initial: 'first', stages: [{ id: 'first', body, ...extra }] },
})
function fixture(commands, behaviors = { renamed: behavior([dialog(100)]) }) {
  return {
    events: { segments: [{ name: 'all', commands }] },
    sourceScenes: [{ sceneId: 10, eventObjects: [{ id: 191, triggerLabel: 'L_1' }] }],
    canonicalScenes: [
      { id: 's010', entities: [{ id: 'e191', behaviors: { trigger: behaviors } }] },
    ],
  }
}
const installation = (owner = 192, target = 3) =>
  fixture([
    end(),
    raw(0x25, owner, target),
    end(),
    dialogue(100),
    end({ advance: true }),
    dialogue(101),
    end(),
  ])

test('confirmation refusal remains structurally reachable with its real caller owner', () => {
  const input = fixture([
    end(),
    raw(0x0a, 4),
    dialogue(101),
    end(),
    raw(0x25, 192, 6),
    end(),
    dialogue(100),
    end(),
  ])
  const source = indexSource(input.events, input.sourceScenes)
  assert.deepEqual(callerContexts(source).get(4), [
    { root: 's010/e191/trigger', entry: 1, owner: 191 },
  ])
  assert.equal(buildCensus(input).edges[0].rootReachability, 'structurally-reached-from-static-root')
  assert.equal(sourceSegment(source.commands, 1, 191).terminal.kind, 'nonlinear')
})

test('current loadScene.scene contributes its actual canonical scene token', () => {
  const input = fixture(
    [end(), raw(0x25, 192, 3), end(), { op: 'loadScene', sceneId: 22 }, end()],
    { current: behavior([{ kind: 'loadScene', scene: 's021' }]) },
  )
  const row = buildCensus(input).edges[0].bindings[0]
  assert.equal(row.status, 'mapped')
  assert.equal(row.behavior, 'current')
})

test('keeps every physical edge, including duplicates, no-op and clear', () => {
  const input = installation()
  input.events.segments[0].commands.splice(
    1,
    0,
    raw(0x25, 192, 3),
    raw(0x25, 0, 3),
    raw(0x24, 192, 0),
  )
  const report = buildCensus(input)
  assert.equal(report.totals.rawEdges, 4)
  assert.equal(report.totals.uniqueNonzeroBindings, 1)
  assert.deepEqual(report.totals.byEffect, { clear: 1, install: 2, 'no-op': 1 })
  assert.deepEqual(
    report.edges.map((edge) => edge.address),
    [1, 2, 3, 4],
  )
})

test('maps by explicit identity and unique body, never legacy number or array position', () => {
  const input = installation()
  input.sourceScenes[0].eventObjects.unshift({ id: 700 })
  input.canonicalScenes[0].entities.unshift({ id: 'e700', behaviors: {} })
  const edge = buildCensus(input).edges[0]
  assert.equal(edge.status, 'mapped')
  assert.equal(edge.bindings[0].behavior, 'renamed')
  assert.equal(edge.bindings[0].entity, 'e191')
  assert.deepEqual(edge.bindings[0].missingSuccessorTokens, ['dialog:101'])
})

test('missing explicit source/canonical identities remain unknown', () => {
  const wrongOperand = buildCensus(installation(1)).edges[0]
  assert.equal(wrongOperand.status, 'unknown')
  const input = installation()
  input.canonicalScenes[0].entities[0].id = 'e0'
  assert.equal(buildCensus(input).edges[0].bindings[0].reason, 'canonical-identity-not-found')
})

test('self is resolved from each caller owner, not the source array or a default NPC', () => {
  const input = installation(65535)
  input.sourceScenes[0].eventObjects.push({ id: 200, triggerLabel: 'L_1' })
  input.canonicalScenes[0].entities.push({
    id: 'e200',
    behaviors: { trigger: { different: behavior([dialog(100)]) } },
  })
  const edge = buildCensus(input).edges[0]
  assert.equal(edge.status, 'multicontext')
  assert.deepEqual(edge.owners, [191, 200])
  assert.equal(edge.callers.length, 2)
  assert.equal(edge.bindings.length, 2)
})

test('scene/item self lacks a world owner even when its item id resembles an entity', () => {
  const input = installation(65535)
  input.sourceScenes[0].eventObjects[0].triggerLabel = undefined
  input.sourceScenes[0].onEnterLabel = 'L_1'
  input.externalTables = [{ name: 'items', rows: [{ id: 191, scriptOnUse: 1 }] }]
  const edge = buildCensus(input).edges[0]
  assert.equal(edge.status, 'unknown')
  assert.equal(edge.unknownSelfContext, true)
  assert.deepEqual(edge.owners, [])
})

test('a known self owner does not erase another unknown caller context', () => {
  const input = installation(65535)
  input.sourceScenes[0].onEnterLabel = 'L_1'
  const edge = buildCensus(input).edges[0]
  assert.equal(edge.status, 'unknown')
  assert.deepEqual(edge.owners, [191])
})

test('call override uses its own 1-based identity; 65535 is not self in call opcode', () => {
  for (const [operand, owner] of [
    [0, 191],
    [201, 200],
    [65535, null],
  ]) {
    const input = fixture([
      end(),
      raw(0x04, 4, operand),
      end(),
      end(),
      raw(0x25, 65535, 7),
      end(),
      end(),
      dialogue(100),
      end(),
    ])
    input.sourceScenes[0].eventObjects.push({ id: 200 })
    assert.equal(buildCensus(input).edges[0].callers[0].owner, owner)
  }
})

test('duplicate canonical bodies and distinct source entries with identical bodies are ambiguous', () => {
  const input = installation()
  input.canonicalScenes[0].entities[0].behaviors.trigger.copy = behavior([dialog(100)])
  assert.equal(buildCensus(input).edges[0].status, 'multicontext')
  const sourceCollision = installation()
  sourceCollision.events.segments[0].commands.push(raw(0x25, 192, 9), end(), dialogue(100), end())
  assert.equal(
    buildCensus(sourceCollision).edges[0].bindings[0].reason,
    'source-target-body-collision',
  )
})

test('author edits are unmapped or protected, not converted into a missing-script verdict', () => {
  const input = installation()
  input.canonicalScenes[0].entities[0].behaviors.trigger.renamed = behavior([dialog(999)])
  assert.equal(buildCensus(input).edges[0].status, 'unknown')
  const protectedReport = buildCensus({ ...installation(), protectedSceneIds: ['s010'] })
  assert.equal(protectedReport.edges[0].status, 'author-protected')
  assert.equal(protectedReport.totals.riskCandidates, 0)
})

test('unknown instruction or source branch cannot yield a confident simple-body match', () => {
  for (const command of [raw(0xffff, 0), raw(0x74, 5)]) {
    const input = installation()
    input.events.segments[0].commands[4] = command
    assert.equal(buildCensus(input).edges[0].status, 'unknown')
  }
})

test('successor content elsewhere never proves the installed cursor is fixed', () => {
  const input = installation()
  input.canonicalScenes[0].entities[0].behaviors.trigger.other = behavior([dialog(101)])
  const report = buildCensus(input)
  assert.equal(report.edges[0].bindings[0].risk, 'missing-successor-candidate')
  assert.equal(report.totals.alreadyFixed, 0)
  assert.equal(report.totals.provenMissing, 0)
  input.canonicalScenes[0].entities[0].behaviors.trigger.renamed.flow.stages.push({
    id: 'unreachable',
    body: [dialog(101)],
  })
  assert.equal(
    buildCensus(input).edges[0].bindings[0].reason,
    'successor-content-present-cursor-not-proven',
  )
})

test('reward then source advance flags a risk even when the successor starts with a condition', () => {
  const input = fixture(
    [
      end(),
      raw(0x25, 192, 3),
      end(),
      { op: 'giveItem', itemId: 107, count: 0 },
      end({ advance: true }),
      raw(0x74, 8),
      dialogue(101),
      end(),
      end(),
    ],
    { reward: behavior([{ kind: 'giveItem', itemId: '107' }]) },
  )
  const binding = buildCensus(input).edges[0].bindings[0]
  assert.equal(binding.risk, 'repeat-reward-candidate')
  assert.equal(binding.successor.terminal.kind, 'nonlinear')
})

test('self-rebinding and explicit completion are not labelled a repeating reward', () => {
  for (const extra of [{ next: { kind: 'complete' } }, {}]) {
    const body = [{ kind: 'giveItem', itemId: '107' }]
    if (!extra.next)
      body.push({
        kind: 'selectEntityBehavior',
        channel: 'trigger',
        target: { scene: 's010', entity: 'e191' },
        selection: { kind: 'none' },
      })
    const input = fixture(
      [
        end(),
        raw(0x25, 192, 3),
        end(),
        { op: 'giveItem', itemId: 107, count: 0 },
        end({ advance: true }),
        end(),
      ],
      { reward: behavior(body, extra) },
    )
    assert.equal(buildCensus(input).edges[0].bindings[0].risk, undefined)
  }
})

test('source and author explicit successor handoff is separate from missing-successor risks', () => {
  const input = fixture(
    [
      end(),
      raw(0x25, 192, 3),
      end(),
      dialogue(100),
      raw(0x25, 192, 6),
      end({ advance: true }),
      dialogue(101),
      end(),
    ],
    {
      first: behavior([
        dialog(100),
        {
          kind: 'selectEntityBehavior',
          target: { scene: 's010', entity: 'e191' },
          channel: 'trigger',
          selection: { kind: 'use', value: 'second' },
        },
      ]),
      second: behavior([dialog(101)]),
    },
  )
  const report = buildCensus(input)
  const binding = report.edges[0].bindings[0]
  assert.equal(binding.risk, undefined)
  assert.equal(binding.reviewType, 'selection-handoff')
  assert.equal(binding.handoffBehavior, 'second')
  assert.equal(report.totals.alreadyFixed, 0)
  assert.equal(report.totals.handoffReviewCases, 1)
  input.canonicalScenes[0].entities[0].behaviors.trigger.second = behavior([dialog(999)])
  assert.equal(buildCensus(input).edges[0].bindings[0].risk, 'missing-successor-candidate')
})

test('dynamic install reachability is propagated; unrelated unreachable source is not erased', () => {
  const input = fixture([
    end(),
    raw(0x25, 192, 4),
    end(),
    end(),
    raw(0x25, 192, 7),
    end(),
    end(),
    dialogue(100),
    end(),
    raw(0x25, 192, 7),
    end(),
  ])
  const edges = buildCensus(input).edges
  assert.equal(edges[1].rootReachability, 'structurally-reached-via-dynamic-install')
  assert.equal(edges[2].rootReachability, 'not-observed-in-modeled-roots')
  assert.equal(edges.length, 3)
})

test('invalid global addresses and duplicate source IDs fail closed', () => {
  const input = installation()
  input.events.segments[0].commands[3].label = 'L_99'
  assert.throws(() => indexSource(input.events, input.sourceScenes), /address mismatch/)
  delete input.events.segments[0].commands[3].label
  input.sourceScenes[0].eventObjects.push({ id: 191 })
  assert.throws(() => indexSource(input.events, input.sourceScenes), /duplicate explicit/)
})

test('report carries hashes and token IDs but no dialogue plaintext; inputs are unchanged', () => {
  const input = installation()
  const before = JSON.stringify(input)
  const report = buildCensus(input)
  assert.equal(JSON.stringify(input), before)
  assert.match(report.inputHashes.events, /^[a-f0-9]{64}$/)
  assert.ok(!JSON.stringify(report).includes('line-100'))
})

test('CLI rejects repair and arbitrary input/output paths', () => {
  const run = new URL('./run.mjs', import.meta.url)
  for (const option of ['--repair', '--out=projects/pal/content/scenes/s010.json']) {
    const result = spawnSync(process.execPath, [run.pathname, option], { encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /No input, output, repair, or write-project overrides/)
  }
})

test('canonical scenes come from the manifest, not the directory containing index.json', async () => {
  const calls = []
  const index = { scenes: [{ id: 's010', path: 'content/scenes/custom.json' }] }
  const scenes = await loadCanonicalScenes(index, async (path) => {
    calls.push(path)
    return { id: 's010', entities: [] }
  })
  assert.equal(scenes.length, 1)
  assert.deepEqual(calls, ['content/scenes/custom.json'])
  await assert.rejects(
    loadCanonicalScenes(index, async () => ({ id: 's999' })),
    /identity mismatch/,
  )
  await assert.rejects(
    loadCanonicalScenes({ scenes: [...index.scenes, ...index.scenes] }, async () => ({
      id: 's010',
    })),
    /Duplicate/,
  )
  await assert.rejects(
    loadCanonicalScenes(
      { scenes: [{ id: 'bad', path: 'content/scenes/../../index.json' }] },
      async () => ({}),
    ),
    /outside/,
  )
})

test('real corpus inventory can be reproduced without an archived converter', async (context) => {
  let input
  try {
    input = JSON.parse(
      await readFile(new URL('../../data/extracted/events/all.json', import.meta.url), 'utf8'),
    )
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    context.skip('Original extracted input is optional; synthetic safety tests still run')
    return
  }
  const source = indexSource(input, [])
  assert.equal(source.commands.length, 43503)
  assert.equal(source.edges.length, 639)
  assert.equal(source.edges.filter((edge) => edge.effect === 'no-op').length, 6)
  assert.equal(source.edges.filter((edge) => edge.effect === 'clear').length, 53)
  assert.equal(source.edges.filter((edge) => edge.operand === 65535).length, 48)
})
