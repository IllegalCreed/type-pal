// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key } from './__tests__/runtime-shell/driver.js'
import {
  bootScenario,
  combatActor,
  enterItems,
  installShellHost,
  medicine,
  state,
  weapon,
} from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test('H7 equip confirmation can be cancelled without changing the actual world or author input', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    items: [weapon('blade')],
    inventory: [{ itemId: 'blade', count: 1 }],
  })
  const before = structuredClone(state().world)
  await enterItems(host, 'equip')
  await key(host, 'Enter')
  expect(state().world).toEqual(before)
  await key(host, 'Escape')
  expect(state().world).toEqual(before)
  await key(host, 'Escape')
  await key(host, 'Escape')
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(false)
  h.assertInputUnchanged()
})

test('H7 equip empty slot commits only selected equipment and removes exactly one bag item', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    items: [weapon('blade'), medicine()],
    inventory: [
      { itemId: 'blade', count: 2 },
      { itemId: 'tonic', count: 3 },
    ],
  })
  const expected = structuredClone(state().world)
  expected.party[0]!.equipment.weapon = 'blade'
  expected.inventory[0]!.count = 1
  await enterItems(host, 'equip')
  await key(host, 'Enter')
  await key(host, 'Enter')
  expect(state().world).toEqual(expected)
  expect(state().renderDebug.menuActive).toBe(true)
  h.assertInputUnchanged()
})

test('H7 equip occupied slot swaps back through the same confirmation panel without losing inventory', async () => {
  host = await installShellHost()
  const hero = combatActor()
  if (!hero.battler) throw new Error('missing battler')
  hero.battler.initialEquipment.weapon = 'old'
  const h = await bootScenario(host, {
    actors: [hero],
    items: [weapon('old'), weapon('new'), medicine()],
    inventory: [
      { itemId: 'new', count: 1 },
      { itemId: 'tonic', count: 3 },
    ],
  })
  const before = structuredClone(state().world)
  const changed = structuredClone(before)
  changed.party[0]!.equipment.weapon = 'new'
  changed.inventory = [
    { itemId: 'tonic', count: 3 },
    { itemId: 'old', count: 1 },
  ]
  await enterItems(host, 'equip')
  await key(host, 'Enter')
  await key(host, 'Enter')
  expect(state().world).toEqual(changed)
  await key(host, 'Enter')
  const restored = structuredClone(before)
  restored.inventory = [
    { itemId: 'tonic', count: 3 },
    { itemId: 'new', count: 1 },
  ]
  expect(state().world).toEqual(restored)
  h.assertInputUnchanged()
})

test.each([
  { keys: ['ArrowRight'], chosen: 'w1' },
  { keys: ['ArrowDown'], chosen: 'w3' },
  { keys: ['ArrowDown', 'ArrowUp'], chosen: 'w0' },
  { keys: ['ArrowRight', 'ArrowLeft'], chosen: 'w0' },
])('H7 equip keyboard navigation $keys commits $chosen, not the original cursor', async ({
  keys,
  chosen,
}) => {
  host = await installShellHost()
  const items = Array.from({ length: 4 }, (_, i) => weapon(`w${i}`))
  const h = await bootScenario(host, {
    items,
    inventory: items.map(({ id }) => ({ itemId: id, count: 1 })),
  })
  const expected = structuredClone(state().world)
  expected.party[0]!.equipment.weapon = chosen
  expected.inventory = expected.inventory.filter((item) => item.itemId !== chosen)
  await enterItems(host, 'equip')
  for (const value of keys) await key(host, value)
  await key(host, 'Enter')
  await key(host, 'Enter')
  expect(state().world).toEqual(expected)
  h.assertInputUnchanged()
})
