import assert from 'node:assert/strict'
import { assertActorRecording } from './actor-recording-contract.mjs'
import { readBoatContract } from './boat-contract.mjs'
import { checkBoatRecording } from './boat-recording-contract.mjs'
import {
  assertErrandCaseReport,
  assertErrandCollector,
  assertErrandStory,
  assertErrandStoryBoundary,
  errandCaseRows,
  readErrandContract,
} from './errand-contract.mjs'
import { readCheckpointInput } from './evidence-artifact.mjs'
import { assertInnChoreography, assertInnEvidence, readInnContract } from './inn-contract.mjs'
import { assertInputLedger } from './input-ledger.mjs'
import { assertKitchenTrace, readKitchenContract } from './kitchen-contract.mjs'
import {
  assertMealAttendantReturn,
  assertMealCaseReport,
  assertMealCollector,
  assertMealDialogue,
  assertMealPhase,
  MEAL_ROWS,
  mealPhaseWindow,
  readMealContract,
} from './meal-contract.mjs'
import { assertOpeningMatrix, readOpeningContract } from './opening-matrix.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

export const STORY_PRODUCERS = Object.freeze({
  '001': (engine) => ({
    entry: `scripts/e2e/${engine}-opening.mjs`,
    traceConfig: `scripts/e2e/${engine}-trace.config.mts`,
  }),
  '002': (engine) => ({
    entry: `scripts/e2e/${engine}-inn.mjs`,
    traceConfig: `scripts/e2e/${engine}-inn.config.mts`,
  }),
  '003': (engine) => ({
    entry: `scripts/e2e/kitchen-${engine}.mjs`,
    traceConfig: `scripts/e2e/kitchen-${engine}.config.mts`,
  }),
  '004': (engine) => ({
    entry: `scripts/e2e/meal-${engine}.mjs`,
    traceConfig: `scripts/e2e/meal-${engine}.config.mts`,
  }),
  '005': (engine) => ({
    entry: `scripts/e2e/errand-${engine}.mjs`,
    traceConfig: `scripts/e2e/errand-${engine}.config.mts`,
  }),
  '006': (engine) => ({
    entry: `scripts/e2e/boat-${engine}.mjs`,
    traceConfig: `scripts/e2e/errand-${engine}.config.mts`,
  }),
})

export async function readStoryContract(fragment, root) {
  const read = {
    '001': readOpeningContract,
    '002': readInnContract,
    '003': readKitchenContract,
    '004': readMealContract,
    '005': readErrandContract,
    '006': readBoatContract,
  }[fragment]
  assert(read, `unsupported story fragment ${fragment}`)
  return read(root)
}

/** The independent story is one context. Persistence/guard/item suites keep their
 * separate contracts; a partial pre-restore trace must never stand in for a story.
 */
export async function checkRecordedStory(reportPath, { report, rawTrace: raw }, contract) {
  const fragment = report.fragment,
    engine = report.engine === 'phase1-game' ? 'game' : report.engine
  assertInputLedger(report.actions, { requireReceipts: true })
  assertActorRecording(raw, engine)
  const artifacts = []
  if (engine === 'reforge' && fragment !== '001') {
    const predecessor = await readCheckpointInput(
      report.predecessor,
      engine,
      String(Number(fragment) - 1).padStart(3, '0'),
    )
    assertReforgeRestoreInput(raw, predecessor.payload)
    artifacts.push(
      ...predecessor.artifacts.map(({ path, sha256, byteLength }) => ({
        path,
        sha256,
        byteLength,
      })),
    )
  }
  if (['004', '005', '006'].includes(fragment))
    assert.equal(report.case, 'story', 'special-case receipt is not a full independent story')
  switch (fragment) {
    case '001':
      assertOpeningMatrix(raw, engine, contract)
      break
    case '002':
      assertInnEvidence(raw, engine, contract)
      assertInnChoreography(raw, engine, contract)
      break
    case '003':
      assertKitchenTrace(raw, engine, contract, report.stairs)
      break
    case '004': {
      assertMealCaseReport(report)
      assert.equal(report.contextTraces.length, 1)
      assertMealCollector(raw)
      assertMealAttendantReturn(raw, engine, report.attendantReturn)
      const shown = assertMealDialogue(raw, engine, contract)
      let priorEnd = report.storyScope.start.afterOrder
      for (const phase of ['pickup', 'serve', 'wine-gift']) {
        const window = mealPhaseWindow(raw, engine, phase)
        assert(
          priorEnd < window.startOrder && window.endOrder <= report.storyScope.end.afterOrder,
          '004 phase is outside story or reordered',
        )
        const ids =
          phase === 'pickup'
            ? MEAL_ROWS.slice(0, 2)
            : phase === 'serve'
              ? MEAL_ROWS.slice(2, 15)
              : MEAL_ROWS.slice(15)
        for (const id of ids)
          assert(
            window.startOrder < shown.get(`dlg.${id}`) && shown.get(`dlg.${id}`) < window.endOrder,
            `${phase} omitted its dialogue ${id}`,
          )
        assertMealPhase(window.trace, engine, shown, phase, window.startOrder)
        priorEnd = window.endOrder
      }
      const gift = mealPhaseWindow(raw, engine, 'wine-gift'),
        dispatches = raw.dispatches.filter(
          (e) => e.order > gift.startOrder && e.order < gift.endOrder,
        )
      assert.equal(dispatches.length, 1, 'wine gift dispatched more or less than once')
      assert.equal(dispatches[0].request.itemId, '272')
      assert.equal(raw.final?.control, true, '004 did not return control')
      assert.equal(raw.pages.at(-1)?.page, null, '004 dialogue remains open')
      break
    }
    case '005': {
      assertErrandCaseReport(report)
      assertErrandCollector(raw)
      const rows = errandCaseRows('story').map((id) => contract.rows.find((row) => row.id === id))
      const shown = assertMealDialogue(raw, engine, { ...contract, rows })
      assertErrandStory(raw, engine, shown)
      assertErrandStoryBoundary(raw, report)
      break
    }
    case '006': {
      const proof = await checkBoatRecording(reportPath, report, raw, contract)
      return { ...proof, artifacts: [...artifacts, ...proof.artifacts] }
    }
    default:
      throw new Error(`unsupported independent story ${fragment}`)
  }
  return { status: 'proved', artifacts }
}
