import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { readBoatContract } from './boat-contract.mjs'
import { checkBoatRecording } from './boat-recording-contract.mjs'
import { assertBoatRiderPose } from './boat-rider-pose.mjs'
import { assertBoatRouteTerminal } from './boat-terminal-contract.mjs'
import { readNpcTrace } from './npc-transition-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const paths = process.argv.slice(2)
assert(
  paths.length >= 1 && paths.length <= 2,
  'usage: boat-rider-counter.mjs REPORT_006 [SECOND_REPORT_006]',
)
const root = fileURLToPath(new URL('../../', import.meta.url))
const contract = await readBoatContract()
for (const path of paths) {
  const { report, rawTrace: raw } = await readNpcTrace(path)
  assert.equal(report.fragment, '006')
  const positive = await checkBoatRecording(path, report, raw, contract)
  assert.equal(positive.status, 'proved')
  const terminal = assertBoatRouteTerminal(raw, report.engine, report.boatMotion.interval)
  const proof = assertBoatRiderPose(raw, report.engine, terminal)
  const drawn = raw.events.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === 'party' &&
      event.sceneVisit === proof.sceneVisit &&
      event.order > proof.command &&
      event.order < proof.continuation,
  )
  assert(drawn && drawn.state.frame === 0, 'counter needs a real ride draw')
  const opposite = raw.events.find(
    (event) =>
      event.kind === 'actor-render' &&
      event.id === 'party' &&
      event.order < drawn.order &&
      event.state.frame === 6 &&
      event.state.assetId === drawn.state.assetId &&
      Number.isSafeInteger(event.state.frameResourceId),
  )
  assert(opposite, 'counter needs an earlier actual opposite frame of the same resource')
  const mutated = {
    ...raw,
    events: raw.events.map((event) =>
      event === drawn
        ? {
            ...event,
            state: { ...event.state, frame: 6, frameResourceId: opposite.state.frameResourceId },
          }
        : event,
    ),
  }
  assert.equal(
    (await checkSpriteResources(mutated, report.engine, root)).status,
    'proved',
    'opposite frame must remain a legal resource, not a malformed-input counter',
  )
  await assert.rejects(checkBoatRecording(path, report, mutated, contract), /opposite\/wrong pose/)
  const missing = {
    ...raw,
    events: raw.events.map((event) =>
      event === drawn
        ? {
            ...event,
            state: {
              ...event.state,
              frame: null,
              frameResourceId: null,
              frameSource: 'none',
              drawStatus: 'not-drawn',
            },
          }
        : event,
    ),
  }
  await assert.rejects(checkBoatRecording(path, report, missing, contract), /not actually drawn/)
  const borrowed = {
    ...raw,
    causes: raw.causes.map((event) =>
      event.order === proof.setter
        ? {
            ...event,
            sceneVisit: event.sceneVisit - 1,
          }
        : event,
    ),
  }
  await assert.rejects(
    checkBoatRecording(path, report, borrowed, contract),
    /actual pre-ride pose setter/,
  )
  console.log(
    JSON.stringify({
      engine: report.engine,
      status: 'passed',
      proof,
      oppositeDraw: drawn.order,
      resourceStatus: 'proved',
      rejected: ['legal-opposite-draw', 'missing-draw', 'borrowed-setter'],
    }),
  )
}
