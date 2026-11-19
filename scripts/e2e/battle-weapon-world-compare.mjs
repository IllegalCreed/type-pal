import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import {
  gearStates,
  makeWorldWhipFixtures,
  plan,
  worldCase,
  worldWhipSources,
} from './battle-weapon-world-scenarios.mjs'
import { repoRoot } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { assertDependencyClosure, recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const producer = 'scripts/e2e/battle-weapon-world.mjs'
const config = 'scripts/e2e/battle-weapon-world.config.mts'
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
const stock = (weapon) =>
  ['163', '164', '165', '166'].filter((item) => item !== weapon).map((item) => [item, 1])
function expected(weapon) {
  const [attack, speed, attackAll, sprite] = gearStates[weapon]
  return {
    scene: worldCase.scene,
    grid: worldCase.grid,
    facing: worldCase.facing,
    music: worldCase.music,
    stock: stock(weapon),
    role: {
      name: 2,
      body: worldCase.body,
      weapon,
      attack,
      speed,
      defense: 38,
      attackAll,
      sprite,
      hp: 220,
      mp: 80,
    },
  }
}
function observed({ scene, grid, facing, music, stock, role }) {
  assert(
    stock.every((entry) => Number.isSafeInteger(entry[1]) && entry[1] >= 0),
    'invalid native count',
  )
  assert.equal(
    new Set(stock.map(([item]) => item)).size,
    stock.length,
    'duplicate native inventory slot',
  )
  return {
    scene,
    grid,
    facing,
    music,
    stock: stock.filter(([, count]) => count > 0).toSorted(([a], [b]) => a.localeCompare(b)),
    role,
  }
}

const drawnQuantity = (engine) => ({
  count: 1,
  x: engine === 'game' ? 51 : 62,
  y: engine === 'game' ? 57 : 52,
  color: 'cyan',
  alignment: 'right',
})

function audit(engine, row, trace, actions, intended) {
  const findings = []
  const check = (step, rule, actual, value) => {
    if (!same(actual, value)) findings.push({ step, rule, actual, expected: value })
  }
  assert.deepEqual(trace.errors, [])
  assert.equal(trace.overflow, false)
  check('start', 'same-normal-room-and-geared-control', observed(row.initial), expected('166'))
  check('start', 'normal-control-after-load', [row.initial.ready, row.initial.menu], [true, null])
  assert.deepEqual(
    row.steps.map(({ id, kind, item }) => ({ id, kind, item })),
    intended,
  )
  const actual = []
  let weapon = worldCase.initialWeapon
  let previousNativeOrder = -1
  const nativeOwners =
    engine === 'game'
      ? [worldCase.entityId, 'Game:OP_REMOVE_EQUIPMENT']
      : [worldCase.entity, 'Reforge:unequipRole']
  for (const step of row.steps) {
    const {
      id,
      kind,
      item,
      before,
      after,
      inputs: [start, end],
    } = step
    const input = actions.slice(start, end)
    assert(
      input.length &&
        input.every(
          ({ phase, step, context }) =>
            phase === 'world-equip' && step === id && context === row.runId,
        ),
    )
    check(id, 'preconditions', observed(before), expected(weapon))
    if (kind === 'equip') {
      assert.equal(input.at(-1).key, 'Enter', 'expected physical role confirm')
      assert.equal(input.at(-2).key, 'Enter', 'expected physical item confirm')
      const selection = { ...before, ...step.selected }
      check(id, 'item-selection-has-no-effect', observed(selection), expected(weapon))
      const { source, selected, weapon: displayedWeapon, role } = step.preview
      assert(
        trace.paints.some((paint) => same(paint, step.preview)),
        'missing actual equip canvas draw',
      )
      assert(step.preview.order > previousNativeOrder, `${id} reused an earlier role-picker draw`)
      previousNativeOrder = step.preview.order
      check(
        id,
        'drawn-role-and-proposal',
        [role, selected, displayedWeapon, source],
        [2, item, weapon, `${engine === 'game' ? 'Game' : 'Reforge'}:drawEquipPickRole`],
      )
      check(id, 'drawn-single-copy-equipment-count', step.preview.quantity, drawnQuantity(engine))
      const { kind: menuKind, phase: menuPhase, selected: nextItem } = after.menu ?? {}
      // PAL's wLastUnequippedItem=0 closes the role picker after filling an empty slot.
      const activeItem =
        engine === 'game' && menuPhase === 'list' && nextItem === '0' ? null : nextItem
      check(
        id,
        'swapped-item-remains-selectable',
        [menuKind, menuPhase, activeItem],
        weapon ? ['equip', 'pick-role', weapon] : ['equip', 'list', null],
      )
      weapon = item
    } else {
      assert.equal(input.at(-1).key, 'Enter', 'expected physical room interaction')
      assert(
        input.slice(0, -1).some(({ key }) => key === 'Escape'),
        'room interaction did not leave equipment',
      )
      assert(
        trace.removals.some((record) => same(record, step.inputWitness)),
        'missing actual script execution',
      )
      const { role, slot, owner, source, order } = step.inputWitness
      assert(order > previousNativeOrder, `${id} reused an earlier unequip call`)
      previousNativeOrder = order
      check(
        id,
        'original-role-weapon-slot-executed',
        [role, slot, owner, source],
        [2, worldCase.weaponSlot, ...nativeOwners],
      )
      check(id, 'ordinary-field-input-restored', [after.ready, after.menu], [true, null])
      weapon = ''
    }
    const state = observed(after)
    check(id, 'equipment-inventory-and-battle-projection', state, expected(weapon))
    actual.push({ id, state })
  }
  check(
    'end',
    'all-native-role-pickers-have-single-copy-count',
    trace.paints.filter(({ quantity }) => !same(quantity, drawnQuantity(engine))),
    [],
  )
  check(
    'end',
    'complete-removal-count',
    trace.removals.length,
    intended.filter(({ kind }) => kind === 'remove').length,
  )
  check('end', 'last-live-state', observed(row.final), expected(weapon))
  return { actual, findings }
}

async function readSide(path, engine, profile) {
  const absolute = resolve(path)
  const directory = dirname(absolute)
  const { value: report, sha256 } = await readEvidenceArtifact(directory, {
    path: basename(absolute),
  })
  const counter = profile === 'counter'
  assert.deepEqual(
    [report.engine, report.profile, report.counter, report.repeats, report.status],
    [
      engine,
      profile === 'capture' ? 'capture' : 'verify',
      counter ? 'body-slot' : 'none',
      profile === 'verify' ? 2 : 1,
      'passed',
    ],
  )
  assert.match(report.revision, /^[0-9a-f]{40}$/u)
  assert.deepEqual(report.errors, [])
  const { definition } = report.dependencies
  assert.deepEqual(
    [definition.entry, definition.packageName, definition.traceConfig],
    [producer, engine, config],
  )
  for (const source of await worldWhipSources())
    assert(definition.declared.includes(source), `missing source ${source}`)
  const closure = await recordingDependencies(repoRoot, definition)
  assertDependencyClosure(report.dependencies, closure)
  assert.deepEqual(report.hashes, closure.hashes, 'recording source bytes changed')
  assert.deepEqual(
    git('diff', '--name-only', '-z', report.revision, '--')
      .split('\0')
      .filter((path) => Object.hasOwn(closure.hashes, path)),
    [],
    'producer revision differs from loaded source',
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  const ids = Array.from({ length: report.repeats }, (_, i) => `world-equip-${i + 1}`)
  assert.deepEqual(
    report.contexts,
    (engine === 'game' ? ['fixture', ...ids] : ids).map((label) => ({
      label,
      initialDatabases: [],
    })),
  )
  assert.deepEqual(
    report.cases.map(({ runId }) => runId),
    ids,
  )
  const intended = counter ? plan.slice(0, 6) : plan
  const { fixtureCommand, save } = await makeWorldWhipFixtures(counter ? 2 : worldCase.weaponSlot)
  const { value: fixture, binding } = await readEvidenceArtifact(directory, report.fixture)
  assert.equal(binding.status, 'verified')
  assert.deepEqual(fixture.event, fixtureCommand)
  assert.deepEqual(fixture.plan, intended)
  if (engine === 'reforge') assert.deepEqual(fixture.checkpoint, save)
  else {
    const initial = fixture.checkpoint.gs
    assert.deepEqual(
      [initial.wNumScene, initial.partyMembers, initial.party],
      [worldCase.gameScene, [2], { ...worldCase.screen, facing: worldCase.facing }],
    )
    assert.deepEqual(
      initial.PlayerRolesRuntime.rgwEquipment.map((row) => row[2]),
      [0, 0, 210, 166, 0, 0],
    )
  }
  const runs = await Promise.all(
    report.cases.map(async (row) => {
      const { value: trace, binding } = await readEvidenceArtifact(directory, row.trace)
      assert.equal(binding.status, 'verified')
      assert.deepEqual(row.resourceErrors, [])
      if (profile === 'capture') {
        assert(
          trace.paints.some((paint) => same(paint, row.finalPreview)),
          'missing final empty-weapon draw',
        )
        assert.deepEqual(
          [row.finalPreview.role, row.finalPreview.selected, row.finalPreview.weapon],
          [2, '165', ''],
        )
        const cleared = row.steps.at(-1)
        const [first, last] = row.finalPreviewInputs
        assert.equal(first, cleared.inputs[1], 'final preview inputs must follow the last unequip')
        assert.equal(last, report.actions.length, 'unexpected input after the final preview')
        const keys = report.actions.slice(first, last)
        assert(keys.length > 0 && keys.at(-1).key === 'Enter')
        assert(
          keys.every(({ step, context }) => step === 'show-empty-weapon' && context === row.runId),
        )
        assert(
          row.finalPreview.order > cleared.inputWitness.order &&
            row.finalPreview.atMs > cleared.inputWitness.atMs,
          'final preview reused a draw before the last unequip',
        )
      }
      return {
        runId: row.runId,
        trace: row.trace,
        ...audit(engine, row, trace, report.actions, intended),
      }
    }),
  )
  return { engine, revision: report.revision, report: absolute, sha256, runs }
}

const [gamePath, reforgePath, output, profile = 'verify'] = process.argv.slice(2)
assert(
  gamePath && reforgePath && output && ['verify', 'capture', 'counter'].includes(profile),
  'usage: node scripts/e2e/battle-weapon-world-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON [capture|counter]',
)
const judgeRevision = git('rev-parse', 'HEAD').trim()
const judge = 'scripts/e2e/battle-weapon-world-compare.mjs'
assert.equal(
  await readFile(resolve(repoRoot, judge), 'utf8'),
  git('show', `${judgeRevision}:${judge}`),
)
const [game, reforge] = await Promise.all([
  readSide(gamePath, 'game', profile),
  readSide(reforgePath, 'reforge', profile),
])
assert.equal(game.revision, reforge.revision)
const findings = [game, reforge].flatMap(({ engine, runs }) =>
  runs.flatMap(({ runId, findings }) => findings.map((finding) => ({ engine, runId, ...finding }))),
)
const paired = game.runs.map((run, i) => ({
  runId: run.runId,
  matched: same(run.actual, reforge.runs[i].actual),
}))
const repeats =
  profile !== 'verify'
    ? []
    : [game, reforge].map(({ engine, runs }) => ({
        engine,
        matched: same(runs[0].actual, runs[1].actual),
      }))
if (![...paired, ...repeats].every(({ matched }) => matched))
  findings.push({ rule: 'same-equipment-sequence-outputs' })
const status = findings.length ? 'rejected' : 'passed'
const receipt = await writeEvidenceArtifact(dirname(resolve(output)), basename(output), {
  schemaVersion: 1,
  status,
  profile,
  judgeRevision,
  producerRevision: game.revision,
  engines: [game, reforge],
  paired,
  repeats,
  findings,
})
console.log(JSON.stringify({ ...receipt, status, findings: findings.length }))
if (status === 'rejected') process.exitCode = 1
