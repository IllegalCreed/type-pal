import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertContinuousCheckpoint,
  CONTINUOUS_SCENE_CHECKPOINTS,
  CONTINUOUS_STORY_FRAGMENTS,
  continuousFragmentContext,
  continuousStoryActions,
  continuousStoryPlan,
  DualTrackBarrier,
  runContinuousStory,
} from './continuous-story.mjs'

const report = (fragment) => ({ fragment, status: 'passed', case: 'story' })

test('continuous story registry is six ordered story fragments with no specialist cases', () => {
  assert.deepEqual(
    CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => id),
    ['001', '002', '003', '004', '005', '006'],
  )
  assert(CONTINUOUS_STORY_FRAGMENTS.every((fragment) => fragment.checkpoints.length > 0))
})

test('continuous checkpoints are scene-boundary oracles, not action-count labels', () => {
  assert.equal(CONTINUOUS_SCENE_CHECKPOINTS['002'].game, 4)
  assert.deepEqual(assertContinuousCheckpoint('005', 'reforge', { scene: 's004' }), {
    fragment: '005',
    engine: 'reforge',
    scene: 's004',
  })
  assert.throws(
    () => assertContinuousCheckpoint('002', 'reforge', { scene: 's001' }),
    /stopped at scene s001; expected s003/,
  )
  assertContinuousCheckpoint('002', 'reforge', {
    scene: 's003',
    runtime: { position: { col: 126, row: 46 } },
    script: {
      entityPos: { s003: { e56: { col: 137, row: 66 } } },
      behaviors: {
        entities: { s003: { e56: { auto: { cursor: { at: { kind: 'completed' } } } } } },
      },
    },
    trio: [{ visible: false }, { visible: false }, { visible: false }],
  })
  assert.throws(
    () =>
      assertContinuousCheckpoint('002', 'reforge', {
        scene: 's003',
        runtime: { position: { col: 126, row: 46 } },
        script: {
          entityPos: { s003: { e56: { col: 137, row: 66 } } },
          behaviors: {
            entities: { s003: { e56: { auto: { cursor: { at: { kind: 'completed' } } } } } },
          },
        },
        trio: [{ visible: false }, { visible: true }, { visible: false }],
      }),
    /before all three Miao guests left/,
  )
})

test('plan rejects missing, reordered, failed and specialist reports', () => {
  const game = CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => report(id)),
    reforge = CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => report(id))
  assert.equal(
    continuousStoryPlan({ gameReports: game, reforgeReports: reforge }).order.at(-1),
    '006',
  )
  assert.throws(
    () => continuousStoryPlan({ gameReports: game.slice(1), reforgeReports: reforge }),
    /chain is incomplete/,
  )
  const reordered = [...game]
  ;[reordered[1], reordered[2]] = [reordered[2], reordered[1]]
  assert.throws(
    () => continuousStoryPlan({ gameReports: reordered, reforgeReports: reforge }),
    /out of order/,
  )
  const specialist = game.map((entry, index) => (index === 3 ? { ...entry, case: 'items' } : entry))
  assert.throws(
    () => continuousStoryPlan({ gameReports: specialist, reforgeReports: reforge }),
    /specialist/,
  )
})

test('dual-track barrier waits for both engines and detaches payloads', async () => {
  const barrier = new DualTrackBarrier(),
    first = barrier.arrive('game', '002', 'trio-hidden', { position: [1, 2] })
  assert.deepEqual(barrier.pending(), [{ key: '002:trio-hidden', engines: ['game'] }])
  const second = barrier.arrive('reforge', '002', 'trio-hidden', { position: [3, 4] }),
    [a, b] = await Promise.all([first, second])
  assert.deepEqual(a, b)
  assert.notEqual(a.game, undefined)
  await assert.rejects(() => barrier.arrive('game', '002', 'trio-hidden', {}), /duplicate/)
})

test('continuous runner passes one in-memory boundary and disables fragment save/load', async () => {
  const seen = { game: [], reforge: [] },
    handlers = { game: {}, reforge: {} }
  for (const fragment of CONTINUOUS_STORY_FRAGMENTS)
    for (const engine of ['game', 'reforge'])
      handlers[engine][fragment.id] = async (context) => {
        assert.deepEqual(context.boundary, { load: false, save: false })
        assert.equal(context.mode, 'continuous')
        seen[engine].push(fragment.id)
      }
  const receipt = await runContinuousStory({
    sessions: { game: {}, reforge: {} },
    handlers,
    report: { game: {}, reforge: {} },
  })
  assert.deepEqual(seen.game, ['001', '002', '003', '004', '005', '006'])
  assert.equal(receipt.receipts.length, 6)
  assert.equal(
    continuousFragmentContext({
      engine: 'game',
      fragment: CONTINUOUS_STORY_FRAGMENTS[0],
      barrier: new DualTrackBarrier(),
    }).boundary.save,
    false,
  )
})

test('continuous action extraction removes boundary I/O and audit wall time while preserving inputs', () => {
  const actions = continuousStoryActions({
    fragment: '002',
    case: 'story',
    actions: [
      { key: 'Enter', reason: 'load actual slot1', scope: 'boundary' },
      { key: 'ArrowLeft', kind: 'down', reason: 'normal held route', atMs: 10, scope: 'story' },
      { key: 'ArrowLeft', kind: 'up', reason: 'touch/scene boundary', scope: 'story' },
      { key: 'F5', reason: 'formal quick-save', scope: 'boundary' },
      { key: 'Enter', reason: 'normal full-dialogue confirmation', atMs: 10000, scope: 'story' },
    ],
  })
  assert.deepEqual(actions, [
    { key: 'ArrowLeft', kind: 'down', reason: 'normal held route' },
    { key: 'ArrowLeft', kind: 'up', reason: 'touch/scene boundary' },
    { key: 'Enter', kind: 'press', reason: 'normal full-dialogue confirmation' },
  ])
  const storyMenu = continuousStoryActions({
    fragment: '004',
    case: 'story',
    actions: [
      { key: 'Escape', reason: 'normal menu navigation toward scene wine' },
      { key: 'ArrowDown', reason: 'normal menu navigation toward scene wine' },
      { key: 'Enter', reason: 'normal menu navigation toward scene wine' },
      { key: 'Escape', reason: 'close actual menu', scope: 'boundary' },
    ],
  })
  assert.deepEqual(
    storyMenu.map(({ key, reason }) => ({ key, reason })),
    [
      { key: 'Escape', reason: 'normal menu navigation toward scene wine' },
      { key: 'ArrowDown', reason: 'normal menu navigation toward scene wine' },
      { key: 'Enter', reason: 'normal menu navigation toward scene wine' },
    ],
  )
  assert.throws(
    () => continuousStoryActions({ fragment: '002', case: 'items', actions: [] }),
    /story only/,
  )
})
