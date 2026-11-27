// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key, observation } from './__tests__/runtime-shell/driver.js'
import { projectData, shellProject } from './__tests__/runtime-shell/project.js'
import { expectDefined } from './defined.js'

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
})

test('normal boot executes the real current project pipeline and first world frame', async () => {
  host = await installShellHost()
  const fixture = await shellProject()
  const before = structuredClone(fixture.files)
  const inputBefore = structuredClone(projectData(fixture.project))
  const { bootGame } = await import('./main.js')
  await bootGame(fixture.project, { kind: 'project', projectId: fixture.project.manifest.id })
  await host.frame()
  expect(observation().sceneId).toBe('a')
  expect(observation().world.party.map((p) => p.template)).toEqual(['hero', 'friend'])
  expect(observation().world.money).toBe(50)
  expect(observation().player.pos).toEqual({ col: 2, row: 2, height: 0 })
  expect(host.frames.size).toBe(1)
  expect(host.draws.some((x) => x.method === 'drawImage')).toBe(true)
  expect(fixture.reads).toContain('content/maps/a.json')
  expect(fixture.files).toEqual(before)
  expect(projectData(fixture.project)).toEqual(inputBefore)
})

test.each([
  ['?entry=second', 'b', ['friend'], 90],
  ['?entry=unknown', 'a', ['hero', 'friend'], 50],
] as const)('startup %s selects a complete entry, not just its scene', async (query, scene, party, money) => {
  host = await installShellHost(query)
  const fixture = await shellProject()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await host.frame()
  expect(observation().sceneId).toBe(scene)
  expect(observation().world.party.map((x) => x.template)).toEqual(party)
  expect(observation().world.money).toBe(money)
  expect(observation().player.pos).toEqual(
    scene === 'b' ? { col: 4, row: 3, height: 0 } : { col: 2, row: 2, height: 0 },
  )
  expect(
    warning.mock.calls.map((args) => String(args[0])).filter((x) => x.startsWith('[boot]')),
  ).toEqual(query.includes('unknown') ? ['[boot] 入口点 "unknown" 不存在,走直接启动项'] : [])
})

test.each([
  'scope',
  'canvas',
  'context',
])('%s failure has no playable frame or published world', async (mode) => {
  host = await installShellHost()
  const fixture = await shellProject()
  if (mode === 'canvas') document.body.replaceChildren()
  if (mode === 'context') vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  const { bootGame } = await import('./main.js')
  const result = await bootGame(fixture.project, {
    kind: 'project',
    projectId: mode === 'scope' ? 'another-project' : 'shell-project',
  }).then(
    () => 'resolved',
    (e: Error) => e.message,
  )
  expect(result).toMatch(
    mode === 'scope' ? /当前项目/ : mode === 'canvas' ? /canvas/ : /2d context/,
  )
  expect(host.frames.size).toBe(0)
  expect(Reflect.has(window, '__reforge')).toBe(false)
  expect(host.fetches).toEqual([])
})

test('failed chrome read rejects the real boot; repaired source boots on a fresh owner', async () => {
  host = await installShellHost()
  const registry = await import('./engine-chrome/registry.js')
  host.overrides.set(
    registry.ENGINE_CHROME.fontBdf,
    async () => new Response('broken', { status: 503 }),
  )
  const fixture = await shellProject()
  const failure = await (await import('./main.js'))
    .bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
    .then(
      () => 'resolved',
      (error: Error) => error.message,
    )
  expect(failure).toContain('503')
  expect(host.frames.size).toBe(0)
  expect(Reflect.has(window, '__reforge')).toBe(false)
  await host.close()
  host = await installShellHost()
  await (await import('./main.js')).bootGame((await shellProject()).project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await host.frame()
  expect(observation().sceneId).toBe('a')
})

test('title startup without videos boots the selected entry and its world', async () => {
  host = await installShellHost('?menu')
  const fixture = await shellProject()
  const { bootGame } = await import('./main.js')
  let settled = false
  const pending = bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
  const consumed = pending.then(
    () => {
      settled = true
    },
    () => {
      settled = true
    },
  )
  try {
    await vi.waitFor(() => expect(host!.frames.size).toBe(1))
    expect(Reflect.has(window, '__reforge')).toBe(false)
    expect(settled).toBe(false)
    await key(host, 'ArrowDown')
    await key(host, 'Enter')
    await pending
    await host.frame()
    expect(observation().sceneId).toBe('b')
    expect(observation().world.party.map((p) => p.template)).toEqual(['friend'])
    expect(observation().world.money).toBe(90)
    expect(observation().renderDebug.menuActive).toBe(false)
    expect(host.frames.size).toBe(1)
  } finally {
    if (!settled) {
      host.key('Escape')
      host.key('ArrowDown')
      host.key('Enter')
      await drain()
    }
    await consumed
  }
})

test.each([
  '?battle-trial=0&money=0',
  '?skill=heal',
] as const)('旧试放/独立试打参数在 bootGame 入口精确拒绝 %s', async (query) => {
  host = await installShellHost(query)
  const fixture = await shellProject()
  const failure = await (await import('./main.js'))
    .bootGame(fixture.project, { kind: 'project', projectId: 'shell-project' })
    .then(
      () => 'resolved' as const,
      (error: Error) => error.message,
    )
  expect(failure).toBe('旧试放链接或未授权独立试打请求；请从编辑器的战斗模拟器重新开始')
  expect(host.frames.size).toBe(0)
})

test('without IndexedDB, quick save writes the current entry through the memory store', async () => {
  host = await installShellHost()
  vi.stubGlobal('indexedDB', undefined)
  const { MemorySaveStore } = await import('./save/store.js')
  const put = vi.spyOn(MemorySaveStore.prototype, 'putSlot')
  const fixture = await shellProject()
  await (await import('./main.js')).bootGame(fixture.project, {
    kind: 'project',
    projectId: 'shell-project',
  })
  await host.frame()
  expect(observation().sceneId).toBe('a')
  await key(host, 'F5')
  await vi.waitFor(() => expect(put).toHaveBeenCalledOnce())
  const [meta, payload] = expectDefined(put.mock.calls[0])
  await expectDefined(put.mock.results[0]).value
  expect(meta).toMatchObject({ slotId: 'quick', savedTimes: 1 })
  expect(payload.position).toMatchObject({ sceneId: 'a', pos: { col: 2, row: 2, height: 0 } })
  expect(payload.world.party.map(({ template }) => template)).toEqual(['hero', 'friend'])
})
