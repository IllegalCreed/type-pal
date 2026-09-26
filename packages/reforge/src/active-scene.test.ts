import { validateSprites } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { scenePreparationFixture } from './__tests__/scene-preparation-fixture.js'
import { ActiveScene } from './active-scene.js'
import { expectDefined } from './defined.js'
import { resolveSpriteActionBinding } from './entity-action-player.js'
import { buildBlankProjectMap } from './project-map.js'

async function fixture() {
  const f = await scenePreparationFixture()
  const plan = await f.preparer.prepare('a', f.world)
  const active = new ActiveScene<typeof plan.renderer>(plan.def, () => {})
  return { f, plan, active }
}

describe('ActiveScene prepared-state ownership', () => {
  test('publishes the actual prepared resources synchronously with stable bounds and baseline containers', async () => {
    const { f, plan, active } = await fixture()
    const before = structuredClone(plan.def)
    const bounds = active.bounds,
      baseline = active.entityStaticBaseline,
      actions = active.actions
    active.commit(plan)
    expect(active.scene).toBe(plan.def)
    expect(active.map).toBe(plan.assets.map)
    expect(active.tiles).toBe(plan.assets.tilesets)
    expect(active.palette).toBe(plan.palette)
    expect(active.renderer).toBe(plan.renderer)
    expect(active.entitySpriteDefs).toBe(plan.entityDefs)
    expect(active.bounds).toBe(bounds)
    expect(active.entityStaticBaseline).toBe(baseline)
    expect(active.actions).toBe(actions)
    expect(active.room).toEqual({ col: 0, row: 0, cols: 8, rows: 8 })
    expect(bounds).toEqual({ minX: -32, minY: -40, maxX: 288, maxY: 144 })
    expect([...baseline]).toEqual([
      ['a/npc', { hidden: true, collide: false }],
      ['a/zone', { hidden: false, collide: false }],
    ])
    expect(plan.def).toEqual(before)
    f.assertInputs()
  })

  test('retains pristine entity flags independently from subsequent projected-scene mutation', async () => {
    const { f, plan, active } = await fixture()
    active.commit(plan)
    const npc = expectDefined(active.scene.entities.find((e) => e.id === 'npc'))
    npc.hidden = false
    npc.collide = true
    expect(active.entityStaticBaseline.get('a/npc')).toEqual({ hidden: true, collide: false })
    f.assertInputs()
  })

  test('next scene clears old actions, baseline and wave cache and settles the actual old waiter', async () => {
    const { f, plan, active } = await fixture()
    active.commit(plan)
    const seed = expectDefined(plan.pageActions[0])
    const pending = active.actions.play(seed.entity, {
      ...seed,
      binding: { ...seed.binding, loop: false },
    })
    active.actions.advance(100)
    expect(active.actions.frame('npc')).toBe(1)
    const wave = { ...plan.renderer }
    expect(active.rendererForWave(() => wave)).toBe(wave)
    const next = await f.preparer.prepare('b', f.world)
    active.commit(next)
    await pending
    expect(active.scene.id).toBe('b')
    expect(active.actions.frame('npc')).toBeUndefined()
    expect(active.actions.hasOverride('npc')).toBe(false)
    expect([...active.entityStaticBaseline]).toEqual([])
    expect(active.entitySpriteDefs.size).toBe(0)
    expect(active.waveRenderer).toBeNull()
    expect(active.renderer).toBe(next.renderer)
    f.assertInputs()
  })

  test('wave renderer is lazy, reused and retried after a factory error', async () => {
    const { plan, active } = await fixture()
    active.commit(plan)
    const error = new Error('canvas allocation')
    expect(() =>
      active.rendererForWave(() => {
        throw error
      }),
    ).toThrow(error)
    expect(active.waveRenderer).toBeNull()
    const create = vi.fn(() => ({ ...plan.renderer }))
    const wave = active.rendererForWave(create)
    expect(active.rendererForWave(create)).toBe(wave)
    expect(create).toHaveBeenCalledTimes(1)
    active.commit(plan)
    expect(active.rendererForWave(create)).not.toBe(wave)
    expect(create).toHaveBeenCalledTimes(2)
  })

  test('map replacement changes only map-owned resources, retaining action time, scene and current bounds timing', async () => {
    const { f, plan, active } = await fixture()
    active.commit(plan)
    active.actions.advance(100)
    const previousBounds = structuredClone(active.bounds)
    const previousBaseline = structuredClone(active.entityStaticBaseline)
    active.rendererForWave(() => ({ ...plan.renderer }))
    const map = buildBlankProjectMap(12, 10, expectDefined(plan.assets.map.tilesetRefs[0]))
    const assets = { ...plan.assets, map },
      renderer = { ...plan.renderer }
    const room = { col: 1, row: 2, cols: 9, rows: 6 }
    active.replaceMap(assets, renderer, room)
    expect(active.map).toBe(map)
    expect(active.tiles).toBe(assets.tilesets)
    expect(active.renderer).toBe(renderer)
    expect(active.room).toBe(room)
    expect(active.waveRenderer).toBeNull()
    expect(active.scene).toBe(plan.def)
    expect(active.palette).toBe(plan.palette)
    expect(active.entitySpriteDefs).toBe(plan.entityDefs)
    expect(active.entityStaticBaseline).toEqual(previousBaseline)
    expect(active.bounds).toEqual(previousBounds)
    expect(active.actions.frame('npc')).toBe(1)
    f.assertInputs()
  })

  test('boundary cue sees the new resources but preserves the original pre-room-update observation order', async () => {
    const { f, plan } = await fixture()
    const sprite = structuredClone(expectDefined(plan.entityDefs.get('npc')))
    const action = expectDefined(sprite.poses?.idle)
    expectDefined(action.steps[0]).cues = [{ kind: 'sound', asset: 'cue.step' }]
    // This unit consumes prepared seeds, not sound IO. Validate the exact sprite and resolve its binding.
    validateSprites([sprite])
    const seed = resolveSpriteActionBinding(
      sprite,
      {
        sprite: sprite.id,
        action: 'idle',
        loop: true,
      },
      2,
    )
    const next = {
      ...plan,
      assets: {
        ...plan.assets,
        map: buildBlankProjectMap(12, 10, expectDefined(plan.assets.map.tilesetRefs[0])),
      },
      entityDefs: new Map([['npc', sprite]]),
      pageActions: [{ ...seed, entity: 'npc' }],
    }
    const observations: unknown[] = []
    const active = new ActiveScene<typeof plan.renderer>(plan.def, (entity, cue) => {
      observations.push({
        entity,
        cue,
        map: active.map,
        renderer: active.renderer,
        sprites: active.entitySpriteDefs,
        room: active.room,
        bounds: { ...active.bounds },
      })
    })
    active.commit(plan)
    const oldRoom = active.room,
      oldBounds = { ...active.bounds }
    active.commit(next)
    expect(observations).toEqual([
      {
        entity: 'npc',
        cue: { kind: 'sound', asset: 'cue.step' },
        map: next.assets.map,
        renderer: next.renderer,
        sprites: next.entityDefs,
        room: oldRoom,
        bounds: oldBounds,
      },
    ])
    expect(active.room).toEqual({ col: 0, row: 0, cols: 12, rows: 10 })
    expect(active.bounds).toEqual({ minX: -32, minY: -40, maxX: 416, maxY: 176 })
    f.assertInputs()
  })
})
