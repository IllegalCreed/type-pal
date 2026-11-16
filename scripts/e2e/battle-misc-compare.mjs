import assert from 'node:assert/strict'
import { basename, dirname, resolve } from 'node:path'
import { battleFoundationScenario, battleLaunchSpec } from './battle-foundation-scenarios.mjs'
import { projectBattleBusinessTrace, validateRecording } from './battle-trace-contract.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const [gamePath, reforgePath, gameCapture, reforgeCapture, ...extra] = process.argv.slice(2)
assert(
  gamePath && reforgePath && Boolean(gameCapture) === Boolean(reforgeCapture) && !extra.length,
  'usage: battle-misc-compare.mjs GAME_VERIFY REFORGE_VERIFY [GAME_CAPTURE REFORGE_CAPTURE]',
)
const scenario = battleFoundationScenario('party-lanterns')
const spec = battleLaunchSpec(scenario)
const party = spec.party.map(({ id }) => id)
const [first, next, last] = spec.enemies.map(({ id }) => id)
const expectedTargets = [last, first, next]

async function readReport(path, engine, profile) {
  const directory = dirname(resolve(path))
  const reportArtifact = await readEvidenceArtifact(directory, { path: basename(path) })
  const report = reportArtifact.value
  assert.equal(report.status, 'passed')
  assert.equal(report.engine, engine)
  assert.equal(report.profile, profile)
  assert.deepEqual(report.fixture, spec)
  assertInputLedger(report.actions, { requireReceipts: true })
  const count = profile === 'verify' ? 2 : 1
  assert.deepEqual(
    report.contexts,
    Array.from({ length: count }, (_, i) => ({
      label: `battle-misc-${i + 1}`,
      initialDatabases: [],
    })),
  )
  assert.equal(report.runs.length, count)
  const runs = []
  for (const [i, run] of report.runs.entries()) {
    assert.equal(run.runId, report.contexts[i].label)
    const artifact = await readEvidenceArtifact(directory, run.trace)
    assert.equal(artifact.binding.status, 'verified')
    const { native, statusPaints } = artifact.value
    validateRecording(native, scenario)
    assert.equal(native.engine, engine)
    assert.equal(native.runId, run.runId)
    const business = projectBattleBusinessTrace(native)
    assert.deepEqual(business.start, scenario.expected.start)
    assert.deepEqual(business.terminal, scenario.expected.terminal)
    assert.deepEqual(
      business.commands,
      party.map((actorId) => ({
        turn: 1,
        actorId,
        kind: 'attack',
        targetId: last,
      })),
    )
    assert.deepEqual(
      business.actions.map(({ targetId }) => targetId),
      expectedTargets,
    )
    assert.deepEqual(
      statusPaints.map(({ id, hp, mp, portrait }) => ({ id, hp, mp, portrait })),
      spec.party.slice(0, 2).map((member, slot) => ({
        id: engine === 'game' ? member.gameRole : member.actorId,
        hp: member.hp,
        mp: scenario.expected.start.players[slot].mp,
        portrait: true,
      })),
    )
    const paintsBetweenCommands = [
      native.commands[0].atMs,
      ...statusPaints.map(({ atMs }) => atMs),
      native.commands[1].atMs,
    ]
    assert(paintsBetweenCommands.slice(1).every((at, index) => at > paintsBetweenCommands[index]))
    const selected = run.before.selectingPlayerId
    assert.equal(selected, party[1])
    assert.equal(run.before.commandCount, 1)
    assert.equal(run.before.turn, 1)
    for (const key of ['selectingPlayerId', 'turn', 'commandCount', 'snapshot'])
      assert.deepEqual(run.after[key], run.before[key])
    const route = report.actions.filter(({ context }) => context === run.runId)
    assert.deepEqual(
      route.slice(0, 10).map(({ key }) => key),
      [
        'Enter',
        'ArrowRight',
        'ArrowRight',
        'Enter',
        'ArrowDown',
        'Enter',
        'ArrowUp',
        'Enter',
        'ArrowRight',
        'Escape',
      ],
    )
    const keys = route.filter(({ step }) => step === 'enable sustained auto attack')
    assert.deepEqual(
      keys.map(({ key }) => key),
      ['Enter'],
    )
    assert(!route.some(({ key }) => key.toLowerCase() === 'a'))
    const random = native.randomDraws.map(({ index, purpose, value, queue, target }) => ({
      index,
      purpose,
      value,
      ...(queue && { queue }),
      ...(target && { target }),
    }))
    runs.push({ id: run.runId, nativeSha256: artifact.sha256, business, random })
  }
  return {
    engine,
    profile,
    revision: report.revision,
    sha256: reportArtifact.sha256,
    runs,
    ...(report.media && {
      nativeVideoSha256: report.media.native.sha256,
      status: report.media.status,
    }),
  }
}

const reports = await Promise.all([
  readReport(gamePath, 'game', 'verify'),
  readReport(reforgePath, 'reforge', 'verify'),
  ...(gameCapture
    ? [readReport(gameCapture, 'game', 'capture'), readReport(reforgeCapture, 'reforge', 'capture')]
    : []),
])
const [game, reforge] = reports
const reference = game.runs[0]
for (const report of reports) {
  assert.equal(report.revision, game.revision)
  if (report.profile === 'capture') assert.equal(report.status, 'passed')
  for (const run of report.runs) {
    assert.deepEqual(run.business, reference.business, `${report.engine}/${run.id} business`)
    assert.deepEqual(run.random, reference.random, `${report.engine}/${run.id} native draws`)
  }
}
console.log(
  JSON.stringify(
    {
      status: 'passed',
      revision: game.revision,
      fixture: spec.id,
      crossEnginePairs: 2,
      sameEngineRepeats: [game.engine, reforge.engine],
      statusPages: party.slice(0, 2),
      commands: reference.business.commands,
      performed: expectedTargets,
      terminal: reference.business.terminal,
      random: reference.random,
      inputs: reports.map(({ runs, ...report }) => ({
        ...report,
        nativeTraces: runs.map(({ id, nativeSha256 }) => ({ id, sha256: nativeSha256 })),
      })),
    },
    null,
    2,
  ),
)
