import assert from 'node:assert/strict'
import { committedRouteReceipt, replayCommittedRoute } from './committed-route.mjs'

/** Expand an authored hold plan, never a path derived from the world being tested. */
export function fixedRoutePlan(engine, { id, scene, start, holds, completion }) {
  assert(['game', 'reforge'].includes(engine), 'unknown input-plan engine')
  const position = ([col, row]) => {
    assert(
      Number.isInteger(col) && Number.isInteger(row),
      'fixed route requires exact grid coordinates',
    )
    return engine === 'game' ? [16 * (col - row), 8 * (col + row)] : [col, row, 0]
  }
  const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  let cursor = [...start]
  const steps = []
  for (const [key, count] of holds) {
    assert(Object.hasOwn(deltas, key) && Number.isInteger(count) && count > 0, 'invalid fixed hold')
    for (let n = 0; n < count; n++) {
      const next = cursor.map((value, axis) => value + deltas[key][axis])
      steps.push({
        scene,
        key,
        from: position(cursor),
        to: position(next),
        source: engine === 'game' ? 'commit:tickSceneInput' : 'commit:player.input',
      })
      cursor = next
    }
  }
  return { id, steps, completion: { ...completion, position: position(completion.position) } }
}

/** The same executor is used by every frozen-route caller; business completion stays outside it. */
export async function executeFixedRoute({
  page,
  engine,
  plan,
  scene,
  id,
  phase,
  context,
  report,
  snapshot,
  evidence,
  ready,
  finished,
  health,
}) {
  const lastOrder = (trace) =>
    Math.max(
      -1,
      ...Object.values(trace)
        .filter(Array.isArray)
        .map((list) => list.at(-1)?.order ?? -1),
    )
  const startOrder = lastOrder(await evidence())
  if (plan.steps.length) assert.equal(plan.steps[0].scene, scene, 'fixed route scene mismatch')
  let inputCount = 0
  await replayCommittedRoute({
    page,
    route: plan,
    health,
    onInput: (input) => {
      const action = {
        phase,
        scene,
        routeId: id,
        ...(context ? { context } : {}),
        atMs: Date.now(),
        scope: 'story',
        ...input,
      }
      inputCount++
      report.route.inputs.push(action)
      report.actions.push(action)
    },
  })
  const end = await snapshot(),
    trace = await evidence(),
    endOrder = lastOrder(trace)
  assert(finished(end), `${plan.id}: fixed inputs ended before the independent story condition`)
  const replay = committedRouteReceipt({
    id,
    engine,
    trace,
    startOrder,
    endOrder,
    scene,
    end,
    ready: ready(end),
    inputCount,
  })
  assert.deepEqual(
    replay.steps.map(({ order: _order, ...step }) => step),
    plan.steps,
    'recorded input commits differ from fixed plan',
  )
  assert.deepEqual(
    replay.completion,
    plan.completion,
    'recorded final boundary differs from fixed plan',
  )
  report.route.legs.push({
    phase,
    scene,
    ...(context ? { context } : {}),
    inputPlan: plan,
    startOrder,
    endOrder,
    replay,
    moveSources: [engine === 'game' ? 'commit:tickSceneInput' : 'commit:player.input'],
  })
  return end
}
