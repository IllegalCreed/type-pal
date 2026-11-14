import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual as same } from 'node:util'
import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import { defeatScenario } from './battle-scripted-defeat-scenario.mjs'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const git = (...args) => execFileSync('git', args, { cwd: repoRoot })
const spec = defeatScenario
const judgePath = 'scripts/e2e/battle-scripted-defeat-compare.mjs'
const postDefeatRows = [
  [4587],
  [4589, 4590, 4591],
  [4593, 4594, 4595],
  [4597, 4598],
  [4600, 4601, 4602],
  [4604, 4605],
]
const expectedSteps = Array.from({ length: 12 }, (_, index) => [
  55 - 0.9375 * (index + 1),
  9 - 0.5625 * (index + 1),
  0,
])
const startParty = [[spec.player, spec.hp, spec.mp, 150, 100, 1, 0, '166']]
const defeatedParty = startParty.map(([id, _hp, ...rest]) => [id, 0, ...rest])
const restoredParty = [[spec.returning, 220, 80, 220, 80, 3, 0, '163'], ...defeatedParty]
const party = (state) =>
  state?.party?.map(({ id, hp, mp, maxHP, maxMP, level, exp, weapon }) => [
    id,
    hp,
    mp,
    maxHP,
    maxMP,
    level,
    exp,
    weapon,
  ])
const withoutWhitespace = (line) => line.replace(/\s+/gu, '')
const before = (a, b) => !!a && !!b && a.order < b.order
const elapsed = (a, b) => (a && b ? Math.round(b.atMs - a.atMs) : null)

async function verifySources() {
  const sources = [
    'data/extracted/events/all.json',
    'data/extracted/data/scene/93.json',
    'data/extracted/data/enemy-objects.json',
    'projects/pal/content/scenes/s093.json',
    'projects/pal/content/scenes/s097.json',
    'projects/pal/content/enemy-teams.json',
    'projects/pal/content/locale.json',
  ]
  const [all, original, objects, scene, predecessor, teams, locale] = await Promise.all(
    sources.map(async (path) => JSON.parse(await readFile(resolve(repoRoot, path), 'utf8'))),
  )
  const raw = all.segments.find(({ name }) => name === 'all').commands
  assert.deepEqual(raw[13782].operands, [spec.team, 13783, 0])
  assert.deepEqual(raw[13783], { op: 'raw', opcode: 120, operands: [0, 0, 0], label: 'L_13783' })
  assert.deepEqual(raw[13785].operands, [3, 1, 0])
  assert.deepEqual([raw[13789].opcode, raw[13789].operands], [0x05, [0, 0, 0]])
  assert.deepEqual(raw[13792].operands, [0, 0, 0])
  assert.deepEqual(raw[13793].operands, [201, 0, 0])
  assert.deepEqual(raw[13794].operands, [12, 0, 0])
  assert.deepEqual(raw[13831].operands, [65535, 65530, 65524])
  assert.equal(raw[13829].op, 'end')
  assert.equal(raw[41076].opcode, 0x4f)
  assert.equal(original.mapNum, spec.map)
  const owner = original.eventObjects.find(({ id }) => `e${id}` === spec.owner)
  assert.deepEqual([owner.triggerLabel, owner.triggerMode], ['L_13777', 6])
  assert.equal(objects.find(({ objectIndex }) => objectIndex === 478).scriptOnTurnStart, 41413)
  assert.deepEqual(teams.find(({ id }) => id === `team-${spec.team}`).slots, [spec.enemy])
  const authored = scene.entities.find(({ id }) => id === spec.owner)
  const battle = authored.behaviors.trigger.default.flow.stages[0].body.find(
    ({ kind }) => kind === 'startBattle',
  )
  assert.deepEqual(
    [battle.enemyTeamId, battle.fieldId, battle.boss],
    [`team-${spec.team}`, spec.field, true],
  )
  const opening = predecessor.entities.find(({ id }) => id === 'e1785')
  const entry = opening.behaviors.trigger.default.flow.stages[0].body
  assert.deepEqual(
    entry
      .filter(({ kind, target }) => kind === 'setEntityState' && target.scene === spec.scene)
      .filter(({ target }) => spec.entities.includes(target.entity))
      .map(({ target, state }) => [target.entity, state]),
    spec.entities.map((id) => [id, 1]),
  )
  const messages = new Map(
    raw
      .filter((step) => step.op === 'showDialog')
      .map(({ messageIndex, text }) => [messageIndex, text]),
  )
  assert.deepEqual(
    postDefeatRows.flat().map((id) => locale[`dlg.${id}`]),
    postDefeatRows.flat().map((id) => messages.get(id)),
  )
  return postDefeatRows.map((rows) =>
    withoutWhitespace(rows.map((id) => messages.get(id)).join('')),
  )
}

export function judgeScriptedDefeat(trace, engine, inputs, expectedPages) {
  const findings = []
  const check = (rule, actual, expected) => {
    if (!same(actual, expected)) findings.push({ rule, actual, expected })
  }
  const rows = (kind) => trace.events.filter((event) => event.kind === kind)
  const single = (kind) => {
    const records = rows(kind)
    check(`one ${kind}`, records.length, 1)
    return records[0]
  }
  const game = engine === 'game'
  check(
    'complete native trace',
    [trace.engine, trace.seed, trace.overflow, trace.errors, Number.isFinite(trace.timeOrigin)],
    [engine, spec.seed, false, [], true],
  )
  check(
    'ordered trace identity',
    trace.events.every(
      ({ seq, order, atMs }, index) =>
        seq === index &&
        order === index &&
        Number.isFinite(atMs) &&
        (index === 0 || trace.events[index - 1].atMs <= atMs),
    ),
    true,
  )
  const input = (phase) => inputs.filter((row) => row.phase === phase)
  const approach = input('approach')
  const [defend] = input('battle')
  const menuInputs = input('world-control')
  const key = game ? 'Space' : 'Enter'
  const confirm = (row) => row.key === key && row.kind === 'press'
  check(
    'real input phases',
    inputs.filter(({ phase }) => phase !== 'restore').map(({ phase }) => phase),
    [
      'approach',
      'approach',
      'pre-defeat-dialogue',
      'battle',
      ...Array(6).fill('post-defeat-dialogue'),
      'world-control',
      'world-control',
    ],
  )
  check(
    'one held approach cell and one manual defense',
    [approach.map(({ kind, key }) => [kind, key]), [defend?.kind, defend?.key]],
    [
      [
        ['down', 'ArrowRight'],
        ['up', 'ArrowRight'],
      ],
      ['press', spec.choice.key],
    ],
  )
  check(
    'native dialogue confirmations agree with script pages',
    [
      input('pre-defeat-dialogue').filter(confirm).length,
      input('post-defeat-dialogue').filter(confirm).length,
    ],
    [1, 6],
  )
  check(
    'world control menu sequence',
    menuInputs.map(({ kind, key }) => [kind, key]),
    [
      ['press', 'Escape'],
      ['press', 'Escape'],
    ],
  )
  const dispatched = (row) =>
    row && (row.execution.dispatches?.[0]?.atMs ?? row.atMs) - trace.timeOrigin
  const consumes = (row, event) =>
    !!event &&
    Number.isFinite(dispatched(row)) &&
    event.atMs >= dispatched(row) - 5 &&
    event.atMs - dispatched(row) < 800
  const origin = single('move'),
    trigger = single('trigger'),
    prepared = single('prepared')
  const caller = game ? single('battle-caller') : single('field')
  const menu = single('command-menu-drawn'),
    command = single('command')
  const lastVisual = single('terminal-hold-eligible'),
    end = single('battle-finished')
  const control = single('world-control')
  const opened = single('restored-world-menu'),
    closed = single('restored-world-menu-closed')
  check(
    'native route and trigger identity',
    [origin?.from, origin?.to, trigger?.scene, trigger?.owner, trigger?.position],
    [
      [...spec.route.start, 0],
      [...spec.route.contact, 0],
      spec.scene,
      spec.owner,
      [...spec.route.contact, 0],
    ],
  )
  const actualTeam = game ? caller?.enemyTeamId : Number(prepared?.team?.split('-').at(-1))
  const actualField = game ? caller?.battleFieldId : caller?.fieldId
  check(
    'normal authored boss battle at first choice',
    [
      actualTeam,
      actualField,
      prepared?.boss,
      prepared?.auto,
      menu?.turn,
      command?.slot,
      command?.turn,
      command?.action?.type ?? command?.action?.kind,
    ],
    [spec.team, spec.field, true, false, 1, 0, 1, 'defend'],
  )
  check(
    'native transaction time and input ownership',
    [
      [origin, trigger, prepared, menu, command, lastVisual, end, control, opened, closed].every(
        (event, index, sequence) => index === 0 || before(sequence[index - 1], event),
      ),
      consumes(approach[0], origin),
      consumes(defend, command),
      consumes(menuInputs[0], opened),
      consumes(menuInputs[1], closed),
    ],
    [true, true, true, true, true],
  )
  const startingPlayers = prepared?.players?.map((player) => [
    player.id ?? player.roleId,
    player.hp,
    player.mp,
  ])
  check('one injured living player enters', startingPlayers, [[spec.player, spec.hp, spec.mp]])

  const rng = rows('rng').map(({ value }) => value)
  const tape = createSeedableRng(spec.seed)
  check(
    'five real result-causing draws',
    rng,
    Array.from({ length: 5 }, () => tape.next()),
  )
  const drops = rows('action').filter((event) => event.party?.some(({ hp }) => hp === 0))
  const [fatal] = drops
  const death = fatal && [
    fatal.turn,
    game ? fatal.actor?.isEnemy : fatal.action.side === 'enemy',
    game ? fatal.actor?.idx : fatal.action.idx,
    game ? fatal.action.type === 'magic' : fatal.action.kind === 'cast',
    Number(fatal.action.actionId ?? fatal.action.skillId),
    fatal.action.target ?? fatal.action.targetPlayerIdx,
    ...fatal.party.map(({ id, hp, mp }) => [id, hp, mp]),
    ...fatal.slots.filter(Boolean).map(({ id, hp }) => [id, hp]),
  ]
  check(
    'female thief spell wins round 1 with no enemy damage',
    [drops.length, death],
    [1, [1, true, 0, true, 343, 0, [spec.player, 0, spec.mp], [spec.enemy, 1250]]],
  )
  check(
    'normal runtime defeat writes HP without rewards or reset',
    [
      end?.result,
      party(end),
      end?.cash,
      end?.inventory,
      rows('settlement').length,
      rows('ordinary-game-over-drawn').length,
      rows('load-last-save').length,
      rows('restore').length,
    ],
    [game ? 'lost' : 'defeat', defeatedParty, spec.money, spec.inventory, 0, 0, 0, game ? 1 : 0],
  )
  const script = rows('script-op')
  if (game)
    check(
      'actual mapped 0x07 and loss cursor',
      [
        script.find(({ ip }) => ip === 13782)?.operands,
        trigger?.ip,
        end?.continuation,
        script.filter(({ ip }) => ip === 13783).length,
      ],
      [[spec.team, 13783, 0], 13777, 13783, 1],
    )
  else {
    const result = single('script-result')
    check('canonical runner took real defeat', [before(end, result), result?.arm], [true, 'onLose'])
  }
  const aftermath = script.filter((event) => before(end, event))
  const partyWrites = aftermath.filter((event) =>
    game ? event.opcode === 0x75 : event.op === 'setParty',
  )
  check(
    'one party order mutation after defeat',
    partyWrites.map((event) => (game ? event.operands : event.members)),
    [game ? [3, 1, 0] : [spec.returning, spec.player]],
  )
  const paint = rows('paint')
  const frames = paint.filter((s) => before(end, s))
  check(
    'post-defeat dialogue and control are drawn on the same original world',
    frames.every(({ surface }) => surface === 'world'),
    true,
  )
  const afterPages = frames.filter(
    ({ box }) => box && (game ? box.phase.startsWith('waiting-') : box.phase === 'waiting-input'),
  )
  const pages = afterPages.map(({ box }) => withoutWhitespace(box.text ?? ''))
  check('all six actually rendered dialogue pages in order', pages, expectedPages)
  check(
    'six later confirm edges follow those six rendered pages',
    afterPages.map((event, index) => {
      const next = dispatched(input('post-defeat-dialogue')[index])
      return Number.isFinite(next) && next >= event.atMs - 5 && next - event.atMs < 6000
    }),
    Array(6).fill(true),
  )

  const moved = []
  let lastPose
  for (const frame of frames) {
    const current = frame.actors.find(({ id }) => id === spec.owner)
    if (current && (!lastPose || !same(current.position, lastPose.position))) {
      moved.push({ position: current.position, atMs: frame.atMs, order: frame.order })
    }
    lastPose = current
  }
  const hidden = frames.find(
    ({ actors }) => actors.find(({ id }) => id === spec.owner)?.state === 0,
  )
  const positions = moved.map(({ position }) => position)
  check('one visible placement and twelve native flight movement steps', positions, [
    [55, 9, 0],
    ...expectedSteps,
  ])
  const stepGaps = moved.slice(2).map((point, index) => elapsed(moved[index + 1], point))
  check(
    'flight moves at the original ten frames per second',
    stepGaps.length === 11 && stepGaps.every((ms) => ms >= 60 && ms <= 180),
    true,
  )
  check(
    'hidden landing and returned same world control',
    [
      hidden?.actors.map(({ id, state, position }) => [id, state, position]),
      control?.position,
      party(control),
      control?.cash,
      control?.inventory,
      control?.music,
      opened?.scene,
      closed?.scene,
    ],
    [
      [
        ['e1758', 0, [55, 9, 0]],
        [spec.owner, 0, [43.75, 2.25, 0]],
      ],
      [...spec.route.contact, 0],
      restoredParty,
      spec.money,
      spec.inventory,
      spec.sceneMusic,
      spec.scene,
      spec.scene,
    ],
  )

  const sounds = rows('sfx-start')
  const requests = rows('sfx-request')
  check(
    'real ordered sound cues and calls',
    [
      sounds.map(({ asset, cue }) => [asset, cue]),
      requests.map(({ asset, cue }) => [asset, cue]),
      sounds.every(({ context, frames }) => context === 'running' && frames > 0),
    ],
    [
      [
        [477, 1],
        [158, 2],
        [23, 3],
        [201, 4],
      ],
      [
        [477, 1],
        [158, 2],
        [23, 3],
        [201, 4],
      ],
      true,
    ],
  )
  const worldMusic = rows('music-start').filter((event) => before(end, event))
  const battleMusic = rows('music-start').filter(({ track }) => track === spec.battleMusic)
  check(
    'actual scene music returns before story cue',
    worldMusic.map(({ track, context }) => [track, context]),
    [[spec.sceneMusic, 'running']],
  )
  check(
    'battle score before the damaging action',
    [
      battleMusic.length,
      battleMusic[0]?.context,
      before(battleMusic[0], command),
      before(battleMusic[0], sounds[0]),
    ],
    [1, 'running', true, true],
  )
  check(
    'source-ordered music, flight and dialogue on return',
    [
      before(end, worldMusic[0]),
      before(worldMusic[0], sounds[3]),
      before(sounds[3], moved[1]),
      before(hidden, afterPages[0]),
      before(afterPages.at(-1), control),
    ],
    [true, true, true, true, true],
  )
  const ms = {
    requestToMenu: elapsed(
      script.find((event) => (game ? event.ip === 13782 : event.op === 'startBattle')),
      menu,
    ),
    musicToMenu: elapsed(battleMusic[0], menu),
    terminalToWorldWrite: elapsed(lastVisual, end),
    worldWriteToMusic: elapsed(end, worldMusic[0]),
    worldWriteToFlightSound: elapsed(end, sounds[3]),
    flightSoundToFirstStep: elapsed(sounds[3], moved[1]),
    flightFirstToLast: elapsed(moved[1], moved.at(-1)),
    flightSoundToHide: elapsed(sounds[3], hidden),
    finalStepToHide: elapsed(moved.at(-1), hidden),
  }
  check(
    'no extra terminal-only hold after fatal playback',
    ms.terminalToWorldWrite !== null &&
      ms.terminalToWorldWrite >= 0 &&
      ms.terminalToWorldWrite <= 120,
    true,
  )
  check(
    'the redraw and one world beat precede the flight cue',
    ms.worldWriteToFlightSound !== null &&
      ms.worldWriteToFlightSound >= 145 &&
      ms.worldWriteToFlightSound <= 285,
    true,
  )
  check(
    'conceal the actor on the twelfth beat without another world beat',
    ms.finalStepToHide !== null && ms.finalStepToHide >= 0 && ms.finalStepToHide <= 60,
    true,
  )
  return {
    findings,
    facts: {
      start: startingPlayers,
      route: [origin?.from, origin?.to],
      death,
      rng,
      pages,
      positions,
      sounds: sounds.map(({ asset }) => asset),
      returned: party(control),
      cash: control?.cash,
      inventory: control?.inventory,
    },
    ms,
  }
}

async function loadReport(path, engine, expectedPages, profile, candidate) {
  const absolute = resolve(path),
    bytes = await readFile(absolute)
  const report = JSON.parse(bytes)
  assert.deepEqual(
    [report.engine, report.fragment, report.profile, report.status, report.errors, report.revision],
    [engine, spec.id, profile, 'passed', [], candidate],
  )
  assert.deepEqual(report.input, spec)
  const definition = report.dependencies.definition
  assert.deepEqual(
    [definition.entry, definition.traceConfig, definition.packageName],
    [
      'scripts/e2e/battle-scripted-defeat.mjs',
      'scripts/e2e/battle-scripted-defeat.config.mts',
      engine,
    ],
  )
  assert.deepEqual(report.hashes, report.dependencies.hashes)
  assert.deepEqual(await recordingDependencies(repoRoot, definition), report.dependencies)
  const drift = git('diff', '--name-only', '-z', candidate, '--').toString().split('\0')
  assert.deepEqual(
    drift.filter((path) => Object.hasOwn(report.hashes, path)),
    [],
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  const count = profile === 'verify' ? 2 : 1
  assert.equal(report.cases.length, count)
  const save = await readEvidenceArtifact(dirname(absolute), report.save)
  assert.equal(save.binding.status, 'verified')
  const contexts = Array.from({ length: count }, (_, index) => `${spec.id}-${index + 1}`)
  assert.deepEqual(report.contexts, [
    ...(engine === 'game' ? [{ label: 'canonical-boot', initialDatabases: [] }] : []),
    ...contexts.map((label) => ({ label, initialDatabases: [] })),
  ])
  let cursor = 0
  const runs = []
  for (const [index, row] of report.cases.entries()) {
    assert.deepEqual([row.context, row.repetition], [contexts[index], index + 1])
    const { start, end } = row.actionRange
    assert(start === cursor && end > start && end <= report.actions.length, 'unbound input range')
    const actions = report.actions.slice(start, end)
    assert(
      actions.every((item) => item.context === row.context),
      'unexpected action context',
    )
    assert.deepEqual(party(row.initial), startParty)
    assert.deepEqual(
      [row.initial.scene, row.initial.position, row.initial.inventory, row.initial.cash],
      [spec.scene, [...spec.route.start, 0], spec.inventory, spec.money],
    )
    if (engine === 'game') assert.equal(row.slotReadback, save.sha256)
    else assert.equal(row.initial.checkpoint, 'loaded')
    const raw = await readEvidenceArtifact(dirname(absolute), row.raw)
    assert.equal(raw.binding.status, 'verified')
    runs.push({
      ...judgeScriptedDefeat(raw.value, engine, actions, expectedPages),
      artifact: row.raw,
    })
    cursor = end
  }
  assert.equal(cursor, report.actions.length, 'unused receipts outside the cases')
  return { report: absolute, sha256: sha256(bytes), engine, runs, dependencies: report.hashes }
}

export async function compareScriptedDefeat(gamePath, reforgePath, profile = 'verify') {
  assert(['verify', 'capture'].includes(profile))
  const candidate = git('rev-parse', 'HEAD').toString().trim()
  const judgeSha256 = sha256(await readFile(resolve(repoRoot, judgePath)))
  assert.equal(
    judgeSha256,
    sha256(git('show', `${candidate}:${judgePath}`)),
    'freeze comparator before comparison',
  )
  const pages = await verifySources()
  const [game, reforge] = await Promise.all([
    loadReport(gamePath, 'game', pages, profile, candidate),
    loadReport(reforgePath, 'reforge', pages, profile, candidate),
  ])
  const paired = game.runs.map((left, index) => ({
    run: index + 1,
    passed: same(left.facts, reforge.runs[index].facts),
  }))
  const repeated = [game, reforge].map(({ engine, runs }) => ({
    engine,
    passed: runs.slice(1).every((run) => same(run.facts, runs[0].facts)),
  }))
  const findings = [game, reforge].flatMap(({ engine, runs }) =>
    runs.flatMap(({ findings }, index) =>
      findings.map((value) => ({ engine, run: index + 1, ...value })),
    ),
  )
  return {
    producerRevision: candidate,
    judgeRevision: candidate,
    judgeSha256,
    profile,
    engines: [game, reforge].map(({ dependencies: _dependencies, ...rest }) => rest),
    paired,
    repeated,
    findings,
    status:
      findings.length || [...paired, ...repeated].some(({ passed }) => !passed)
        ? 'rework'
        : 'passed',
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [game, reforge, outputPath, profile] = process.argv.slice(2)
  assert(
    game && reforge && outputPath,
    'usage: node scripts/e2e/battle-scripted-defeat-compare.mjs game-report reforge-report output [verify|capture]',
  )
  const output = resolve(outputPath)
  const comparison = await compareScriptedDefeat(game, reforge, profile)
  await writeEvidenceArtifact(dirname(output), basename(output), comparison)
  console.log(JSON.stringify({ status: comparison.status, output, findings: comparison.findings }))
  process.exitCode = comparison.status === 'passed' ? 0 : 1
}
