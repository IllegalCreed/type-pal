// @vitest-environment jsdom

import { Blob as StreamBlob } from 'node:buffer'
import { webcrypto } from 'node:crypto'
import { MessageChannel as NativeChannel } from 'node:worker_threads'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../src/core/__tests__/battle-trial-project.js'
import {
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from '../src/core/battle-simulator-library.js'
import {
  launchBattleTrial,
  parseBattleTrialLocation,
  receiveBattleTrial,
} from '../src/core/battle-trial-launch.js'

const identity = {
  projectId: 'simulator-smoke',
  workspaceId: '11111111-1111-4111-8111-111111111111',
  source: 'http' as const,
}
const origin = window.location.origin
const originalOpener = Object.getOwnPropertyDescriptor(window, 'opener')
const closers: Array<() => void> = []
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('MessageChannel', NativeChannel)
  vi.stubGlobal('Blob', StreamBlob)
})
afterEach(() => {
  for (const close of closers.splice(0)) close()
  if (originalOpener) Object.defineProperty(window, 'opener', originalOpener)
  else Reflect.deleteProperty(window, 'opener')
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function send(source: unknown, data: unknown, ports: unknown[] = [], messageOrigin = origin) {
  const event = new MessageEvent('message', { data, origin: messageOrigin })
  Object.defineProperties(event, { source: { value: source }, ports: { value: ports } })
  window.dispatchEvent(event)
}
async function setup() {
  const files = await battleTrialProjectFiles(),
    source = fixtureSource(files)
  const config = resolveBattleSimulatorPlan(
    parseBattleSimulatorLibrary(files['editor/battle-simulator.json']),
    'basic',
  )
  return { source, config, files }
}
function popup() {
  const messages: Array<{ data: any; port: MessagePort }> = []
  let deliver!: (v: { data: any; port: MessagePort }) => void
  const delivered = new Promise<{ data: any; port: MessagePort }>((r) => {
    deliver = r
  })
  const child = {
    closed: false,
    location: { href: '' },
    close: vi.fn(() => {
      child.closed = true
    }),
    postMessage: vi.fn((data, expectedOrigin, ports = []) => {
      expect(expectedOrigin).toBe(origin)
      if (data.kind === 'config') {
        const clone = structuredClone({ data, port: ports[0] }, { transfer: ports })
        closers.push(() => clone.port.close())
        messages.push(clone)
        deliver(clone)
      }
    }),
  }
  const open = vi.spyOn(window, 'open').mockReturnValue(child as unknown as Window)
  return { child, open, delivered, messages }
}
function readyFor(child: unknown, open: ReturnType<typeof popup>['open']) {
  const url = new URL(String(open.mock.calls[0]![0]), origin)
  const target = parseBattleTrialLocation(url.searchParams)!
  send(child, { protocol: 'type-pal-battle-trial', kind: 'ready', launchId: target.launchId })
  return target
}
describe('one-time simulator launch transport', () => {
  test('rejects mixed/duplicate modes and fourth member before opening a window', async () => {
    expect(() => parseBattleTrialLocation(new URLSearchParams('battle-trial=bad'))).toThrow(
      '启动标识',
    )
    const params = new URLSearchParams({
      project: identity.projectId,
      'save-workspace': identity.workspaceId,
      'battle-trial': crypto.randomUUID(),
      skill: 'x',
    })
    expect(() => parseBattleTrialLocation(params)).toThrow('参数')
    params.delete('skill')
    params.append('project', 'another')
    expect(() => parseBattleTrialLocation(params)).toThrow('重复')
    const { source, config } = await setup(),
      { open } = popup()
    config.party.members = Array.from({ length: 4 }, (_, i) => ({
      ...structuredClone(config.party.members[0]!),
      actorId: `a${i}`,
    }))
    expect(() => launchBattleTrial({ identity, source, config, assertCanLaunch() {} })).toThrow(
      '最多3名',
    )
    expect(open).not.toHaveBeenCalled()
  })
  test('ignores wrong origin/source/nonce, transfers only once, and never places configuration in URL/storage', async () => {
    const { source, config } = await setup(),
      { child, open, delivered } = popup()
    const check = vi.fn(),
      storage = vi.spyOn(Storage.prototype, 'setItem'),
      closed = vi.fn()
    const handle = launchBattleTrial({
      identity,
      source,
      config,
      assertCanLaunch: check,
      onClosed: closed,
    })
    closers.push(handle.close)
    const target = parseBattleTrialLocation(
      new URL(String(open.mock.calls[0]![0]), origin).searchParams,
    )!
    const message = { protocol: 'type-pal-battle-trial', kind: 'ready', launchId: target.launchId }
    send({}, message)
    send(child, message, [], 'https://elsewhere.invalid')
    send(child, { ...message, launchId: crypto.randomUUID() })
    expect(check).not.toHaveBeenCalled()
    readyFor(child, open)
    readyFor(child, open)
    const received = await delivered
    expect(received.data.packet.config).toEqual(config)
    expect(received.data.packet.identity).toEqual(identity)
    expect(received.data.packet.revision).toMatch(/^[a-f0-9]{64}$/)
    expect([...new URL(String(open.mock.calls[0]![0]), origin).searchParams.keys()]).toEqual([
      'project',
      'save-workspace',
      'battle-trial',
    ])
    expect(storage).not.toHaveBeenCalled()
    received.port.postMessage({ kind: 'ack' })
    await handle.ready
    expect(child.postMessage).toHaveBeenCalledTimes(1)
    handle.close()
    handle.close()
    expect(closed).toHaveBeenCalledTimes(1)
    expect(child.close).toHaveBeenCalledTimes(1)
  })
  test('closing while admission is suspended prevents late project IO and delivery', async () => {
    const { source, config } = await setup(),
      { child, open } = popup()
    let release!: () => void
    const blocked = new Promise<void>((r) => {
      release = r
    })
    const read = vi.spyOn(source, 'readJson')
    const readState = vi.spyOn(source, 'readText')
    const handle = launchBattleTrial({ identity, source, config, assertCanLaunch: () => blocked })
    const outcome = handle.ready.catch((e) => e)
    readyFor(child, open)
    handle.close()
    release()
    expect(await outcome).toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    await Promise.resolve()
    expect(read).not.toHaveBeenCalled()
    expect(readState).not.toHaveBeenCalled()
    expect(child.postMessage).not.toHaveBeenCalled()
  })
  test('ack consumes the URL nonce; refresh fails immediately without another configuration', async () => {
    const { source, config } = await setup(),
      { child, open, delivered } = popup()
    const handle = launchBattleTrial({ identity, source, config, assertCanLaunch() {} })
    closers.push(handle.close)
    readyFor(child, open)
    const received = await delivered
    received.port.postMessage({ kind: 'ack' })
    await handle.ready
    readyFor(child, open)
    expect(child.postMessage).toHaveBeenCalledTimes(2)
    expect(child.postMessage.mock.calls[1]![0]).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('已使用'),
    })
  })
  test('restart rotates the nonce in the same window and rebuilds from the original config', async () => {
    const { source, config } = await setup(),
      { child, open, delivered, messages } = popup()
    const original = structuredClone(config)
    const handle = launchBattleTrial({ identity, source, config, assertCanLaunch() {} })
    closers.push(handle.close)
    const first = readyFor(child, open),
      received = await delivered
    received.port.postMessage({ kind: 'ack' })
    await handle.ready
    config.money = 999
    received.data.packet.config.money = 222
    received.port.postMessage({ kind: 'restart' })
    await vi.waitFor(() => expect(child.location.href).toContain('battle-trial='))
    const next = parseBattleTrialLocation(new URL(child.location.href, origin).searchParams)!
    expect(next.launchId).not.toBe(first.launchId)
    expect(open).toHaveBeenCalledTimes(1)
    send(child, { protocol: 'type-pal-battle-trial', kind: 'ready', launchId: first.launchId })
    expect(messages).toHaveLength(1)
    send(child, { protocol: 'type-pal-battle-trial', kind: 'ready', launchId: next.launchId })
    await vi.waitFor(() => expect(messages).toHaveLength(2))
    expect(messages[1]!.data.packet.config).toEqual(original)
    messages[1]!.port.postMessage({ kind: 'ack' })
  })
  test('restart after a real project change refuses stale configuration', async () => {
    const { source, config, files } = await setup(),
      { child, open, delivered } = popup()
    const handle = launchBattleTrial({ identity, source, config, assertCanLaunch() {} })
    closers.push(handle.close)
    readyFor(child, open)
    const received = await delivered
    received.port.postMessage({ kind: 'ack' })
    await handle.ready
    const manifest = files['manifest.json'] as { name: string }
    manifest.name = 'Changed project title'
    received.port.postMessage({ kind: 'restart' })
    await vi.waitFor(() => expect(child.location.href).toContain('battle-trial='))
    const next = parseBattleTrialLocation(new URL(child.location.href, origin).searchParams)!
    send(child, { protocol: 'type-pal-battle-trial', kind: 'ready', launchId: next.launchId })
    await vi.waitFor(() => expect(child.postMessage).toHaveBeenCalledTimes(2))
    expect(child.postMessage.mock.calls[1]![0]).toMatchObject({
      kind: 'error',
      message: expect.stringContaining('工程已变化'),
    })
  })
  test('receiver checks identity and rejects duplicate-use configuration after ack', async () => {
    const { config } = await setup()
    const opener = { closed: false, postMessage: vi.fn() }
    Object.defineProperty(window, 'opener', { value: opener, configurable: true })
    const target = { identity, launchId: crypto.randomUUID() }
    const connection = receiveBattleTrial(target)
    closers.push(connection.dispose)
    const channel = new NativeChannel()
    closers.push(() => {
      channel.port1.close()
      channel.port2.close()
    })
    const ack = new Promise<unknown>((resolve) => channel.port2.once('message', resolve))
    const data = {
      protocol: 'type-pal-battle-trial',
      kind: 'config',
      packet: { ...target, config, sourceToken: 'absent', revision: '1'.repeat(64) },
    }
    send({}, data, [channel.port1])
    send(opener, data, [channel.port1])
    const packet = await connection.ready
    expect(await ack).toEqual({ kind: 'ack' })
    expect(packet.config).toEqual(config)
    send(opener, { ...data, packet: { ...data.packet, config: {} } }, [])
    expect(connection.signal.aborted).toBe(false)
    connection.dispose()
    expect(connection.signal.aborted).toBe(true)
  })
  test('receiver refuses a changed project rather than normal boot, and refuses refresh without opener', async () => {
    const { config } = await setup(),
      opener = { closed: false, postMessage: vi.fn() }
    Object.defineProperty(window, 'opener', { value: opener, configurable: true })
    const target = { identity, launchId: crypto.randomUUID() },
      connection = receiveBattleTrial(target)
    closers.push(connection.dispose)
    const channel = new NativeChannel()
    closers.push(() => {
      channel.port1.close()
      channel.port2.close()
    })
    const outcome = connection.ready.catch((e) => e)
    send(
      opener,
      {
        protocol: 'type-pal-battle-trial',
        kind: 'config',
        packet: {
          ...target,
          identity: { ...identity, projectId: 'other' },
          config,
          sourceToken: 'absent',
          revision: '1'.repeat(64),
        },
      },
      [channel.port1],
    )
    expect(await outcome).toBeInstanceOf(Error)
    Object.defineProperty(window, 'opener', { value: null, configurable: true })
    expect(() => receiveBattleTrial(target)).toThrow('请从编辑器')
  })
})
