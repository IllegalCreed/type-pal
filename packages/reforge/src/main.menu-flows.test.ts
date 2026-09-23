// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key, observation } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})
async function boot(options: Parameters<typeof shellProject>[0] = {}) {
  host = await installShellHost()
  const fixture = await shellProject(options)
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame()
  return host
}

test('H3 status panel cycles both real party members and returns through hub without changing world', async () => {
  const h = await boot(),
    before = structuredClone(observation().world)
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(true)
  await key(h, 'Enter')
  await key(h, 'ArrowRight')
  await key(h, 'Enter')
  expect(observation().renderDebug.menuActive).toBe(true)
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(false)
  expect(observation().world).toEqual(before)
})

test('H3 real magic route selects caster and target, heals only target, charges caster once, and backs out', async () => {
  const h = await boot(),
    before = structuredClone(observation().world)
  await key(h, 'Escape')
  await key(h, 'ArrowDown')
  await key(h, 'Enter')
  await key(h, 'Enter') // hero caster
  await key(h, 'Enter') // heal -> target
  await key(h, 'ArrowDown')
  await key(h, 'Enter') // friend target
  const expected = structuredClone(before)
  expected.party[0]!.mp -= 5
  expected.party[1]!.hp += 10
  expect(observation().world).toEqual(expected)
  await key(h, 'Escape')
  await key(h, 'Escape')
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(false)
  expect(observation().world).toEqual(expected)
})

test('H3 empty caster list cannot cast and returns to the same hub', async () => {
  const h = await boot(),
    before = structuredClone(observation().world)
  await key(h, 'Escape')
  await key(h, 'ArrowDown')
  await key(h, 'Enter')
  await key(h, 'ArrowDown')
  await key(h, 'Enter')
  await key(h, 'Enter')
  expect(observation().world).toEqual(before)
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(true)
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(false)
})

test('H3 insufficient MP cannot enter a cast; exact same skill succeeds with enough MP', async () => {
  for (const mp of [4, 5]) {
    const h = await boot({ party: ['hero'], seedStats: { hero: { mp } } })
    const before = structuredClone(observation().world)
    await key(h, 'Escape')
    await key(h, 'ArrowDown')
    await key(h, 'Enter')
    await key(h, 'Enter')
    await key(h, 'Enter')
    const expected = structuredClone(before)
    if (mp === 5) {
      expected.party[0]!.hp += 10
      expected.party[0]!.mp = 0
    }
    expect(observation().world).toEqual(expected)
    await h.settleIO()
    h.close()
    host = undefined
  }
})

test('H3 music switch commits explicit silence; cancellation preserves stored preferences and world', async () => {
  const h = await boot(),
    before = structuredClone(observation().world)
  await key(h, 'Escape')
  await key(h, 'ArrowUp')
  await key(h, 'Enter') // system
  await key(h, 'ArrowDown')
  await key(h, 'ArrowDown')
  await key(h, 'Enter') // music
  await key(h, 'ArrowRight')
  await key(h, 'Enter')
  expect(JSON.parse(localStorage.getItem('reforge:audio') ?? 'null')).toEqual({
    music: false,
    sound: true,
  })
  await key(h, 'Enter') // system again; cursor remembers music
  await key(h, 'Enter')
  await key(h, 'ArrowRight')
  await key(h, 'Escape')
  expect(JSON.parse(localStorage.getItem('reforge:audio') ?? 'null')).toEqual({
    music: false,
    sound: true,
  })
  expect(observation().world).toEqual(before)
  expect(observation().renderDebug.menuActive).toBe(true)
})

test.each([
  'equip',
  'use',
] as const)('H3 empty %s panel rejects confirm without closing hub or mutating inventory', async (panel) => {
  const h = await boot(),
    before = structuredClone(observation().world)
  await key(h, 'Escape')
  await key(h, 'ArrowDown')
  await key(h, 'ArrowDown')
  await key(h, 'Enter')
  if (panel === 'use') await key(h, 'ArrowDown')
  await key(h, 'Enter')
  await key(h, 'Enter')
  expect(observation().world).toEqual(before)
  await key(h, 'Escape')
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(true)
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(false)
})
