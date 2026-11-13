import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'
import {
  compareCasualtyDialogue,
  compareMagicCasualty,
  comparePoisonCasualty,
} from './battle-casualty-presentation.mjs'
import { compareBattleRepeats, compareBattleTraces } from './battle-comparison.mjs'
import { firstNumberDraws, validateBattlePresentation } from './battle-presentation.mjs'
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

// Deterministic renderer facts exercise the judge. The native captures provide product evidence.
function battlePainter(observer, attack) {
  let clockMs = 0
  return function paint({
    player = [240, 170, 0, 0],
    foe = [100, 110, 0],
    fading = false,
    animation = attack,
    turn = 1,
    phase = 'performAction',
    selecting = false,
    number,
    elapsedMs = 40,
  } = {}) {
    clockMs += elapsedMs
    observer.beginFrame('reforge:BattleSession.render', {
      clockMs,
      phase,
      turn,
      selecting,
      animation,
    })
    const [x, y, frameIndex, colorShift] = player
    const drawn = { x, y, colorShift }
    observer.labelFighter(drawn, 'player', 0, false, 7)
    observer.fighterDrawn(drawn, frameIndex)
    if (foe) {
      const enemy = { x: foe[0], y: foe[1] }
      observer.labelFighter(enemy, 'enemy', 0, fading, foe[2])
      observer.fighterDrawn(enemy)
    }
    if (number !== undefined) {
      const damage = {}
      observer.labelNumber(damage, 'player', 0)
      observer.numberDrawn(damage, number, 'blue', 246, 95, 0)
    }
    if (selecting) {
      observer.panelDrawn(0)
      observer.panelDrawn(1)
    }
    if (phase === 'won') observer.settlementDrawn('exp-cash')
    observer.endFrame()
    return clockMs
  }
}

function guardFixture(automatic, cadenceMs) {
  const fixture = scenario()
  const start = state(150, 30, 2)
  const hit = automatic ? start : state(149, 30, 2)
  const poisoned = state(142, 30, 2)
  const attack = {
    ...decision('lantern-a', 'attack', 'hero'),
    actorSide: 'enemy',
    guard: { before: !automatic },
    rawDamage: automatic ? 0 : 1,
    blocked: automatic,
    before: start,
    after: hit,
  }
  const follow = {
    ...strike,
    turn: automatic ? 1 : 2,
    before: automatic ? start : poisoned,
    after: automatic ? start : poisoned,
  }
  const round = { turn: 1, before: hit, after: poisoned }
  const defend = cadenceMs && decision('hero', 'defend', null)
  const nativeDefend = defend && {
    ...defend,
    before: start,
    after: start,
    guard: { before: false, after: true },
  }
  fixture.expected.start = start
  fixture.expected.actions = nativeDefend ? [nativeDefend, attack, follow] : [attack, follow]
  if (automatic) fixture.expected.automaticBlock = { actionIndex: 0, guardFrame: 3, idleFrame: 0 }
  else {
    fixture.expected.defendRecovery = {
      actionIndex: nativeDefend ? 1 : 0,
      hitFrame: 4,
      guardFrame: 3,
      idleFrame: 0,
      ...(cadenceMs && { cadenceMs }),
    }
    fixture.expected.rounds = [round]
  }
  installBattleTraceObserver(
    { scenarioId: fixture.id, runId: `run-${++run}`, engine: 'reforge', random },
    createEvidenceRecorder,
  )
  const observer = globalThis.__battleEvidence
  observer.start(start, 'battle:start')
  const paint = battlePainter(observer, attack)
  paint({ animation: null, phase: 'selectAction', selecting: true })
  if (nativeDefend) {
    observer.command({ ...defend, source: 'BattleCommandSelection:submit:pendingActions.set' })
    observer.action({
      ...nativeDefend,
      source: 'BattleSession:stepBattle:before-lastAction-consumption',
    })
    paint({ animation: null, player: [240, 170, 3, 0] })
  }
  paint({ player: [240, 170, automatic ? 0 : 3, 0], foe: [98, 109, 0] })
  const charge = [196, 154, 1]
  const contact = [196, 154, 2]
  paint({ player: [240, 170, 3, 0], foe: charge })
  paint({
    player: [240, 170, automatic ? 3 : 4, automatic ? 0 : 6],
    foe: contact,
    ...(automatic ? {} : { number: 1 }),
  })
  const recoilFrame = automatic ? 3 : 4
  paint({ player: [248, 174, recoilFrame, 0], foe: contact })
  paint({ player: [250, 175, recoilFrame, 0], foe: contact })
  paint({ player: [240, 170, automatic ? 0 : 3, 0] })
  if (!automatic) {
    const clockMs = paint({ player: [240, 170, 3, 0], phase: 'postAction', animation: null })
    observer.round({ ...round, clockMs, source: 'battle:round-ended' })
    const feedback = { turn: 2, phase: 'selectAction', animation: null }
    paint({ ...feedback, player: [240, 170, 3, 0], number: 7 })
    paint({ ...feedback, player: [240, 170, 3, 0], elapsedMs: 280 })
    paint({ ...feedback, selecting: true })
  }
  paint({ turn: follow.turn, animation: follow })
  paint({ turn: follow.turn, animation: null, phase: 'won' })
  const trace = observer.read()
  if (nativeDefend) {
    const [, guardDraw, firstEnemyDraw, , damageDraw] = trace.presentations
    const stamps = new Map([
      [trace.commands[0].order, 100],
      [trace.actions[0].order, 139],
      [guardDraw.order, 140],
      [firstEnemyDraw.order, 180],
      [damageDraw.order, 500],
    ])
    const events = [
      trace.start,
      ...trace.commands,
      ...trace.actions,
      ...trace.presentations,
      ...trace.rounds,
    ].sort((a, b) => a.order - b.order)
    // The synthetic recorder clock is independent of the render clock and Node scheduling.
    let atMs = 0
    for (const event of events) {
      atMs = stamps.get(event.order) ?? atMs + 1
      event.atMs = atMs
    }
  }
  return { fixture, trace }
}

function casualtyFixture() {
  const fixture = scenario()
  const enemyAttack = { ...decision('lantern-a', 'attack', 'hero'), actorSide: 'enemy' }
  const healthy = state(40, 30, 2)
  const dying = state(5, 30, 2)
  const dead = state(0, 30, 2)
  const first = { ...enemyAttack, before: healthy, after: dying, rawDamage: 35 }
  const second = { ...enemyAttack, turn: 2, before: dying, after: dead, rawDamage: 5 }
  const ally = { ...strike, turn: 2, before: dead, after: state(0, 0, 2) }
  const dyingSound = 'sound.pal.019'
  const deathSound = 'sound.pal.023'
  fixture.expected.start = healthy
  fixture.expected.actions = [first, second, ally]
  fixture.expected.playerCasualties = [
    { actionIndex: 0, recoveryFrame: 1, soundKind: 'player-dying' },
    { actionIndex: 1, recoveryFrame: 2, soundKind: 'player-death' },
  ]
  fixture.expected.audioCues = [
    { actionIndex: 0, kind: 'player-dying', assetId: dyingSound },
    { actionIndex: 1, kind: 'player-death', assetId: deathSound },
  ]
  fixture.expected.audioSourceFrames = { [dyingSound]: 3, [deathSound]: 3 }
  installBattleTraceObserver(
    { scenarioId: fixture.id, runId: `run-${++run}`, engine: 'reforge', random },
    createEvidenceRecorder,
  )
  const observer = globalThis.__battleEvidence
  const play = (assetId) => {
    const cue = observer.audioRequested(assetId, 'reforge:SfxPlayer.play')
    const buffer = {
      numberOfChannels: 1,
      sampleRate: 22050,
      length: 3,
      getChannelData: () => new Float32Array([0, -0.5, 0.25]),
    }
    observer.audioDecoded(
      assetId,
      buffer,
      `assets/migrated/sounds/${assetId.slice(-3)}.wav`,
      'reforge:SfxPlayer.ensureDecoded:decode',
    )
    observer.audioStarted(
      cue,
      assetId,
      buffer,
      { state: 'running', currentTime: 1 },
      'reforge:browserAdapter.play:AudioBufferSourceNode.start',
    )
  }
  observer.start(healthy, 'battle:start')
  const paint = battlePainter(observer, first)
  for (const attack of [first, second]) {
    const { turn, rawDamage } = attack
    const draw = (options) => paint({ turn, animation: attack, ...options })
    draw({
      player: [240, 170, turn - 1, 0],
      animation: null,
      phase: 'selectAction',
      selecting: true,
    })
    observer.command({ ...decision('hero', 'defend', null), turn, source: 'selection:commit' })
    draw({ player: [240, 170, turn - 1, 0], foe: [98, 109, 1] })
    draw({ player: [240, 170, turn - 1, 0], foe: [196, 154, 1] })
    draw({ player: [240, 170, 4, 6], foe: [196, 154, 2], number: rawDamage })
    draw({ player: [248, 174, 4, 0], foe: [196, 154, 2] })
    if (turn === 2) play(deathSound)
    draw({ player: [250, 175, 4, 0], foe: [196, 154, 2] })
    draw({ player: [240, 170, turn, 0] })
    if (turn === 1) play(dyingSound)
    draw({ player: [240, 170, turn, 0], animation: null })
  }
  const fallen = [240, 170, 2, 0]
  paint({ turn: 2, player: fallen, animation: ally })
  paint({ turn: 2, player: fallen, animation: null, fading: true })
  paint({ turn: 2, player: fallen, animation: null, foe: null, phase: 'won', elapsedMs: 1152 })
  const trace = observer.read()
  // The cold decode and native start fit within one battle tick on a fixed recorder clock.
  for (const event of [...trace.presentations, ...trace.audioEvents]) event.atMs = event.order * 15
  return { fixture, trace }
}

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
  const cadenceMs = { commandToGuard: [20, 65], guardToEnemy: [20, 65], enemyToDamage: [280, 360] }

  test('defense cadence rejects independent timing errors even when the total delay is unchanged', () => {
    const { fixture, trace } = guardFixture(false, cadenceMs)
    const result = validateBattlePresentation(trace, fixture)
    assert.equal(result.status, 'passed')
    const { command, nativeDefend, guard, enemyStart, damage, durationsMs } =
      result.defendRecovery.cadence
    assert.deepEqual(durationsMs, { commandToGuard: 40, guardToEnemy: 40, enemyToDamage: 320 })
    assert.deepEqual(
      [command.atMs, nativeDefend.atMs, guard.atMs, enemyStart.atMs, damage.atMs],
      [100, 139, 140, 180, 500],
    )

    const sameTotal = structuredClone(trace)
    sameTotal.presentations[guard.frame].atMs += 30
    assert.deepEqual(
      validateBattlePresentation(sameTotal, fixture).findings.map(({ rule, actualMs }) => [
        rule,
        actualMs,
      ]),
      [
        ['defend-command-to-guard-cadence', 70],
        ['defend-guard-to-enemy-cadence', 10],
      ],
    )
    const lateDamage = structuredClone(trace)
    for (const event of [...lateDamage.presentations, ...lateDamage.rounds])
      if (event.order >= damage.order) event.atMs += 41
    assert.deepEqual(
      validateBattlePresentation(lateDamage, fixture).findings.map(({ rule, actualMs }) => [
        rule,
        actualMs,
      ]),
      [['defend-enemy-to-damage-cadence', 361]],
    )
    const earlierSameDamage = structuredClone(trace)
    earlierSameDamage.presentations[enemyStart.frame].payload.numbers.push({
      ...damage.number,
      numberId: 99,
    })
    assert.deepEqual(
      validateBattlePresentation(earlierSameDamage, fixture).findings.map(
        ({ rule, firstDraw, impactDraw }) => [rule, firstDraw.order, impactDraw.order],
      ),
      [['defend-cadence-first-damage-draw', enemyStart.order, damage.order]],
    )
  })

  test('defense cadence needs the native action and refuses a guard pose before it', () => {
    const { fixture, trace } = guardFixture(false, cadenceMs)
    const noNativeDefend = structuredClone(trace)
    noNativeDefend.actions.length = 0
    assert.deepEqual(
      validateBattlePresentation(noNativeDefend, fixture).findings.map(({ domain, rule }) => [
        domain,
        rule,
      ]),
      [['integrity', 'defend-cadence-native-defend-missing']],
    )
    trace.presentations[0].payload.players[0].frameIndex = 3
    assert.deepEqual(
      validateBattlePresentation(trace, fixture).findings.map(({ domain, rule }) => [domain, rule]),
      [['business', 'defend-cadence-render-order']],
    )
  })

  test('active defense must be restored on the first base draw and held until round end', () => {
    const { fixture, trace } = guardFixture(false)
    const result = validateBattlePresentation(trace, fixture)
    assert.equal(result.status, 'passed')
    const { hit, knockback, returned, through, poison, poisonRecovery } = result.defendRecovery
    assert.deepEqual(
      [hit, returned, through, poison, poisonRecovery.recovery].map(
        ({ player }) => player.frameIndex,
      ),
      [4, 3, 3, 3, 0],
    )
    assert.equal(poisonRecovery.holdMs, 320)
    const earlyRecovery = structuredClone(trace)
    earlyRecovery.presentations[knockback.frame].payload.players[0].frameIndex = 3
    assert.deepEqual(
      validateBattlePresentation(earlyRecovery, fixture).findings.map(({ rule }) => rule),
      ['defend-hit-frame'],
    )

    const wrongPose = structuredClone(trace)
    wrongPose.presentations[returned.frame].payload.players[0].frameIndex = 0
    assert.deepEqual(
      validateBattlePresentation(wrongPose, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['defend-recovery-frame', returned.frame]],
    )
    const interrupted = structuredClone(trace)
    interrupted.presentations[through.frame].payload.players[0].frameIndex = 0
    assert.deepEqual(
      validateBattlePresentation(interrupted, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['defend-recovery-frame', through.frame]],
    )

    const earlyPoisonPose = structuredClone(trace)
    earlyPoisonPose.presentations[poison.frame].payload.players[0].frameIndex = 0
    assert.deepEqual(
      validateBattlePresentation(earlyPoisonPose, fixture).findings.map(({ rule, holdMs }) => [
        rule,
        holdMs,
      ]),
      [['defend-round-poison-frame', 0]],
    )
    delete trace.presentations[returned.frame].payload.players[0].frameIndex
    assert.deepEqual(
      validateBattlePresentation(trace, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['guard-fighter-pose-missing', returned.frame]],
    )
  })

  test('automatic block starts on the first charge and has no physical damage number', () => {
    const { fixture, trace } = guardFixture(true)
    const result = validateBattlePresentation(trace, fixture)
    assert.equal(result.status, 'passed')
    const { charge, knockback, recoil, returned } = result.automaticBlock
    assert.deepEqual(
      [charge, knockback, recoil, returned].map(({ player }) => player.frameIndex),
      [3, 3, 3, 0],
    )

    const late = structuredClone(trace)
    late.presentations[charge.frame].payload.players[0].frameIndex = 0
    assert.deepEqual(
      validateBattlePresentation(late, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['automatic-block-guard-frame', charge.frame]],
    )
    const early = structuredClone(trace)
    early.presentations[charge.frame - 1].payload.players[0].frameIndex = 3
    assert.deepEqual(
      validateBattlePresentation(early, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['automatic-block-before-charge', charge.frame - 1]],
    )
    trace.presentations[knockback.frame].payload.numbers.push({
      numberId: 0,
      tone: 'blue',
      side: 'player',
      slot: 0,
      value: 1,
      right: 246,
      y: 95,
      age: 0,
    })
    assert.deepEqual(
      validateBattlePresentation(trace, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['automatic-block-damage-number', knockback.frame]],
    )
  })

  test('player casualties require the first hit and return poses before a living ally acts', () => {
    const { fixture, trace } = casualtyFixture()
    const accepted = validateBattlePresentation(trace, fixture)
    assert.equal(accepted.status, 'passed')
    const [dying, dead] = accepted.playerCasualties
    assert.deepEqual(
      [dying, dead].map(({ hit, knockback, recoil, returned, next }) => [
        hit.number.value,
        hit.player.frameIndex,
        knockback.player.x - returned.player.x,
        recoil.player.x - returned.player.x,
        returned.player.frameIndex,
        next.animation.actorId,
      ]),
      [
        [35, 4, 8, 10, 1, 'lantern-a'],
        [5, 4, 8, 10, 2, 'ally'],
      ],
    )

    const early = structuredClone(trace)
    early.presentations[dying.charge.frame - 1].payload.numbers.push({
      ...dying.hit.number,
      numberId: 99,
    })
    assert.deepEqual(
      validateBattlePresentation(early, fixture).findings.map(({ rule, turn }) => [rule, turn]),
      [['player-casualty-hit-frame', 1]],
    )
    const latePose = structuredClone(trace)
    latePose.presentations[dead.returned.frame].payload.players[0].frameIndex = 1
    assert.deepEqual(
      validateBattlePresentation(latePose, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['player-casualty-recovery-frame', dead.returned.frame]],
    )
    const revivedAction = structuredClone(trace)
    const fading = accepted.deaths[0].start.frame
    revivedAction.presentations[fading].payload.animation = {
      actorId: 'hero',
      kind: 'attack',
      targetId: 'lantern-a',
    }
    assert.deepEqual(
      validateBattlePresentation(revivedAction, fixture).findings.map(({ rule, draw }) => [
        rule,
        draw.frame,
      ]),
      [['dead-player-animation', fading]],
    )
  })

  test('a casualty sound request in the recoil window still needs timely native playback', () => {
    const { fixture, trace } = casualtyFixture()
    const [dying, dead] = validateBattlePresentation(trace, fixture).audio.playerCasualties
    assert.deepEqual(
      [dying, dead].map(({ start, buffer, cold }) => [start.assetId, buffer.bufferId, cold]),
      [
        ['sound.pal.019', 0, true],
        ['sound.pal.023', 1, true],
      ],
    )
    const requestedOnly = structuredClone(trace)
    requestedOnly.audioEvents = requestedOnly.audioEvents.filter(
      (event) => event.order !== dead.start.order,
    )
    assert.deepEqual(
      validateBattlePresentation(requestedOnly, fixture).findings.map(({ rule, kind }) => [
        rule,
        kind,
      ]),
      [['audio-cue-start-missing', 'player-death']],
    )
    trace.audioEvents[dead.start.seq].atMs = dead.request.atMs + 41
    assert.deepEqual(
      validateBattlePresentation(trace, fixture).findings.map(({ rule, kind }) => [rule, kind]),
      [['player-casualty-sound-start-edge', 'player-death']],
    )
  })

  test('a complete drawn dialogue page cannot briefly hide a printed timing control', () => {
    const page = {
      slot: 'bottom',
      phase: 'auto-advance',
      active: true,
      lines: ['我还撑得住'],
      portrait: { id: 15, x: 229, y: 97, width: 83, height: 94 },
      source: 'game:drawDialogBox',
    }
    const rows = [
      [0, { actorId: 'lantern-a' }],
      [200, { actorId: 'lantern-a' }],
      [400, null],
      [800, null, [page]],
      [1120, null, [page]],
      [1485, null],
      [1525, null],
    ]
    const frames = rows.map(([clockMs, animation, dialogue], seq) => ({
      seq,
      order: seq * 2,
      clockMs,
      atMs: clockMs,
      payload: { animation, dialogue },
    }))
    const next = { ...decision('ally', 'defend', null), order: 11, atMs: 1510 }
    const expected = { actions: [{}, next] }
    const trace = { engine: 'game', actions: [{ order: 3 }, next], presentations: [] }
    const motion = {
      action: { turn: 1, targetId: 'hero' },
      start: frames[0],
      next: frames.at(-1),
      observed: { returned: { frame: 1 } },
    }
    const probe = {
      actionIndex: 0,
      nextActionIndex: 1,
      pages: [
        {
          slot: 'bottom',
          portraitId: 15,
          lines: ['我还撑得住'],
          holdMs: 685,
          advance: 'auto',
        },
      ],
    }
    const judge = () => {
      const findings = []
      compareCasualtyDialogue(trace, frames, expected, probe, motion, (_, rule) =>
        findings.push(rule),
      )
      return findings
    }
    assert.deepEqual(judge(), [])
    frames[4].payload.dialogue = [{ ...page, lines: ['我还撑得住~60'] }]
    assert.deepEqual(judge(), ['casualty-dialogue-text'])
  })

  test('the first blue spell numeral belongs to the original-position hurt frame', () => {
    const before = state(24, 30, 2)
    const cast = {
      ...decision('lantern-a', 'cast', 'hero'),
      actorSide: 'enemy',
      skillId: '316',
      before,
      after: state(0, 30, 2),
    }
    const rows = [
      [0, 240, 170, 0, 0],
      [100, 240, 170, 3, 0],
      [300, 240, 170, 4, 6],
      [340, 244, 172, 4, 6],
      [380, 246, 173, 4, 6],
      [420, 247, 173, 4, 0],
      [540, 240, 170, 2, 0],
    ]
    const frames = rows.map(([clockMs, x, y, frameIndex, colorShift], seq) => ({
      seq,
      order: seq,
      clockMs,
      atMs: clockMs,
      payload: {
        turn: 1,
        selecting: seq === 0,
        players: [{ slot: 0, x, y, frameIndex, colorShift }],
        numbers: [],
      },
    }))
    const next = { ...strike, order: 10, atMs: 860 }
    const expected = { actions: [cast, next] }
    const trace = { actions: [cast, next] }
    const probe = {
      actionIndex: 0,
      targetId: 'hero',
      damage: 24,
      recoveryFrame: 2,
      soundKind: 'player-death',
    }
    const number = { numberId: 0, tone: 'blue', value: 24, side: 'player', slot: 0 }
    frames[2].payload.numbers.push(number)
    const judge = () => {
      const findings = []
      compareMagicCasualty(
        trace,
        frames,
        firstNumberDraws(frames),
        expected,
        [frames[1]],
        probe,
        (_, rule) => findings.push(rule),
      )
      return findings
    }
    assert.deepEqual(judge(), [])
    frames[2].payload.numbers.length = 0
    frames[5].payload.numbers.push(number)
    assert.deepEqual(judge(), ['magic-casualty-number-edge'])
  })

  test('round-end poison retains the old pose through the displayed damage hold', () => {
    const round = {
      turn: 1,
      order: 3,
      clockMs: 100,
      before: state(7, 30, 2),
      after: state(0, 30, 2),
    }
    const trace = { rounds: [round], actions: [{ turn: 1, order: 1 }] }
    const frames = [
      { order: 2, clockMs: 60, frameIndex: 1 },
      { order: 4, clockMs: 100, frameIndex: 1, number: true },
      { order: 5, clockMs: 380, frameIndex: 1 },
      { order: 6, clockMs: 420, frameIndex: 2, selecting: true },
    ].map(({ order, clockMs, frameIndex, selecting, number }, seq) => ({
      seq,
      order,
      clockMs,
      atMs: clockMs,
      payload: {
        turn: order === 2 ? 1 : 2,
        selecting,
        players: [{ slot: 0, x: 240, y: 170, frameIndex, colorShift: 0 }],
        numbers: number ? [{ numberId: 0, side: 'player', slot: 0, value: 7, tone: 'blue' }] : [],
      },
    }))
    const probe = {
      turn: 1,
      targetId: 'hero',
      damage: 7,
      holdFrame: 1,
      recoveryFrame: 2,
      forbiddenSounds: ['sound.pal.023'],
    }
    const judge = () => {
      const findings = []
      comparePoisonCasualty(trace, frames, firstNumberDraws(frames), probe, (_, rule) =>
        findings.push(rule),
      )
      return findings
    }
    assert.deepEqual(judge(), [])
    frames[1].payload.players[0].frameIndex = 2
    assert.deepEqual(judge(), ['poison-casualty-pose-hold'])
  })

  test('the next action can consume deferred healing only with the native effect receipt', () => {
    const start = state(5, 30, 2)
    start.players[1].hp = 100
    const dead = state(0, 30, 2)
    dead.players[1].hp = 100
    const healed = state(0, 30, 2)
    const attack = {
      ...decision('lantern-a', 'attack', 'hero'),
      actorSide: 'enemy',
      before: start,
      after: dead,
    }
    const reply = { ...strike, before: healed, after: state(0, 0, 2) }
    const effect = {
      targetId: 'ally',
      before: { hp: 100, attack: 902 },
      after: { hp: 150, attack: 947 },
    }
    const terminal = { result: 'victory', settlementCount: 1, after: state(75, 0, 2, 1, 13) }
    const fixture = {
      id: 'deferred-casualty',
      random,
      expected: {
        start,
        commands: [strike],
        actions: [attack, reply],
        terminal,
        casualtyDialogue: [{ actionIndex: 0, nextActionIndex: 1 }],
        casualtyEffects: [{ afterActionIndex: 0, ...effect }],
      },
    }
    installBattleTraceObserver(
      { scenarioId: fixture.id, runId: `run-${++run}`, engine: 'game', random },
      createEvidenceRecorder,
    )
    const observer = globalThis.__battleEvidence
    observer.start(start, 'battle:start')
    observer.random(0.25, 'rng:queue')
    observer.command({ ...strike, source: 'selection:commit' })
    observer.action({ ...attack, source: 'action:attack' })
    observer.presentation({
      kind: 'battle-casualty-effect',
      source: 'game:tickActionFollowup:friend-death-effects',
      payload: { turn: 1, ...effect },
    })
    observer.action({ ...reply, source: 'action:attack' })
    observer.terminal({ ...terminal, source: 'settlement:commit' })
    const trace = observer.read()
    assert.equal(validateBattleTrace(trace, fixture).status, 'passed')
    trace.presentations[0].kind = 'dialogue-draw'
    assert.equal(validateBattleTrace(trace, fixture).findings[0].rule, 'casualty-effect-count')
  })

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
