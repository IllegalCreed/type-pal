import { expect, test } from 'vitest'
import { correctionRuntime } from './__tests__/pal-corrections-harness.js'
import { gov3Scene } from './pal-gov3-content-harness.js'

test.each([
  { scene: 's226', entity: 'e3969', col: 128, row: 59 },
  { scene: 's225', entity: 'e3949', col: 119, row: 57 },
  { scene: 's226', entity: 'e3989', col: 124, row: 18 },
])('$scene/$entity activates the corrected trial-cave destination', async ({
  scene,
  entity,
  col,
  row,
}) => {
  const run = correctionRuntime(scene)
  expect(await run.activate(entity)).toBe(true)
  const requests = run.effects.filter((command) => command.kind === 'loadScene')
  expect(requests).toHaveLength(1)
  const request = requests[0]!
  expect(request.scene).toBe('s226')
  if (!request.entryId) throw new Error('portal must name its arrival point')
  expect(gov3Scene(request.scene).entries?.[request.entryId]?.pos).toEqual({ col, row, height: 0 })
  expect(request.transition).toMatchObject({ kind: 'source', outMs: 600, inMs: 600 })
})
