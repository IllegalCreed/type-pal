// @vitest-environment jsdom
import { Blob as StreamBlob } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { MessageChannel as NativeChannel } from 'node:worker_threads'
import { loadCurrentProjectFrom } from '@type-pal/reforge'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../src/core/__tests__/battle-trial-project.js'
import {
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from '../src/core/battle-simulator-library.js'

const probes = vi.hoisted(() => ({
  boot: vi.fn(),
  run: vi.fn(),
  load: vi.fn(),
  record: vi.fn(),
  permission: vi.fn(),
}))
vi.mock('@type-pal/reforge', async (original) => ({
  ...(await original<typeof import('@type-pal/reforge')>()),
  bootGame: probes.boot,
  runBattleTrial: probes.run,
}))
vi.mock('../src/core/load-play-project.js', () => ({ loadPlayProject: probes.load }))
vi.mock('../src/core/handle-store.js', () => ({
  loadWorkspaceRecord: probes.record,
  ensurePermission: probes.permission,
}))
const W = '11111111-1111-4111-8111-111111111111',
  L = '22222222-2222-4222-8222-222222222222'
const opener = { closed: false, postMessage: vi.fn() },
  handle = { name: 'test-directory' }
const closers: Array<() => void> = []
const originalOpener = Object.getOwnPropertyDescriptor(window, 'opener')
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('Blob', StreamBlob)
  vi.stubGlobal('MessageChannel', NativeChannel)
  Object.defineProperty(window, 'opener', { configurable: true, value: opener })
  document.body.innerHTML =
    '<canvas id="screen"></canvas><div id="gate" hidden><button id="gate-btn">授权</button><p id="gate-hint"></p></div>'
  probes.run.mockResolvedValue(undefined)
  probes.record.mockResolvedValue({ workspaceId: W, projectId: 'simulator-smoke', handle })
  probes.permission.mockResolvedValue('granted')
  vi.spyOn(window, 'close').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  for (const close of closers.splice(0)) close()
  if (originalOpener) Object.defineProperty(window, 'opener', originalOpener)
  else Reflect.deleteProperty(window, 'opener')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})
async function fixture() {
  const files = await battleTrialProjectFiles(),
    project = await loadCurrentProjectFrom(fixtureSource(files))
  const config = resolveBattleSimulatorPlan(
    parseBattleSimulatorLibrary(files['editor/battle-simulator.json']),
    'basic',
  )
  probes.load.mockResolvedValue(project)
  return { project, config }
}
async function open(query = `project=simulator-smoke&save-workspace=${W}&battle-trial=${L}`) {
  history.replaceState(null, '', `/play.html?${query}`)
  await import('../src/play.js')
}
function deliver(config: unknown, source = 'http') {
  const channel = new NativeChannel()
  closers.push(() => {
    channel.port1.close()
    channel.port2.close()
  })
  const event = new MessageEvent('message', {
    origin: location.origin,
    data: {
      protocol: 'type-pal-battle-trial',
      kind: 'config',
      packet: {
        launchId: L,
        identity: { projectId: 'simulator-smoke', workspaceId: W, source },
        config,
        sourceToken: 'absent',
        revision: '1'.repeat(64),
      },
    },
  })
  Object.defineProperties(event, { source: { value: opener }, ports: { value: [channel.port1] } })
  window.dispatchEvent(event)
}
const cancel = () =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === '取消并关闭')!.click()

test('real play entry consumes the real handshake before routing exclusively to the isolated host', async () => {
  const { project, config } = await fixture()
  await open()
  expect(probes.load).not.toHaveBeenCalled()
  expect(document.getElementById('gate-hint')?.textContent).toContain('接收独立试打')
  deliver(config)
  await vi.waitFor(() => expect(probes.run).toHaveBeenCalledTimes(1))
  expect(probes.run).toHaveBeenCalledWith(
    project,
    config,
    expect.objectContaining({ sourceToken: 'absent', revision: '1'.repeat(64) }),
  )
  expect(probes.boot).not.toHaveBeenCalled()
  expect(probes.record).not.toHaveBeenCalled()
  expect(probes.load).toHaveBeenCalledWith('simulator-smoke', undefined)
})
test.each([
  'no-opener',
  'mixed-mode',
  'load-failure',
] as const)('%s stays an actionable error and never falls back to normal boot', async (failure) => {
  const { config } = await fixture()
  if (failure === 'no-opener')
    Object.defineProperty(window, 'opener', { value: null, configurable: true })
  if (failure === 'load-failure') probes.load.mockRejectedValue(new Error('读取工程失败'))
  await open(
    `project=simulator-smoke&save-workspace=${W}&battle-trial=${L}${failure === 'mixed-mode' ? '&battle=0' : ''}`,
  )
  if (failure === 'load-failure') deliver(config)
  await vi.waitFor(() => expect(document.querySelector('#gate-hint.err')).not.toBeNull())
  expect(document.getElementById('gate')?.hidden).toBe(false)
  expect(probes.boot).not.toHaveBeenCalled()
  expect(probes.run).not.toHaveBeenCalled()
  if (failure !== 'load-failure') expect(probes.load).not.toHaveBeenCalled()
})
test('cancel during entered project loading prevents a late successful load from starting battle', async () => {
  const { project, config } = await fixture()
  let release!: (value: typeof project) => void
  probes.load.mockImplementation(
    () =>
      new Promise((yes) => {
        release = yes
      }),
  )
  await open()
  deliver(config)
  await vi.waitFor(() => expect(probes.load).toHaveBeenCalledTimes(1))
  cancel()
  release(project)
  await vi.waitFor(() =>
    expect(document.querySelector('#gate-hint.err')?.textContent).toContain('取消'),
  )
  expect(probes.run).not.toHaveBeenCalled()
  expect(probes.boot).not.toHaveBeenCalled()
  expect(window.close).toHaveBeenCalledTimes(1)
})
test('late permission after cancellation cannot read the local project or start either runtime', async () => {
  const { config } = await fixture()
  let grant!: (value: string) => void
  probes.permission.mockResolvedValueOnce('prompt').mockImplementationOnce(
    () =>
      new Promise((yes) => {
        grant = yes
      }),
  )
  await open(`project=simulator-smoke&workspace=${W}&battle-trial=${L}`)
  deliver(config, 'local')
  await vi.waitFor(() => expect(document.getElementById('gate-btn')?.hidden).toBe(false))
  document.getElementById('gate-btn')!.click()
  expect(probes.permission).toHaveBeenCalledTimes(2)
  cancel()
  grant('granted')
  await vi.waitFor(() =>
    expect(document.querySelector('#gate-hint.err')?.textContent).toContain('取消'),
  )
  expect((document.getElementById('gate-btn') as HTMLButtonElement).onclick).toBeNull()
  expect(probes.load).not.toHaveBeenCalled()
  expect(probes.run).not.toHaveBeenCalled()
  expect(probes.boot).not.toHaveBeenCalled()
})
