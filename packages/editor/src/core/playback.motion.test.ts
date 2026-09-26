import type { Facing, WalkSpeed } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { flowOf, preview, settle, target } from './__tests__/playback-canonical-fixtures.js'

describe('Canonical preview movement', () => {
  test.each<{ speed: WalkSpeed; step: number }>([
    { speed: 'slow', step: 200 },
    { speed: 'normal', step: 130 },
    { speed: 'fast', step: 100 },
    { speed: 'run', step: 50 },
  ])('party speed $speed accumulates partial ticks and finishes at exact endpoint', async ({
    speed,
    step,
  }) => {
    const r = preview(),
      p = r.p
    const to = { col: 1, row: 0, height: 5 }
    await r.start(
      flowOf([
        { kind: 'setPartyFacing', facing: 'left', gesture: 3 },
        { kind: 'moveParty', to, speed },
        { kind: 'giveMoney', delta: 1 },
      ]),
    )
    expect(p.tick(step - 1)).toBe(true)
    expect(p.view.player.pos).toEqual({ col: 0, row: 0, height: 2 })
    expect(p.view.player.gesture).toBe(3)
    p.tick(1)
    expect(p.view.player).toEqual({
      pos: { col: 0.5, row: 0, height: 2 },
      facing: 'right',
      gesture: null,
      spriteId: null,
    })
    expect(p.view.logs).toEqual([])
    p.tick(step)
    await settle()
    expect(p.view.player.pos).toEqual(to)
    expect(p.view.logs).toEqual(['💰 +1 钱'])
    expect(p.mode).toBe('done')
    expect(p.tick(step)).toBe(false)
    r.unchanged()
  })

  test.each<{ col: number; row: number; facing: Facing }>([
    { col: -1, row: -2, facing: 'up' },
    { col: -2, row: -1, facing: 'left' },
    { col: 1, row: 2, facing: 'down' },
    { col: 2, row: 1, facing: 'right' },
  ])('pixel-axis quadrant faces $facing on the first entity step', async ({ col, row, facing }) => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'setEntityFrame', target, frame: 7 },
        {
          kind: 'moveEntity',
          target,
          to: { col: 2 + col, row: 3 + row, height: 9 },
          speed: 'normal',
        },
      ]),
      { ownerId: 'npc' },
    )
    expect(p.poiPos()).toEqual({ col: 2, row: 3, height: 4 })
    p.tick(130)
    expect(p.view.entity.get('npc')).toEqual({
      frame: undefined,
      anim: 1,
      facing,
      pos: { col: 2 + Math.sign(col) * 0.5, row: 3 + Math.sign(row) * 0.5, height: 4 },
    })
    expect(p.poiPos()).toEqual(p.entityPos('npc'))
    p.tick(390)
    await settle()
    expect(p.entityPos('npc')).toEqual({ col: 2 + col, row: 3 + row, height: 9 })
    expect(p.view.entity.get('npc')?.anim).toBe(4)
    expect(p.view.entity.has('other')).toBe(false)
    expect(p.mode).toBe('done')
    r.unchanged()
  })

  test('already-near endpoint snaps exact height without changing facing', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([{ kind: 'moveParty', to: { col: 0.2, row: -0.2, height: 8 }, speed: 'fast' }]),
    )
    p.tick(100)
    await settle()
    expect(p.view.player.pos).toEqual({ col: 0.2, row: -0.2, height: 8 })
    expect(p.view.player.facing).toBe('down')
    expect(p.mode).toBe('done')
    r.unchanged()
  })

  test('global speed scales movement and a subsequent timer, not authored coordinates', async () => {
    const r = preview(),
      p = r.p
    p.speed = 2
    await r.start(
      flowOf([
        { kind: 'moveParty', to: { col: 1, row: 0, height: 2 }, speed: 'normal' },
        { kind: 'wait', ms: 100 },
        { kind: 'giveMoney', delta: 2 },
      ]),
    )
    p.tick(130)
    await settle()
    expect(p.view.player.pos.col).toBe(1)
    p.tick(49)
    await settle()
    expect(p.view.logs).toEqual([])
    p.tick(1)
    await settle()
    expect(p.view.logs).toEqual(['💰 +2 钱'])
    expect(p.mode).toBe('done')
    r.unchanged()
  })
})
