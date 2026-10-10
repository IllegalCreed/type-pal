import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertComparisonReceipt,
  assertContinuousAcceptance,
  assertContinuousTapeBinding,
} from './continuous-acceptance.mjs'
import {
  CONTINUOUS_STORY_FRAGMENTS,
  continuousStoryActions,
  continuousStoryPlan,
} from './continuous-story.mjs'
import { assertSaveProvider } from './save-handoff.mjs'

test('persisted receipt matches the JSON wire form, but dropped meaningful fields and non-passing verdicts fail', () => {
  const current = {
    status: 'passed',
    comparison: { holdIntent: undefined, findings: [], effects: { state: 'proved' } },
  }
  const saved = JSON.parse(JSON.stringify(current))
  assertComparisonReceipt(saved, current)
  delete saved.comparison.effects
  assert.throws(() => assertComparisonReceipt(saved, current), /not bound/)
  const failed = { ...current, status: 'needs-review' }
  assert.throws(
    () => assertComparisonReceipt(JSON.parse(JSON.stringify(failed)), failed),
    /not accepted/,
  )
})

test('tape binding uses independently accepted reports: every plan field, menu input and predecessor must match', async () => {
  // This unit tests binding, not proof of gameplay. File/proof admission uses the actual offline verifier.
  const validated = CONTINUOUS_STORY_FRAGMENTS.map(({ id }, index, fragments) => ({
    fragment: id,
    paths: [`/game/${id}.json`, `/reforge/${id}.json`],
    reports: ['game', 'reforge'].map((engine) => ({
      fragment: id,
      status: 'passed',
      case: 'story',
      ...(!['004', '005'].includes(id) ? { checkpoint: { sha256: `${engine}-${id}-save` } } : {}),
      ...(index
        ? {
            predecessor: {
              report: `/${engine}/${fragments[index - 1].id}${['004', '005'].includes(fragments[index - 1].id) ? '-saves' : ''}.json`,
              sha256: `${engine}-${fragments[index - 1].id}-save`,
            },
          }
        : {}),
      actions: [
        { kind: 'press', key: 'Escape', scope: 'story' },
        { key: 'F5', scope: 'boundary' },
      ],
    })),
  }))
  const handoffs = ['004', '005'].flatMap((fragment) =>
    ['game', 'reforge'].map((engine) => ({
      fragment,
      engine,
      report: { path: `/${engine}/${fragment}-saves.json` },
      checkpoint: `${engine}-${fragment}-save`,
      artifacts: [],
    })),
  )
  const tape = {
    kind: 'continuous-story-action-tape',
    mode: 'story-only',
    boundary: { fragmentLoad: false, fragmentSave: false },
    handoffs,
    plan: continuousStoryPlan({
      gameReports: validated.map((v) => v.reports[0]),
      reforgeReports: validated.map((v) => v.reports[1]),
    }),
    actions: Object.fromEntries(
      ['game', 'reforge'].map((engine, index) => [
        engine,
        validated.map((v) => ({
          fragment: v.fragment,
          actions: continuousStoryActions(v.reports[index]),
        })),
      ]),
    ),
  }
  assertContinuousTapeBinding(tape, validated, handoffs)
  for (const mutate of [
    (x) => {
      x.plan.fragments[0].id = '002'
    },
    (x) => {
      x.plan.mode = 'other'
    },
    (x) => {
      x.plan.order.reverse()
    },
    (x) => {
      x.actions.reforge[0].actions[0].key = 'Enter'
    },
    (x) => {
      x.boundary.fragmentLoad = true
    },
    (x) => {
      x.plan.fragments[1].engines.game.predecessor.sha256 = 'different'
    },
    (x) => {
      x.handoffs[0].report.path = '/game/004.json'
    },
    (x) => {
      x.handoffs[1].checkpoint = 'wrong-save'
    },
    (x) => {
      x.handoffs.pop()
    },
  ]) {
    const copy = structuredClone(tape)
    mutate(copy)
    assert.throws(() => assertContinuousTapeBinding(copy, validated, handoffs))
  }
  const wrong = structuredClone(validated)
  wrong[1].reports[0].predecessor.sha256 = 'different'
  const wrongTape = structuredClone(tape)
  wrongTape.plan = continuousStoryPlan({
    gameReports: wrong.map((v) => v.reports[0]),
    reforgeReports: wrong.map((v) => v.reports[1]),
  })
  assert.throws(
    () => assertContinuousTapeBinding(wrongTape, wrong, handoffs),
    /predecessor checkpoint differs/,
  )
  await assert.rejects(assertContinuousAcceptance(tape), /six ordered dual-track/)
})

test('separate saves provider requires the accepted story engine, entry and complete producer evidence', () => {
  const hashes = { 'engine.ts': 'a'.repeat(64), 'observer.mjs': 'b'.repeat(64) }
  const story = {
    fragment: '004',
    engine: 'game',
    case: 'story',
    revision: 'c'.repeat(40),
    predecessor: { report: '/003.json', sha256: 'd'.repeat(64) },
    hashes,
    dependencies: { hashes, groups: { runtime: ['engine.ts'], recording: ['observer.mjs'] } },
    core: { sourceHashes: hashes },
  }
  const provider = { ...structuredClone(story), case: 'saves', kind: 'verify', status: 'passed' }
  assertSaveProvider(provider, story)
  for (const mutate of [
    (p) => {
      p.engine = 'reforge'
    },
    (p) => {
      p.fragment = '005'
    },
    (p) => {
      p.case = 'story'
    },
    (p) => {
      p.status = 'failed'
    },
    (p) => {
      p.revision = 'e'.repeat(40)
    },
    (p) => {
      p.predecessor.sha256 = 'e'.repeat(64)
    },
    (p) => {
      delete p.dependencies.hashes['observer.mjs']
    },
    (p) => {
      p.hashes['engine.ts'] = 'e'.repeat(64)
    },
  ]) {
    const copy = structuredClone(provider)
    mutate(copy)
    assert.throws(() => assertSaveProvider(copy, story))
  }
})
