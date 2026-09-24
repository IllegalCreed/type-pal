// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key, observation } from './__tests__/runtime-shell/driver.js'
import { projectData, shellProject } from './__tests__/runtime-shell/project.js'
import { IndexedDbSaveStore } from './save/store.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test('menu storage ports write the selected real slot, retain rejected load UI, then restore and close on success', async () => {
  host = await installShellHost()
  const fixture = await shellProject(),
    input = structuredClone(projectData(fixture.project))
  const runtimeStore = await import('./save/store.js')
  // Transparent observation of both valid outcomes: a miswired read must fail by assertion,
  // not wait forever for the write that never happens. The real IDB implementation still runs.
  const writes = vi.spyOn(runtimeStore.IndexedDbSaveStore.prototype, 'putSlot')
  const reads = vi.spyOn(runtimeStore.IndexedDbSaveStore.prototype, 'getPayload')
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame()
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  const before = structuredClone(observation().world)
  for (const value of ['Escape', 'ArrowUp', 'Enter', 'Enter', 'ArrowDown', 'ArrowDown', 'Enter'])
    await key(host, value)
  await vi.waitFor(() =>
    expect(writes.mock.calls.length + reads.mock.calls.length).toBeGreaterThan(0),
  )
  const io = writes.mock.results[0] ?? reads.mock.results[0]
  if (!io || io.type !== 'return') throw new Error('real slot IO did not return')
  await io.value
  expect(writes).toHaveBeenCalledOnce()
  expect(reads).not.toHaveBeenCalled()
  const good = await store.getPayload('m01')
  expect(good).toEqual({
    version: 8,
    contentVersion: 20,
    projectId: 'shell-project',
    world: before,
    position: { sceneId: 'a', pos: { col: 2, row: 2, height: 0 }, facing: 'down' },
  })
  if (!good) throw new Error('manual snapshot missing')
  expect(await store.getPayload('quick')).toBeNull()
  expect(await store.getThumb('m01')).not.toBeNull()
  const meta = (await store.listMeta())[0]
  expect(meta).toMatchObject({ slotId: 'm01', savedTimes: 1 })
  if (!meta) throw new Error('manual meta missing')
  await vi.waitFor(() => {
    host!.frame()
    expect(
      host!.text.mock.calls.some((call) => call[1].some((span) => span.text === 'Shell Project')),
    ).toBe(true)
  })
  // Close browser/system/hub, then cast through the real menu to change the live world.
  for (const value of [
    'Escape',
    'Escape',
    'Escape',
    'Escape',
    'ArrowUp',
    'ArrowUp',
    'Enter',
    'Enter',
    'Enter',
    'Enter',
    'Escape',
    'Escape',
    'Escape',
  ])
    await key(host, value)
  expect(observation().world.party[0]).toMatchObject({ hp: 90, mp: 25 })
  const changed = structuredClone(observation().world)
  const bad = structuredClone(good)
  bad.world.party[0]!.hp = Number.NaN
  await store.putSlot(meta, bad, new Blob([chromePng().slice().buffer], { type: 'image/png' }))
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  // Hub remembers magic (1): twice down selects system; system remembers save (0).
  for (const value of ['Escape', 'ArrowDown', 'ArrowDown', 'Enter', 'ArrowDown', 'Enter', 'Enter'])
    await key(host, value)
  await vi.waitFor(() =>
    expect(warn.mock.calls.some((call) => String(call[0]).includes('归一化拒绝'))).toBe(true),
  )
  host.frame()
  expect(observation().world).toEqual(changed)
  expect(observation().renderDebug.menuActive).toBe(true)
  expect(
    host.text.mock.calls.some((call) => call[1].some((span) => span.text === '存档损坏，无法读取')),
  ).toBe(true)
  await store.putSlot(meta, good, new Blob([chromePng().slice().buffer], { type: 'image/png' }))
  await key(host, 'Enter')
  await vi.waitFor(() => expect(observation().renderDebug.menuActive).toBe(false))
  expect(observation().world).toEqual({
    ...before,
    audio: {},
    skillUseCounts: {},
    party: before.party.map((member) => ({
      ...member,
      extraPoisonRes: undefined,
      extraStatuses: undefined,
      poisons: undefined,
    })),
  })
  expect(await store.getPayload('m01')).toEqual(good)
  expect((await store.listMeta())[0]?.savedTimes).toBe(1)
  expect(projectData(fixture.project)).toEqual(input)
})
