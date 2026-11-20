import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectRainRouteFrames } from './boss-entrances/rain-route-presentation.mjs'

test('a submitted blank frame interrupts the visible soldiers even outside dialogue', () => {
  const scene = 's230'
  const soldiers = Array.from({ length: 6 }, (_, index) => ({
    id: 4132 + index,
    spriteNum: 598,
  }))
  const entry = { scene, atMs: 0, order: 0 }
  const launch = { atMs: 800, order: 15 }
  const events = [entry]
  for (const [renderId, frame] of [null, 0, 1, 1, 2, 0, null].entries()) {
    const atMs = renderId * 100 + 1
    const order = 2 * renderId + 1
    const visible = frame !== null
    const actors = Object.fromEntries(
      soldiers.map(({ id, spriteNum }, index) => [
        `e${id}`,
        { asset: spriteNum, position: [index * 32, 140], facing: 'down', frame },
      ]),
    )
    if (visible)
      events.push({
        kind: 'world-drawn',
        scene,
        order,
        atMs,
        camera: [0, 0],
        actors,
        party: [],
      })
    events.push({
      kind: 'world-render',
      scene,
      order: order + 1,
      atMs,
      renderId,
      view: visible ? order : null,
      backdrop: { textured: visible, dark: !visible },
      dialogue: false,
    })
  }
  events.push(launch)
  const check = () => {
    const issues = []
    inspectRainRouteFrames({
      events,
      hooks: [entry],
      launch,
      source: { rainRouteActors: { [scene]: soldiers } },
      issues,
    })
    return issues
  }
  assert.deepEqual(check(), [])
  const hidden = events.find((event) => event.renderId === 3)
  hidden.view = null
  hidden.backdrop = null
  const [failure, ...other] = check()
  assert.deepEqual(other, [])
  assert.equal(failure.issue, 'rain-route-interrupted-visible-world')
  assert.equal(failure.actual.renderId, 3)
})
