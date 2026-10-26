import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assertBoatStoryEnd } from './boat-contract.mjs'
import { sha256 } from './browser-journey.mjs'
import { assertErrandCollector, errandSaveView } from './errand-contract.mjs'
import { assertInputLedger } from './input-ledger.mjs'
import { writeLongEvidenceArtifact } from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

/** Recording is an explicit process input; the existing strict verify argv stays unchanged. */
export function boatMediaEnabled(value) {
  assert(value === undefined || value === '1', 'TYPE_PAL_BOAT_MEDIA must be absent or 1')
  return value === '1'
}

/** Actual save input and a fresh-context committed restore, after the complete story.
 * No synthesized world, modified digest, or inferred terminal snapshot is accepted.
 */
export async function deliverBoatCheckpoint({
  engine,
  getPage,
  out,
  report,
  snapshot,
  ready,
  press,
  until,
  evidence,
  restore,
  begin,
}) {
  await begin('006-terminal-save')
  assertBoatStoryEnd(await snapshot(), engine)
  await press('Escape', '006 prove normal save-eligible menu')
  await until(
    snapshot,
    (s) => (engine === 'game' ? s.mode === 'menu' : s.runtime?.menuActive),
    '006 normal save menu',
  )
  await press('Escape', '006 close save-eligible menu')
  await until(snapshot, ready, '006 menu closed before formal save')
  let bytes, payload, captureProof
  if (engine === 'game') {
    const before = await getPage().evaluate(() => window.__readErrandStatus())
    await press('F5', '006 actual formal F5 terminal save')
    await until(
      () => getPage().evaluate(() => window.__readErrandStatus()),
      (s) => s.saveCompletions === before.saveCompletions + 1,
      '006 formal save acknowledged',
    )
    bytes = await getPage().evaluate(async () => {
      const { Save } = await import('/src/core/save/api.ts')
      const { serializeSave } = await import('/src/tools/save-io.ts')
      return serializeSave(await Save.loadSlot(1))
    })
    payload = JSON.parse(bytes)
    const trace = await evidence(),
      captures = trace.saveCaptures.slice(before.saveCaptures),
      completions = trace.saveCompletions.slice(before.saveCompletions)
    assert.equal(captures.length, 1, '006 requires one synchronous real save input')
    assert.equal(completions.length, 1, '006 requires one matching save acknowledgement')
    assert.equal(captures[0].slot, 1)
    assert.equal(completions[0].captureSeq, captures[0].seq)
    assert(completions[0].order > captures[0].order)
    assert.deepEqual(errandSaveView(payload, engine), errandSaveView(captures[0].payload, engine))
    captureProof = { inputOrder: captures[0].order, acknowledgementOrder: completions[0].order }
    assert.equal(payload.gs.wNumScene, 15)
    assert.deepEqual(
      [payload.gs.party.x, payload.gs.party.y],
      [report.endWorld.position.pos.x, report.endWorld.position.pos.y],
    )
  } else {
    payload = await getPage().evaluate(() => window.__tpE2e.dumpSave())
    bytes = JSON.stringify(payload)
    assert.equal(payload.version, 12)
    assert.equal(payload.contentVersion, 22)
    assert.equal(payload.projectId, 'pal')
    assert.deepEqual(payload.position, report.endWorld.position)
    captureProof = { source: 'public __tpE2e.dumpSave after actual006 control return' }
  }
  const expected = errandSaveView(payload, engine)
  await writeFile(resolve(out, '006.end.save.json'), bytes, { flag: 'wx' })
  const endFrame = await waitForOpeningFrame(getPage(), until)
  await getPage().screenshot({ path: resolve(out, '006-formal-save.png') })
  report.checkpoint = {
    path: '006.end.save.json',
    sha256: sha256(bytes),
    byteLength: Buffer.byteLength(bytes),
    source:
      engine === 'game'
        ? 'actual formal F5 after complete006, paired synchronous input/acknowledgement'
        : 'actual public dumpSave after complete006',
    captureProof,
  }
  // Keep the real save input/ack in the first context's raw; the declared story
  // boundary still ends before menus/save, so those are not compared as story.
  const savedTrace = await evidence()
  assertErrandCollector(savedTrace, '006')
  report.contextTraces = [await writeLongEvidenceArtifact(out, '006-trace.json', savedTrace)]
  await begin('006-fresh-checkpoint-restore')
  await getPage().close()
  await restore(bytes)
  const restored = await snapshot()
  assertBoatStoryEnd(restored, engine)
  const trace = await evidence()
  assertErrandCollector(trace, '006')
  const commits = engine === 'game' ? trace.gameRestores : trace.restoreCommits
  assert.equal(commits.length, 1, '006 fresh context must have exactly one actual restore')
  assert.equal(
    commits[0].source,
    engine === 'game' ? 'commit:loadGameFromSlot' : 'commit:restorePayload',
  )
  const actual = errandSaveView(commits[0].payload, engine)
  assert.deepEqual(actual, expected, '006 fresh restore lost full persistent state')
  if (engine === 'reforge') assertReforgeRestoreInput(trace, payload)
  assert.equal(trace.pages.filter((p) => p.page).length, 0, '006 restore replayed arrival dialogue')
  const restoredFrame = await waitForOpeningFrame(getPage(), until)
  await getPage().screenshot({ path: resolve(out, '006-formal-restored.png') })
  const artifact = await writeLongEvidenceArtifact(out, '006-formal-restored-trace.json', trace)
  report.checks.terminalSave = 'passed'
  report.checks.terminalRestore = 'passed'
  report.persistence = {
    expectedStateSHA256: sha256(JSON.stringify(expected)),
    restoredStateSHA256: sha256(JSON.stringify(actual)),
    restoreOrder: commits[0].order,
    freshContext: true,
    arrivalReplayed: false,
    endFrame,
    restoredFrame,
    artifact,
    frameContract:
      'actual nonblack frames plus exact atomic persistent state; any pixel difference remains explicitly observable',
  }
  assertInputLedger(report.actions, { requireReceipts: true })
  report.contextTraces.push(artifact)
}
