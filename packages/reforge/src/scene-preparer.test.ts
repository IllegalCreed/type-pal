import { expect, test, vi } from 'vitest'
import { deferredScene, scenePreparationFixture } from './__tests__/scene-preparation-fixture.js'

test('preparer creates a complete legal plan including hidden sprites and page actions without mutation or pruning', async () => {
  const f = await scenePreparationFixture(),
    world = structuredClone(f.world)
  const prune = vi.spyOn(f.sprites, 'prune')
  const plan = await f.preparer.prepare('a', f.world)
  expect([...plan.entityDefs.keys()]).toEqual(['npc'])
  expect([...plan.neededSprites]).toEqual(['sprite'])
  expect(plan.pageActions).toEqual([
    {
      entity: 'npc',
      binding: { sprite: 'walker', action: 'idle', loop: true },
      action: f.project.spritesById.walker!.poses!.idle,
    },
  ])
  expect(plan.onEnterEntry).toEqual({ prepare: [], reveal: { kind: 'cut' } })
  expect(plan.spawn).toEqual({ pos: { col: 2, row: 2, height: 0 }, facing: 'down' })
  expect(plan.assets.map.width).toBe(8)
  expect(plan.palette.colors).toHaveLength(256)
  expect(plan.renderer.tiles).toBe(plan.assets.tilesets)
  expect(prune).not.toHaveBeenCalled()
  expect(f.world).toEqual(world)
  plan.def.entities[0]!.pos.col = 99
  expect(f.project.entryScene.entities[0]!.pos.col).toBe(3)
  f.assertInputs()
})

test('world and explicit script are frozen before the first scene read can resume', async () => {
  const f = await scenePreparationFixture(),
    gate = deferredScene<void>()
  const read = f.ports.canonicalScene
  let entered = false
  f.ports.canonicalScene = async (id) => {
    entered = true
    await gate.promise
    return read(id)
  }
  const explicit = structuredClone(f.world.script!)
  explicit.mapOverride = { a: 'map-extra-0' }
  explicit.followers = ['other']
  const expectedWorld = structuredClone(f.world),
    before = structuredClone(explicit)
  const pending = f.preparer.prepare('a', f.world, undefined, false, explicit)
  try {
    expect(entered).toBe(true)
    explicit.mapOverride.a = 'map-extra-1'
    explicit.followers = []
    f.world.party[0]!.appearance = { spriteId: 'other' }
    gate.resolve()
    const plan = await pending
    expect(plan.dependencies.mapOverride).toBe('map-extra-0')
    expect(plan.dependencies.followers).toEqual(['other'])
    expect(plan.dependencies.party[0]!.spriteId).toBeNull()
    expect(f.readCalls).toContain('map:map-extra-0')
    expect(f.readCalls).not.toContain('map:map-extra-1')
    expect(vi.mocked(f.ports.prepareSounds).mock.calls[0]![1]).toEqual({
      ...expectedWorld,
      script: before,
    })
    expect(() => f.preparer.assertCurrent(plan, f.world)).toThrow(/预检依赖已变化/)
  } finally {
    gate.resolve()
    await pending.catch(() => undefined)
  }
  f.assertInputs()
})

test('actor override definitions are cloned on entry while the selected world can opt out', async () => {
  const f = await scenePreparationFixture(),
    gate = deferredScene<void>()
  const override = {
    def: structuredClone(f.project.spritesById.walker!),
    frames: await f.ports.loadSprite('sprite'),
  }
  f.overrides.set('hero', override)
  const read = f.ports.canonicalScene
  f.ports.canonicalScene = async (id) => {
    await gate.promise
    return read(id)
  }
  const pending = f.preparer.prepare('a', f.world)
  try {
    override.def.id = 'other'
    gate.resolve()
    const plan = await pending
    expect(plan.dependencies.actorOverrides[0]).toEqual(['hero', 'walker', 'sprite'])
    expect(() => f.preparer.assertCurrent(plan, f.world)).toThrow(/预检依赖已变化/)
    const without = await f.preparer.prepare('a', f.world, undefined, false)
    expect(without.dependencies.actorOverrides).toEqual([])
    expect(() => f.preparer.assertCurrent(without, f.world)).not.toThrow()
  } finally {
    gate.resolve()
    await pending.catch(() => undefined)
  }
  f.assertInputs()
})

test.each([
  'map',
  'palette',
  'loadSprite',
  'prepareSounds',
] as const)('%s preparation failure propagates exact error without renderer creation', async (port) => {
  const f = await scenePreparationFixture(),
    before = structuredClone(f.world),
    error = new Error(`${port} failed`)
  vi.spyOn(f.ports, port).mockRejectedValueOnce(error)
  const result = await f.preparer.prepare('a', f.world).then(
    () => undefined,
    (e) => e,
  )
  expect(result).toBe(error)
  expect(f.ports.createRenderer).not.toHaveBeenCalled()
  expect(f.world).toEqual(before)
  f.assertInputs()
})

test('sound readiness is awaited before plan publication, not detached from the scene barrier', async () => {
  const f = await scenePreparationFixture(),
    gate = deferredScene<void>()
  let entered = false,
    settled = false
  f.ports.prepareSounds.mockImplementation(async () => {
    entered = true
    await gate.promise
  })
  const pending = f.preparer.prepare('a', f.world).then((plan) => {
    settled = true
    return plan
  })
  try {
    await f.resources.canonical('a')
    await Promise.resolve()
    expect(entered).toBe(true)
    await f.resources.map('map-a')
    await f.resources.palette()
    await f.ports.loadSprite('sprite')
    expect(settled).toBe(false)
    expect(f.ports.createRenderer).not.toHaveBeenCalled()
    gate.resolve()
    const plan = await pending
    expect(plan.def.id).toBe('a')
    expect(f.ports.createRenderer).toHaveBeenCalledTimes(1)
  } finally {
    gate.resolve()
    await pending.catch(() => undefined)
  }
})

test.each([
  'inventory',
  'equipment',
  'followers',
  'appearance',
] as const)('%s changes invalidate only the captured dependency footprint', async (kind) => {
  const f = await scenePreparationFixture(),
    plan = await f.preparer.prepare('a', f.world)
  if (kind === 'inventory') f.world.inventory.push({ itemId: 'tonic', count: 1 })
  if (kind === 'equipment') f.world.party[0]!.equipment.weapon = 'blade'
  if (kind === 'followers') f.world.script!.followers = ['other']
  if (kind === 'appearance') f.world.party[0]!.appearance = { spriteId: 'other' }
  expect(() => f.preparer.assertCurrent(plan, f.world)).toThrow(/预检依赖已变化/)
})

test('unrelated money and flags remain allowed and missing script is not filled into the caller', async () => {
  const f = await scenePreparationFixture()
  delete f.world.script
  const before = structuredClone(f.world)
  const plan = await f.preparer.prepare('a', f.world)
  expect(f.world).toEqual(before)
  expect(f.world.script).toBeUndefined()
  f.world.money += 7
  expect(() => f.preparer.assertCurrent(plan, f.world)).not.toThrow()
  f.assertInputs()
})

test('explicit fractional spawn and facing remain precise without modifying scene entry or caller spawn', async () => {
  const f = await scenePreparationFixture(),
    spawn = { pos: { col: 2.5, row: 3.25, height: 0 as const }, facing: 'up' as const }
  const before = structuredClone(spawn)
  const plan = await f.preparer.prepare('a', f.world, spawn)
  expect(plan.spawn).toEqual(spawn)
  expect(spawn).toEqual(before)
  expect(plan.def.entry.pos).toEqual({ col: 2, row: 2, height: 0 })
  f.assertInputs()
})
