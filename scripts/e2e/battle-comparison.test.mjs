import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { compareBattleRepeats, compareBattleTraces } from './battle-comparison.mjs'
import { validateBattleTrace } from './battle-trace-contract.mjs'
import { battleObserverScript, installBattleTraceObserver } from './battle-trace-observer.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'

const random = { algorithm: 'mulberry32', seed: 1729 }
const decision = (actorId, kind, targetId, itemId) => ({
  turn: 1,
  actorId,
  kind,
  targetId,
  ...(itemId ? { itemId } : {}),
})
const use = decision('hero', 'item', 'hero', '99')
const strike = decision('ally', 'attack', 'lantern-a')

function state(heroHP, lanternHP, herbCount, experience = 0, money = 10) {
  return {
    players: [
      {
        id: 'hero',
        slot: 0,
        hp: heroHP,
        maxHP: 150,
        mp: 100,
        maxMP: 100,
        level: 1,
        exp: experience,
        statuses: {},
      },
      {
        id: 'ally',
        slot: 1,
        hp: 150,
        maxHP: 150,
        mp: 100,
        maxMP: 100,
        level: 1,
        exp: experience,
        statuses: {},
      },
    ],
    enemies: [
      {
        id: 'lantern-a',
        slot: 0,
        templateId: 'enemy-399',
        hp: lanternHP,
        maxHP: 30,
        alive: lanternHP > 0,
        statuses: {},
      },
      null,
      null,
      null,
      null,
    ],
    inventory: [{ itemId: '99', count: herbCount }],
    money,
  }
}

// Independent checker oracle. These are declared business values, not copied from a recording.
function scenario() {
  return {
    id: 'medicine-then-victory',
    random,
    expected: {
      start: state(50, 30, 2),
      commands: [use, strike],
      actions: [
        { ...use, before: state(50, 30, 2), after: state(100, 30, 1) },
        { ...strike, before: state(100, 30, 1), after: state(100, 0, 1) },
      ],
      terminal: { result: 'victory', settlementCount: 1, after: state(125, 0, 1, 1, 13) },
    },
  }
}

let run = 0
function capture(engine = 'game', options = {}) {
  installBattleTraceObserver(
    { scenarioId: 'medicine-then-victory', runId: `run-${++run}`, engine, random },
    createEvidenceRecorder,
  )
  const observer = globalThis.__battleEvidence
  const initial = state(50, 30, 2)
  observer.random(0.25, 'rng:queue') // A constructor draw may precede the effective start snapshot.
  observer.start(initial, 'battle:start')
  initial.players[0].hp = 1 // The observer must have detached the original facts.
  observer.command({ ...use, source: 'selection:commit' })
  observer.command({ ...strike, source: 'selection:commit' })
  const healed = options.wrongTarget ? 50 : 100
  const count = options.doubleCost ? 0 : 1
  observer.action({
    ...use,
    targetId: options.wrongTarget ? 'ally' : use.targetId,
    before: state(50, 30, 2),
    after: state(healed, 30, count),
    source: 'action:medicine',
  })
  observer.presentation({ kind: 'sound-request', assetId: 'sound.pal.078', source: 'audio:play' })
  observer.random(options.changedRandom ? 0.5 : 0.75, 'rng:attack')
  if (!options.omitAction)
    observer.action({
      ...strike,
      before: state(healed, 30, count),
      after: state(healed, 0, count),
      rawDamage: options.rawDamage ?? (engine === 'game' ? 42 : 55),
      source: 'action:attack',
    })
  observer.presentation({ kind: 'draw', frame: 2, source: 'render:battle' })
  if (options.resource)
    globalThis.__e2eRecordSpriteFrame({
      width: 1,
      height: 1,
      pixels: new Uint8Array([42]),
      opaque: new Uint8Array([1]),
    })
  observer.terminal({
    result: 'victory',
    settlementCount: options.doubleSettlement ? 2 : 1,
    after: state(options.wrongTarget ? 100 : 125, 0, count, 1, 13),
    source: 'settlement:commit',
  })
  return { observer, trace: observer.read() }
}

afterEach(() => {
  delete globalThis.__battleEvidence
  delete globalThis.__battleTraceContext
  delete globalThis.__e2eRecordSpriteFrame
})

describe('battle evidence observer', () => {
  test('the browser serialization installs the shared recorder and returns detached sealed facts', () => {
    const context = {
      scenarioId: 'medicine-then-victory',
      runId: 'serialized-run',
      engine: 'reforge',
      random,
    }
    Function(battleObserverScript(context))()
    const observer = globalThis.__battleEvidence
    observer.start(state(50, 30, 2), 'start')
    observer.random(0.2, 'random')
    observer.terminal({
      result: 'victory',
      settlementCount: 1,
      after: state(125, 0, 1, 1, 13),
      source: 'terminal',
    })
    const first = observer.read()
    first.start.state.players[0].hp = 0
    assert.equal(observer.read().start.state.players[0].hp, 50)
    assert.equal(first.randomDraws[0].index, 0)
    assert.deepEqual(
      [first.start.order, first.randomDraws[0].order, first.terminal.order],
      [0, 1, 2],
    )
    observer.command({ ...use, source: 'late-command' })
    assert.match(observer.read().errors[0], /sealed/)
    assert.equal(observer.read().commands.length, 0)
    assert.equal(globalThis.__battleTraceContext, undefined)
  })

  test('the shared byte budget reports overflow instead of passing a truncated recording', () => {
    installBattleTraceObserver(
      { scenarioId: 'medicine-then-victory', runId: 'bounded', engine: 'game', random },
      (options) => createEvidenceRecorder({ ...options, budgets: { events: 1 } }),
    )
    globalThis.__battleEvidence.start(state(50, 30, 2), 'start')
    const trace = globalThis.__battleEvidence.read()
    assert.equal(trace.overflow, true)
    const verdict = validateBattleTrace(trace, scenario())
    assert.equal(verdict.status, 'rejected')
    assert.equal(verdict.findings[0].rule, 'collector-integrity')
  })

  test('callers cannot replace recording identity or omit a fact source', () => {
    const { observer } = capture()
    installBattleTraceObserver(
      { scenarioId: 'medicine-then-victory', runId: 'protected', engine: 'game', random },
      createEvidenceRecorder,
    )
    const fresh = globalThis.__battleEvidence
    fresh.start(state(50, 30, 2), 'start')
    fresh.command({ ...use, engine: 'reforge', source: 'commit' })
    fresh.presentation({ kind: 'draw' })
    assert.equal(fresh.read().engine, 'game')
    assert.equal(fresh.read().commands.length, 0)
    assert.equal(fresh.read().presentations.length, 0)
    assert.match(fresh.read().errors.join('\n'), /cannot replace evidence engine/)
    assert.match(fresh.read().errors.join('\n'), /source is required/)
    assert.equal(observer.read().errors.length, 0)
  })
})

describe('battle business conformance and comparison', () => {
  test('independent runs prove effective action states while exposing unaccepted native damage', () => {
    const game = capture('game').trace
    const reforge = capture('reforge').trace
    assert.equal(validateBattleTrace(game, scenario()).status, 'passed')
    assert.equal(game.start.state.players[0].hp, 50)
    assert.deepEqual(game.start.state.enemies.slice(1), [null, null, null, null])
    const result = compareBattleTraces(game, reforge, scenario())
    assert.equal(result.status, 'passed')
    assert.deepEqual(result.rawActionDifferences, [
      { actionIndex: 1, game: { rawDamage: 42 }, reforge: { rawDamage: 55 }, accepted: false },
    ])
    assert.equal(result.randomObservation.firstValueDifference, null)
    assert(result.notAccepted.includes('raw-damage-parity'))
    assert(result.notAccepted.includes('audio-correctness'))
    assert.equal(result.validations[0].checked.presentations, 2)
  })

  // Synthetic recorder inputs test the judge. These are not product-mutant execution credit.
  for (const [name, options, rule, path] of [
    ['wrong target', { wrongTarget: true }, 'action-semantic', 'actions[0]'],
    ['double item cost', { doubleCost: true }, 'action-after', 'actions[0].after'],
    ['missing real action', { omitAction: true }, 'action-count', 'actions'],
  ])
    test(`the public verifier rejects ${name}`, () => {
      const game = capture('game').trace
      const bad = capture('reforge', options).trace
      const result = compareBattleTraces(game, bad, scenario())
      assert.equal(result.status, 'rejected')
      assert.deepEqual(
        result.findings.map(({ domain, rule: found, path: at }) => ({
          domain,
          rule: found,
          path: at,
        })),
        [{ domain: 'business', rule, path }],
      )
    })

  test('same-engine repetition compares random calls and native facts, and rejects self-comparison', () => {
    const first = capture('game').trace
    const repeat = capture('game').trace
    assert.equal(compareBattleRepeats(first, repeat, scenario()).status, 'passed')
    const changed = capture('game', { changedRandom: true }).trace
    const rngVerdict = compareBattleRepeats(first, changed, scenario())
    assert.equal(rngVerdict.status, 'rejected')
    assert.equal(rngVerdict.findings[0].rule, 'repeat-random-draws')
    const nativeChanged = capture('game', { rawDamage: 43 }).trace
    assert.equal(
      compareBattleRepeats(first, nativeChanged, scenario()).findings[0].rule,
      'repeat-native-actions',
    )
    assert.equal(
      compareBattleRepeats(first, first, scenario()).findings[0].rule,
      'independent-run-identity',
    )
  })

  test('shared decoded resources keep their global order without granting presentation correctness', () => {
    const { trace } = capture('game', { resource: true })
    const result = validateBattleTrace(trace, scenario())
    assert.equal(result.status, 'passed')
    assert.deepEqual(trace.resources[0].pixels, [42])
    assert.equal(trace.resources[0].source, undefined)
    assert(trace.resources[0].order < trace.terminal.order)
    assert(result.notAccepted.includes('complete-animation-conformance'))
    trace.resources[0].pixels.pop()
    assert.equal(validateBattleTrace(trace, scenario()).findings[0].rule, 'resource-frame')
  })

  test('missing numeric state, malformed presentations and lost terminal/order are integrity failures', () => {
    for (const [change, rule] of [
      [
        (trace) => {
          delete trace.actions[0].after.players[0].mp
        },
        'player-numbers',
      ],
      [
        (trace) => {
          trace.presentations[0].kind = 1
        },
        'presentation-shape',
      ],
      [
        (trace) => {
          trace.presentations[0].badValue = Number.NaN
        },
        'serializable-fact',
      ],
      [
        (trace) => {
          trace.terminal = null
        },
        'start-terminal-present',
      ],
      [
        (trace) => {
          trace.randomDraws.at(-1).order = 999
        },
        'evidence-order',
      ],
      [
        (trace) => {
          trace.start.state.enemies = trace.start.state.enemies.filter(Boolean)
        },
        'enemy-slots-present',
      ],
    ]) {
      const { trace } = capture()
      change(trace)
      const result = validateBattleTrace(trace, scenario())
      assert.equal(result.status, 'rejected')
      assert.equal(result.findings[0].domain, 'integrity')
      assert.equal(result.findings[0].rule, rule)
    }
  })

  test('matching values with reversed submission causality fail closed', () => {
    const { trace } = capture()
    const firstCommand = trace.commands[0],
      firstAction = trace.actions[0]
    ;[firstCommand.order, firstAction.order] = [firstAction.order, firstCommand.order]
    // Re-establish a valid chronological envelope; the action still precedes its command.
    const all = [
      trace.start,
      ...trace.commands,
      ...trace.actions,
      ...trace.randomDraws,
      ...trace.presentations,
      trace.terminal,
    ].sort((a, b) => a.order - b.order)
    all.forEach((entry, index) => {
      entry.atMs = index
    })
    trace.commands
      .sort((a, b) => a.order - b.order)
      .forEach((entry, index) => {
        entry.seq = index
      })
    const reorderedOracle = scenario()
    reorderedOracle.expected.commands.reverse()
    const verdict = validateBattleTrace(trace, reorderedOracle)
    assert.equal(verdict.status, 'rejected')
    assert.equal(verdict.findings[0].rule, 'action-submission')
  })

  test('settlement duplication fails the terminal business oracle', () => {
    const result = validateBattleTrace(
      capture('game', { doubleSettlement: true }).trace,
      scenario(),
    )
    assert.equal(result.findings[0].domain, 'business')
    assert.equal(result.findings[0].rule, 'terminal-state')
  })

  test('incomplete expected action states fail as oracle errors', () => {
    const badOracle = scenario()
    delete badOracle.expected.actions[0].after
    const rejected = validateBattleTrace(capture().trace, badOracle)
    assert.equal(rejected.status, 'rejected')
    assert.equal(rejected.findings[0].domain, 'oracle')
  })
})
