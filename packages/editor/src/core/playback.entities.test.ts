import type { Facing } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { flowOf, preview, settle, target } from './__tests__/playback-canonical-fixtures.js'

describe('Canonical preview entity overlays', () => {
  test.each<{ dir: Facing; col: number; row: number }>([
    { dir: 'up', col: 2, row: 2.5 },
    { dir: 'down', col: 2, row: 3.5 },
    { dir: 'left', col: 1.5, row: 3 },
    { dir: 'right', col: 2.5, row: 3 },
  ])('single step $dir followed by pixel nudge composes on the existing overlay', async ({
    dir,
    col,
    row,
  }) => {
    const r = preview(),
      p = r.p
    await r.run([
      { kind: 'stepEntity', target, dir },
      { kind: 'nudgeEntity', target, dx: 16, dy: 8 },
      { kind: 'animEntity', target },
      { kind: 'animEntity', target },
    ])
    expect(p.view.entity.get('npc')).toEqual({
      pos: { col: col + 1, row, height: 4 },
      facing: dir,
      anim: 3,
    })
    expect(p.entityPos('other')).toEqual({ col: 7, row: 8, height: 1 })
    expect(p.view.entity.has('other')).toBe(false)
    r.unchanged()
  })

  test('first nudge starts at scene baseline and zero/positive states hide/show only the target', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'nudgeEntity', target, dx: -16, dy: 8 },
        { kind: 'setEntityState', target, state: 0 },
        { kind: 'wait', ms: 10 },
        { kind: 'setEntityState', target, state: 2 },
        { kind: 'setEntityFacing', target, facing: 'up' },
      ]),
    )
    expect(p.view.entity.get('npc')).toEqual({ pos: { col: 2, row: 4, height: 4 }, hidden: true })
    p.tick(10)
    await settle()
    expect(p.view.entity.get('npc')).toEqual({
      pos: { col: 2, row: 4, height: 4 },
      hidden: false,
      facing: 'up',
    })
    expect(p.mode).toBe('done')
    r.unchanged()
  })

  test('current lifecycle hide/restore/suspend/remove preserves scene definitions', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'setEntityFrame', target, frame: 8 },
        { kind: 'hideEntity', target, ticks: 5 },
        { kind: 'wait', ms: 10 },
        { kind: 'restoreEntity', target },
        { kind: 'wait', ms: 10 },
        { kind: 'suspendEntity', target, ticks: 2 },
        { kind: 'wait', ms: 10 },
        { kind: 'removeEntity', target },
      ]),
    )
    expect(p.view.entity.get('npc')).toEqual({ frame: 8, hidden: true })
    p.tick(10)
    await settle()
    expect(p.view.entity.get('npc')).toEqual({ frame: 0, hidden: false })
    p.tick(10)
    await settle()
    expect(p.view.entity.get('npc')).toEqual({ frame: 0, hidden: false })
    p.tick(10)
    await settle()
    expect(p.view.entity.get('npc')).toEqual({ frame: 0, hidden: true })
    expect(p.mode).toBe('done')
    expect(p.view.entity.size).toBe(1)
    r.unchanged()
  })

  test.each([
    false,
    true,
  ])('action loop=%s clears a fixed frame and records stop reset semantics', async (loop) => {
    const r = preview(),
      p = r.p
    await r.run([
      { kind: 'setEntityFrame', target, frame: 5 },
      { kind: 'playEntityAction', target, sprite: 'hero', action: 'walk', loop },
      { kind: 'stopEntityAction', target, reset: loop },
    ])
    expect(p.view.entity.get('npc')).toEqual({ frame: undefined })
    expect(p.view.logs).toEqual([
      `▶ npc 播放动作 hero/walk${loop ? '（循环）' : '（单次）'}`,
      `■ npc 停止动作${loop ? '并重置默认动作' : ''}`,
    ])
    r.unchanged()
  })

  test('owner camera falls back for a missing owner and follows a valid owner overlay', async () => {
    const r = preview(),
      p = r.p
    expect(p.entityPos('absent')).toBeUndefined()
    await r.start(flowOf([]), { ownerId: 'absent' })
    expect(p.poiPos()).toEqual(r.scene.entry.pos)
    await r.start(flowOf([{ kind: 'nudgeEntity', target, dx: 16, dy: 8 }]), { ownerId: 'npc' })
    expect(p.poiPos()).toEqual({ col: 3, row: 3, height: 4 })
    p.stop()
    await settle()
    expect(p.entityPos('npc')).toEqual({ col: 2, row: 3, height: 4 })
    expect(p.poiPos()).toEqual(r.scene.entry.pos)
    r.unchanged()
  })
})
