import { expect, test } from 'vitest'
import { flowOf, preview, settle, target } from './__tests__/playback-canonical-fixtures.js'

test('scene preview evaluates both live entity overlays after movement and keeps the strict fractional boundary', async () => {
  const r = preview()
  const to = { scene: target.scene, entity: 'other' }
  const cond = { kind: 'entitiesNear' as const, from: target, to, range: 0.5 }
  await r.start(
    flowOf([
      {
        kind: 'branch',
        cond,
        then: [{ kind: 'giveMoney', delta: 1000 }],
        else: [{ kind: 'giveMoney', delta: 1 }],
      },
      { kind: 'moveEntity', target: to, to: { col: 2.5, row: 3, height: 4 }, speed: 'normal' },
      {
        kind: 'branch',
        cond,
        then: [{ kind: 'giveMoney', delta: 1000 }],
        else: [{ kind: 'giveMoney', delta: 2 }],
      },
      { kind: 'nudgeEntity', target: to, dx: -4, dy: -2 },
      { kind: 'setEntityState', target: to, state: 0 },
      {
        kind: 'branch',
        cond,
        then: [{ kind: 'giveMoney', delta: 3 }],
        else: [{ kind: 'giveMoney', delta: 1000 }],
      },
    ]),
  )
  expect(r.p.view.logs).toEqual(['💰 +1 钱'])
  for (let turn = 0; turn < 40 && r.p.mode !== 'done'; turn++) {
    r.p.tick(130)
    await settle()
  }
  expect(r.p.mode).toBe('done')
  expect(r.p.view.logs.filter((line) => line.startsWith('💰'))).toEqual([
    '💰 +1 钱',
    '💰 +2 钱',
    '💰 +3 钱',
  ])
  r.unchanged()
})
