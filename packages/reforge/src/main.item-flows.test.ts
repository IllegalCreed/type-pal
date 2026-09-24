// @vitest-environment jsdom
import type { AuthorItemCore } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key } from './__tests__/runtime-shell/driver.js'
import {
  advance,
  bootScenario,
  enterItems,
  installShellHost,
  medicine,
  state,
} from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
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
  host.frame()
  expect(state().world).toEqual(before)
  expect(host.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))).toContain(
    '没有产生效果',
  )
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
  host.frame()
  expect(state().world).toEqual(before)
  expect(host.text.mock.calls.flatMap((call) => call[1].map((span) => span.text))).toContain(
    'No exit here',
  )
  h.assertInputUnchanged()
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
