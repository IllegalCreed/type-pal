import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rixFixture } from '../__tests__/rix-fixture.js'
import { createRixBackend } from './audio-rix.js'

const wasm = readFileSync('src/shell/rix/rix.wasm')
class Context {
  static current: Context
  state = 'suspended'
  destination = {}
  gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }
  audioWorklet = { addModule: vi.fn(async () => {}) }
  close = vi.fn(async () => {})
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  constructor() {
    Context.current = this
  }
  createGain() {
    return this.gain
  }
}
class WorkletNode {
  static current: WorkletNode | undefined
  port = { onmessage: (_event: MessageEvent) => {}, postMessage: vi.fn() }
  connect = vi.fn()
  disconnect = vi.fn()
  onprocessorerror = () => {}
  constructor() {
    WorkletNode.current = this
    queueMicrotask(() =>
      this.port.onmessage(new MessageEvent('message', { data: { type: 'ready' } })),
    )
  }
}
function pending<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
beforeEach(() => {
  WorkletNode.current = undefined
  vi.stubGlobal('AudioContext', Context)
  vi.stubGlobal('AudioWorkletNode', WorkletNode)
})
afterEach(() => vi.unstubAllGlobals())

describe('FM backend at browser media IO boundaries', () => {
  it('queues the latest song until ready, connects with the current mute, and unlocks by gesture', async () => {
    const archive = pending<Response>()
    vi.stubGlobal('fetch', (url: URL | string) =>
      String(url).endsWith('mus.mkf') ? archive.promise : Promise.resolve(new Response(wasm)),
    )
    const backend = createRixBackend('/extracted')
    backend.setVolume?.(0)
    backend.play(49, true)
    backend.play(3, false)
    backend.resume?.()
    archive.resolve(new Response(rixFixture()))
    await backend.ready
    expect(WorkletNode.current?.port.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'play',
      track: 3,
      loop: false,
    })
    expect(WorkletNode.current?.connect).toHaveBeenCalledWith(Context.current.gain)
    expect(Context.current.gain.gain.value).toBe(0)
    expect(Context.current.resume).toHaveBeenCalledOnce()
    backend.stop()
    expect(WorkletNode.current?.port.postMessage).toHaveBeenLastCalledWith({ type: 'stop' })
    backend.dispose?.()
    backend.dispose?.()
    expect(Context.current.close).toHaveBeenCalledOnce()
    expect(WorkletNode.current?.disconnect).toHaveBeenCalledOnce()
  })

  it('never creates output after a disposed initialization finishes late', async () => {
    const archive = pending<Response>()
    vi.stubGlobal('fetch', (url: URL | string) =>
      String(url).endsWith('mus.mkf') ? archive.promise : Promise.resolve(new Response(wasm)),
    )
    const backend = createRixBackend('/extracted')
    backend.play(49, true)
    backend.dispose?.()
    archive.resolve(new Response(rixFixture()))
    await backend.ready
    expect(WorkletNode.current).toBeUndefined()
    expect(Context.current.close).toHaveBeenCalledOnce()
  })

  it('surfaces a missing RIX library and allows cleanup of the partial context', async () => {
    vi.stubGlobal('fetch', (url: URL | string) =>
      Promise.resolve(
        String(url).endsWith('mus.mkf') ? new Response('', { status: 404 }) : new Response(wasm),
      ),
    )
    const backend = createRixBackend('/extracted')
    await expect(backend.ready).rejects.toThrow('RIX 曲库加载失败 (404)')
    backend.dispose?.()
    expect(WorkletNode.current).toBeUndefined()
    expect(Context.current.gain.disconnect).toHaveBeenCalledOnce()
  })

  it('reports processor failures after readiness rather than leaving a silent ready backend', async () => {
    vi.stubGlobal('fetch', (url: URL | string) =>
      Promise.resolve(new Response(String(url).endsWith('mus.mkf') ? rixFixture() : wasm)),
    )
    const backend = createRixBackend('/extracted')
    const failed = vi.fn()
    backend.setErrorHandler?.(failed)
    await backend.ready
    WorkletNode.current?.onprocessorerror()
    expect(failed).toHaveBeenCalledExactlyOnceWith(new Error('FM 音频处理失败'))
    backend.dispose?.()
  })
})
