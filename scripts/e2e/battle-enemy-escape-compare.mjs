import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const judge = 'scripts/e2e/battle-enemy-escape-compare.mjs'
const git = (...args) => execFileSync('git', args, { cwd: repoRoot })
const contact = [73, 10, 0]
const trio = [
  ['bottom', 5, []],
  ['top', 24, [['bottom', 5]]],
  ['top', 90, []],
]
const startParty = [
  ['li-xiaoyao', 150, 100, 0],
  ['lin-yueru', 220, 80, 0],
]

async function sourceFacts() {
  const raw = JSON.parse(await readFile(resolve(repoRoot, 'data/extracted/events/all.json')))
  const commands = raw.segments[0].commands
  const original = commands.slice(41060, 41073)
  assert.deepEqual(
    original.filter(({ opcode }) => opcode === 105).map(({ operands }) => operands),
    [[0, 0, 0]],
  )
  assert.deepEqual(
    original
      .filter(({ op }) => op.startsWith('setDialogStyle'))
      .map(({ op, arg0 }) => [op, arg0 ?? null]),
    [
      ['setDialogStyleBottom', 5],
      ['setDialogStyleTop', 24],
      ['setDialogStyleTop', 90],
      ['setDialogStyleNarration', null],
    ],
  )
  assert.deepEqual(commands[8852].operands, [25, 0, 0])
  assert.deepEqual(
    commands.slice(8853, 8856).map(({ op, opcode, sceneId }) => [op, opcode ?? sceneId]),
    [
      ['raw', 119],
      ['raw', 109],
      ['loadScene', 38],
    ],
  )
  assert.deepEqual(
    [8861, 8863, 8864].map((index) => [commands[index].opcode, commands[index].operands[0]]),
    [
      [9, 16],
      [128, 0],
      [9, 6],
    ],
  )
  const lines = original.filter(({ op }) => op === 'showDialog').map(({ text }) => text)
  const next = commands
    .slice(8867, 8869)
    .map(({ text }) => text)
    .join('\n')
  assert.equal(lines.length, 5)
  return { pages: [lines.slice(0, 2).join('\n'), ...lines.slice(2)], next }
}

function checkRun(engine, row, trace, actions, source) {
  const findings = []
  const check = (name, actual, expected = true) => {
    if (!isDeepStrictEqual(actual, expected)) findings.push({ name, actual, expected })
  }
  const { events } = trace
  const isGame = engine === 'game'
  const group = (kind) => events.filter((event) => event.kind === kind)
  const portrait = (id) => (id === null ? null : Number(String(id).split('.').at(-1)))
  const timing = {}
  check(
    'sealed actual timeline',
    [trace.engine, trace.seed, trace.errors, trace.overflow],
    [engine, 6, [], false],
  )
  check(
    'initial state from current save',
    [
      row.initial.scene,
      row.initial.position,
      row.initial.ownerState,
      row.initial.party,
      row.initial.cash,
      row.initial.items,
    ],
    ['s036', [72, 10, 0], 2, startParty, 150, []],
  )
  check(
    'one real right press and three dialogue confirmations',
    actions
      .filter(({ scope }) => scope === 'story')
      .map(({ kind, key, phase }) => [
        kind,
        phase,
        key === 'Space' || key === 'Enter' ? 'confirm' : key,
      ]),
    [
      ['down', 'approach', 'ArrowRight'],
      ['up', 'approach', 'ArrowRight'],
      ...Array.from({ length: 3 }, () => ['press', 'dialogue', 'confirm']),
    ],
  )
  check(
    'one actual walk and contact',
    [
      group('approach-move').map(({ position }) => position),
      group('move').map(({ position }) => position),
      group('contact').map(({ scene, owner, position }) => [scene, owner, position]),
    ],
    [[contact], [], [['s036', 'e602', contact]]],
  )
  const starts = group('battle-start')
  check(
    'actual team 25 and field 24',
    [
      starts.map(({ team }) => Number(String(team).split('-').at(-1))),
      isGame ? starts.map(({ field }) => field) : group('field').map(({ field }) => field),
    ],
    [[25], [24]],
  )
  check('no rule random draw before scripted exit', group('rng'), [])
  const paints = group('paint')
  const battle = paints.filter((frame) => frame.battle && frame.scene === 's036')
  const confirms = battle.filter(({ box }) => box?.phase.startsWith('waiting'))
  const uniquePages = confirms.filter(
    ({ box }, index) => confirms[index - 1]?.box.text !== box.text,
  )
  const pages = uniquePages.map(({ box, retained }) => [
    box.text,
    box.style,
    portrait(box.portrait),
    retained.map(([slot, id]) => [slot, portrait(id)]),
  ])
  check(
    'actual displayed dialogue and portrait slots',
    pages,
    trio.map((attrs, i) => [source.pages[i], ...attrs]),
  )
  const finalizations = group('finalize')
  const end = finalizations[0]
  check(
    'terminating outcome with no cash or experience',
    finalizations.map((event) =>
      isGame ? [event.outcome, event.resume, event.owner] : [event.outcome, event.rewards],
    ),
    isGame ? [['terminated', 8853, 602]] : [['enemyFled', { exp: 0, cash: 0 }]],
  )
  const sounds = group('sound').filter(({ id }) => id === 45)
  check(
    'the native escape sample starts once',
    sounds.map(({ context, duration }) => [context, duration]),
    [['running', 0.8573541666666666]],
  )
  const sound = sounds[0]
  const notice = battle.find(
    ({ box }) => box?.style === 'narration' && box.text === source.pages[3],
  )
  const rawTravel = battle.filter(
    ({ atMs, fighters }) =>
      atMs >= (sound?.atMs ?? Infinity) - 20 &&
      atMs < (notice?.atMs ?? -Infinity) &&
      fighters.length &&
      fighters[0].x < 100,
  )
  const moved = rawTravel.filter(
    ({ fighters }, i) => rawTravel[i - 1]?.fighters[0].x !== fighters[0].x,
  )
  check(
    'escape stays on the actual single enemy and original foot y',
    moved.length >= 15 &&
      moved.every(
        ({ fighters }) =>
          fighters.length === 1 && fighters[0].y === 110 && fighters[0].firstWidth === 95,
      ),
  )
  check(
    'escape only moves left in source 5 px increments',
    moved.every(({ fighters }, i) => {
      const x = fighters[0].x
      const dx = (moved[i - 1]?.fighters[0].x ?? 100) - x
      return dx > 0 && dx <= 20 && dx % 5 === 0
    }),
  )
  const first = moved[0],
    off = moved.at(-1)
  check(
    'sprite leaves at its source frame width',
    [first?.fighters[0].x, off?.fighters[0].x],
    [95, -95],
  )
  const lastNotice = battle.findLast(
    ({ box }) => box?.style === 'narration' && box.text === source.pages[3],
  )
  check(
    'timed scroll is centered and unretained after the actual escape',
    [notice?.box.style, notice?.box.portrait, notice?.retained, notice?.fighters[0]?.x],
    ['narration', null, [], -95],
  )
  if (first && off && sound && notice && lastNotice && end) {
    check(
      'battle presentation executes in source order',
      uniquePages.at(-1)?.atMs < sound.atMs &&
        sound.atMs < off.atMs &&
        off.atMs < notice.atMs &&
        notice.atMs < end.atMs,
    )
    timing.travel = off.atMs - first.atMs
    timing.offscreenHold = notice.atMs - off.atMs
    timing.narration = end.atMs - notice.atMs
    check('slide lasts about 390 ms', timing.travel >= 340 && timing.travel <= 425)
    check('offscreen hold about 500 ms', timing.offscreenHold >= 480 && timing.offscreenHold <= 580)
    check(
      'scroll stays automatically about 1400 ms',
      timing.narration >= 1360 && timing.narration <= 1490,
    )
  } else check('complete slide, sound, and scroll timestamps', false)
  const target = paints.find(
    ({ scene, box }) =>
      scene === 's037' && box?.phase.startsWith('waiting') && box.text === source.next,
  )
  check(
    'the native on-enter hook actually shows its first two lines',
    [target?.position, target?.party, target?.cash, target?.items, row.returned?.box.text],
    [[76, 10, 0], [startParty[0]], 150, [], source.next],
  )
  const stable = paints.find(
    ({ scene, position, party }) =>
      scene === 's037' && isDeepStrictEqual(position, [76, 10, 0]) && party.length === 1,
  )
  const nextCue =
    stable && paints.find(({ scene, box, atMs }) => scene === 's037' && box && atMs >= stable.atMs)
  if (stable && nextCue && end) {
    timing.entranceToStory = nextCue.atMs - stable.atMs
    timing.terminalToStory = nextCue.atMs - end.atMs
    check(
      'first authored story cue waits through day/night presentation',
      timing.entranceToStory >= 5290 && timing.entranceToStory <= 5650,
    )
  } else check('retained first cue time', false)
  return {
    context: row.context,
    raw: row.raw,
    findings,
    timing,
    facts: { pages, finalPosition: target?.position, worldParty: target?.party },
  }
}

async function loadReport(reportPath, engine, source) {
  const path = resolve(reportPath)
  const report = await readEvidenceArtifact(dirname(path), { path: basename(path) })
  const value = report.value
  assert.deepEqual([value.engine, value.status, value.errors], [engine, 'passed', []])
  assert(['verify', 'capture'].includes(value.profile))
  assert.match(value.revision, /^[a-f0-9]{40}$/u)
  const { definition, hashes } = value.dependencies
  assert.deepEqual(
    [definition.entry, definition.packageName, definition.traceConfig],
    [
      'scripts/e2e/battle-enemy-escape.mjs',
      engine,
      `scripts/e2e/battle-enemy-escape-${engine}.config.mts`,
    ],
  )
  assert.deepEqual(await recordingDependencies(repoRoot, definition), value.dependencies)
  const changed = git('diff', '--name-only', '-z', value.revision, '--').toString().split('\0')
  assert.deepEqual(
    changed.filter((file) => Object.hasOwn(hashes, file)),
    [],
    'recording source drift',
  )
  const fixture = await readEvidenceArtifact(dirname(path), value.save)
  assert.equal(fixture.binding.status, 'verified')
  assertInputLedger(value.actions)
  assert.equal(value.cases.length, value.profile === 'capture' ? 1 : 2)
  assert.equal(new Set(value.cases.map(({ context }) => context)).size, value.cases.length)
  const runs = []
  let next = 0
  for (const row of value.cases) {
    assert.equal(row.actionRange.start, next)
    next = row.actionRange.end
    const native = await readEvidenceArtifact(dirname(path), row.raw)
    assert.equal(native.binding.status, 'verified')
    if (engine === 'game') assert.equal(row.slotReadback, fixture.sha256)
    const actions = value.actions.slice(row.actionRange.start, row.actionRange.end)
    assert(actions.length && actions.every(({ context }) => context === row.context))
    runs.push(checkRun(engine, row, native.value, actions, source))
  }
  assert.equal(next, value.actions.length)
  return {
    engine,
    path,
    sha256: report.sha256,
    revision: value.revision,
    profile: value.profile,
    fixture: value.save,
    runs,
  }
}

const [left, right, output] = process.argv.slice(2)
assert(left && right && output, 'usage: battle-enemy-escape-compare.mjs GAME REFORGE OUTPUT')
const judgeRevision = git('rev-parse', 'HEAD').toString().trim()
const judgeSha256 = sha256(await readFile(resolve(repoRoot, judge)))
assert.equal(judgeSha256, sha256(git('show', `${judgeRevision}:${judge}`)))
const source = await sourceFacts()
const engines = await Promise.all([
  loadReport(left, 'game', source),
  loadReport(right, 'reforge', source),
])
const [game, reforge] = engines
assert.equal(game.profile, reforge.profile)
assert.equal(game.revision, reforge.revision)
const compare = (a, b) => ({
  sameFacts: isDeepStrictEqual(a.facts, b.facts),
  gapsMs: Object.fromEntries(
    Object.entries(a.timing).map(([key, ms]) => [key, Math.abs(ms - b.timing[key])]),
  ),
})
const paired = game.runs.map((a, i) => compare(a, reforge.runs[i]))
const repeated = game.profile === 'verify' ? engines.map(({ runs }) => compare(...runs)) : []
const findings = engines.flatMap(({ engine, runs }) =>
  runs.flatMap(({ context, findings }) =>
    findings.map((finding) => ({ engine, context, ...finding })),
  ),
)
const tolerances = {
  travel: 50,
  offscreenHold: 85,
  narration: 90,
  entranceToStory: 220,
  terminalToStory: 550,
}
const badPair = [...paired, ...repeated].some(
  ({ sameFacts, gapsMs }) =>
    !sameFacts ||
    Object.entries(tolerances).some(
      ([key, max]) => !Number.isFinite(gapsMs[key]) || gapsMs[key] > max,
    ),
)
const result = {
  status: findings.length || badPair ? 'rejected' : 'passed',
  producerRevision: game.revision,
  judgeRevision,
  judgeSha256,
  engines,
  paired,
  repeated,
  findings,
}
await writeEvidenceArtifact(dirname(resolve(output)), basename(output), result)
console.log(JSON.stringify({ status: result.status, paired, repeated, findings }))
if (result.status !== 'passed') process.exitCode = 1
