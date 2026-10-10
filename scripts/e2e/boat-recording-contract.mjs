import assert from 'node:assert/strict'
import { dirname } from 'node:path'
import { assertBoatMotion, assertBoatReport, assertBoatStoryEnd } from './boat-contract.mjs'
import { boatMotionEvidence } from './boat-motion-evidence.mjs'
import { summarizeBoatMotion } from './boat-observations.mjs'
import { assertBoatRiderPose } from './boat-rider-pose.mjs'
import { assertBoatRouteTerminal } from './boat-terminal-contract.mjs'
import { canonicalPosition } from './coordinate-evidence.mjs'
import { assertErrandCollector } from './errand-contract.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { assertMealDialogue } from './meal-contract.mjs'
import { npcStoryBoundary } from './npc-story-scope.mjs'

/** Recompute the specialized 006 proof from byte-bound raw; report flags are not the oracle. */
export async function checkBoatRecording(reportPath, report, raw, contract) {
  assertBoatReport(report)
  assertErrandCollector(raw, '006')
  const shown = assertMealDialogue(raw, report.engine, contract.dialogue)
  assert.deepEqual([...shown.keys()], report.core.rows)
  assert.equal(raw.final?.scene, 's014', 'boat collector did not finish on the island')
  assert.equal(raw.final.control, true, 'boat collector still holds control')
  assert.equal(raw.pages.at(-1)?.page, null, 'boat final dialogue remains open')
  const { startOrder, endOrder } = report.boatMotion.interval ?? {}
  assert(
    Number.isSafeInteger(startOrder) && Number.isSafeInteger(endOrder),
    'missing boat capture interval',
  )
  assert(
    startOrder >= report.storyScope.start.afterOrder && startOrder < endOrder,
    'boat interval outside story',
  )
  assert.equal(endOrder, report.storyScope.end.afterOrder, 'boat interval does not reach story end')
  assert.equal(
    npcStoryBoundary(raw).afterOrder,
    endOrder,
    'boat final state is outside story scope',
  )
  const route = report.route.legs.filter((leg) => leg.phase === 'island-arrival')
  assert.equal(route.length, 1, 'boat boarding route is missing or repeated')
  assert(
    startOrder <= route[0].startOrder && route[0].endOrder <= endOrder,
    'boat interval omitted boarding',
  )
  const motion = await readEvidenceArtifact(dirname(reportPath), report.boatMotion.artifact),
    states = await readEvidenceArtifact(dirname(reportPath), report.stateTrace)
  assert.equal(motion.binding.status, 'verified', 'boat motion lacks byte binding')
  assert.equal(states.binding.status, 'verified', 'boat state trace lacks byte binding')
  const actual = boatMotionEvidence(raw, startOrder, endOrder)
  assert.deepEqual(motion.value, actual, 'boat motion artifact differs from completed world draws')
  const normalized = actual.map((sample) => ({
    ...sample,
    ...Object.fromEntries(
      ['position', 'e116', 'e117'].map((key) => [
        key,
        report.engine === 'game' ? canonicalPosition(sample[key]).slice(0, 2) : sample[key],
      ]),
    ),
  }))
  const verdict = assertBoatMotion(normalized)
  for (const [key, value] of Object.entries(verdict))
    assert.deepEqual(report.boatMotion[key], value, `boat ${key} receipt differs`)
  assert.deepEqual(report.boatMotion.final, actual.at(-1))
  assert.equal(report.stateTrace.samples, states.value.length)
  const last = states.value.at(-1)?.state
  assertBoatStoryEnd(last, report.engine)
  assert.deepEqual(last.position, raw.final.actors.party.position, 'boat final snapshots disagree')
  assert.equal(last.facing, raw.final.actors.party.facing, 'boat final facing disagrees')
  const end = report.endWorld.position.pos
  assert.deepEqual(
    last.position,
    report.engine === 'game' ? [end.x, end.y] : [end.col, end.row, end.height],
  )
  assert.equal(report.endWorld.position.facing, last.facing)
  const leaderPosition = assertBoatLeaderHold(raw, report.engine)
  const terminal = assertBoatRouteTerminal(raw, report.engine, { startOrder, endOrder })
  const riderPose = assertBoatRiderPose(raw, report.engine, terminal)
  const sampledMotion = summarizeBoatMotion(actual)
  return {
    status: 'proved',
    observations: {
      rows: [...shown.keys()],
      arrivalScene: raw.final.scene,
      motion: {
        ...sampledMotion,
        steeringFacings: sampledMotion.facings,
        facings: riderPose.facings,
        riderPose,
        sampledEnd: sampledMotion.end,
        end: terminal.position,
        terminal,
      },
      leaderPosition,
    },
    artifacts: [motion, states].map(({ path, sha256, byteLength }) => ({
      path,
      sha256,
      byteLength,
    })),
  }
}

/** Include every commit/draw from real dialogue open through its final close.
 * Page snapshots alone would miss an out-and-back movement while the page is unchanged.
 */
export function assertBoatLeaderHold(raw, engine) {
  const leaderPages = raw.pages.filter(
    (page) => page.scene === 's003' && page.page && page.actors?.e59?.visible,
  )
  assert(leaderPages.length, '苗人头领对话窗口缺失')
  const leaderPosition = canonicalPosition(leaderPages[0].actors.e59.position)
  for (const page of leaderPages) {
    assert.deepEqual(
      canonicalPosition(page.actors.e59.position),
      leaderPosition,
      '苗人头领对话期间移动',
    )
    assert.equal(page.actors.e59.facing, 'left', '苗人头领对话未面向主角')
  }
  const first = leaderPages[0],
    last = leaderPages.at(-1),
    causes = raw.causes.filter(
      (cause) => cause.scene === 's003' && cause.sceneVisit === first.sceneVisit,
    ),
    start = causes.find(
      (cause) =>
        cause.order < first.order &&
        (engine === 'game' ? cause.dialogue : cause.after)?.instance === first.page.instance,
    ),
    end = causes.find(
      (cause) =>
        cause.order > last.order &&
        (engine === 'game'
          ? cause.dialogue === null
          : cause.phase === 'dialogue' && cause.after === null),
    )
  assert(start && end, '苗人头领对白缺少真实开始/关闭证据')
  const commits = raw.events.filter(
    (event) =>
      event.kind === 'actor' &&
      event.sceneVisit === first.sceneVisit &&
      event.scene === 's003' &&
      event.id === 'e59',
  )
  const baseline = commits.findLast((event) => event.order <= start.order)
  assert(baseline, '苗人头领对白缺少实体起始状态')
  const relevant = [
    baseline,
    ...raw.events.filter(
      (event) =>
        ['actor', 'actor-render'].includes(event.kind) &&
        event.scene === 's003' &&
        event.sceneVisit === first.sceneVisit &&
        event.id === 'e59' &&
        (event.kind === 'actor-render' ? event.throughOrder : event.order) > start.order &&
        event.order < end.order,
    ),
  ]
  for (const event of relevant) {
    assert.deepEqual(
      canonicalPosition(event.state.position),
      leaderPosition,
      `苗人头领对白中途移动 order ${event.order}`,
    )
    assert.equal(event.state.facing, 'left', `苗人头领对白中途转身 order ${event.order}`)
  }
  return leaderPosition
}
