import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual as same } from 'node:util'
import { battleFoundationInputSources } from './battle-foundation-scenarios.mjs'
import { makeSpec, poisonCases, six } from './battle-poison-scenarios.mjs'
import { poisonSources, verifyPoisonSources } from './battle-poison-sources.mjs'
import { firstNumberDraws } from './battle-presentation.mjs'
import { validateRecording } from './battle-trace-contract.mjs'
import { repoRoot } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import {
  assertDependencyClosure,
  dependencyImpact,
  recordingDependencies,
} from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const entry = 'scripts/e2e/battle-poison-items.mjs'
const comparisonSource = 'scripts/e2e/battle-poison-compare.mjs'
const red = 551
const crane = 556
const bile = 557
const begonia = 558
const corpse = 555
const byItem = new Map(six.map((row) => [row.item, row]))
const pid = (item) => byItem.get(item).poison
const poisons = (...ids) => ids.sort((a, b) => a - b)
const player = (index, slot, hp, active, roll, damage) => ({
  index,
  side: 'player',
  slot,
  hp,
  poisons: active,
  roll,
  damage,
})
const enemy = (index, hp, active, roll, damage) => ({
  index,
  side: 'enemy',
  slot: 0,
  hp,
  poisons: active,
  roll,
  damage,
})
const currentHp = (index, before, after) =>
  enemy(index, [before, after], [[], []], [], before - after)
const throwRolls = ['spell-damage-variance', 'poison-resistance']
const casterRoll = ['player-poison-resistance']
const poisonTickHp = (id, side) => (id === corpse ? 0 : side === 'player' ? 50 : 100)
const fixtures = {
  'garlic-resistance': [player(1, 1, [171, 171], [[], []], casterRoll)],
  'dragon-ally-only': [
    player(0, 1, [171, 121], [[], [crane]], casterRoll, 50),
    player(1, 2, [171, 164], [[], [red]], casterRoll, 7),
    player(2, 1, [121, 121], [[crane], []], []),
  ],
  'dragon-mixed-levels': [
    player(0, 2, [171, 121], [[], [crane]], casterRoll, 50),
    player(1, 2, [121, 114], [[crane], poisons(red, crane)], casterRoll, 7),
    player(2, 2, [114, 114], [poisons(red, crane), []], []),
  ],
  'dragon-red-only': [
    player(0, 1, [171, 164], [[], [red]], casterRoll, 7),
    player(1, 1, [164, 164], [[red], []], []),
  ],
  'dragon-clean-target': [player(0, 1, [171, 0], [[], []], [], 171)],
  'shadowless-self': [
    player(0, 0, [21, 10], [[], []], [], 11),
    player(1, 1, [20, 10], [[], []], [], 10),
  ],
  'shadowless-cap': [currentHp(0, 2250, 1250), currentHp(1, 1250, 624)],
  'shadowless-20': [currentHp(1, 20, 9)],
  'shadowless-1997': [currentHp(1, 1997, 998)],
  'shadowless-1998': [currentHp(3, 1998, 998)],
  'shadowless-2000': [currentHp(1, 2000, 1000)],
  'use-reverse-counter': [
    player(0, 1, [171, 121], [[], [crane]], casterRoll, 50),
    player(1, 1, [121, 71], [[crane], poisons(crane, begonia)], casterRoll, 50),
  ],
  'throw-counter-does-not-cure': [
    enemy(0, [330, 230], [[], [begonia]], throwRolls, 100),
    enemy(1, [230, 130], [[begonia], poisons(crane, begonia)], throwRolls, 100),
  ],
  'throw-lethal-after-resist': [
    enemy(0, [3000, 2900], [[], [bile]], throwRolls, 100),
    enemy(1, [2900, 0], [[bile], [bile]], throwRolls, 2900),
  ],
  'use-counter-before-lethal': [
    player(0, 2, [171, 121], [[], [begonia]], casterRoll, 50),
    player(1, 2, [121, 71], [[begonia], poisons(begonia, bile)], casterRoll, 50),
    player(2, 2, [71, 71], [poisons(begonia, bile), [bile]], []),
  ],
  'use-duplicate-poison': [
    player(0, 1, [171, 164], [[], [red]], casterRoll, 7),
    player(1, 1, [164, 164], [[red], [red]], casterRoll),
  ],
  'three-corpse-ally-rounds': [player(0, 1, [171, 171], [[], [corpse]], casterRoll)],
  'three-corpse-enemy-round': [
    enemy(0, [330, 330], [[], [corpse]], throwRolls),
    enemy(1, [330, 330], [[corpse], [corpse]], throwRolls),
  ],
}

function witnesses(label) {
  if (Object.hasOwn(fixtures, label)) return fixtures[label]
  const kind = label.replace(/-\d+$/, '')
  const item = Number(label.split('-').at(-1))
  const { poison, counters, lethal } = byItem.get(item)
  const isThrow = kind === 'throw-lethal'
  const firstPoison = pid(kind === 'use-counters' ? counters : lethal)
  const hp = isThrow ? 330 : 171
  const entryDamage = poisonTickHp(firstPoison, isThrow ? 'enemy' : 'player')
  const rest = hp - entryDamage
  if (isThrow)
    return [
      enemy(0, [hp, rest], [[], [firstPoison]], throwRolls, entryDamage || undefined),
      enemy(1, [rest, 0], [[firstPoison], poisons(poison, firstPoison)], throwRolls, rest),
    ]
  return [
    player(0, 1, [hp, rest], [[], [firstPoison]], casterRoll, entryDamage || undefined),
    player(
      1,
      1,
      [rest, kind === 'use-counters' ? rest : 0],
      [[firstPoison], kind === 'use-counters' ? [] : [firstPoison]],
      [],
      kind === 'use-counters' ? undefined : rest,
    ),
  ]
}
const semantic = ({ turn, actorId, actorSide, kind, itemId, skillId, targetId, targetSide }) => ({
  turn,
  actorId,
  ...(actorSide ? { actorSide } : {}),
  kind,
  ...(itemId ? { itemId } : {}),
  ...(skillId ? { skillId } : {}),
  targetId,
  ...(targetSide ? { targetSide } : {}),
})
const unitPoison = (unit) => unit.poisons ?? []
const itemCount = (state, itemId) =>
  state.inventory.find((row) => row.itemId === itemId)?.count ?? 0
const shown = ({ side, slot, value, tone }) => ({ side, slot, value, tone })

function compareCase(trace, scenario, premises) {
  validateRecording(trace, {
    id: `poison-${scenario.label}`,
    random: { algorithm: 'mulberry32', seed: scenario.seed },
  })
  const rounds = trace.rounds ?? []
  const findings = []
  const check = (name, actual, expected) => {
    if (!same(actual, expected)) findings.push({ name, expected, actual })
  }
  const { label, commands, team, seed, hp } = scenario
  const expected = witnesses(label)
  const source = premises.teams.find(({ id }) => id === team)
  check('declared seed', trace.random, { seed, algorithm: 'mulberry32' })
  check(
    'initial player HP',
    trace.start.state.players.map(({ hp }) => hp),
    hp,
  )
  check('initial player poison', trace.start.state.players.map(unitPoison), [[], [], []])
  const foes = trace.start.state.enemies.filter(Boolean)
  check(
    'initial enemy HP',
    foes.map(({ hp }) => hp),
    source.hp,
  )
  check(
    'initial enemy templates',
    foes.map(({ templateId }) => templateId),
    source.objects.map((id) => `enemy-${id}`),
  )
  check(
    'native committed commands',
    trace.commands.map(semantic),
    commands.slice(0, trace.commands.length),
  )
  check(
    'victory settlement',
    [trace.terminal.result, trace.terminal.settlementCount],
    ['victory', 1],
  )
  for (const action of trace.actions)
    if (action.itemId) {
      const stock = itemCount(action.before, action.itemId)
      check(
        `order ${action.order} item consumed once`,
        [stock > 0, itemCount(action.after, action.itemId)],
        [true, stock - 1],
      )
    }
  const frames = trace.presentations.filter(({ kind }) => kind === 'battle-frame')
  const firstDraws = firstNumberDraws(frames)
  const receipts = []
  const animated = trace.actions.map((action, index) => {
    const priorOrder = trace.actions[index - 1]?.order ?? trace.start.order
    const lastCommit = trace.commands.findLast(({ turn }) => turn === action.turn)?.order
    const lower = Math.max(priorOrder, lastCommit ?? priorOrder)
    const upper = trace.actions[index + 1]?.order ?? trace.terminal.order
    return frames.find(
      ({ order, payload }) =>
        order > lower &&
        order <= upper &&
        payload.turn === action.turn &&
        payload.animation?.actorId === action.actorId &&
        payload.animation.kind === action.kind &&
        payload.animation.targetId === action.targetId,
    )
  })
  for (const witness of expected) {
    const { index, side, slot, hp: expectedHp, poisons: expectedPoisons, roll, damage } = witness
    const command = commands[index]
    const location = `command ${index} ${command.itemId ?? command.skillId}`
    const actionIndex = trace.actions.findIndex((action) => same(semantic(action), command))
    if (actionIndex === -1) {
      check(location, 'missing native action', command)
      continue
    }
    const actual = trace.actions[actionIndex]
    const units = side === 'player' ? 'players' : 'enemies'
    const before = actual.before[units][slot],
      after = actual.after[units][slot]
    const observedHp = [before.hp, after.hp]
    const observedPoison = [unitPoison(before), unitPoison(after)]
    check(`${location} HP`, observedHp, expectedHp)
    check(`${location} active poison`, observedPoison, expectedPoisons)
    for (const group of ['players', 'enemies']) {
      const unrelated = (state) =>
        state[group].filter((unit, index) => unit && (group !== units || index !== slot))
      check(`${location} other ${group}`, unrelated(actual.after), unrelated(actual.before))
    }
    const predecessor = trace.actions[actionIndex - 1]
    const previousBoundary = rounds.findLast(
      ({ order }) => order < actual.order && order > (predecessor?.order ?? 0),
    )
    const beforeOrder = previousBoundary?.order ?? predecessor?.order ?? trace.start.order
    const lastQueue = trace.randomDraws.findLast(
      ({ order, purpose }) =>
        order > beforeOrder && order < actual.order && purpose === 'queue-dexterity',
    )
    const last = lastQueue?.order ?? beforeOrder
    const draws = trace.randomDraws.filter(({ order }) => order > last && order < actual.order)
    // This was the historical instrumentation name for exactly the same opcode sample.
    const purpose = ({ purpose }) =>
      purpose === 'enemy-equivalent-poison-script' ? 'player-poison-resistance' : purpose
    const expectedDraws =
      command.itemId === '137' && command.kind === 'throw' ? ['spell-damage-variance'] : roll
    check(`${location} RNG purpose/order`, draws.map(purpose), expectedDraws)
    if (label === 'garlic-resistance')
      check(
        `${location} resistance roll`,
        draws.map(({ value }) => 1 + Math.floor(value * 100)),
        [24],
      )
    if (label === 'throw-lethal-after-resist')
      check(
        `${location} sorcery roll`,
        draws
          .filter((entry) => entry.purpose === 'poison-resistance')
          .map(({ value }) => Math.floor(value * 10)),
        [index === 0 ? 6 : 3],
      )
    const nextAnimation = animated.slice(actionIndex + 1).find(Boolean)
    const nextRound = rounds.find(({ order }) => order > actual.order)
    const startFrame = animated[actionIndex]
    check(`${location} native animation`, Boolean(startFrame), true)
    const through = Math.min(
      nextAnimation?.order ?? Infinity,
      nextRound?.order ?? Infinity,
      trace.terminal.order,
    )
    const feedback = firstDraws.filter(
      ({ frame, number }) =>
        frame.order >= (startFrame?.order ?? actual.order) &&
        frame.order < through &&
        number.side === side &&
        number.slot === slot,
    )
    if (damage !== undefined) {
      check(
        `${location} drawn blue damage`,
        feedback.map(({ number }) => shown(number)),
        [{ side, slot, value: damage, tone: 'blue' }],
      )
    } else
      check(
        `${location} draws no damage`,
        feedback.map(({ number }) => shown(number)),
        [],
      )
    receipts.push({
      command,
      orders: { first: beforeOrder, last: through },
      actionOrder: actual.order,
      hp: observedHp,
      poisons: observedPoison,
      draws: draws.map(({ index, value, purpose: rawPurpose }) => ({
        index,
        value,
        purpose: rawPurpose,
      })),
      numbers: feedback.map(({ frame, number }) => ({ order: frame.order, ...shown(number) })),
    })
  }
  if (label === 'three-corpse-ally-rounds')
    check(
      'first two player round ticks',
      rounds.slice(0, 2).map(({ before, after }) => before.players[1].hp - after.players[1].hp),
      [0, 1],
    )
  if (label === 'three-corpse-enemy-round')
    check(
      'first enemy round tick',
      rounds.slice(0, 1).map(({ before, after }) => before.enemies[0].hp - after.enemies[0].hp),
      [111],
    )
  return { label, status: findings.length ? 'rejected' : 'passed', findings, receipts }
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (args) => execFileSync('git', args, { cwd: repoRoot })

function verifyProducerHashes(report, current) {
  assertDependencyClosure(report.dependencies, current)
  assert.deepEqual(report.hashes, report.dependencies.hashes)
  const originalJudge = sha256(git(['show', `${report.revision}:${comparisonSource}`]))
  assert.equal(
    report.hashes[comparisonSource],
    originalJudge,
    'recorded judge differs from its Git revision',
  )
  assert.equal(dependencyImpact(report.dependencies, comparisonSource), 'declared-oracle')
  assert.equal(dependencyImpact(current, comparisonSource), 'declared-oracle')
  const expected = { ...current.hashes, [comparisonSource]: originalJudge }
  assert.deepEqual(report.hashes, expected, 'a producer or unrelated declared source changed')
  return { recorded: originalJudge, current: current.hashes[comparisonSource] }
}

function compareFocusedActions(game, reforge) {
  const projection = ({ command, hp, poisons, draws, numbers }) => ({
    command,
    hp,
    poisons,
    draws: draws.map(({ purpose, value }) => ({ purpose, value })),
    numbers: numbers.map(shown),
  })
  const results = []
  for (const [index, { label, receipts }] of game.results.entries()) {
    const left = receipts.map(projection)
    const right = reforge.results[index].receipts.map(projection)
    const differences = []
    for (let focus = 0; focus < Math.max(left.length, right.length); focus++) {
      if (!same(left[focus], right[focus]))
        differences.push({
          focus,
          command: (left[focus] ?? right[focus]).command,
          game: left[focus] ?? null,
          reforge: right[focus] ?? null,
        })
    }
    results.push({ label, status: differences.length ? 'rejected' : 'passed', differences })
  }
  return results
}

/** A changed comparison may rejudge original bytes only when the native source closure still matches. */
export async function comparePoisonReports(gamePath, reforgePath, selector = 'all') {
  const scenarios = poisonCases(selector)
  const premises = await verifyPoisonSources(repoRoot)
  const judgeRevision = git(['rev-parse', 'HEAD']).toString().trim()
  const judgeSha = sha256(await readFile(resolve(repoRoot, comparisonSource)))
  assert.equal(
    judgeSha,
    sha256(git(['show', `${judgeRevision}:${comparisonSource}`])),
    'commit the comparator before rejudging',
  )
  let producerRevision
  const commonSources = [
    ...(await battleFoundationInputSources(repoRoot)),
    ...poisonSources,
    comparisonSource,
  ]
  const engines = []
  for (const [engine, path] of [
    ['game', gamePath],
    ['reforge', reforgePath],
  ]) {
    const absolute = resolve(path)
    const bytes = await readFile(absolute)
    const report = JSON.parse(bytes)
    assert.equal(report.engine, engine)
    assert.match(report.revision, /^[a-f0-9]{40}$/u, 'invalid producer revision')
    if (producerRevision === undefined) producerRevision = report.revision
    assert.equal(
      report.revision,
      producerRevision,
      'the two recordings have different producer revisions',
    )
    assert.equal(report.selector, selector)
    assert.equal(report.profile, 'verify', 'verify reports are distinct from review recordings')
    assert.equal(report.counter, 'none')
    assert.equal(report.status, 'passed', 'the native journey did not finish')
    assert.deepEqual(report.errors, [])
    assert.deepEqual(report.premises, premises)
    assert.equal(report.dependencies.definition.entry, entry)
    assert.equal(report.dependencies.definition.packageName, engine)
    assert.equal(
      report.dependencies.definition.traceConfig,
      `scripts/e2e/battle-${engine}.config.mts`,
    )
    for (const source of commonSources)
      assert(
        report.dependencies.definition.declared.includes(source),
        `missing source binding ${source}`,
      )
    const current = await recordingDependencies(repoRoot, report.dependencies.definition)
    const judge = verifyProducerHashes(report, current)
    assert.equal(judge.current, judgeSha)
    assertInputLedger(report.actions, { requireReceipts: true })
    assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
    assert.deepEqual(
      report.contexts,
      scenarios.map(({ label }) => ({ label, initialDatabases: [] })),
    )
    assert.deepEqual(
      report.cases.map(({ label }) => label),
      scenarios.map(({ label }) => label),
    )
    const results = []
    for (const [index, scenario] of scenarios.entries()) {
      const { label, commands, focus } = scenario
      const result = report.cases[index]
      const configured = makeSpec(scenario)
      assert.deepEqual(result.configured, configured)
      assert.deepEqual(result.planned, commands)
      assert.deepEqual(result.focus, focus)
      const artifact = await readEvidenceArtifact(dirname(absolute), result.trace)
      assert.equal(artifact.binding.status, 'verified')
      const trace = artifact.value
      assert.equal(trace.engine, engine)
      assert.equal(trace.runId, label)
      assert.equal(trace.scenarioId, configured.id)
      assert.deepEqual(trace.errors, [])
      assert.equal(trace.overflow, false)
      const keys = report.actions.filter(({ context }) => context === label)
      for (const commandIndex of focus)
        assert(
          keys.some(
            (input) =>
              input.commandIndex === commandIndex && input.execution.status === 'completed',
          ),
        )
      results.push({ ...compareCase(trace, scenario, premises), trace: result.trace })
    }
    engines.push({
      engine,
      report: absolute,
      sha256: sha256(bytes),
      judge,
      results,
    })
  }
  const paired = compareFocusedActions(...engines)
  const rejected = [
    ...engines.flatMap(({ engine, results }) =>
      results.filter(({ status }) => status === 'rejected').map(({ label }) => ({ engine, label })),
    ),
    ...paired
      .filter(({ status }) => status === 'rejected')
      .map(({ label }) => ({ engine: 'paired', label })),
  ]
  return {
    schemaVersion: 1,
    producerRevision,
    judgeRevision,
    judgeSha,
    selector,
    status: rejected.length ? 'rejected' : 'passed',
    rejected,
    engines,
    paired,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , game, reforge, output, selector] = process.argv
  assert(
    output,
    'usage: node scripts/e2e/battle-poison-compare.mjs game/report.json reforge/report.json output-directory [all|GROUP|CASE[,CASE]]',
  )
  const report = await comparePoisonReports(game, reforge, selector)
  await mkdir(output, { recursive: true })
  console.log(JSON.stringify(await writeEvidenceArtifact(output, 'comparison.json', report)))
  assert.equal(report.status, 'passed', JSON.stringify(report.rejected))
}
