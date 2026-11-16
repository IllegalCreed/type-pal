import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { beeEscapeExits, beeEscapeParty, beeWorldInput } from './battle-world-bee-scenario.mjs'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const judge = 'scripts/e2e/battle-world-escape-exits-compare.mjs'
const git = (...args) => execFileSync('git', args, { cwd: repoRoot })
const grid = ({ col, row }) => [col, row]
const gameGrid = ([x, y]) => [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2]
const observedRecontact = { ArrowRight: 1, ArrowLeft: 2, ArrowUp: 1, ArrowDown: 1 }

function judgeExit(engine, trace, { exitKey, exitSteps, exitGrid }) {
  const isGame = engine === 'game'
  const route = isGame ? trace.moves : trace.events.filter(({ kind }) => kind === 'move')
  const finish = (point) => (isGame ? gameGrid(point) : grid(point))
  const [, approachSteps] = beeWorldInput.hold[0]
  const returned = (isGame ? trace.native : trace).handoff.find(
    ({ stage }) => stage === 'world-ready',
  )
  assert(returned?.pixels?.nonBlack > 0)
  assert.deepEqual(isGame ? returned.grid : grid(returned.position), beeWorldInput.stop)
  const contact = isGame
    ? trace.native.handoff.find(({ stage }) => stage === 'contact')
    : trace.events.find(({ kind }) => kind === 'contact')
  assert.deepEqual(
    isGame ? [contact.entityId, contact.grid] : [contact.entity, grid(contact.player)],
    [beeWorldInput.enemy, beeWorldInput.stop],
  )
  const departure = route.slice(approachSteps)
  assert.equal(departure.length, exitSteps, `${exitKey}: unexpected number of moves`)
  assert.deepEqual(finish(departure[0].from), beeWorldInput.stop)
  const path = departure.map(({ to }) => finish(to))
  const delta = exitGrid.map((target, axis) => (target - beeWorldInput.stop[axis]) / exitSteps)
  assert.deepEqual(
    path,
    Array.from({ length: exitSteps }, (_, index) =>
      beeWorldInput.stop.map((start, axis) => start + (index + 1) * delta[axis]),
    ),
  )
  const { samples, secondContact, afterExpiry } = trace.cooldown
  assert.deepEqual(
    samples.map(({ remaining }) => remaining),
    Array.from({ length: 16 }, (_, i) => 15 - i),
  )
  const start = samples[0]
  const zero = samples.at(-1)
  assert.deepEqual(start.grid, beeWorldInput.stop)
  assert.deepEqual(start.enemy, [98.25, 45])
  assert(samples.every(({ visible, contacts }) => visible && contacts === 1))
  // Sample 15 can still be drawn during the return handoff. From the first
  // decrement onwards the native world counter must advance once per sample.
  const firstDecrement = samples[1].tick
  assert(firstDecrement > start.tick)
  assert(samples.slice(1).every(({ tick }, i) => tick === firstDecrement + i))
  assert(
    samples
      .slice(0, -1)
      .every(({ enemy }) => enemy[0] === start.enemy[0] && enemy[1] === start.enemy[1]),
  )
  assert(returned.atMs < departure[0].atMs && departure.at(-1).atMs < zero.atMs)
  assert.deepEqual(zero.grid, exitGrid)
  const contactTick = secondContact ? secondContact.tick - zero.tick : null
  const expectedTick = exitSteps === 1 ? observedRecontact[exitKey] : null
  assert.equal(contactTick, expectedTick, `${exitKey}: second contact after expiry`)
  if (secondContact) {
    assert(secondContact.atMs > zero.atMs)
    assert.deepEqual([secondContact.entity, secondContact.grid], [beeWorldInput.enemy, exitGrid])
  }
  assert.deepEqual(
    afterExpiry.map(({ tick }) => tick - zero.tick),
    Array.from({ length: (expectedTick ?? 4) - 1 }, (_, i) => i + 1),
  )
  assert(afterExpiry.every(({ visible, contacts }) => visible && contacts === 1))
  return {
    key: exitKey,
    path,
    cooldownDurationMs: zero.atMs - start.atMs,
    recontactTicksAfterExpiry: contactTick,
  }
}

async function readReport(file, engine) {
  const reportPath = resolve(file)
  const bytes = await readFile(reportPath)
  const report = JSON.parse(bytes)
  assert.deepEqual(
    [report.engine, report.status, report.fragment, report.profile, report.errors],
    [engine, 'passed', 'q2-world-escape-exits', 'verify', []],
  )
  assert.deepEqual(report.input, { ...beeWorldInput, party: beeEscapeParty, battleInput: ['KeyQ'] })
  const { definition } = report.dependencies
  assert.equal(definition.entry, `scripts/e2e/battle-world-bee-${engine}.mjs`)
  assert.deepEqual(await recordingDependencies(repoRoot, definition), report.dependencies)
  assert.match(report.revision, /^[a-f0-9]{40}$/u)
  const changed = git('diff', '--name-only', '-z', report.revision, '--').toString().split('\0')
  assert.deepEqual(
    changed.filter((path) => Object.hasOwn(report.dependencies.hashes, path)),
    [],
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  assert.equal(
    (await readEvidenceArtifact(dirname(reportPath), report.save)).binding.status,
    'verified',
  )
  const contextLabels = beeEscapeExits.map(
    ({ exitKey, exitSteps }) => `seed-4-run-1-${exitKey}-${exitSteps}`,
  )
  assert.deepEqual(report.contexts, [
    ...(engine === 'game' ? [{ label: 'canonical-scene-baseline', initialDatabases: [] }] : []),
    ...contextLabels.map((label) => ({ label, initialDatabases: [] })),
  ])
  assert.deepEqual(
    report.cases.map(({ label }) => label),
    contextLabels,
  )
  let cursor = 0
  const runs = []
  for (const [index, row] of report.cases.entries()) {
    const { exitKey, exitSteps, exitGrid } = beeEscapeExits[index]
    assert.deepEqual(
      [row.escape, row.seed, row.exitKey, row.exitSteps, row.exitGrid],
      ['success', 4, exitKey, exitSteps, exitGrid],
    )
    if (engine === 'game') assert.equal(row.slotReadback, report.save.sha256)
    const { start, end } = row.actionRange
    assert(start === cursor && end > start && end <= report.actions.length)
    const inputs = report.actions.slice(start, end)
    assert(inputs.every(({ context }) => context === row.label))
    assert.deepEqual(
      inputs
        .filter(({ phase }) => phase === 'world-escape-departure')
        .map(({ key, kind }) => [key, kind]),
      [
        [exitKey, 'down'],
        [exitKey, 'up'],
      ],
    )
    cursor = end
    const { binding, value } = await readEvidenceArtifact(dirname(reportPath), row.raw)
    assert.equal(binding.status, 'verified')
    assert.deepEqual([value.seed, value.overflow, value.errors], [4, false, []])
    runs.push({ ...judgeExit(engine, value, row), context: row.label, raw: row.raw })
  }
  assert.equal(cursor, report.actions.length)
  return { engine, report: reportPath, sha256: sha256(bytes), revision: report.revision, runs }
}

const [gamePath, reforgePath, out] = process.argv.slice(2)
assert(
  gamePath && reforgePath && out,
  'usage: battle-world-escape-exits-compare.mjs GAME REFORGE OUTPUT',
)
const judgeRevision = git('rev-parse', 'HEAD').toString().trim()
const judgeSha256 = sha256(await readFile(resolve(repoRoot, judge)))
assert.equal(
  judgeSha256,
  sha256(git('show', `${judgeRevision}:${judge}`)),
  'freeze escape direction comparator',
)
const [game, reforge] = await Promise.all([
  readReport(gamePath, 'game'),
  readReport(reforgePath, 'reforge'),
])
assert.equal(game.revision, reforge.revision)
const project = ({ key, path, recontactTicksAfterExpiry }) => ({
  key,
  path,
  recontactTicksAfterExpiry,
})
assert.deepEqual(game.runs.map(project), reforge.runs.map(project))
const result = {
  status: 'passed',
  judgeRevision,
  judgeSha256,
  producerRevision: game.revision,
  engines: [game, reforge],
  exits: game.runs.map(project),
}
await writeEvidenceArtifact(dirname(resolve(out)), basename(out), result)
console.log(JSON.stringify({ status: result.status, exits: result.exits }))
