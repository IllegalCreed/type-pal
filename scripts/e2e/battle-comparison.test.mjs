import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import { compareBattleRepeats, compareBattleTraces } from './battle-comparison.mjs'
import { validateBattlePresentation } from './battle-presentation.mjs'
import { validateBattleRules } from './battle-rules.mjs'
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
  test('a complete logical trace still requires native render observations', () => {
    const fixture = scenario()
    const trace = capture('game').trace
    assert.equal(validateBattleTrace(trace, fixture).status, 'passed')
    const result = validateBattlePresentation(trace, fixture)
    assert.equal(result.status, 'rejected')
    assert.deepEqual(result.findings, [
      { domain: 'integrity', rule: 'rendered-frame-stream', count: 0 },
    ])
  })

  test('battle audio ties each repeated cue to its own native start and the rendered action', () => {
    const fixture = scenario()
    const assetId = 'sound.pal.050'
    const attack = { ...decision('lantern-a', 'attack', 'hero'), actorSide: 'enemy' }
    fixture.expected.actions = [{ ...attack, before: state(50, 30, 2), after: state(49, 30, 2) }]
    fixture.expected.audioCues = [
      { actionIndex: 0, kind: 'enemy-windup', assetId },
      { actionIndex: 0, kind: 'enemy-impact', assetId },
    ]
    fixture.expected.audioSourceFrames = { [assetId]: 3 }
    installBattleTraceObserver(
      { scenarioId: fixture.id, runId: `run-${++run}`, engine: 'game', random },
      createEvidenceRecorder,
    )
    const observer = globalThis.__battleEvidence
    const buffer = {
      numberOfChannels: 1,
      sampleRate: 22050,
      length: 3,
      getChannelData: () => new Float32Array([0, -0.5, 0.25]),
    }
    observer.audioDecoded(
      assetId,
      buffer,
      '/extracted/sounds/50.wav',
      'game:AudioManager.loadSfx:decodeAudioData',
    )
    observer.start(fixture.expected.start, 'battle:start')
    const play = () => {
      const cue = observer.audioRequested(assetId, 'game:AudioManager.playSfx')
      observer.audioStarted(
        cue,
        assetId,
        buffer,
        { state: 'running', currentTime: 1 },
        'game:AudioManager.play:AudioBufferSourceNode.start',
      )
    }
    play()
    const render = (clockMs, phase, animation = null) => {
      const selecting = phase === 'selectAction'
      observer.beginFrame('game:BattlePresent.draw', {
        clockMs,
        phase,
        selecting,
        turn: 1,
        animation,
      })
      if (selecting) {
        observer.panelDrawn(0)
        observer.panelDrawn(1)
      }
      if (phase === 'won') observer.settlementDrawn('exp-cash')
      observer.endFrame()
    }
    render(0, 'selectAction')
    observer.command({ ...use, source: 'selection:commit' })
    render(40, 'performAction', attack)
    play()
    play()
    render(120, 'won')
    const trace = observer.read()
    // The judge fixture has fixed recorder times so a paused Node worker cannot shift a cue.
    for (const event of [...trace.presentations, ...trace.audioEvents]) event.atMs = event.order
    const result = validateBattlePresentation(trace, fixture)
    assert.equal(result.status, 'passed')
    assert.deepEqual(
      result.audio.beforeFirstCommand.map(({ request }) => request.cueId),
      [0],
    )
    assert.deepEqual(
      result.audio.cues.map(({ start, buffer }) => [start.cueId, start.bufferId, buffer.peak]),
      [
        [1, 0, 0.5],
        [2, 0, 0.5],
      ],
    )
    const requestedOnly = structuredClone(trace)
    requestedOnly.audioEvents = requestedOnly.audioEvents.filter(
      (event) => !(event.kind === 'sfx-start' && event.cueId === 2),
    )
    assert.deepEqual(
      validateBattlePresentation(requestedOnly, fixture).findings.map(({ rule, kind }) => [
        rule,
        kind,
      ]),
      [['audio-cue-start-missing', 'enemy-impact']],
    )
    const late = structuredClone(trace)
    for (const event of late.audioEvents) if (event.cueId === 1) event.atMs += 100
    assert.deepEqual(
      validateBattlePresentation(late, fixture).findings.map(({ rule, kind }) => [rule, kind]),
      [['audio-cue-render-window', 'enemy-windup']],
    )
  })

  test('portrait color, transparency and cure are judged from separate native selection draws', () => {
    const fixture = scenario()
    fixture.portraitProbe = {
      slot: 0,
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    }
    fixture.expected.actions = []
    fixture.expected.portraitSize = [2, 1]
    fixture.expected.portraitSamples = [
      { turn: 1, hp: 150, rgbs: [[0, 0, 0], null] },
      { turn: 2, hp: 135, rgbs: [[178, 56, 44], null] },
      { turn: 3, hp: 134, rgbs: [[0, 0, 0], null] },
    ]
    installBattleTraceObserver(
      {
        engine: 'game',
        scenarioId: fixture.id,
        runId: `run-${++run}`,
        random,
        portraitProbe: fixture.portraitProbe,
      },
      createEvidenceRecorder,
    )
    const observer = globalThis.__battleEvidence
    observer.start(fixture.expected.start, 'battle:start')
    const begin = (turn, phase, selecting) =>
      observer.beginFrame('game:BattlePresent.draw', {
        clockMs: turn * 40,
        turn,
        phase,
        selecting,
        animation: null,
      })
    const colors = [
      [0, 0, 0],
      [10, 30, 50],
      [178, 56, 44],
    ]
    const box = { width: 2, height: 1, indices: new Uint8Array([1, 1]) }
    for (const [turn, hp, faceIndex] of [
      [1, 150, 0],
      [2, 135, 2],
      [3, 134, 0],
    ]) {
      box.indices[0] = 1
      begin(turn, 'selectAction', true)
      const afterDraw = observer.captureIndexedPortrait(0, hp, box, box, 0, 0, colors)
      box.indices[0] = faceIndex
      afterDraw()
      observer.panelDrawn(0)
      observer.panelDrawn(1)
      observer.endFrame()
    }
    begin(3, 'won', false)
    observer.settlementDrawn('exp-cash')
    observer.endFrame()
    const actual = observer.read()
    assert.equal(validateBattlePresentation(actual, fixture).status, 'passed')

    const dark = structuredClone(actual)
    dark.presentations[1].payload.portrait.samples[0].after.rgba = [33, 0, 0, 255]
    assert.deepEqual(
      validateBattlePresentation(dark, fixture).findings.map(({ rule, turn }) => [rule, turn]),
      [['portrait-palette', 2]],
    )

    const covered = structuredClone(actual)
    covered.presentations[1].payload.portrait.samples[1].after.index = 0
    assert.deepEqual(
      validateBattlePresentation(covered, fixture).findings.map(({ rule, turn }) => [rule, turn]),
      [['portrait-transparent-pixel', 2]],
    )

    delete actual.presentations[2].payload.portrait
    assert.deepEqual(
      validateBattlePresentation(actual, fixture).findings.map(({ rule }) => rule),
      ['portrait-sample-count'],
    )
  })

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

  test('round evidence distinguishes a poison tick from an incapacitated action and later input', () => {
    const defend = decision('ally', 'defend', null)
    const pass = decision('hero', 'pass', null)
    const finish = { ...strike, turn: 2 }
    const start = state(50, 30, 2)
    Object.assign(start.players[0], { statuses: { sleep: 2 }, poisons: [551] })
    const afterRound = structuredClone(start)
    Object.assign(afterRound.players[0], { hp: 43, statuses: { sleep: 1 } })
    const won = structuredClone(afterRound)
    Object.assign(won.enemies[0], { hp: 0, alive: false })
    const fixture = {
      id: 'poisoned-round',
      random,
      expected: {
        start,
        commands: [defend, finish],
        actions: [
          { ...defend, before: start, after: start },
          { ...pass, before: start, after: start },
          { ...finish, before: afterRound, after: won },
        ],
        rounds: [{ turn: 1, before: start, after: afterRound }],
        terminal: { result: 'victory', settlementCount: 1, after: state(118, 0, 2, 1, 13) },
      },
    }
    const collect = (engine, clockMs = 100) => {
      installBattleTraceObserver(
        { scenarioId: fixture.id, runId: `run-${++run}`, engine, random },
        createEvidenceRecorder,
      )
      const observer = globalThis.__battleEvidence
      observer.start(start, 'battle:start')
      observer.command({ ...defend, source: 'selection:commit' })
      observer.random(0.25, 'rng:queue')
      observer.action({ ...fixture.expected.actions[0], source: 'action:defend' })
      observer.action({
        ...fixture.expected.actions[1],
        native: { inaction: 'incapacitated' },
        source: 'action:incapacitated',
      })
      const slots = [{ partySlot: 0, poisonId: 551 }]
      observer.round({
        ...fixture.expected.rounds[0],
        clockMs,
        native: { poisonsBefore: slots, poisonsAfter: slots },
        source: 'round:end',
      })
      observer.command({ ...finish, source: 'selection:commit' })
      observer.action({ ...fixture.expected.actions[2], source: 'action:attack' })
      observer.terminal({ ...fixture.expected.terminal, source: 'battle:commit' })
      return observer.read()
    }
    const game = collect('game')
    const reforge = collect('reforge')
    assert.equal(compareBattleTraces(game, reforge, fixture).status, 'passed')
    const repeat = collect('game', 220)
    assert.equal(compareBattleRepeats(game, repeat, fixture).status, 'passed')
    repeat.rounds[0].native.poisonsAfter = []
    assert.equal(
      compareBattleRepeats(game, repeat, fixture).findings[0].rule,
      'repeat-native-rounds',
    )
    repeat.rounds[0].clockMs = -1
    assert.equal(validateBattleTrace(repeat, fixture).findings[0].rule, 'round-clock')

    const staleTick = structuredClone(reforge)
    staleTick.rounds[0].after.players[0].hp++
    assert.deepEqual(
      compareBattleTraces(game, staleTick, fixture).findings.map(({ domain, rule, path }) => [
        domain,
        rule,
        path,
      ]),
      [['business', 'round-after', 'rounds[0].after']],
    )

    const forgedPass = structuredClone(reforge)
    delete forgedPass.actions[1].native.inaction
    assert.equal(
      compareBattleTraces(game, forgedPass, fixture).findings[0].rule,
      'incapacitated-action-producer',
    )

    const outOfOrder = structuredClone(reforge)
    const [round] = outOfOrder.rounds
    const command = outOfOrder.commands[1]
    ;[round.order, command.order] = [command.order, round.order]
    ;[round.atMs, command.atMs] = [command.atMs, round.atMs]
    assert.equal(compareBattleTraces(game, outOfOrder, fixture).findings[0].rule, 'round-order')
  })

  test('round-end feedback holds only for a newly drawn number before the next selection HUD', () => {
    const fixture = scenario()
    fixture.id = 'equivalent-poison'
    fixture.expected.actions = []
    fixture.expected.rounds = [
      { turn: 1, before: state(142, 30, 2), after: state(135, 30, 2) },
      { turn: 2, before: state(134, 30, 2), after: state(134, 30, 2) },
    ]
    const blue = (numberId, value, age = 0) => ({
      numberId,
      value,
      age,
      tone: 'blue',
      side: 'player',
      slot: 0,
      right: 246,
      y: 90 - age,
    })
    const frame = (
      order,
      clockMs,
      turn,
      phase,
      numbers = [],
      selecting = phase === 'selectAction',
    ) => ({
      kind: 'battle-frame',
      source: 'reforge:BattleSession.render',
      seq: order,
      order,
      clockMs,
      atMs: order * 10,
      payload: {
        turn,
        phase,
        selecting,
        panels: selecting ? [0, 1] : [],
        enemies: [],
        players: [],
        animation: null,
        numbers,
        settlement: phase === 'won' ? 'exp-cash' : null,
      },
    })
    const trace = {
      engine: 'reforge',
      rounds: [
        { turn: 1, order: 2, atMs: 20, clockMs: 1200 },
        { turn: 2, order: 6, atMs: 60, clockMs: 2000 },
      ],
      presentations: [
        frame(1, 1000, 1, 'selectAction'),
        frame(3, 1200, 2, 'selectAction', [blue(1, 7)], false),
        frame(4, 1520, 2, 'selectAction', [blue(1, 7, 8)]),
        frame(5, 1960, 2, 'performAction', [blue(2, 1)]),
        frame(7, 2040, 3, 'selectAction', [blue(2, 1, 2)]),
        frame(8, 2500, 3, 'won'),
      ],
    }
    const result = validateBattlePresentation(trace, fixture)
    assert.equal(result.status, 'passed')
    assert.deepEqual(
      result.roundEnds.map(({ turn, draws, delayMs }) => [
        turn,
        draws.map(({ value }) => value),
        delayMs,
      ]),
      [
        [1, [7], 320],
        [2, [], 40],
      ],
    )
    const rejected = (mutate, finding) => {
      const changed = structuredClone(trace)
      mutate(changed)
      assert.deepEqual(
        validateBattlePresentation(changed, fixture).findings.map(({ rule, turn }) => [rule, turn]),
        [finding],
      )
    }
    rejected(
      (changed) => {
        changed.presentations[2].clockMs = 1216
      },
      ['round-end-selection-early', 1],
    )
    rejected(
      (changed) => {
        changed.presentations[4].clockMs = 2320
      },
      ['round-end-selection-delay', 2],
    )
    rejected(
      (changed) => {
        changed.presentations[4].payload.numbers.push(blue(3, 7))
      },
      ['round-end-number', 2],
    )
    rejected(
      (changed) => {
        delete changed.rounds[0].clockMs
      },
      ['round-end-clock-missing', 1],
    )
  })

  test('a round-end poison number cannot substitute for the physical number or appear during the hit', () => {
    const before = state(150, 30, 2)
    const hit = state(142, 30, 2)
    const tick = state(135, 30, 2)
    const attack = { ...decision('lantern-a', 'attack', 'hero'), actorSide: 'enemy' }
    const scenario = {
      expected: { ruleDraws: [], actions: [{ rawDamage: 1, effectiveHpLoss: 8 }] },
    }
    const frame = (seq, value, selecting = false) => ({
      kind: 'battle-frame',
      seq,
      order: seq + (selecting ? 3 : 1),
      clockMs: seq * 40,
      atMs: seq * 40,
      payload: {
        turn: selecting ? 2 : 1,
        selecting,
        animation: selecting ? null : attack,
        numbers: [
          {
            numberId: seq,
            tone: 'blue',
            side: 'player',
            slot: 0,
            value,
            right: 244,
            y: 95,
            age: 0,
          },
        ],
      },
    })
    const cast = frame(0, 94)
    cast.payload.animation = { ...attack, kind: 'cast' }
    const strike = frame(1, 1)
    // The preceding spell's number remains visible. The first sampled strike draw can be late.
    strike.payload.numbers[0].age = 1
    strike.payload.numbers.unshift({ ...cast.payload.numbers[0], age: 8 })
    const trace = {
      engine: 'reforge',
      actions: [{ ...attack, before, after: hit, native: { lastAction: { damage: 1 } } }],
      rounds: [{ turn: 1, order: 4, atMs: 110, before: hit, after: tick }],
      randomDraws: [],
      presentations: [cast, strike, frame(3, 7, true)],
    }
    const good = validateBattleRules(trace, scenario)
    assert.equal(good.status, 'passed')
    assert.equal(good.strikes[0].poisonRound.draw.afterRoundMs, 10)
    trace.presentations.splice(2, 0, frame(2, 7))
    assert.deepEqual(
      validateBattleRules(trace, scenario).findings.map(({ rule }) => rule),
      ['extra-blue-number-before-poison-round'],
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
