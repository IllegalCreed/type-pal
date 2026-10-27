import { validateProjectMap } from '@type-pal/content'
import { expect, test } from 'vitest'
import map204Json from '../../../projects/pal/content/maps/map-204.json' with { type: 'json' }
import { correctionRuntime } from './__tests__/pal-corrections-harness.js'
import { isBlockedAt } from './collision.js'
import { gov3Scene } from './pal-gov3-content-harness.js'

const room = validateProjectMap(map204Json)

test.each([
  { scene: 's249', entity: 'e4400', target: 's260', col: 80, row: 22 },
  { scene: 's260', entity: 'e4557', target: 's249', col: 82, row: -5 },
  { scene: 's285', entity: 'e4813', target: 's286', col: 80, row: 22 },
  { scene: 's286', entity: 'palace-isolated-exit', target: 's285', col: 82, row: -5 },
  { scene: 's285', entity: 'e4814', target: 's286', col: 102, row: 29 },
])('$scene/$entity keeps the intended palace room and era on arrival', async ({
  scene,
  entity,
  target,
  col,
  row,
}) => {
  const run = correctionRuntime(scene)
  expect(await run.activate(entity)).toBe(true)
  const loads = run.effects.filter((command) => command.kind === 'loadScene')
  expect(loads).toHaveLength(1)
  const load = loads[0]!
  expect(load.scene).toBe(target)
  if (!load.entryId) throw new Error('arrival point missing')
  expect(gov3Scene(target).entries?.[load.entryId]?.pos).toEqual({ col, row, height: 0 })
})

test('现世独立房间出口可从邻格触发，不要求踩进墙格或与敌人战斗', async () => {
  const run = correctionRuntime('s286')
  const exit = gov3Scene('s286').entities.find((entity) => entity.id === 'palace-isolated-exit')!
  expect(exit.pages?.[0]?.triggerActivation).toEqual({ on: 'touch', range: 1 })
  expect(exit.pos).toEqual({ col: 80, row: 25, height: 0 })
  expect(exit.hostile).toBeUndefined()
  expect(run.gates({ scene: 's286', entity: exit.id })).toMatchObject({
    visible: true,
    collidable: false,
  })
  // Arrival at 80,22 can approach to 80,24; the exit marker itself is on a wall.
  for (const row of [22, 23, 24]) expect(isBlockedAt(room, { col: 80, row, height: 0 })).toBe(false)
  expect(isBlockedAt(room, exit.pos)).toBe(true)
  expect(await run.activate(exit.id)).toBe(true)
  expect(
    run.effects.some((command) => command.kind === 'loadScene' && command.scene === 's285'),
  ).toBe(true)
})
