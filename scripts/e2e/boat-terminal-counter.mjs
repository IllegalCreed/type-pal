import assert from 'node:assert/strict'
import { assertBoatRouteTerminal } from './boat-terminal-contract.mjs'
import { readNpcTrace } from './npc-transition-contract.mjs'

const paths = process.argv.slice(2)
assert.equal(paths.length, 2, 'usage: boat-terminal-counter.mjs GAME_006_REPORT REFORGE_006_REPORT')
for (const path of paths) {
  const { report, rawTrace: raw } = await readNpcTrace(path)
  assert.equal(report.fragment, '006')
  const proof = assertBoatRouteTerminal(raw, report.engine, report.boatMotion.interval)
  assert.deepEqual(proof.position, [126, 34])
  const incomplete = {
    ...raw,
    causes: raw.causes.filter((event) => event.order !== proof.continuation),
  }
  assert.throws(() =>
    assertBoatRouteTerminal(incomplete, report.engine, report.boatMotion.interval),
  )
  const wrongPose = {
    ...raw,
    causes: raw.causes.map((event) => {
      if (event.order !== proof.continuation) return event
      const poses = structuredClone(event.poses)
      poses.e116.state.position[1] += 0.25
      return { ...event, poses }
    }),
  }
  assert.throws(
    () => assertBoatRouteTerminal(wrongPose, report.engine, report.boatMotion.interval),
    /latest same-visit actor/,
  )
  const alteredOrders = new Set(
    raw.events
      .filter(
        (event) =>
          event.kind === 'actor' &&
          event.id === 'e116' &&
          event.sceneVisit === proof.sceneVisit &&
          event.order > proof.command &&
          JSON.stringify(event.state.position.slice(0, 2)) ===
            JSON.stringify(report.engine === 'game' ? [1472, 1280] : [126, 34]),
      )
      .map((event) => event.order),
  )
  assert(alteredOrders.size, 'actual terminal actor observations required')
  const wrongPosition = report.engine === 'game' ? [1468, 1282] : [126, 34.25, 0]
  const selfConsistent = {
    ...raw,
    events: raw.events.map((event) =>
      alteredOrders.has(event.order)
        ? { ...event, state: { ...event.state, position: wrongPosition } }
        : event,
    ),
    causes: raw.causes.map((event) =>
      alteredOrders.has(event.poses?.e116?.commitOrder)
        ? {
            ...event,
            poses: {
              ...event.poses,
              e116: {
                ...event.poses.e116,
                state: { ...event.poses.e116.state, position: wrongPosition },
              },
            },
          }
        : event,
    ),
  }
  assert.deepEqual(
    selfConsistent.events.filter((event) => event.kind === 'actor-render'),
    raw.events.filter((event) => event.kind === 'actor-render'),
  )
  assert.throws(
    () => assertBoatRouteTerminal(selfConsistent, report.engine, report.boatMotion.interval),
    /actual terminal differs from its source\/authored target/,
  )
  console.log(
    JSON.stringify({
      kind: 'boat-terminal-counter',
      scope: 'diagnostic archived raw; no acceptance',
      engine: report.engine,
      proof,
      counters: 3,
      result: 'rejected',
    }),
  )
}
