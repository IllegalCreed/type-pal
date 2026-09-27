// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { observation } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import type { StoredSavePayload } from './save/types.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
  Reflect.deleteProperty(window, '__tpObserve')
})
interface Probe {
  readBoot(): { projectId: string; entryId: string; opening: null; checkpointLoad: string }
  readRuntime(): {
    sceneId: string
    position: { col: number }
    dialogue: null
    scriptRunning: boolean
  }
  dumpSave(): Promise<StoredSavePayload>
}
function probe(): Probe {
  const read = Reflect.get(window, '__tpObserve') as Omit<Probe, 'dumpSave'>
  const checkpoint = Reflect.get(window, '__tpE2e') as Pick<Probe, 'dumpSave'>
  return { ...read, dumpSave: checkpoint.dumpSave }
}
async function boot(query = '', payload?: StoredSavePayload) {
  host = await installShellHost(query)
  const fixture = await shellProject()
  if (payload)
    host.overrides.set('/checkpoint.json', async () => new Response(JSON.stringify(payload)))
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame()
  return host
}

test('runtime observation is detached/read-only and preserves actual world and player state', async () => {
  await boot()
  const before = structuredClone(observation().world)
  const initial = probe().readRuntime()
  expect(initial).toMatchObject({ sceneId: 'a', dialogue: null, scriptRunning: false })
  expect(probe().readBoot()).toMatchObject({
    projectId: 'shell-project',
    opening: null,
    checkpointLoad: 'none',
  })
  expect(Reflect.set(initial.position, 'col', 999)).toBe(false)
  expect(probe().readRuntime()).toEqual(initial)
  expect(observation().world).toEqual(before)
})

test('real checkpoint restore reports loaded; rejected input is explicitly failed even when boot falls back', async () => {
  await boot()
  const payload = await probe().dumpSave()
  host?.close()
  host = undefined
  const restoredHost = await boot('?e2e-load=/checkpoint.json', payload)
  expect(probe().readBoot().checkpointLoad).toBe('loaded')
  expect(probe().readRuntime().sceneId).toBe(payload.position.sceneId)
  restoredHost.close()
  host = undefined
  host = await installShellHost('?e2e-load=/checkpoint.json')
  host.overrides.set(
    '/checkpoint.json',
    async () => new Response(JSON.stringify({ ...payload, projectId: 'foreign' })),
  )
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  host.frame()
  expect(probe().readBoot().checkpointLoad).toBe('failed')
  expect(warn.mock.calls.some((row) => String(row[0]).includes('[e2e-load] 恢复失败'))).toBe(true)
})
