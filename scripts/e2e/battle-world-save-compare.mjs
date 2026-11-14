import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  assertRestoredWorld,
  assertSavedWorld,
  badSaveToast,
  manualSaveSlots,
  savedPoses,
  saveWorldFacts,
} from './battle-world-save-contract.mjs'
import { repoRoot } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const comparator = 'scripts/e2e/battle-world-save-compare.mjs'
const hash = (data) => createHash('sha256').update(data).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: repoRoot })

const event = (raw, kind) => raw.events.filter((row) => row.kind === kind)

async function inspectRun(row, engine, profile, load, actions, contexts) {
  assert.equal(row.seed, 99)
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
  const evidence = row.postBattleSave
  const initial = await load(evidence.initial)
  assertSavedWorld(initial, savedPoses[0])
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
  for (const [index, receipt] of evidence.saves.entries()) {
    const record = await load(receipt.record)
    const actual = saveWorldFacts(record.payload, engine)
    assert.deepEqual(actual, receipt.world)
    assertSavedWorld(actual, savedPoses[index])
    const [version, storedSlot] =
      engine === 'game'
        ? [record.payload.version, record.payload.gs.currentSaveSlot]
        : [record.payload.version, record.meta.slotId]
    assert.equal(version, engine === 'game' ? 1 : 12)
    assert.equal(storedSlot, receipt.slot)
    if (engine === 'reforge') {
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
  assertSavedWorld(evidence.beforeInGameRestore, savedPoses[1])
  assertSavedWorld(evidence.restoredInGame, savedPoses[0])
  assertRestoredWorld(saved[0].world, evidence.restoredInGame, 3)
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
      assertSavedWorld(rejected.before, savedPoses[1])
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
      assertSavedWorld(fresh.world, savedPoses[index])
      assertRestoredWorld(saved[index].world, fresh.world, 3)
      assert(fresh.restoredAt.ready && fresh.resumedAt.ready && fresh.resumedAt.hidden)
      assert(fresh.resumedAt.clock > fresh.restoredAt.clock)
      assert(fresh.resumedAt.ticks < fresh.restoredAt.ticks)
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
    ...(optional ?? {}),
  }
}

async function readReport(path, engine, profile) {
  const absolute = resolve(path)
  const bytes = await readFile(absolute)
  const report = JSON.parse(bytes)
  assert.equal(git('cat-file', '-t', report.revision).toString().trim(), 'commit')
  assert.deepEqual(
    [report.engine, report.status, report.profile, report.errors],
    [engine, 'passed', profile, []],
  )
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
    Array.from({ length: expectedRuns }, (_, index) => `seed-99-run-${index + 1}`),
  )
  const load = async (reference) => {
    const { value, binding } = await readEvidenceArtifact(dirname(absolute), reference)
    assert.equal(binding.status, 'verified')
    return value
  }
  const predecessor = saveWorldFacts(await load(report.save), engine)
  assert.deepEqual(
    [predecessor.grid, predecessor.money, predecessor.inventory, predecessor.party[0].exp],
    [[93, 45], 0, [], 0],
    'the real checkpoint must precede the victory rewards',
  )
  const runs = []
  let actionIndex = 0
  for (const row of report.cases) {
    assert.equal(row.actionRange.start, actionIndex, 'unbound battle input range')
    assert.equal(row.postBattleSave.actionRange.start, row.actionRange.end)
    runs.push(await inspectRun(row, engine, profile, load, report.actions, report.contexts))
    actionIndex = row.postBattleSave.actionRange.end
  }
  assert.equal(actionIndex, report.actions.length, 'unused native inputs')
  return { engine, path: absolute, sha256: hash(bytes), revision: report.revision, runs }
}

export async function comparePostBattleSave(gamePath, reforgePath, profile = 'verify') {
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
    readReport(gamePath, 'game', profile),
    readReport(reforgePath, 'reforge', profile),
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
    assert.deepEqual(
      project(run),
      project(reforge.runs[index]),
      'cross-engine durable save state differs',
    )
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
    game,
    reforge,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [game, reforge, output, profile] = process.argv.slice(2)
  assert(
    game && reforge && output,
    'usage: node scripts/e2e/battle-world-save-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON [verify|capture]',
  )
  const result = await comparePostBattleSave(game, reforge, profile)
  console.log(await writeEvidenceArtifact(dirname(resolve(output)), basename(output), result))
}
