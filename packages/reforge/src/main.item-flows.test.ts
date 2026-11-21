// @vitest-environment jsdom
import type { AuthorItemCore } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { shellScene } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  enterItems,
  installShellHost,
  medicine,
  state,
} from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
})

test('H8 medicine repeats on the real target and returns to list only after last consumption', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    items: [medicine()],
    inventory: [{ itemId: 'tonic', count: 2 }],
  })
  const before = structuredClone(state().world)
  await enterItems(host, 'use')
  await key(host, 'Enter') // select target
  expect(state().world).toEqual(before)
  for (const count of [1, 0]) {
    await key(host, 'Enter')
    await advance(host, () => state().renderDebug.menuActive)
    const expected = structuredClone(before)
    expected.party[0]!.hp = count === 1 ? 90 : 100
    expected.inventory = count ? [{ itemId: 'tonic', count }] : []
    expect(state().world).toEqual(expected)
  }
  await key(host, 'Enter')
  expect(state().world.party[0]!.hp).toBe(100)
  expect(state().world.inventory).toEqual([])
  h.assertInputUnchanged()
})

test('H8 explicit failed item gate keeps item and menu, with a visible failure message', async () => {
  host = await installShellHost()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const item = medicine()
  if (!item.use) throw new Error('missing use')
  // Current item contract is RandomLong(1,100) < chance; 1 is legal and always rejects.
  item.use.effects.unshift({ kind: 'gate', chance: 1 })
  const h = await bootScenario(host, { items: [item], inventory: [{ itemId: 'tonic', count: 1 }] })
  const before = structuredClone(state().world)
  await enterItems(host, 'use')
  await key(host, 'Enter')
  await key(host, 'Enter')
  await advance(host, () => state().renderDebug.menuActive)
  await host.frame()
  expect(state().world).toEqual(before)
  expect(host.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))).toContain(
    '没有产生效果',
  )
  expect(warning.mock.calls).toEqual([['[script]', 'itemUse(tonic): 没有产生效果']])
  h.assertInputUnchanged()
})

test('H8 all-allies item uses direct route, heals both and consumes only once', async () => {
  host = await installShellHost()
  const item = medicine()
  if (!item.use) throw new Error('missing use')
  item.use.target = 'allAllies'
  const h = await bootScenario(host, {
    party: ['hero', 'friend'],
    items: [item],
    inventory: [{ itemId: 'tonic', count: 2 }],
  })
  const expected = structuredClone(state().world)
  for (const character of expected.party) character.hp = 90
  expected.inventory[0]!.count = 1
  await enterItems(host, 'use')
  await key(host, 'Enter')
  await advance(host, () => state().renderDebug.menuActive)
  expect(state().world).toEqual(expected)
  h.assertInputUnchanged()
})

test('H8 item target cancellation preserves bag, and a close-after-use item really releases the menu', async () => {
  host = await installShellHost()
  const item = medicine()
  if (!item.use) throw new Error('missing use')
  item.use.menuAfterUse = 'close'
  const h = await bootScenario(host, { items: [item], inventory: [{ itemId: 'tonic', count: 1 }] })
  const before = structuredClone(state().world)
  await enterItems(host, 'use')
  await key(host, 'Enter')
  await key(host, 'Escape')
  expect(state().world).toEqual(before)
  await key(host, 'Enter')
  await key(host, 'Enter')
  await advance(host, () => state().world.inventory.length === 0)
  const expected = structuredClone(before)
  expected.party[0]!.hp = 90
  expected.inventory = []
  expect(state().world).toEqual(expected)
  expect(state().renderDebug.menuActive).toBe(false)
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(true)
  h.assertInputUnchanged()
})

const scroll = (): AuthorItemCore => ({
  ...medicine('scroll'),
  use: {
    target: 'scene',
    consuming: true,
    effects: [
      {
        kind: 'itemPrivateScript',
        script: {
          id: 'use',
          body: [
            { kind: 'wait', ms: 500 },
            { kind: 'giveMoney', delta: 7 },
          ],
        },
      },
    ],
  },
})

test('H8 actual item private script blocks duplicate input and preserves its money on consumption', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    items: [scroll(), medicine()],
    inventory: [
      { itemId: 'scroll', count: 2 },
      { itemId: 'tonic', count: 3 },
    ],
  })
  const expected = structuredClone(state().world)
  await enterItems(host, 'use')
  await key(host, 'Enter')
  expect(state().renderDebug.menuActive).toBe(false)
  expect(state().world).toEqual(expected)
  await key(host, 'Enter', 50)
  await key(host, 'Escape', 50)
  expect(state().world).toEqual(expected)
  await advance(host, () => state().renderDebug.menuActive)
  expected.money += 7
  expected.inventory[0]!.count = 1
  expect(state().world).toEqual(expected)
  h.assertInputUnchanged()
})

test('H8 unavailable teleport hook refuses consumption and restores the same usable menu', async () => {
  host = await installShellHost()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const item: AuthorItemCore = {
    ...medicine('orb'),
    use: {
      target: 'scene',
      consuming: true,
      effects: [{ kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: 'No exit here' }],
    },
  }
  const h = await bootScenario(host, { items: [item], inventory: [{ itemId: 'orb', count: 1 }] })
  const before = structuredClone(state().world)
  await enterItems(host, 'use')
  await key(host, 'Enter')
  await advance(host, () => state().renderDebug.menuActive)
  await host.frame()
  expect(state().world).toEqual(before)
  expect(host.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))).toContain(
    'No exit here',
  )
  expect(warning.mock.calls).toEqual([['[script]', 'itemUse(orb): No exit here']])
  h.assertInputUnchanged()
})

test('repellent pauses an in-range hostile at its footpoint through one turn cycle and expires', async () => {
  host = await installShellHost()
  const first = shellScene('a')
  first.entities = [
    {
      id: 'bee',
      sprite: 'walker',
      pos: { col: 5, row: 2, height: 0 },
      facing: 'down',
      hostile: {
        enemyTeamId: 'encounter',
        chase: { range: 3, speed: 2 },
        onVictory: { kind: 'remain' },
        onPlayerFlee: { kind: 'remain' },
      },
    },
  ]
  const item: AuthorItemCore = {
    ...medicine('repellent'),
    use: {
      target: 'scene',
      consuming: true,
      menuAfterUse: 'close',
      effects: [{ kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 1000 }],
    },
  }
  const fixture = await bootScenario(host, {
    first,
    items: [item],
    inventory: [{ itemId: item.id, count: 1 }],
  })
  const bee = () => state().entities.find(({ id }) => id === 'bee')
  await enterItems(host, 'use')
  await key(host, 'Enter')
  await advance(host, () => state().world.inventory.length === 0 && !state().renderDebug.menuActive)
  await key(host, 'ArrowRight', 100)
  expect(state().player.pos).toEqual({ col: 3, row: 2, height: 0 })

  const facings = ['down']
  for (let beat = 0; beat < 12 && state().world.hostileAwareness; beat++) {
    expect(bee()?.pos).toEqual({ col: 5, row: 2, height: 0 })
    const facing = bee()?.facing
    if (!facing) throw new Error('repelled hostile is unavailable')
    if (facing !== facings.at(-1)) facings.push(facing)
    await host.frame(100)
    await drain()
  }
  expect(facings).toEqual(['down', 'left', 'up', 'right', 'down'])
  expect(state().world.hostileAwareness).toBeUndefined()
  await advance(host, () => (bee()?.pos.col ?? 5) < 5)
  expect(bee()?.pos).toEqual({ col: 4.75, row: 2, height: 0 })
  fixture.assertInputUnchanged()
})

test('a teleport item gathers the follower at the destination before the first move', async () => {
  host = await installShellHost('?e2e=1')
  const first = shellScene('a')
  first.hooks = {
    onTeleport: {
      initial: 'exit',
      variants: {
        exit: {
          label: 'Exit',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'leave',
            stages: [{ id: 'leave', body: [{ kind: 'loadScene', scene: 'b' }] }],
          },
        },
      },
    },
  }
  const item: AuthorItemCore = {
    ...medicine('orb'),
    use: {
      target: 'scene',
      consuming: true,
      menuAfterUse: 'close',
      effects: [
        {
          kind: 'itemPrivateScript',
          script: { id: 'use', body: [{ kind: 'teleportOut', gatherParty: true }] },
        },
      ],
    },
  }
  const fixture = await bootScenario(host, {
    first,
    party: ['hero', 'friend'],
    items: [item],
    inventory: [{ itemId: item.id, count: 1 }],
  })
  const follower = () => {
    const debug: unknown = Reflect.get(window, '__tpE2e')
    if (!debug || typeof debug !== 'object' || !('dumpMotionState' in debug))
      throw new Error('motion observation unavailable')
    if (typeof debug.dumpMotionState !== 'function') throw new Error('motion reader unavailable')
    return debug.dumpMotionState().followers[0]
  }
  await key(host, 'ArrowRight')
  expect(follower()).toMatchObject({ template: 'friend', pos: { col: 2, row: 1, height: 0 } })
  await enterItems(host, 'use')
  await key(host, 'Enter')
  await advance(host, () => state().sceneId === 'b' && state().world.inventory.length === 0)
  expect(state().player.pos).toEqual({ col: 4, row: 3, height: 0 })
  expect(follower()).toMatchObject({
    template: 'friend',
    pos: { col: 3.9375, row: 2.9375, height: 0 },
    facing: 'right',
  })
  fixture.assertInputUnchanged()
})

test('H8 running item script owns exploration input until completion, then scene navigation works', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    items: [scroll()],
    inventory: [{ itemId: 'scroll', count: 1 }],
  })
  const before = structuredClone(state().world)
  await enterItems(host, 'use')
  await key(host, 'Enter')
  expect(state().renderDebug.menuActive).toBe(false)
  await key(host, ']')
  expect(state().sceneId).toBe('a')
  expect(state().world).toEqual(before)
  await advance(host, () => state().renderDebug.menuActive)
  expect(state().sceneId).toBe('a')
  const expected = structuredClone(before)
  expected.money += 7
  expected.inventory = []
  expect(state().world).toEqual(expected)
  await key(host, 'Escape')
  await key(host, 'Escape')
  await key(host, 'Escape')
  await key(host, ']')
  await advance(host, () => state().sceneId === 'b')
  expect(state().world).toEqual(expected)
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(true)
  h.assertInputUnchanged()
})

test('H8 item private script changes scene and closes the old menu while preserving its new world', async () => {
  host = await installShellHost()
  const item: AuthorItemCore = {
    ...medicine('portal'),
    use: {
      target: 'scene',
      consuming: true,
      effects: [
        {
          kind: 'itemPrivateScript',
          script: {
            id: 'use',
            body: [
              { kind: 'giveMoney', delta: 13 },
              { kind: 'loadScene', scene: 'b' },
            ],
          },
        },
      ],
    },
  }
  const h = await bootScenario(host, { items: [item], inventory: [{ itemId: 'portal', count: 1 }] })
  const before = structuredClone(state().world)
  await enterItems(host, 'use')
  await key(host, 'Enter')
  await advance(host, () => state().sceneId === 'b' && state().world.inventory.length === 0)
  const expected = structuredClone(before)
  expected.money += 13
  expected.inventory = []
  expect(state().world).toEqual(expected)
  expect(state().player.pos).toEqual({ col: 4, row: 3, height: 0 })
  expect(state().renderDebug.menuActive).toBe(false)
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(true)
  h.assertInputUnchanged()
})
