import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { beePostWin, honeycombText } from './battle-world-bee-scenario.mjs'
import {
  assertPostWinPredecessor,
  assertRestoredWorld,
  assertSavedWorld,
  badSaveToast,
  manualSaveSlots,
  savedPoses,
  saveWorldFacts,
} from './battle-world-save-contract.mjs'
import { inspectBeeRespawn } from './battle-world-save-respawn.mjs'
import { repoRoot } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const comparator = 'scripts/e2e/battle-world-save-compare.mjs'
const hash = (data) => createHash('sha256').update(data).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: repoRoot })

const event = (raw, kind) => raw.events.filter((row) => row.kind === kind)
// Original role 4 plus one legal level at minimum rolls, then seed 6.
const baseBefore = [172, 224, 112, 162, 152]
const baseAfter = [177, 228, 115, 164, 154]
// Weapon 187, helm/body/cloak 202/209/231, accessory 251. battle.c:1184–1212 draws effective stats.
const equipmentBonus = [98, 0, 60, 98, 116]
const fromStatSnapshot = ({ attack, magicAttack, defense, speed, luck }) => [
  attack,
  magicAttack,
  defense,
  speed,
  luck,
]

function readPermanentStats(payload, engine) {
  if (engine === 'reforge') return fromStatSnapshot(payload.world.party[0])
  const { PlayerRolesRuntime: runtime } = payload.gs
  const { role } = beePostWin.before
  return [
    runtime.rgwAttackStrength[role],
    runtime.rgwMagicStrength[role],
    runtime.rgwDefense[role],
    runtime.rgwDexterity[role],
    runtime.rgwFleeRate[role],
  ]
}

function loadRevealBoundary(paints, grid, context) {
  const final = paints.at(-1)
  assert(paints[0]?.peak > 0 && final?.peak > 0, `${context}: missing menu or ready world draw`)
  assert.deepEqual(final.grid, grid)
  assert(!final.frozen && final.opaqueCount === 4000)
  const lastBlack = paints.findLastIndex(
    ({ peak, opaqueCount }) => peak === 0 && opaqueCount === 4000,
  )
  assert(lastBlack > 0, `${context}: confirmed load never drew black`)
  const black = paints[lastBlack]
  const fromBlack = paints.slice(lastBlack + 1)
  const readyIndex = fromBlack.findIndex(({ frozen, mean }) => !frozen && mean >= final.mean * 0.98)
  assert(readyIndex > 0, `${context}: black cut straight to the ready world`)
  const ramp = fromBlack.slice(0, readyIndex)
  assert(
    ramp.every(({ frozen }) => frozen),
    `${context}: released control during the reveal`,
  )
  const distinct = ramp
    .map(({ mean }) => mean)
    .filter((mean, index, values) => index === 0 || mean !== values[index - 1])
  assert(
    distinct.length >= 8 &&
      distinct[0] <= final.mean * 0.15 &&
      distinct.at(-1) >= final.mean * 0.75,
    `${context}: missing the lightening steps of the saved scene`,
  )
  assert(
    distinct.slice(1).every((mean, index) => mean > distinct[index]),
    `${context}: the saved scene flickered during the reveal`,
  )
  for (const frame of ramp) assert.deepEqual(frame.grid, grid, `${context}: moved during reveal`)
  const ready = fromBlack[readyIndex]
  const revealMs = ready.atMs - black.atMs
  assert(revealMs >= 500 && revealMs <= 730, `${context}: reveal ${revealMs} ms`)
  return { blackAtMs: black.atMs, readyAtMs: ready.atMs, revealMs, shades: distinct.length }
}

function rewardScrollBoundary(engine, story) {
  let first
  let clear
  let second
  if (engine === 'game') {
    const frames = story.native.frames
    const notices = frames.filter(({ dialog }) => dialog?.text === honeycombText)
    assert.deepEqual(
      notices.map(({ renderer, loot }) => [renderer, loot]),
      [
        ['battle', 1],
        ['battle', 2],
      ],
    )
    first = notices[0]
    second = notices[1]
    clear = frames.find(({ draw }) => draw === second.draw - 1)
    assert(clear && clear.order > first.order, 'Game must draw a separate reward-clear frame')
    assert.deepEqual([clear.renderer, clear.loot, clear.dialog], ['battle', 2, null])
  } else {
    const notices = event(story, 'notice')
    assert.deepEqual(
      notices.map(({ slot, surface, loot, text }) => [slot, surface, loot, text]),
      [0, 1].map((slot) => [slot, 'battle', slot + 1, honeycombText]),
    )
    first = notices[0]
    second = notices[1]
    assert.notEqual(first.id, second.id)
    const frames = event(story, 'reward-frame')
    const between = frames.filter(({ order }) => order > first.order && order < second.order)
    clear = between.find(({ changed }) => changed === 0)
    assert(clear, 'Reforge must paint the unoccluded battle between identical reward scrolls')
    assert(between[0].changed > 0)
    assert(
      between.every(({ order, changed }) => (order < clear.order ? changed > 0 : changed === 0)),
    )
    assert(frames.find(({ order }) => order > second.order)?.changed > 0)
  }
  const blankMs = second.atMs - clear.atMs
  assert(
    blankMs >= 24 && blankMs <= 90,
    'identical rewards must be separated by about one battle beat',
  )
  const firstVisibleMs = clear.atMs - first.atMs
  assert(
    firstVisibleMs >= 1320 && firstVisibleMs <= 1500,
    'the first scroll keeps its full display time',
  )
  return {
    firstDraw: first.order,
    clearDraw: clear.order,
    secondDraw: second.order,
    firstAtMs: first.atMs,
    clearAtMs: clear.atMs,
    secondAtMs: second.atMs,
    firstVisibleMs,
    blankMs,
  }
}

export function inspectWinProgression(story, engine) {
  const game = engine === 'game'
  const frames = game ? story.native.frames : event(story, 'settlement')
  const observed = frames
    .map((row) => (game ? row.battle?.settlement?.screen : row.screen))
    .filter(Boolean)
  const screens = observed.filter(({ kind }, index) => kind !== observed[index - 1]?.kind)
  assert.deepEqual(
    screens.map(({ kind }) => kind),
    ['exp-cash', 'level-up', 'learn-magic'],
  )
  const [reward, growth, magic] = screens
  const { before, after, growthRolls, skill } = beePostWin
  assert.deepEqual(game ? [reward.expGained, reward.cashGained] : [reward.exp, reward.cash], [4, 4])
  assert.equal(before.exp + 4 - beePostWin.threshold, after.exp)
  const observedGrowth = game
    ? [
        [
          growth.data.level.old,
          growth.data.hp.old,
          growth.data.hp.oldMax,
          growth.data.mp.old,
          growth.data.mp.oldMax,
        ],
        [
          growth.data.level.cur,
          growth.data.hp.cur,
          growth.data.hp.curMax,
          growth.data.mp.cur,
          growth.data.mp.curMax,
        ],
      ]
    : [growth.report.before, growth.report.after].map(({ level, hp, maxHP, mp, maxMP }) => [
        level,
        hp,
        maxHP,
        mp,
        maxMP,
      ])
  assert.deepEqual(
    observedGrowth,
    [before, after].map(({ level, hp, maxHP, mp, maxMP }) => [level, hp, maxHP, mp, maxMP]),
  )
  const effective = game
    ? ['old', 'cur'].map((time) =>
        ['attack', 'magic', 'defense', 'dexterity', 'flee'].map(
          (field) => growth.data[field][time],
        ),
      )
    : [growth.report.before, growth.report.after].map(fromStatSnapshot)
  assert.deepEqual(
    effective,
    [baseBefore, baseAfter].map((stats) => stats.map((value, i) => value + equipmentBonus[i])),
    'native level-up screen must show the equipped stats before and after growth',
  )
  assert.equal(game ? magic.data.magicName : magic.magicName, skill.label)
  if (game) assert.equal(String(magic.data.magicId), skill.id)
  else assert.deepEqual(growth.report.learned, [skill.id])
  const bounds = [7, 5, 1, 1, 1, 1]
  const rng = game ? story.native.rng : event(story, 'draw')
  assert.equal(rng.length, 14)
  const roll = rng.slice(6, 12).map((draw, index) => {
    if (game) {
      assert.deepEqual([draw.kind, draw.args], ['rangeInclusive', [0, bounds[index]]])
      return draw.value
    }
    assert.equal(draw.source, 'growth')
    return Math.floor(draw.sample * (bounds[index] + 1))
  })
  assert.deepEqual(roll, growthRolls)
  const drops = rng.slice(12).map((draw) => {
    if (game) {
      assert.deepEqual([draw.kind, draw.args], ['rangeInclusive', [1, 100]])
      return draw.value
    }
    assert.equal(draw.source, 'drop')
    return Math.floor(draw.sample * 100) + 1
  })
  assert.deepEqual(drops, beePostWin.rolls)
  const hide = game
    ? frames.find(({ npc }) => npc?.state === -1)?.npc.vanishTime
    : event(story, 'hidden')[0]?.state.remainingTicks
  assert.equal(hide, 800, 'actual victory must start the native 800-tick hide')
  return { screens, effective, roll, drops, hide }
}

async function inspectRun(row, engine, profile, load, loadScreen, actions, contexts, postWin) {
  assert.equal(row.seed, postWin ? beePostWin.seed : 99)
  const story = await load(row.raw)
  assert.equal(story.overflow, false)
  assert.deepEqual(story.errors, [])
  const rawBattle = engine === 'game' ? story.native : story
  const contact =
    engine === 'game'
      ? rawBattle.handoff.filter((item) => item.stage === 'contact')
      : event(rawBattle, 'contact')
  assert.equal(contact.length, 1)
  assert.deepEqual(row.grants, [1, 1])
  const rewardScroll = rewardScrollBoundary(engine, story)
  const progression = postWin ? inspectWinProgression(story, engine) : undefined
  const evidence = row.postBattleSave
  const initial = await load(evidence.initial)
  assertSavedWorld(initial, savedPoses[0], postWin)
  const traces = await load(evidence.raw)
  assert.equal(traces.overflow, false)
  assert.deepEqual(traces.errors, [])
  const scope = actions.slice(evidence.actionRange.start, evidence.actionRange.end)
  assert(evidence.actionRange.start >= row.actionRange.end)
  assert.equal(evidence.actionRange.end - evidence.actionRange.start, scope.length)
  assert(
    scope.length > 0 &&
      scope.every(
        ({ scope, context }) =>
          scope === 'boundary' &&
          (context === row.label || context.startsWith(`${row.label}/restart-slot-`)),
      ),
  )
  const fromOrigin = scope.filter(({ context }) => context === row.label)
  assert.deepEqual(
    fromOrigin
      .filter(({ reason }) =>
        ['commit manual save in selected slot', 'restore slot 1 from altered active pose'].includes(
          reason,
        ),
      )
      .map(({ key, phase }) => [key, phase]),
    [
      ['Enter', 'post-battle-save'],
      ['Enter', 'post-battle-save'],
      ['Enter', 'post-battle-load'],
    ],
  )
  assert.deepEqual(
    fromOrigin
      .filter(({ phase }) => phase === 'post-battle-move')
      .map(({ kind, key }) => [kind, key]),
    [
      ['down', 'ArrowLeft'],
      ['up', 'ArrowLeft'],
    ],
  )
  const slots = manualSaveSlots[engine]
  assert.deepEqual(
    evidence.saves.map(({ slot }) => slot),
    slots.slice(0, 2),
  )
  const saved = []
  const gameRepeat = []
  const repeatFacts = (entries) =>
    entries.map(([role, { type, target, targetSide }]) => [role, type, target, targetSide])
  for (const [index, receipt] of evidence.saves.entries()) {
    const record = await load(receipt.record)
    const actual = saveWorldFacts(record.payload, engine, postWin)
    if (postWin)
      assert.deepEqual(
        readPermanentStats(record.payload, engine),
        baseAfter,
        'native saves persist only the base stat growth',
      )
    assert.deepEqual(actual, receipt.world)
    assertSavedWorld(actual, savedPoses[index], postWin)
    const [version, storedSlot] =
      engine === 'game'
        ? [record.payload.version, record.payload.gs.currentSaveSlot]
        : [record.payload.version, record.meta.slotId]
    assert.equal(version, engine === 'game' ? 1 : 12)
    assert.equal(storedSlot, receipt.slot)
    if (engine === 'game') {
      const repeats = record.payload.gs.prevBattleActions
      assert.equal(repeats.__gameNativeSave, 'Map', 'fresh copy must preserve native Map identity')
      const recent = repeatFacts(repeats.entries)
      assert.deepEqual(recent, [[4, 'attack', -1, 'enemy']])
      gameRepeat.push(recent)
    } else {
      assert.equal(record.payload.projectId, 'pal')
      assert.equal(record.thumb.type, 'image/png')
      assert.deepEqual(record.thumb.bytes.slice(0, 8), [137, 80, 78, 71, 13, 10, 26, 10])
    }
    assert(Number.isSafeInteger(record.meta.savedTimes))
    if (index === 1) assert.equal(record.meta.savedTimes, saved[0].savedTimes + 1)
    assert(actual.lifecycle.ticks <= initial.lifecycle.ticks)
    saved.push({ ...receipt, version, savedTimes: record.meta.savedTimes })
  }
  const writes = event(traces, 'write-committed')
  assert.deepEqual(
    writes.map(({ slot }) => slot),
    slots.slice(0, 2),
  )
  const restored = event(traces, 'restore-committed')
  assert.deepEqual(
    restored.map(({ slot }) => slot),
    [slots[0]],
  )
  assert(writes.at(-1).order < restored[0].order)
  assertSavedWorld(evidence.beforeInGameRestore, savedPoses[1], postWin)
  assertSavedWorld(evidence.restoredInGame, savedPoses[0], postWin)
  assertRestoredWorld(saved[0].world, evidence.restoredInGame, 3)
  const loadReveal = [
    loadRevealBoundary(evidence.loadPaint, savedPoses[0].grid, `${engine} world menu`),
  ]
  let optional
  if (profile === 'verify') {
    const receipt = evidence.invalid
    const isGame = engine === 'game'
    const attempts = fromOrigin
      .filter(({ reason }) =>
        ['attempt empty manual slot', 'attempt malformed manual slot'].includes(reason),
      )
      .map(({ reason, key, phase }) => [reason, key, phase])
    assert.deepEqual(
      attempts,
      [...(isGame ? ['attempt empty manual slot'] : []), 'attempt malformed manual slot'].map(
        (reason) => [reason, 'Enter', 'post-battle-load-invalid'],
      ),
    )
    const [fault, unexpected] = event(traces, 'toast-drawn')
    assert(fault && !unexpected)
    assert(writes.at(-1).order < fault.order && fault.order < restored[0].order)
    const empty = event(traces, 'empty-slot')
    assert.equal(empty.length, isGame ? 1 : 0)
    if (isGame) {
      assert.match(receipt.portableError, /dwCash/u)
      assert.deepEqual([receipt.empty.slot, empty[0].slot], [slots[2], slots[2]])
      assert.deepEqual(receipt.empty.event, empty[0])
      assert(writes.at(-1).order < empty[0].order && empty[0].order < fault.order)
    }
    const malformed = receipt.malformed
    assert.deepEqual(malformed.event, fault)
    assert.deepEqual(
      [malformed.slot, malformed.field, malformed.value, fault.text],
      [slots[1], isGame ? 'gs.dwCash' : 'world.money', 'corrupt-cash', badSaveToast],
    )
    const original = await load(saved[1].record)
    const corrupt = await load(malformed.input)
    if (isGame) original.payload.gs.dwCash = malformed.value
    else original.payload.world.money = malformed.value
    assert.deepEqual(corrupt, original, 'the corrupt slot should differ only in its cash value')
    for (const rejected of [malformed, ...(isGame ? [receipt.empty] : [])]) {
      assertSavedWorld(rejected.before, savedPoses[1], postWin)
      assert.deepEqual(rejected.after, rejected.before)
      assert.equal(rejected.menu.mode, 'load')
    }
    assert.deepEqual(
      evidence.fresh.map(({ slot }) => slot),
      slots.slice(0, 2),
    )
    optional = { invalid: receipt, fresh: [] }
    for (const [index, fresh] of evidence.fresh.entries()) {
      const context = `${row.label}/restart-slot-${index + 1}`
      const original = contexts.find(({ label }) => label === context)
      assert.deepEqual(original?.initialDatabases, [])
      const freshKeys = scope.filter(({ context: label }) => label === context)
      assert(
        freshKeys.some(
          ({ reason, key }) => reason === 'load selected slot from title' && key === 'Enter',
        ),
      )
      assert.deepEqual(
        fresh.transferred,
        saved.map(({ slot, record: { sha256, byteLength } }) => ({ slot, sha256, byteLength })),
      )
      const freshTrace = await load(fresh.trace)
      assert.equal(freshTrace.overflow, false)
      assert.deepEqual(freshTrace.errors, [])
      assert.equal(freshTrace.events.length, 1)
      assert.deepEqual(freshTrace.events[0], fresh.event)
      assert.deepEqual([fresh.event.kind, fresh.event.slot], ['restore-committed', fresh.slot])
      assertSavedWorld(fresh.world, savedPoses[index], postWin)
      assertRestoredWorld(saved[index].world, fresh.world, 3)
      assert(fresh.restoredAt.ready && fresh.resumedAt.ready && fresh.resumedAt.hidden)
      assert(fresh.resumedAt.clock > fresh.restoredAt.clock)
      assert(fresh.resumedAt.ticks < fresh.restoredAt.ticks)
      if (isGame) assert.deepEqual(repeatFacts(fresh.restoredAt.repeat), gameRepeat[index])
      loadReveal.push(
        loadRevealBoundary(
          fresh.loadPaint,
          savedPoses[index].grid,
          `${engine} title slot ${index + 1}`,
        ),
      )
      if (postWin && index === 0) {
        const respawn = fresh.respawn
        assert(respawn, 'missing the restored native enemy lifecycle')
        const raw = await load(respawn.raw)
        const checked = inspectBeeRespawn(raw, saved[index].world.lifecycle.ticks)
        assert.deepEqual(checked, respawn.summary)
        await loadScreen(respawn.screen, `${row.label}-learned-magic.png`)
        const walk = freshKeys.filter(({ phase }) => phase === 'post-battle-respawn')
        assert.deepEqual(
          walk.map(({ kind, key }) => [kind, key]),
          ['ArrowUp', 'ArrowUp', 'ArrowDown'].flatMap((key) => [
            ['down', key],
            ['up', key],
          ]),
        )
        assert(walk[0].atMs > raw.timeOrigin + checked.expired.atMs)
        assert.deepEqual(
          freshKeys
            .filter(({ phase }) => phase === 'post-battle-learned-spell')
            .map(({ key }) => key),
          ['ArrowLeft', 'Enter'],
        )
      }
      optional.fresh.push(fresh)
    }
  } else {
    assert.equal(evidence.invalid, undefined)
    assert.equal(evidence.fresh, undefined)
  }
  return {
    label: row.label,
    initial,
    saved,
    restored: evidence.restoredInGame,
    raw: evidence.raw,
    nativeBattle: row.raw,
    rewardScroll,
    loadReveal,
    ...(progression && { progression }),
    ...(optional ?? {}),
  }
}

async function readReport(path, engine, profile, postWin) {
  const absolute = resolve(path)
  const bytes = await readFile(absolute)
  const report = JSON.parse(bytes)
  assert.equal(git('cat-file', '-t', report.revision).toString().trim(), 'commit')
  assert.deepEqual(
    [report.engine, report.status, report.profile, report.errors],
    [engine, 'passed', profile, []],
  )
  assert.equal(report.input.postWin === true, postWin)
  const { definition } = report.dependencies
  assert.deepEqual(
    [definition.entry, definition.traceConfig, definition.packageName],
    [
      `scripts/e2e/battle-world-bee-${engine}.mjs`,
      `scripts/e2e/battle-world-save-${engine}.config.mts`,
      engine,
    ],
  )
  assert.deepEqual(await recordingDependencies(repoRoot, definition), report.dependencies)
  assert.deepEqual(report.hashes, report.dependencies.hashes)
  assert(Object.hasOwn(report.hashes, 'scripts/e2e/battle-world-save.mjs'))
  const changed = git('diff', '--name-only', '-z', report.revision, '--').toString().split('\0')
  assert.deepEqual(
    changed.filter((file) => Object.hasOwn(report.hashes, file)),
    [],
    'save proof source drift',
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  const expectedRuns = profile === 'verify' ? 2 : 1
  assert.deepEqual(
    report.cases.map(({ label }) => label),
    Array.from(
      { length: expectedRuns },
      (_, index) => `seed-${postWin ? beePostWin.seed : 99}-run-${index + 1}`,
    ),
  )
  const load = async (reference) => {
    const { value, binding } = await readEvidenceArtifact(dirname(absolute), reference)
    assert.equal(binding.status, 'verified')
    return value
  }
  const loadScreen = async (reference, expectedPath) => {
    assert.equal(reference.path, expectedPath)
    const png = await readFile(resolve(dirname(absolute), expectedPath))
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    assert.equal(reference.byteLength, png.byteLength)
    assert.equal(reference.sha256, hash(png))
  }
  const initial = await load(report.save)
  const predecessor = saveWorldFacts(initial, engine, postWin)
  assert.deepEqual(
    [predecessor.grid, predecessor.money, predecessor.inventory, predecessor.party[0].exp],
    [[93, 45], 0, [], postWin ? beePostWin.before.exp : 0],
    'the real checkpoint must precede the victory rewards',
  )
  if (postWin) {
    assertPostWinPredecessor(predecessor)
    assert.deepEqual(readPermanentStats(initial, engine), baseBefore)
  }
  const runs = []
  let actionIndex = 0
  for (const row of report.cases) {
    assert.equal(row.actionRange.start, actionIndex, 'unbound battle input range')
    assert.equal(row.postBattleSave.actionRange.start, row.actionRange.end)
    runs.push(
      await inspectRun(
        row,
        engine,
        profile,
        load,
        loadScreen,
        report.actions,
        report.contexts,
        postWin,
      ),
    )
    actionIndex = row.postBattleSave.actionRange.end
  }
  assert.equal(actionIndex, report.actions.length, 'unused native inputs')
  return { engine, path: absolute, sha256: hash(bytes), revision: report.revision, runs }
}

export async function comparePostBattleSave(
  gamePath,
  reforgePath,
  profile = 'verify',
  postWin = false,
) {
  assert(['verify', 'capture'].includes(profile))
  assert.notEqual(
    resolve(gamePath),
    resolve(reforgePath),
    'a second engine must have its own recording',
  )
  const judgeRevision = git('rev-parse', 'HEAD').toString().trim()
  const judgeSha256 = hash(await readFile(resolve(repoRoot, comparator)))
  assert.equal(
    judgeSha256,
    hash(git('show', `${judgeRevision}:${comparator}`)),
    'freeze comparator before review',
  )
  const contract = 'scripts/e2e/battle-world-save-contract.mjs'
  const contractSha256 = hash(await readFile(resolve(repoRoot, contract)))
  assert.equal(contractSha256, hash(git('show', `${judgeRevision}:${contract}`)))
  const [game, reforge] = await Promise.all([
    readReport(gamePath, 'game', profile, postWin),
    readReport(reforgePath, 'reforge', profile, postWin),
  ])
  assert.equal(game.revision, reforge.revision, 'use the same frozen candidate on both engines')
  const durable = ({ lifecycle: _lifecycle, ...world }) => world
  const project = ({ initial, saved, restored, fresh }) => [
    durable(initial),
    saved.map(({ world }) => durable(world)),
    durable(restored),
    ...(fresh ? [fresh.map(({ world }) => durable(world))] : []),
  ]
  for (const [index, run] of game.runs.entries()) {
    const other = reforge.runs[index]
    assert.deepEqual(project(run), project(other), 'cross-engine durable save state differs')
    if (postWin && profile === 'verify') {
      const path = ({
        fresh: [
          {
            respawn: { summary },
          },
        ],
      }) => {
        const { inView, revived, contact, spell } = summary
        return {
          inside: [inView.grid, inView.foot],
          outside: [revived.grid, revived.foot],
          contact: contact.grid,
          spell: [spell.id, spell.label, spell.mp, spell.enabled],
        }
      }
      assert.deepEqual(path(run), path(other), 'same respawn and spell path on both engines')
    }
    assert.equal(run.loadReveal.length, other.loadReveal.length)
    for (const [i, { revealMs }] of run.loadReveal.entries()) {
      const { revealMs: reforgeMs } = other.loadReveal[i]
      assert(
        Math.abs(revealMs - reforgeMs) <= 100,
        `cross-engine load fade ${revealMs} vs ${reforgeMs} ms`,
      )
    }
  }
  for (const side of [game, reforge]) {
    if (side.runs.length === 2) assert.deepEqual(project(side.runs[0]), project(side.runs[1]))
  }
  return {
    schemaVersion: 1,
    status: 'passed',
    producerRevision: game.revision,
    judgeRevision,
    judgeSha256,
    contractSha256,
    profile,
    ...(postWin && { postWin }),
    game,
    reforge,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [game, reforge, output, profile, scenario] = process.argv.slice(2)
  assert(
    game && reforge && output,
    'usage: node scripts/e2e/battle-world-save-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON [verify|capture] [--post-win-save]',
  )
  assert(scenario === undefined || scenario === '--post-win-save')
  const result = await comparePostBattleSave(game, reforge, profile, scenario === '--post-win-save')
  console.log(await writeEvidenceArtifact(dirname(resolve(output)), basename(output), result))
}
