// @vitest-environment jsdom
import type { WorldState } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key, observation } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import { IndexedDbSaveStore } from './save/store.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})
async function boot() {
  host = await installShellHost()
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame()
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  return { h: host, fixture, store }
}
async function saved(store: IndexedDbSaveStore) {
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const payload = await store.getPayload('quick')
  if (!payload) throw new Error('quick save missing')
  return payload
}

function expectedRestored(world: WorldState): WorldState {
  // SAVE8 normalization supplies counts and the documented restore step clears transient conditions.
  return {
    ...structuredClone(world),
    audio: {},
    skillUseCounts: {},
    party: world.party.map((member) => ({
      ...structuredClone(member),
      extraPoisonRes: undefined,
      extraStatuses: undefined,
      poisons: undefined,
    })),
  }
}

test('H5 F5 stores real SAVE8 data, F9 restores after actual menu spell, and scopes remain isolated', async () => {
  const { h, store } = await boot()
  const before = structuredClone(observation().world)
  await key(h, 'F5')
  const payload = await saved(store)
  expect(payload).toEqual({
    version: 8,
    contentVersion: 20,
    projectId: 'shell-project',
    world: before,
    position: { sceneId: 'a', pos: { col: 2, row: 2, height: 0 }, facing: 'down' },
  })
  expect((await store.listMeta())[0]?.savedTimes).toBe(1)
  expect(await store.getThumb('quick')).not.toBeNull()
  expect(
    await new IndexedDbSaveStore({ kind: 'project', projectId: 'other' }).getPayload('quick'),
  ).toBeNull()
  await key(h, 'Escape')
  await key(h, 'ArrowDown')
  await key(h, 'Enter')
  await key(h, 'Enter')
  await key(h, 'Enter')
  await key(h, 'Enter')
  expect(observation().world.party[0]?.hp).toBe(90)
  expect(observation().world.party[0]?.mp).toBe(25)
  await key(h, 'Escape')
  await key(h, 'Escape')
  await key(h, 'Escape')
  await key(h, 'F9')
  await vi.waitFor(() => expect(observation().world.party[0]?.mp).toBe(30))
  expect(observation().world).toEqual(expectedRestored(before))
  expect(await store.getPayload('quick')).toEqual(payload)
  h.frame()
  expect(
    h.text.mock.calls.some((call) => call[1].some((span) => span.text === '已读取快速存档')),
  ).toBe(true)
})

test('H5 empty slot preserves world and shows the absent message, not load success', async () => {
  const { h } = await boot(),
    before = structuredClone(observation().world)
  await key(h, 'F9')
  await vi.waitFor(() => {
    h.frame()
    expect(
      h.text.mock.calls.some((call) => call[1].some((span) => span.text.includes('无快速存档'))),
    ).toBe(true)
  })
  expect(observation().world).toEqual(before)
  expect(
    h.text.mock.calls.some((call) => call[1].some((span) => span.text === '已读取快速存档')),
  ).toBe(false)
})

test('H5 corrupt snapshot is rejected without mutation, menu remains usable, then the original snapshot restores', async () => {
  const { h, store } = await boot()
  await key(h, 'F5')
  const good = await saved(store),
    before = structuredClone(observation().world)
  const meta = (await store.listMeta())[0]!
  const bad = structuredClone(good)
  bad.world.party[0]!.hp = Number.NaN
  await store.putSlot(meta, bad, new Blob([chromePng().slice().buffer], { type: 'image/png' }))
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await key(h, 'F9')
  await vi.waitFor(() =>
    expect(warning.mock.calls.some((row) => String(row[0]).includes('归一化拒绝'))).toBe(true),
  )
  h.frame()
  expect(observation().world).toEqual(before)
  expect(
    h.text.mock.calls.some((call) => call[1].some((span) => span.text === '存档损坏，无法读取')),
  ).toBe(true)
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(true)
  await key(h, 'Escape')
  await store.putSlot(meta, good, new Blob([chromePng().slice().buffer], { type: 'image/png' }))
  await key(h, 'F9')
  await vi.waitFor(() => {
    h.frame()
    expect(
      h.text.mock.calls.some((call) => call[1].some((span) => span.text === '已读取快速存档')),
    ).toBe(true)
  })
  expect(observation().world).toEqual(expectedRestored(before))
})

test('H5 two actual quick-save requests commit monotonically without consuming an extra count', async () => {
  const { h, store } = await boot()
  await key(h, 'F5')
  await key(h, 'F5')
  await vi.waitFor(async () => expect((await store.listMeta())[0]?.savedTimes).toBe(2))
  expect(await store.listMeta()).toHaveLength(1)
  expect((await saved(store)).world).toEqual(observation().world)
})

test('H5 delayed old IDB read cannot replace a newer restore or its success message', async () => {
  const { h, store } = await boot()
  await key(h, 'F5')
  const first = await saved(store),
    meta = (await store.listMeta())[0]!
  const held = h.holdNextPayloadRead()
  try {
    await key(h, 'F9')
    await vi.waitFor(() => expect(held.entered).toBe(true))
    expect(held.delivered).toBe(false)
    const next = structuredClone(first)
    next.world.money = 123
    next.position.sceneId = 'b'
    await store.putSlot(meta, next, new Blob([chromePng().slice().buffer], { type: 'image/png' }))
    await key(h, 'F9')
    await vi.waitFor(() => expect(observation().world.money).toBe(123))
    expect(observation().sceneId).toBe('b')
    const committed = structuredClone(observation().world)
    held.release()
    await held.consumed
    await h.settleIO()
    expect(held.delivered).toBe(true)
    expect(observation().world).toEqual(committed)
    expect(observation().sceneId).toBe('b')
    h.text.mockClear()
    h.frame()
    expect(
      h.text.mock.calls.some((call) => call[1].some((span) => span.text === '已读取快速存档')),
    ).toBe(true)
  } finally {
    held.release()
    if (held.entered) await held.consumed
    await h.settleIO()
  }
})
