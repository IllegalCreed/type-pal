import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import { beeEscapeCases, beeEscapeParty, beeWorldInput } from './battle-world-bee-scenario.mjs'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const judge = 'scripts/e2e/battle-world-escape-compare.mjs'
const git = (...args) => execFileSync('git', args, { cwd: repoRoot })
const group = (entries, kind) => entries.filter((entry) => entry.kind === kind)
const coordinates = ({ col, row }) => [col, row]
const gameGrid = ([x, y]) => [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2]
const layer = (trace, stage) => trace.find(({ stage: current }) => current === stage)
const positions = [
  [200, 176],
  [256, 152],
]
const notice = '逃跑失败'
const expectedRolls = {
  success: [[1, 1, 22, true]],
  failure: [
    [1, 1, 33, false],
    [1, 0, 53, false],
    [2, 1, 32, false],
    [2, 0, 25, true],
  ],
}
const expectedParty = {
  success: [
    [136, 95, 1, 0],
    [225, 230, 5, 0],
  ],
  failure: [
    [135, 95, 1, 0],
    [207, 230, 5, 0],
  ],
}

async function verifyPremises() {
  const load = async (path) => JSON.parse(await readFile(resolve(repoRoot, path)))
  const [raw, scene, teams, enemies] = await Promise.all([
    load('data/extracted/events/all.json'),
    load('projects/pal/content/scenes/s006.json'),
    load('projects/pal/content/enemy-teams.json'),
    load('projects/pal/content/enemies.json'),
  ])
  const [original] = raw.segments
  const start = original.commands[41142]
  const flee = original.commands[41073]
  assert.deepEqual([start.opcode, start.operands], [7, [4, 41075, 41073]])
  assert.equal(flee.opcode, 0x4b)
  assert.deepEqual(scene.entities.find(({ id }) => id === 'e154').hostile.onPlayerFlee, {
    kind: 'suspend',
    ticks: 15,
  })
  assert.deepEqual(teams.find(({ id }) => id === 'team-4').slots, ['enemy-403', 'enemy-403'])
  const { level, fleeRate } = enemies.find(({ id }) => id === 'enemy-403').stats
  assert.equal(2 * (fleeRate + (level + 6) * 4), 60)
}

// Game has one source record per changed draw. Reforge emits the render list and
// the label together from the frame that paints them on the real battle canvas.
function projectPaint(engine, trace) {
  if (engine === 'reforge') return group(trace.events, 'escape-paint')
  return trace.native.frames
    .filter(({ renderer, battle }) => renderer === 'battle' && battle)
    .filter(({ battle }) =>
      battle.players.every(({ position, frame }) => position && frame !== undefined),
    )
    .map(({ atMs, battle }) => ({
      atMs,
      players: battle.players.map(({ position: { x, y }, frame }) => ({ x, y, frame })),
      text: trace.native.escapeLabels.findLast((label) => label.atMs <= atMs)?.text ?? null,
      weights: battle.players.map(({ luckWeight }) => luckWeight),
    }))
}

function verifyPaint(engine, trace, rolls, check) {
  const allPaint = projectPaint(engine, trace)
  const timings = []
  const failurePaint = []
  for (const [index, roll] of rolls.entries()) {
    if (roll.success) break
    const base = positions[roll.slot]
    const events = allPaint.filter(({ atMs }) => atMs >= roll.atMs && atMs < rolls[index + 1]?.atMs)
    const walk = [1, 2, 3].map((step) =>
      events.find(
        ({ players }) =>
          players[roll.slot].x === base[0] + step * 4 &&
          players[roll.slot].y === base[1] + step * 2 &&
          players[roll.slot].frame === 0,
      ),
    )
    const hold = events.find(
      ({ text, players }) =>
        text === notice &&
        players[roll.slot].x === base[0] + 12 &&
        players[roll.slot].y === base[1] + 6 &&
        players[roll.slot].frame === 1,
    )
    check(`failure ${index + 1} three increments and crouch`, walk.every(Boolean) && !!hold)
    if (!walk.every(Boolean) || !hold) continue
    check(
      `failure ${index + 1} draw order`,
      walk.every((frame, i) => frame.atMs < (walk[i + 1] ?? hold).atMs),
    )
    const reset = events.find(
      ({ players, atMs }) =>
        atMs > hold.atMs && players[roll.slot].x === base[0] && players[roll.slot].y === base[1],
    )
    check(`failure ${index + 1} label clears on reset`, !!reset && reset.text === null)
    if (reset) {
      const held = reset.atMs - hold.atMs
      timings.push(held)
      check(`failure ${index + 1} label 320 ms`, held >= 275 && held <= 370)
    }
    failurePaint.push(walk.map(({ players }) => players[roll.slot]).concat(hold.players[roll.slot]))
  }
  const success = rolls.at(-1)
  const moving = allPaint.filter(({ atMs }) => atMs >= success?.atMs)
  const departure = Array.from({ length: 16 }, (_, index) =>
    positions.map(([x, y]) => ({ x: x + 5 * (index + 1), y: y + 4 * (index + 1), frame: 0 })),
  )
  const steps = departure.map((expected) =>
    moving.find(({ players }) => isDeepStrictEqual(players, expected)),
  )
  check('escape draws 16 southeast ally steps', steps.every(Boolean))
  if (steps.every(Boolean)) {
    check(
      'escape displacement order',
      steps.slice(1).every((frame, i) => frame.atMs > steps[i].atMs),
    )
    const travel = steps.at(-1).atMs - steps[0].atMs
    check('escape travel is 15 intervals of 40 ms', travel >= 550 && travel <= 660)
    timings.push(travel)
  }
  return { failurePaint, departure: steps.filter(Boolean).map(({ players }) => players), timings }
}

function judgeRun(engine, trace, row, inputs) {
  const findings = []
  const check = (rule, actual, expected = true) => {
    if (!isDeepStrictEqual(actual, expected)) findings.push({ rule, actual, expected })
  }
  const raw = engine === 'game' ? trace.native : trace
  const events = trace.events ?? []
  check('intact native evidence', [trace.seed, trace.overflow, trace.errors], [row.seed, false, []])
  const isGame = engine === 'game'
  const contact = isGame ? layer(raw.handoff, 'contact') : group(events, 'contact')[0]
  const returned = layer(raw.handoff, 'world-ready')
  check(
    'native contact',
    contact && [
      isGame ? contact.entityId : contact.entity,
      isGame ? contact.grid : coordinates(contact.player),
    ],
    ['e154', beeWorldInput.stop],
  )
  const nativeMoves = isGame
    ? trace.moves.map(({ to }) => gameGrid(to))
    : group(events, 'move').map(({ to }) => coordinates(to))
  check(
    'same committed physical route',
    nativeMoves,
    [94, 95, 96, 97].map((col) => [col, 45]),
  )
  check(
    'one input per eligible turn',
    inputs.filter(({ phase, key }) => phase === 'battle-escape' && key === 'KeyQ').length,
    row.attempts,
  )
  check(
    'actual escape keys delivered',
    raw.inputs.filter(({ code }) => code === 'KeyQ').map(({ kind }) => kind),
    Array.from({ length: row.attempts }, () => ['down', 'up']).flat(),
  )
  const committed = []
  if (isGame) {
    for (const { battle } of raw.frames) {
      if (battle?.pending.length !== 2 || committed.some(({ turn }) => turn === battle.round + 1))
        continue
      committed.push({
        turn: battle.round + 1,
        slots: battle.pending.map(([slot, action]) => [slot, action.type]),
      })
    }
  } else {
    for (const { playerIndex, turn, action } of group(events, 'command')) {
      if (committed.at(-1)?.turn !== turn) committed.push({ turn, slots: [] })
      committed.at(-1).slots.push([playerIndex, action.kind])
    }
  }
  check(
    'same team commands',
    committed,
    Array.from({ length: row.attempts }, (_, i) => ({
      turn: i + 1,
      slots: [
        [0, 'flee'],
        [1, 'flee'],
      ],
    })),
  )
  const rolls = isGame ? raw.escapeRolls : group(events, 'escape-roll')
  const normalizedRolls = rolls.map(({ turn, slot, roll, success }) => [turn, slot, roll, success])
  check('escape rolls and result', normalizedRolls, expectedRolls[row.escape])
  check(
    'active luck and resistance',
    rolls.map(({ slot, luck, resistance }) => [slot, luck, resistance]),
    expectedRolls[row.escape].map(([, slot]) => [slot, [32, 27][slot], 60]),
  )
  const weathered = isGame
    ? rolls.map(({ atMs }) =>
        raw.frames
          .find((frame) => frame.atMs >= atMs && frame.battle)
          ?.battle.players.map(({ luckWeight }) => luckWeight),
      )
    : group(events, 'action')
        .filter(({ action }) => action.kind === 'flee')
        .map(({ luckWeights }) => luckWeights)
  const expectedWeights =
    row.escape === 'success'
      ? [[0, 0]]
      : [
          [0, 2],
          [2, 2],
          [2, 4],
          [2, 4],
        ]
  check('failed decisions add only the actor temporary luck weight', weathered, expectedWeights)
  const rng = createSeedableRng(row.seed)
  const drawStates = isGame
    ? raw.rng.map(({ after }) => after)
    : group(events, 'draw').map(({ sample }) => sample)
  const count = row.escape === 'success' ? 12 : 29
  check(
    'seeded draws consumed in order',
    drawStates,
    Array.from({ length: count }, () => {
      const drawn = rng.next()
      return isGame ? rng.getState() : drawn
    }),
  )
  const { failurePaint, departure, timings } = verifyPaint(engine, trace, rolls, check)
  const sound = isGame ? raw.escapeSound : group(events, 'escape-sound')
  check(
    'escape sound starts exactly once natively',
    sound.map(({ track, audioContextState }) => [track, audioContextState]),
    [[45, 'running']],
  )
  const successful = rolls.at(-1)
  if (successful && sound.length === 1)
    check(
      'escape sound near successful roll',
      sound[0].atMs - successful.atMs < 80 && sound[0].atMs >= successful.atMs,
    )
  if (!isGame)
    check(
      'escape terminal outcome and no rewards',
      group(events, 'writeback').map(({ result, rewards }) => [result, rewards]),
      [['playerFled', { exp: 0, cash: 0 }]],
    )
  check(
    'no reward presentation or victory fade',
    isGame
      ? raw.slots.length === 0 && raw.frames.every(({ battle }) => !battle?.settlement)
      : group(events, 'hidden').length === 0 && group(events, 'settlement').length === 0,
  )
  check(
    'no victory fade frames',
    raw.handoff.every(({ stage }) => !['fade-out', 'world-fade-in'].includes(stage)),
  )
  check(
    'actual painted world return',
    returned && (isGame ? returned.grid : coordinates(returned.position)),
    beeWorldInput.stop,
  )
  if (returned && successful) {
    const elapsed = returned.atMs - successful.atMs
    timings.push(elapsed)
    check('return after escape animation', elapsed >= 630 && elapsed <= 800)
  }
  const party = row.returned?.party.map(({ hp, mp, level, exp }) => [hp, mp, level, exp])
  const assets = isGame
    ? [row.returned?.cash, row.returned?.loot]
    : [
        row.returned?.money,
        row.returned?.inventory.find(({ itemId }) => itemId === '115')?.count ?? 0,
      ]
  const suspension = isGame
    ? raw.frames.find(({ npc }) => npc?.vanishTime === -15)
    : group(events, 'suspend')[0]
  check(
    'native flee branch preserves visible encounter with 15 suspended ticks',
    isGame
      ? [suspension?.npc.state, suspension?.npc.vanishTime]
      : [row.returned?.entity.hidden, suspension?.state],
    isGame ? [1, -15] : [false, { phase: 'suspended', remainingTicks: 15 }],
  )
  check('same wound, MP and no experience gains', party, expectedParty[row.escape])
  check('no cash or loot', assets, [0, 0])
  check(
    'world menu accepts and releases input',
    isGame
      ? row.control?.kind === 'in-game' && !row.end?.menu
      : row.control?.menuActive && !row.end?.run.menuActive,
  )
  const cooldown = trace.cooldown?.samples ?? []
  const countdown = cooldown.map(({ remaining }) => remaining)
  check(
    'fifteen suspended world steps including the final decrement to zero',
    countdown,
    Array.from({ length: 16 }, (_, index) => 15 - index),
  )
  check(
    'the visible enemy and player remain still with one contact throughout the suspension',
    cooldown
      .filter(({ remaining }) => remaining > 0)
      .map(({ visible, contacts, grid, enemy }) => [visible, contacts, grid, enemy]),
    Array.from({ length: 15 }, () => [true, 1, beeWorldInput.stop, [98.25, 45]]),
  )
  const last = cooldown.at(-1)
  check(
    'the visible enemy is released at zero before any new contact',
    last && [last.visible, last.contacts, last.grid, last.enemy],
    // Game resumes the PAL auto-script after the decrement. Reforge scans contact on the next step.
    [true, 1, beeWorldInput.stop, isGame ? [97.5, 45] : [98.25, 45]],
  )
  const contactAfterWait = trace.cooldown?.secondContact
  check(
    'the same enemy contacts only on the world step after the countdown reaches zero',
    contactAfterWait &&
      last && [
        contactAfterWait.entity,
        contactAfterWait.grid,
        contactAfterWait.tick - last.tick,
        contactAfterWait.atMs > last.atMs,
      ],
    ['e154', beeWorldInput.stop, 1, true],
  )
  return {
    context: row.label,
    raw: row.raw,
    findings,
    facts: {
      nativeMoves,
      normalizedRolls,
      committed,
      weathered,
      failurePaint,
      departure,
      party,
      assets,
      countdown,
    },
    timings,
  }
}

async function readReport(path, engine, spec) {
  const absolute = resolve(path)
  const bytes = await readFile(absolute)
  const report = JSON.parse(bytes)
  assert.deepEqual(
    [report.engine, report.status, report.fragment, report.errors],
    [engine, 'passed', 'q2-world-player-escape', []],
  )
  assert(['verify', 'capture'].includes(report.profile))
  assert.match(report.revision, /^[a-f0-9]{40}$/u)
  assert.deepEqual(report.input, { ...beeWorldInput, party: beeEscapeParty, battleInput: ['KeyQ'] })
  const { definition } = report.dependencies
  assert.deepEqual(
    [definition.entry, definition.packageName, definition.traceConfig],
    [
      `scripts/e2e/battle-world-bee-${engine}.mjs`,
      engine,
      `scripts/e2e/battle-world-bee-${engine}.config.mts`,
    ],
  )
  assert.deepEqual(await recordingDependencies(repoRoot, definition), report.dependencies)
  const changed = git('diff', '--name-only', '-z', report.revision, '--').toString().split('\0')
  assert.deepEqual(
    changed.filter((file) => Object.hasOwn(report.dependencies.hashes, file)),
    [],
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  const count = report.profile === 'verify' ? 2 : 1
  const expectedContexts = Array.from({ length: count }, (_, i) => `seed-${spec.seed}-run-${i + 1}`)
  assert.deepEqual(report.contexts, [
    ...(engine === 'game' ? [{ label: 'canonical-scene-baseline', initialDatabases: [] }] : []),
    ...expectedContexts.map((label) => ({ label, initialDatabases: [] })),
  ])
  assert.deepEqual(
    report.cases.map(({ label }) => label),
    expectedContexts,
  )
  const save = await readEvidenceArtifact(dirname(absolute), report.save)
  assert.equal(save.binding.status, 'verified')
  let cursor = 0
  const runs = []
  for (const row of report.cases) {
    assert.deepEqual([row.escape, row.seed, row.attempts], [spec.escape, spec.seed, spec.attempts])
    if (engine === 'game') assert.equal(row.slotReadback, save.sha256)
    const { start, end } = row.actionRange
    assert(start === cursor && end > start && end <= report.actions.length, 'unbound action range')
    const inputs = report.actions.slice(start, end)
    assert(inputs.every(({ context }) => context === row.label))
    cursor = end
    const raw = await readEvidenceArtifact(dirname(absolute), row.raw)
    assert.equal(raw.binding.status, 'verified')
    runs.push(judgeRun(engine, raw.value, row, inputs))
  }
  assert.equal(cursor, report.actions.length)
  return {
    engine,
    profile: report.profile,
    report: absolute,
    sha256: sha256(bytes),
    revision: report.revision,
    runs,
  }
}

export async function compareWorldEscapeReports(outcome, gamePath, reforgePath) {
  const spec = beeEscapeCases.find((entry) => entry.escape === outcome)
  assert(spec, 'unknown world escape case')
  const judgeRevision = git('rev-parse', 'HEAD').toString().trim()
  const judgeSha256 = sha256(await readFile(resolve(repoRoot, judge)))
  assert.equal(
    judgeSha256,
    sha256(git('show', `${judgeRevision}:${judge}`)),
    'freeze escape comparator',
  )
  await verifyPremises()
  const [game, reforge] = await Promise.all([
    readReport(gamePath, 'game', spec),
    readReport(reforgePath, 'reforge', spec),
  ])
  assert.equal(game.revision, reforge.revision)
  assert.equal(game.profile, reforge.profile)
  const compare = (from, to) => ({
    findings: Object.keys(from.facts).filter(
      (key) => !isDeepStrictEqual(from.facts[key], to.facts[key]),
    ),
    timingMs: from.timings.map((ms, index) => Math.abs(ms - to.timings[index])),
  })
  const paired = game.runs.map((run, i) => compare(run, reforge.runs[i]))
  const repeated =
    game.profile === 'verify' ? [game, reforge].map(({ runs }) => compare(...runs)) : []
  const findings = [game, reforge].flatMap(({ engine, runs }) =>
    runs.flatMap(({ findings, context }) =>
      findings.map((finding) => ({ engine, context, ...finding })),
    ),
  )
  const errors = [...paired, ...repeated].some(
    (row) => row.findings.length > 0 || row.timingMs.some((ms) => !Number.isFinite(ms) || ms > 85),
  )
  return {
    status: findings.length || errors ? 'rejected' : 'passed',
    outcome,
    judgeRevision,
    judgeSha256,
    producerRevision: game.revision,
    engines: [game, reforge],
    paired,
    repeated,
    findings,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [outcome, game, reforge, out] = process.argv.slice(2)
  assert(
    outcome && game && reforge && out,
    'usage: battle-world-escape-compare.mjs success|failure GAME REFORGE OUTPUT',
  )
  const result = await compareWorldEscapeReports(outcome, game, reforge)
  await writeEvidenceArtifact(dirname(resolve(out)), basename(out), result)
  console.log(
    JSON.stringify({ status: result.status, findings: result.findings, paired: result.paired }),
  )
  if (result.status !== 'passed') process.exitCode = 1
}
