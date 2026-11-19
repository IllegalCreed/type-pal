import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual as same } from 'node:util'
import { battleOpponentScenarios, battleOpponentSources } from './battle-opponent-scenarios.mjs'
import { projectBattleBusinessTrace, validateRecording } from './battle-trace-contract.mjs'
import { repoRoot } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { assertDependencyClosure, recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const producer = 'scripts/e2e/battle-opponents.mjs'
const judge = 'scripts/e2e/battle-opponent-compare.mjs'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: repoRoot })

function difference(game, reforge, path = []) {
  if (same(game, reforge)) return null
  if (game && reforge && typeof game === 'object' && typeof reforge === 'object') {
    for (const key of new Set([...Object.keys(game), ...Object.keys(reforge)])) {
      const first = difference(game[key], reforge[key], [...path, key])
      if (first) return first
    }
  }
  return { path, game: game ?? null, reforge: reforge ?? null }
}

function activeFoe(action, opponent) {
  const before = action.before.enemies[opponent.slot]
  return (
    action.actorSide === 'enemy' &&
    action.actorId === opponent.id &&
    action.kind !== 'pass' &&
    before?.alive &&
    before.templateId === opponent.templateId
  )
}

function actionDraw(trace, action, frames, slot) {
  // Game records an action as the queue leaves it. Reforge records the action
  // before its BattleSession consumes the matching animation. The round receipt
  // bounds that action even if the next action comes after a turn-start script.
  const command = trace.commands.findLast(
    ({ turn, order }) => turn === action.turn && order < action.order,
  )
  const previous = Math.max(
    command?.order ?? trace.start.order,
    trace.actions[action.seq - 1]?.order ?? trace.start.order,
  )
  const next = trace.actions[action.seq + 1]?.order ?? trace.terminal.order
  const roundEnd =
    trace.rounds?.find(({ turn }) => turn === action.turn)?.order ?? trace.terminal.order
  const [left, right] =
    trace.engine === 'game' ? [previous, action.order] : [action.order, Math.min(next, roundEnd)]
  const inside = ({ order }) => order > left && order < right
  const motion = frames.filter(
    (frame) =>
      inside(frame) &&
      frame.payload.animation?.actorId === action.actorId &&
      frame.payload.animation.kind === action.kind &&
      frame.payload.enemies.some((draw) => draw.slot === slot && Number.isInteger(draw.frameIndex)),
  )
  const cues = trace.audioEvents
    .filter((event) => inside(event) && event.kind === 'sfx-request')
    .flatMap((request) => {
      // The native request owns the cue. Loading may finish after action dispatch.
      const started = trace.audioEvents.find(
        (event) => event.kind === 'sfx-start' && event.cueId === request.cueId,
      )
      if (!started) return []
      assert.equal(started.assetId, request.assetId)
      assert(started.order > request.order, 'sound started before its native request')
      return [{ assetId: started.assetId, seq: started.seq, requestSeq: request.seq }]
    })
  return {
    first: motion[0]?.seq ?? null,
    firstAtMs: motion[0]?.atMs ?? null,
    last: motion.at(-1)?.seq ?? null,
    lastAtMs: motion.at(-1)?.atMs ?? null,
    cues,
  }
}

export function inspectOpponentRun(trace, scenario) {
  const business = projectBattleBusinessTrace(trace)
  const findings = []
  const check = (rule, observed, expected) => {
    if (!same(observed, expected)) findings.push({ rule, ...difference(observed, expected) })
  }
  const start = scenario.slots.map(
    (opponent) =>
      opponent && {
        id: opponent.id,
        slot: opponent.slot,
        templateId: opponent.templateId,
        hp: opponent.health,
        maxHP: opponent.health,
        alive: true,
        statuses: {},
      },
  )
  check('original enemy slots', business.start.enemies, start)
  check('actual player commands', business.commands, scenario.commands)
  check(
    'native victory and settlement count',
    [business.terminal.result, business.terminal.settlementCount],
    ['victory', 1],
  )
  const scriptedPasses = trace.actions
    .filter((action) => action.native?.inaction === 'scripted-pass')
    .map(({ actorId, turn, seq, native: { scriptedPass } }) => ({
      actorId,
      turn,
      seq,
      proof: scriptedPass,
    }))
  if (scenario.team === 26) {
    check(
      'Zombie King skips its first turn then casts the original spell on turn two',
      trace.actions
        .filter(({ actorId }) => actorId === 'foe-0')
        .map(({ turn, kind, skillId, native }) => [turn, kind, skillId ?? native.inaction]),
      [
        [1, 'pass', 'scripted-pass'],
        [2, 'cast', '357'],
      ],
    )
  }

  const frames = trace.presentations.filter(({ kind }) => kind === 'battle-frame')
  const first = frames.find(
    (frame) => frame.order < trace.actions[0]?.order && frame.payload.enemies.length,
  )
  const opponents = scenario.slots.filter(Boolean)
  check(
    'opening draw slots',
    first?.payload.enemies.map(({ slot }) => slot),
    opponents.map(({ slot }) => slot),
  )
  const roster = opponents.map((opponent) => {
    const label = opponent.templateId
    const draw = first?.payload.enemies.find(({ slot }) => slot === opponent.slot)
    check(`${label} opening anchor`, draw && { x: draw.x, y: draw.y }, opponent.position)
    check(
      `${label} opening idle frame`,
      Boolean(
        draw &&
          Number.isInteger(draw.frameIndex) &&
          draw.frameIndex >= 0 &&
          draw.frameIndex < opponent.idleFrames &&
          !draw.fading,
      ),
      true,
    )
    const actions = trace.actions.filter((action) => activeFoe(action, opponent))
    const appearances = actions.map((action) => ({
      seq: action.seq,
      turn: action.turn,
      kind: action.kind,
      targetId: action.targetId,
      targetSide: action.targetSide ?? null,
      skillId: action.skillId ?? null,
      motion: actionDraw(trace, action, frames, opponent.slot),
    }))
    check(`${label} actually executed an action`, actions.length > 0, true)
    for (const { seq, motion } of appearances)
      check(`${label} action ${seq} actually drawn`, motion.first !== null, true)
    return {
      slot: opponent.slot,
      templateId: label,
      name: opponent.name,
      sprite: opponent.sprite,
      opening: { seq: first?.seq ?? null, draw: draw ?? null },
      actions: appearances,
    }
  })
  return { findings, roster, business, scriptedPasses }
}

const gameplayRandom = (trace) =>
  trace.randomDraws.map(({ index, value, purpose, queue, target }) => ({
    index,
    value,
    purpose,
    queue,
    target,
  }))
const cueList = (roster) =>
  roster.map(({ slot, actions }) => [
    slot,
    actions.map(({ seq, motion }) => [seq, motion.cues.map(({ assetId }) => assetId)]),
  ])

function compareSceneRewards(game, reforge, owners, patch) {
  const drawCount = owners.filter(({ chanceUnder }) => chanceUnder !== null).length
  const split = Math.max(0, game.random.length - drawCount)
  const rolls = game.random.slice(split)
  patch('native random draws', game.random.slice(0, split), reforge.random)
  patch('Game scene reward draw count', rolls.length, drawCount)
  patch(
    'Game scene reward draw ownership',
    game.sceneRewardDraws,
    rolls.map(({ index }) => index),
  )

  const expected = new Map()
  let drawIndex = 0
  const rewards = owners.map((owner) => {
    const draw = owner.chanceUnder === null ? null : (rolls[drawIndex++] ?? null)
    const roll = draw && Math.floor(draw.value * 100) + 1
    const granted = owner.chanceUnder === null || (roll !== null && roll < owner.chanceUnder)
    if (granted) expected.set(owner.itemId, (expected.get(owner.itemId) ?? 0) + 1)
    return { ...owner, randomIndex: draw?.index ?? null, roll, granted }
  })
  const inventory = [...expected].map(([itemId, count]) => ({ itemId, count }))
  inventory.sort((first, second) => first.itemId.localeCompare(second.itemId))

  const { inventory: gameInventory, ...gameAfter } = game.business.terminal.after
  const { inventory: rfInventory, ...rfAfter } = reforge.business.terminal.after
  patch('Game original scene reward', gameInventory, inventory)
  patch('Reforge standalone trial inventory', rfInventory, [])
  patch(
    'terminal outside scene reward',
    { ...game.business.terminal, after: gameAfter },
    { ...reforge.business.terminal, after: rfAfter },
  )
  return {
    source: 'original victory scripts and canonical onDefeated',
    rewards,
    gameInventory,
    rfInventory,
  }
}

function comparePair(first, second, scenario) {
  const repeat = first.engine === second.engine
  assert(!repeat || first.runId !== second.runId, 'replay reused a browser context')
  const differences = []
  const patch = (rule, game, reforge) => {
    const first = difference(game, reforge)
    if (first) differences.push({ rule, ...first })
  }
  for (const key of ['start', 'commands', 'actions', 'rounds'])
    patch(key, first.business[key], second.business[key])
  patch('starting effective player stats', first.players, second.players)
  patch('played enemy action sound cues', cueList(first.roster), cueList(second.roster))
  const observations = []
  if (!repeat && scenario.victoryScriptOwners.length) {
    // A Reforge trial settles combat without running scene onDefeated commands.
    observations.push(compareSceneRewards(first, second, scenario.victoryScriptOwners, patch))
  } else {
    patch('native random draws', first.random, second.random)
    patch('terminal', first.business.terminal, second.business.terminal)
  }
  return { id: scenario.id, first: first.runId, second: second.runId, differences, observations }
}

async function readReport(path, engine, scenarios, sources) {
  const absolute = resolve(path)
  const bytes = await readFile(absolute)
  const report = JSON.parse(bytes)
  assert.equal(report.status, 'passed')
  assert.equal(report.engine, engine)
  assert(['verify', 'capture'].includes(report.profile))
  assert([1, 2].includes(report.repeats))
  if (report.profile === 'capture') {
    assert.equal(report.repeats, 1)
    assert.equal(report.media?.status, 'passed')
  }
  const definition = {
    entry: producer,
    packageName: engine,
    traceConfig: `scripts/e2e/battle-${engine}.config.mts`,
    declared: [...new Set([...sources, ...report.dependencies.definition.declared])],
  }
  const current = await recordingDependencies(repoRoot, definition)
  assertDependencyClosure(report.dependencies, current)
  assert.deepEqual(report.hashes, current.hashes, 'recorded producer dependencies changed')
  const changed = git('diff', '--name-only', '-z', report.revision, '--').toString().split('\0')
  assert.deepEqual(
    changed.filter((path) => Object.hasOwn(current.hashes, path)),
    [],
    'recorded producer differs from its Git revision',
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  const labels = scenarios.flatMap(({ id }) =>
    Array.from({ length: report.repeats }, (_, index) => `${id}-${index + 1}`),
  )
  assert.deepEqual(
    report.contexts,
    labels.map((label) => ({ label, initialDatabases: [] })),
  )
  assert.deepEqual(
    report.cases.map(({ runId }) => runId),
    labels,
  )
  assert(
    report.actions.every(({ context }) => labels.includes(context)),
    'unbound physical input',
  )

  const runs = []
  for (const [index, result] of report.cases.entries()) {
    const scenario = scenarios[Math.floor(index / report.repeats)]
    assert.equal(result.id, scenario.id)
    assert.equal(result.scene, scenario.scene)
    assert.deepEqual(result.configured, scenario.configured)
    const input = report.actions.filter(({ context }) => context === result.runId)
    for (const i of scenario.commands.keys())
      assert(
        input.some(({ commandIndex }) => commandIndex === i),
        `command ${i} has no physical input`,
      )
    const { value: trace, binding } = await readEvidenceArtifact(dirname(absolute), result.trace)
    assert.equal(binding.status, 'verified')
    assert.equal(trace.engine, engine)
    assert.equal(trace.runId, result.runId)
    validateRecording(trace, {
      id: scenario.configured.id,
      random: { algorithm: 'mulberry32', seed: scenario.seed },
    })
    assert.deepEqual(result.initial.snapshot, trace.start.state)
    const { result: battleResult, settlementCount, after } = trace.terminal
    assert.deepEqual(result.terminal, { result: battleResult, settlementCount, after })
    const players = result.initial.nativePlayers.map(({ gameRole: _gameRole, ...player }) => player)
    assert.equal(players.length, scenario.configured.party.length)
    const lastAction = trace.actions.at(-1)?.order ?? trace.start.order
    const sceneRewardDraws = trace.randomDraws.flatMap(({ index, order, purpose }) =>
      order > lastAction && order < trace.terminal.order && purpose === 'battle-script-chance'
        ? [index]
        : [],
    )
    runs.push({
      id: scenario.id,
      engine,
      runId: result.runId,
      trace: result.trace,
      players,
      random: gameplayRandom(trace),
      sceneRewardDraws,
      inputs: input.length,
      ...inspectOpponentRun(trace, scenario),
    })
  }
  return {
    engine,
    report: absolute,
    sha256: hash(bytes),
    revision: report.revision,
    profile: report.profile,
    repeats: report.repeats,
    runs,
  }
}

export async function compareOpponentReports(selector, game, reforge) {
  const scenarios = await battleOpponentScenarios(repoRoot, selector)
  const revision = git('rev-parse', 'HEAD').toString().trim()
  const judgeSha256 = hash(await readFile(resolve(repoRoot, judge)))
  assert.equal(judgeSha256, hash(git('show', `${revision}:${judge}`)), 'commit the judge first')
  const sources = await battleOpponentSources(repoRoot, scenarios)
  const engines = await Promise.all([
    readReport(game, 'game', scenarios, sources),
    readReport(reforge, 'reforge', scenarios, sources),
  ])
  const [l, r] = engines
  assert.equal(l.revision, r.revision)
  assert.equal(l.repeats, r.repeats)
  assert.equal(l.profile, r.profile)
  const paired = l.runs.map((run, index) =>
    comparePair(run, r.runs[index], scenarios[Math.floor(index / l.repeats)]),
  )
  const repeated =
    l.repeats === 1
      ? []
      : engines.flatMap((entry) =>
          scenarios.map((scenario, index) => ({
            engine: entry.engine,
            ...comparePair(entry.runs[index * 2], entry.runs[index * 2 + 1], scenario),
          })),
        )
  const failures = [
    ...engines.flatMap(({ engine, runs }) =>
      runs.flatMap(({ runId, findings }) => findings.map((entry) => ({ engine, runId, ...entry }))),
    ),
    ...[...paired, ...repeated].flatMap(({ id, first, differences }) =>
      differences.map((entry) => ({ id, runId: first, ...entry })),
    ),
  ]
  return {
    schemaVersion: 1,
    selector,
    status: failures.length ? 'rejected' : 'passed',
    producerRevision: l.revision,
    judgeRevision: revision,
    judgeSha256,
    cases: scenarios.map(({ id, scene, field, rawBattleStart, slots, sprites }) => ({
      id,
      scene,
      field,
      rawBattleStart,
      slots,
      sprites,
    })),
    engines: engines.map(({ runs, ...entry }) => ({
      ...entry,
      runs: runs.map(({ business, random, ...run }) => ({ ...run, randomDraws: random.length })),
    })),
    paired,
    repeated,
    failures,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [selector, game, reforge, output] = process.argv.slice(2)
  assert(
    selector && game && reforge && output && process.argv.length === 6,
    'usage: node scripts/e2e/battle-opponent-compare.mjs SELECTOR GAME_REPORT REFORGE_REPORT OUTPUT',
  )
  const result = await compareOpponentReports(selector, game, reforge)
  const artifact = await writeEvidenceArtifact(dirname(resolve(output)), basename(output), result)
  console.log(
    JSON.stringify({ ...artifact, status: result.status, failures: result.failures.length }),
  )
  if (result.failures.length) process.exitCode = 1
}
