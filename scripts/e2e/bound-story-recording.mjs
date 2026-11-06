import assert from 'node:assert/strict'
import { basename, dirname, resolve } from 'node:path'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'
import { readCheckpointInput, readEvidenceArtifact } from './evidence-artifact.mjs'
import { assertInputLedger } from './input-ledger.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

const pin = ({ path, sha256, byteLength }) => ({ path, sha256, byteLength })

/** Bind later fragments' two independent browser contexts and native checkpoint handoff.
 * The fragment supplies its recorder dialect and story oracle.
 */
export async function readBoundStoryRecording({ path, engine, fragment, readTrace, assertTrace }) {
  const dir = dirname(path)
  const reportFile = await readEvidenceArtifact(dir, { path: basename(path) })
  const report = reportFile.value
  assert.equal(report.fragment, fragment)
  assert.equal(report.engine, engine)
  assert.equal(report.kind, 'verify')
  assert.equal(report.profile, 'verify')
  assert.equal(report.case, 'story')
  assert.equal(report.status, 'passed')
  assert.deepEqual(report.errors, [])
  assert.equal(report.route.status, 'passed')
  assert.equal(report.checks.terminalSave, 'passed')
  assert.equal(report.checks.terminalRestore, 'passed')
  assert.equal(report.persistence.freshContext, true)
  assert.equal(report.contextTraces.length, 2)
  assert.deepEqual(report.hashes, report.dependencies.hashes)
  assertInputLedger(report.actions, { requireReceipts: true })
  const prior = String(Number(fragment) - 1).padStart(3, '0')
  const [story, fresh, terminal, predecessor] = await Promise.all([
    readTrace(dir, report.contextTraces[0]),
    readTrace(dir, report.contextTraces[1]),
    readEvidenceArtifact(dir, report.checkpoint),
    readCheckpointInput(report.predecessor, engine, prior),
  ])
  for (const artifact of [story, fresh, terminal])
    assert.equal(artifact.binding.status, 'verified', 'native story artifact needs exact bytes')
  assert.equal(story.path, resolve(dir, `${fragment}-trace.json`))
  assert.equal(fresh.path, resolve(dir, `${fragment}-fresh-trace.json`))
  assert.equal(terminal.path, resolve(dir, `${fragment}.end.save.json`))
  assert.equal(predecessor.artifacts[0].sha256, report.predecessor.reportSha256)
  assert.equal(predecessor.artifacts[1].binding.status, 'verified')
  assertTrace(story.value, `${fragment} story`)
  assertTrace(fresh.value, `${fragment} fresh restore`)
  if (engine === 'game') {
    assert.equal(story.value.gameRestores.length, 1)
    assert.equal(fresh.value.gameRestores.length, 1)
    assertBoatGameRestore(predecessor.payload, story.value.gameRestores[0].payload)
    const capture = story.value.saveCaptures.at(-1)
    const acknowledgement = story.value.saveCompletions.at(-1)
    assert.equal(capture.order, report.checkpoint.captureProof.inputOrder)
    assert.equal(acknowledgement.order, report.checkpoint.captureProof.acknowledgementOrder)
    assert.equal(acknowledgement.captureSeq, capture.seq)
    assert(capture.order < acknowledgement.order)
    assertBoatGameSaveCapture(terminal.value, capture.payload)
    assertBoatGameRestore(terminal.value, fresh.value.gameRestores[0].payload)
  } else {
    assertReforgeRestoreInput(story.value, predecessor.payload)
    assertReforgeRestoreInput(fresh.value, terminal.value)
  }
  return {
    report,
    trace: story.value,
    fresh: fresh.value,
    terminal: terminal.value,
    predecessor: predecessor.payload,
    files: [reportFile, story, fresh, terminal, ...predecessor.artifacts].map(pin),
  }
}
