import assert from 'node:assert/strict'
import { dirname } from 'node:path'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'
import { sha256 } from './browser-journey.mjs'
import { assertErrandCollector, errandSaveView } from './errand-contract.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { assertInputLedger } from './input-ledger.mjs'
import { readLongEvidenceArtifact } from './long-evidence.mjs'
import { openingFrameMatches } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

/** Independent byte-bound consumption of terminal save/restore, separate from
 * the story comparison. An endWorld observation or a passed flag is insufficient.
 */
export async function checkBoatCheckpoint(reportPath, report) {
  const directory = dirname(reportPath)
  assert.equal(report.checkpoint?.path, '006.end.save.json')
  assert.equal(report.contextTraces?.length, 2)
  assert.equal(report.contexts?.length, 2)
  for (const context of report.contexts) assert.deepEqual(context.initialDatabases, [])
  const file = await readEvidenceArtifact(directory, report.checkpoint)
  assert.equal(file.binding.status, 'verified')
  const saved = await readLongEvidenceArtifact(directory, report.persistence?.saveArtifact)
  const story = await readLongEvidenceArtifact(directory, report.contextTraces[0])
  const restored = await readLongEvidenceArtifact(directory, report.contextTraces[1])
  assert.equal(saved.binding.status, 'verified')
  assert.equal(restored.binding.status, 'verified')
  assert.equal(story.binding.status, 'verified')
  assertErrandCollector(story.value, '006')
  // The continuation retains original seq/order values. Rejoin the byte-bound
  // prefix to prove every global event, rather than renumbering a cropped raw.
  const joined = { ...saved.value }
  for (const [key, value] of Object.entries(story.value))
    if (Array.isArray(value) && Array.isArray(saved.value[key]))
      joined[key] = [...value, ...saved.value[key]]
  assertErrandCollector(joined, '006')
  assertErrandCollector(restored.value, '006')
  const payload = file.value,
    engine = report.engine
  assert(['game', 'reforge'].includes(engine))
  assert.equal(report.checks.terminalSave, 'passed')
  assert.equal(report.checks.terminalRestore, 'passed')
  assert.deepEqual(report.persistence.artifact, report.contextTraces[1])
  if (engine === 'game') {
    assert.equal(payload.gs.wNumScene, 15)
    assert.deepEqual(
      [payload.gs.party.x, payload.gs.party.y],
      [report.endWorld.position.pos.x, report.endWorld.position.pos.y],
    )
    assert.equal(payload.gs.party.facing, report.endWorld.position.facing)
    assert.equal(saved.value.saveCaptures.length, 1)
    assert.equal(saved.value.saveCompletions.length, 1)
    const capture = saved.value.saveCaptures[0],
      ack = saved.value.saveCompletions[0]
    assert.equal(capture.source, 'before:Save.saveSlot:deepClone')
    assert.equal(ack.source, 'commit:Save.saveSlot')
    assert.equal(capture.slot, 1)
    assert.equal(ack.captureSeq, capture.seq)
    assert(capture.order > report.storyScope.end.afterOrder && ack.order > capture.order)
    assertBoatGameSaveCapture(payload, capture.payload)
    assert.deepEqual(errandSaveView(capture.payload, engine), errandSaveView(payload, engine))
    assert.deepEqual(report.checkpoint.captureProof, {
      inputOrder: capture.order,
      acknowledgementOrder: ack.order,
    })
  } else {
    assert.equal(payload.version, 12)
    assert.equal(payload.contentVersion, 22)
    assert.equal(payload.projectId, 'pal')
    assert.equal(payload.position.sceneId, 's014')
    assert.deepEqual(payload.position, report.endWorld.position)
    assertReforgeRestoreInput(restored.value, payload)
  }
  const commits = engine === 'game' ? restored.value.gameRestores : restored.value.restoreCommits
  assert.equal(commits.length, 1)
  assert.equal(
    commits[0].source,
    engine === 'game' ? 'commit:loadGameFromSlot' : 'commit:restorePayload',
  )
  const completeGameDomain =
    engine === 'game' ? assertBoatGameRestore(payload, commits[0].payload) : undefined
  // Immutable earlier receipts hash this summary. Authenticate that historical field
  // separately; current complete-domain acceptance is derived above from byte-bound raw.
  const expected = errandSaveView(payload, engine),
    actual = errandSaveView(commits[0].payload, engine)
  assert.deepEqual(actual, expected, '006 terminal checkpoint lost persistent fields')
  assert.equal(report.persistence.expectedStateSHA256, sha256(JSON.stringify(expected)))
  assert.equal(report.persistence.restoredStateSHA256, sha256(JSON.stringify(actual)))
  assert.equal(report.persistence.restoreOrder, commits[0].order)
  assert.equal(restored.value.pages.filter((page) => page.page).length, 0)
  assert.equal(restored.value.final.scene, 's014')
  assert.equal(restored.value.final.control, true)
  assert.equal(report.persistence.arrivalReplayed, false)
  assert.equal(report.persistence.freshContext, true)
  assert(openingFrameMatches(report.persistence.endFrame))
  assert(openingFrameMatches(report.persistence.restoredFrame))
  assertInputLedger(report.persistenceActions, { requireReceipts: true })
  const saveKeys = report.persistenceActions
    .filter((action) => action.phase === '006-terminal-save')
    .map((action) => action.key)
  assert.deepEqual(saveKeys, engine === 'game' ? ['Escape', 'Escape', 'F5'] : ['Escape', 'Escape'])
  return {
    status: 'proved',
    ...(completeGameDomain ? { completeGameDomain } : {}),
    checkpoint: report.checkpoint,
    saveArtifact: report.persistence.saveArtifact,
    restoredArtifact: report.contextTraces[1],
    stateSHA256: sha256(JSON.stringify(expected)),
    scene: 's014',
    freshContext: true,
    arrivalReplayed: false,
  }
}
