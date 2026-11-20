import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { isDeepStrictEqual as same } from 'node:util'
import {
  auditEquipmentRun,
  authoredBeadSemantics,
  equipmentAppearanceFindings,
} from './battle-weapon-world-rules.mjs'
import {
  equipmentCatalogue,
  equipmentScenario,
  loadEquipmentInputs,
  makeEquipmentFixture,
  room,
  worldEquipmentSources,
} from './battle-weapon-world-scenarios.mjs'
import { repoRoot } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { assertDependencyClosure, recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const producer = 'scripts/e2e/battle-weapon-world.mjs'
const config = 'scripts/e2e/battle-weapon-world.config.mts'
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })

function validateGameCheckpoint(checkpoint, scenario) {
  const { gs } = checkpoint
  assert.deepEqual(
    [gs.wNumScene, gs.partyMembers, gs.party, gs.wNumMusic],
    [room.gameScene, scenario.party, { ...room.screen, facing: room.facing }, room.music],
  )
  assert.deepEqual(
    scenario.party.map((role) => gs.PlayerRolesRuntime.rgwEquipment.map((row) => row[role])),
    scenario.starting.map((gear) => gear.map(Number)),
  )
  assert.deepEqual(
    gs.inventory,
    scenario.stock.map((itemId) => ({ itemId: Number(itemId), count: 1, inUse: 0 })),
  )
}

async function readSide(path, engine, profile, inputs, catalogue, sources, scenario, fixtureData) {
  const absolute = resolve(path)
  const directory = dirname(absolute)
  const { value: report, sha256 } = await readEvidenceArtifact(directory, {
    path: basename(absolute),
  })
  assert.equal(report.scenario, scenario.id)
  assert.deepEqual(
    [report.engine, report.profile, report.counter, report.repeats, report.status],
    [
      engine,
      profile === 'capture' ? 'capture' : 'verify',
      scenario.wrongSlot ? 'body-slot' : 'none',
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
  for (const source of sources)
    assert(definition.declared.includes(source), `missing source ${source}`)
  const closure = await recordingDependencies(repoRoot, definition)
  assertDependencyClosure(report.dependencies, closure)
  assert.deepEqual(report.hashes, closure.hashes, 'recording source bytes changed')
  const changedSources = git('diff', '--name-only', '-z', report.revision, '--')
    .split('\0')
    .filter((file) => Object.hasOwn(closure.hashes, file))
  let itemDraft
  if (changedSources.length) {
    const path = 'projects/pal/content/items.json'
    assert.deepEqual(changedSources, [path], 'producer revision differs from loaded source')
    const { sha256, value: loaded } = await readEvidenceArtifact(repoRoot, {
      path,
      sha256: closure.hashes[path],
    })
    assert.deepEqual(loaded, inputs.palItems)
    const committed = JSON.parse(git('show', `${report.revision}:${path}`))
    assert.deepEqual(
      loaded.map(({ id }) => id),
      committed.map(({ id }) => id),
      'item IDs/order changed',
    )
    const changedItems = loaded.filter((item, index) => !same(item, committed[index]))
    assert(changedItems.length > 0, 'unexplained item file difference')
    assert(
      changedItems.every(
        ({ id, equip }) => !equip && !committed.find((item) => item.id === id)?.equip,
      ),
      'draft changed equipment definitions',
    )
    itemDraft = { path, sha256, ids: changedItems.map(({ id }) => id) }
  }
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
  const { event, save } = fixtureData
  const { value: fixture, binding } = await readEvidenceArtifact(directory, report.fixture)
  assert.equal(binding.status, 'verified')
  assert.deepEqual([fixture.event, fixture.scenario], [event, scenario])
  if (engine === 'game') validateGameCheckpoint(fixture.checkpoint, scenario)
  else assert.deepEqual(fixture.checkpoint, save)
  if (profile === 'capture') {
    assert.equal(report.media.status, 'passed')
    assert.deepEqual(report.predecessor, { kind: 'world-equip-fixture', ...report.fixture })
    assert.equal(report.media.semanticStart.event, 'before-world-equipment')
    assert.equal(report.media.semanticEnd.event, 'world-equipment-finished')
  }
  const seenInput = new Set()
  const runs = await Promise.all(
    report.cases.map(async (row) => {
      const { value: trace, binding: traceBinding } = await readEvidenceArtifact(
        directory,
        row.trace,
      )
      assert.equal(traceBinding.status, 'verified')
      assert.deepEqual(row.resourceErrors, [])
      for (const {
        inputs: [start, end],
      } of row.steps)
        for (let index = start; index < end; index++) {
          assert(!seenInput.has(index), 'physical input assigned twice')
          seenInput.add(index)
        }
      return {
        runId: row.runId,
        trace: row.trace,
        ...auditEquipmentRun({
          engine,
          scenario,
          row,
          trace,
          actions: report.actions,
          inputs,
          catalogue,
        }),
        appearance: row.steps.flatMap(({ id, first, preview, swapped }) =>
          Object.entries({ first, preview, swapped })
            .filter(([, draw]) => draw)
            .map(([stage, draw]) => ({
              step: id,
              stage,
              selected: draw.selected,
              order: draw.order,
              atMs: draw.atMs,
              sample: draw.frame.appearance ?? null,
            })),
        ),
      }
    }),
  )
  const equipmentInputs = report.actions.filter(({ phase }) => phase === 'world-equip')
  assert.equal(seenInput.size, equipmentInputs.length, 'unbound physical equip input')
  assert(
    report.actions.every(
      ({ phase, context }) =>
        ids.includes(context) &&
        (phase === 'world-equip' || (engine === 'game' && phase === 'restore')),
    ),
  )
  return { engine, revision: report.revision, report: absolute, sha256, runs, scenario, itemDraft }
}

function actualCoverage(runs, scenario, findings) {
  if (!scenario.id.startsWith('catalogue-') || findings.length) return []
  const steps = runs.flatMap(({ runs: side }) => side.map((run) => run.steps))
  return scenario.covered.map((item) => {
    assert(
      steps.every((rows) => {
        const verified = rows.filter((row) => row.verified)
        return (
          verified.some((row) => row.kind === 'equip' && row.item === item && !row.previous) &&
          verified.some((row) => row.kind === 'equip' && row.item === item && row.previous) &&
          verified.some((row) => row.kind === 'equip' && row.previous === item) &&
          verified.some((row) => row.kind === 'remove' && row.item === item)
        )
      }),
      `missing actual empty-slot/equip replacement/unequip for ${item}`,
    )
    return item
  })
}

const [gamePath, reforgePath, output, profile = 'verify'] = process.argv.slice(2)
assert(
  gamePath && reforgePath && output && ['verify', 'probe', 'capture', 'counter'].includes(profile),
  'usage: node scripts/e2e/battle-weapon-world-compare.mjs GAME_REPORT REFORGE_REPORT NEW_JSON [verify|probe|capture|counter]',
)
const judgeRevision = git('rev-parse', 'HEAD').trim()
for (const judge of ['battle-weapon-world-compare.mjs', 'battle-weapon-world-rules.mjs']) {
  const file = `scripts/e2e/${judge}`
  assert.equal(
    await readFile(resolve(repoRoot, file), 'utf8'),
    git('show', `${judgeRevision}:${file}`),
  )
}
const inputs = await loadEquipmentInputs()
const sources = await worldEquipmentSources(inputs)
const catalogue = equipmentCatalogue(inputs)
const gameReport = JSON.parse(await readFile(resolve(gamePath), 'utf8'))
const scenario = equipmentScenario(gameReport.scenario, catalogue, profile === 'counter')
const fixture = await makeEquipmentFixture(inputs, scenario)
const [game, reforge] = await Promise.all([
  readSide(gamePath, 'game', profile, inputs, catalogue, sources, scenario, fixture),
  readSide(reforgePath, 'reforge', profile, inputs, catalogue, sources, scenario, fixture),
])
assert.equal(game.revision, reforge.revision)
assert.deepEqual(game.scenario, reforge.scenario)
const findings = [game, reforge].flatMap(({ engine, runs }) =>
  runs.flatMap(({ runId, findings: rows }) =>
    rows.map((finding) => ({ engine, runId, ...finding })),
  ),
)
const paired = game.runs.map((run, i) => ({
  runId: run.runId,
  matched: same(run.steps, reforge.runs[i].steps),
}))
const appearanceKeys = (draws) => draws.map(({ step, stage, selected }) => [step, stage, selected])
for (const [index, run] of game.runs.entries()) {
  const other = reforge.runs[index]
  if (!same(appearanceKeys(run.appearance), appearanceKeys(other.appearance))) {
    findings.push({ rule: 'same-equipment-appearance-sequence', runId: run.runId })
    continue
  }
  for (const [i, { step, stage, selected, sample }] of run.appearance.entries()) {
    for (const finding of equipmentAppearanceFindings(sample, other.appearance[i].sample)) {
      findings.push({ runId: run.runId, step, stage, selected, ...finding })
    }
  }
}
const repeats =
  profile === 'verify'
    ? [game, reforge].map(({ engine, runs }) => ({
        engine,
        matched: same(runs[0].steps, runs[1].steps),
      }))
    : []
if (![...paired, ...repeats].every(({ matched }) => matched))
  findings.push({ rule: 'same-equipment-sequence-outputs' })
const status = findings.length ? 'rejected' : 'passed'
const receipt = await writeEvidenceArtifact(dirname(resolve(output)), basename(output), {
  schemaVersion: 2,
  kind: 'world-equipment',
  status,
  scenario: game.scenario.id,
  profile,
  judgeRevision,
  producerRevision: game.revision,
  engines: [game, reforge],
  paired,
  repeats,
  covered: actualCoverage([game, reforge], game.scenario, findings),
  beadSemantics: authoredBeadSemantics,
  findings,
})
console.log(JSON.stringify({ ...receipt, status, findings: findings.length }))
if (status === 'rejected') process.exitCode = 1
