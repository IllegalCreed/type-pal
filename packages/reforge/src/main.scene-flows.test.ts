// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key, observation } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'

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
  return { h: host, fixture }
}

test('H6 public next/previous scene input commits complete scenes and preserves party identity', async () => {
  const { h, fixture } = await boot(),
    before = structuredClone(observation().world)
  await key(h, ']')
  // A completion toast is emitted for any successfully selected scene. Wait for completion,
  // then assert the identity, so a wrong routing mutation fails by value, not by timeout.
  await vi.waitFor(() => {
    h.frame()
    expect(
      h.text.mock.calls.some((call) => call[1].some((span) => /^[ab]\([12]\/2\)$/.test(span.text))),
    ).toBe(true)
  })
  expect(observation().sceneId).toBe('b')
  expect(observation().player.pos).toEqual({ col: 4, row: 3, height: 0 })
  expect(fixture.reads).toContain('content/scenes/b.json')
  expect(fixture.reads).toContain('content/maps/b.json')
  expect(observation().world.party).toEqual(before.party)
  expect(observation().world.money).toBe(before.money)
  await key(h, '[')
  await vi.waitFor(() => expect(observation().sceneId).toBe('a'))
  expect(observation().player.pos).toEqual({ col: 2, row: 2, height: 0 })
})

test('H6 failed scene IO leaves the original world operable; repairing the same source permits retry', async () => {
  const { h, fixture } = await boot(),
    before = structuredClone(observation().world)
  let failures = 0
  fixture.hooks.read = (path) => {
    if (path === 'content/maps/b.json') {
      failures++
      throw new Error('source offline')
    }
  }
  await key(h, ']')
  await vi.waitFor(() => {
    h.frame()
    expect(
      h.text.mock.calls.some((call) => call[1].some((span) => span.text.startsWith('切场景失败:'))),
    ).toBe(true)
  })
  expect(failures).toBe(1)
  expect(observation().sceneId).toBe('a')
  expect(observation().world).toEqual(before)
  expect(observation().player.pos).toEqual({ col: 2, row: 2, height: 0 })
  await key(h, 'Escape')
  expect(observation().renderDebug.menuActive).toBe(true)
  await key(h, 'Escape')
  fixture.hooks.read = undefined
  await key(h, ']')
  await vi.waitFor(() => expect(observation().sceneId).toBe('b'))
})

test('H6 old in-flight scene response cannot overwrite a newer complete round trip', async () => {
  const { h, fixture } = await boot()
  const mapRead = vi.spyOn(await import('./scene-map.js'), 'loadSceneMap')
  let originalRead: ReturnType<typeof import('./scene-map.js')['loadSceneMap']> | undefined
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let entered = false,
    completed = false
  fixture.hooks.read = async (path) => {
    if (path === 'content/maps/b.json' && !entered) {
      entered = true
      await gate
      completed = true
    }
  }
  try {
    await key(h, ']')
    await vi.waitFor(() => expect(entered).toBe(true))
    const originalResult = mapRead.mock.results[0]
    if (!originalResult || originalResult.type !== 'return')
      throw new Error('original map request missing')
    originalRead = originalResult.value
    expect(observation().sceneId).toBe('a')
    expect(completed).toBe(false)
    await key(h, ']')
    await vi.waitFor(() => expect(observation().sceneId).toBe('b'))
    await key(h, '[')
    await vi.waitFor(() => expect(observation().sceneId).toBe('a'))
    const current = structuredClone(observation().world)
    release()
    await originalRead
    await h.settleIO()
    expect(completed).toBe(true)
    // Await real map completion and its continuation turn, not an old error toast.
    // The dev hop currently displays cancelled-request errors; that is an observation,
    // not a UI policy this test should freeze as correct.
    expect(observation().player.pos).toEqual({ col: 2, row: 2, height: 0 })
    expect(observation().sceneId).toBe('a')
    expect(observation().world).toEqual(current)
  } finally {
    release()
    await gate
    await originalRead
    await h.settleIO()
  }
})
