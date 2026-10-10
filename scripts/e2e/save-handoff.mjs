import assert from 'node:assert/strict'
import { basename, dirname, resolve } from 'node:path'
import { readErrandContract, readErrandReceipt } from './errand-contract.mjs'
import { readCheckpointInput, readEvidenceArtifact } from './evidence-artifact.mjs'
import {
  assertMealCaseReport,
  assertMealCollector,
  assertMealDialogue,
  assertMealGameSaveInput,
  assertMealPhase,
  assertMealRestored,
  MEAL_ROWS,
  mealPhaseWindow,
  mealSaveView,
  readMealContract,
} from './meal-contract.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

/** Saves is a separate producer run, never a checkpoint invented on a story receipt. */
export function assertSaveProvider(provider, story) {
  assert(['004', '005'].includes(story.fragment), 'unexpected save provider fragment')
  assert.equal(story.case, 'story')
  assert.equal(provider.case, 'saves', 'predecessor must be a saves run')
  for (const key of ['fragment', 'engine', 'revision'])
    assert.equal(provider[key], story[key], `save provider ${key} differs from accepted story`)
  assert.equal(provider.kind, 'verify')
  assert.equal(provider.status, 'passed')
  assert.deepEqual(provider.predecessor, story.predecessor, 'save provider entry differs')
  assert(story.dependencies && story.hashes, 'accepted story lacks dependency evidence')
  assert.deepEqual(provider.dependencies, story.dependencies, 'save provider dependencies differ')
  assert.deepEqual(provider.hashes, story.hashes, 'save provider source bytes differ')
  assert.deepEqual(
    provider.hashes,
    provider.dependencies.hashes,
    'provider dependency hashes differ',
  )
  assert.deepEqual(provider.core?.sourceHashes, story.core?.sourceHashes)
}

async function checkMealSaveReceipt(report, traces, saves) {
  assertMealCaseReport(report)
  const contract = await readMealContract()
  assert.deepEqual(
    report.contextTraces.map((r) => [r.context, r.path]),
    [
      ['003-real-predecessor', '004-before-carry-restore.trace.json'],
      ['carried-meal-real-restore', '004-saves-story.trace.json'],
      ['004-real-restore', '004-restored.trace.json'],
    ],
  )
  for (const trace of traces) assertMealCollector(trace)
  for (const [index, phases] of [['pickup'], ['serve', 'wine-gift']].entries()) {
    const trace = traces[index],
      ids = index ? MEAL_ROWS.slice(2) : MEAL_ROWS.slice(0, 2)
    const shown = assertMealDialogue(trace, report.engine, {
      ...contract,
      rows: ids.map((id) => contract.rows.find((row) => row.id === `dlg.${id}`)),
    })
    let priorEnd = -1
    for (const phase of phases) {
      const window = mealPhaseWindow(trace, report.engine, phase)
      assert(priorEnd < window.startOrder, 'save provider phases reordered')
      const phaseIds =
        phase === 'pickup'
          ? MEAL_ROWS.slice(0, 2)
          : phase === 'serve'
            ? MEAL_ROWS.slice(2, 15)
            : MEAL_ROWS.slice(15)
      for (const id of phaseIds)
        assert(
          window.startOrder < shown.get(`dlg.${id}`) && shown.get(`dlg.${id}`) < window.endOrder,
          'save provider dialogue borrowed another phase',
        )
      assertMealPhase(window.trace, report.engine, shown, phase, window.startOrder)
      priorEnd = window.endOrder
    }
  }
  const gift = mealPhaseWindow(traces[1], report.engine, 'wine-gift')
  const dispatches = traces[1].dispatches.filter(
    (e) => e.order > gift.startOrder && e.order < gift.endOrder,
  )
  assert.equal(dispatches.length, 1)
  assert.equal(dispatches[0].request.itemId, '272')
  assert.equal(traces[1].final?.control, true)
  assert.equal(traces[1].pages.at(-1)?.page, null)
  for (const [index, checkpoint] of [report.carryCheckpoint, report].entries()) {
    const world = mealSaveView(saves[index].value, report.engine)
    assert.deepEqual(world, checkpoint.endWorld, 'save provider payload differs from end world')
    assertMealRestored(traces[index + 1], world, report.engine)
    if (report.engine === 'reforge')
      assertReforgeRestoreInput(traces[index + 1], saves[index].value)
    if (report.engine === 'game') {
      const receipt = report.saveInputCaptures?.[index]
      assert.equal(receipt?.label, index ? '004.end' : '004.carry')
      assert.equal(receipt.context, report.contextTraces[index].context)
      const trace = traces[index],
        capturedIndex = receipt.captured.seq
      const completionIndex = trace.saveCompletions.findIndex((e) => e.captureSeq === capturedIndex)
      assert(
        trace.saveCaptures.slice(0, capturedIndex).every((e) => e.arm === null),
        'extra armed save before checkpoint',
      )
      assert(
        trace.saveCompletions.slice(0, completionIndex).every((e) => e.arm === null),
        'extra completed save before checkpoint',
      )
      const captured = assertMealGameSaveInput(
        trace,
        capturedIndex,
        completionIndex,
        receipt.captured.arm,
        saves[index].value,
      )
      assert.deepEqual(captured, receipt.captured, 'save provider input receipt differs from raw')
    }
  }
}

/** Pin and recheck every input; validation cannot borrow a story's PASS for a saves run. */
export async function readSaveHandoff(path, story) {
  const directory = dirname(resolve(path)),
    references = [{ path: basename(path) }]
  const reportArtifact = await readEvidenceArtifact(directory, references[0])
  const report = reportArtifact.value
  assertSaveProvider(report, story)
  const artifacts = [reportArtifact],
    traces = [],
    saves = []
  const predecessor = await readCheckpointInput(
    report.predecessor,
    report.engine,
    report.fragment === '004' ? '003' : '004',
  )
  for (const reference of report.contextTraces) {
    const artifact = await readEvidenceArtifact(directory, reference)
    assert.equal(artifact.binding.status, 'verified', 'handoff trace is not fully bound')
    references.push(reference)
    artifacts.push(artifact)
    traces.push(artifact.value)
  }
  for (const reference of report.fragment === '004'
    ? [report.carryCheckpoint, report.checkpoint]
    : [report.checkpoint]) {
    assert.match(reference.sha256, /^[a-f0-9]{64}$/)
    const artifact = await readEvidenceArtifact(directory, reference)
    references.push(reference)
    artifacts.push(artifact)
    saves.push(artifact)
  }
  if (report.fragment === '004') {
    if (report.engine === 'reforge') assertReforgeRestoreInput(traces[0], predecessor.payload)
    assertMealRestored(traces[0], mealSaveView(predecessor.payload, report.engine), report.engine)
    await checkMealSaveReceipt(report, traces, saves)
  } else {
    const checked = await readErrandReceipt(path, await readErrandContract())
    assert.deepEqual(checked, report, 'save provider changed during validation')
  }
  const bindings = [...artifacts, ...predecessor.artifacts].map(({ path, sha256, byteLength }) => ({
    path,
    sha256,
    byteLength,
  }))
  for (const binding of bindings)
    await readEvidenceArtifact(dirname(binding.path), { ...binding, path: basename(binding.path) })
  return {
    fragment: report.fragment,
    engine: report.engine,
    report: bindings[0],
    artifacts: bindings.slice(1),
    checkpoint: saves.at(-1).sha256,
  }
}
