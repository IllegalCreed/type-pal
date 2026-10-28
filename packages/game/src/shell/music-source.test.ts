import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAudioManager, type MusicBackend } from './audio.js'
import {
  createMusicSourceController as createSource,
  MUSIC_SOURCE_KEY,
  readMusicSource,
} from './music-source.js'

const sources: ReturnType<typeof createSource>[] = []
let previousSource: string | null
beforeEach(() => {
  previousSource = localStorage.getItem(MUSIC_SOURCE_KEY)
})
afterEach(() => {
  try {
    for (const source of sources.splice(0)) source.dispose?.()
  } finally {
    if (previousSource === null) localStorage.removeItem(MUSIC_SOURCE_KEY)
    else localStorage.setItem(MUSIC_SOURCE_KEY, previousSource)
  }
})
function createMusicSourceController(...args: Parameters<typeof createSource>) {
  const source = createSource(...args)
  sources.push(source)
  return source
}

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function backend(ready = Promise.resolve()): MusicBackend {
  return {
    ready,
    play: vi.fn(),
    stop: vi.fn(),
    resume: vi.fn(),
    dispose: vi.fn(),
    setVolume: vi.fn(),
  }
}

describe('music source selection through the real audio manager', () => {
  it('keeps playback available when browser preference storage is blocked', async () => {
    const storage = {
      getItem: () => {
        throw new Error('storage blocked')
      },
      setItem: () => {
        throw new Error('storage blocked')
      },
    }
    const midi = backend(),
      rix = backend()
    const source = createMusicSourceController(
      (kind) => (kind === 'midi' ? midi : rix),
      readMusicSource(storage),
      storage,
    )
    const manager = createAudioManager()
    manager.setMusicBackend(source)
    manager.resume()
    manager.sync([], { track: 31, loop: true })
    source.setSource('rix')
    await rix.ready
    expect(source.getState()).toEqual({ source: 'rix', status: 'ready' })
    expect(rix.play).toHaveBeenCalledExactlyOnceWith(31, true)
    source.dispose?.()
  })

  it('drops retired readiness notifications and stops notifying an unsubscribed view', async () => {
    const loading = deferred()
    const output = backend(loading.promise)
    const factory = vi.fn(() => output)
    const source = createMusicSourceController(factory, 'rix')
    const listener = vi.fn()
    const unsubscribe = source.subscribe(listener)
    unsubscribe()
    source.dispose?.()
    loading.resolve()
    await loading.promise
    source.setSource('midi')
    source.play(31, true)
    expect(listener).toHaveBeenCalledExactlyOnceWith({ source: 'rix', status: 'loading' })
    expect(factory).toHaveBeenCalledOnce()
    expect(output.play).not.toHaveBeenCalled()
    expect(output.dispose).toHaveBeenCalledOnce()
  })
  it('releases a source that fails after readiness and restarts its current track on retry', async () => {
    let report: ((error: unknown) => void) | undefined
    const first = backend(),
      replacement = backend()
    first.setErrorHandler = (handler) => {
      report = handler
    }
    let calls = 0
    const source = createMusicSourceController(() => (++calls === 1 ? first : replacement), 'rix')
    source.play(31, true)
    await first.ready
    expect(source.getState().status).toBe('ready')
    report?.(new Error('processor failed'))
    expect(source.getState().status).toBe('error')
    expect(first.dispose).toHaveBeenCalledOnce()
    source.setSource('rix')
    await replacement.ready
    expect(source.getState().status).toBe('ready')
    expect(replacement.play).toHaveBeenCalledExactlyOnceWith(31, true)
    source.dispose?.()
  })
  it('defaults to MIDI and remembers FM independently of game saves', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }
    expect(readMusicSource(storage)).toBe('midi')
    const source = createMusicSourceController(() => backend(), readMusicSource(storage), storage)
    source.setSource('rix')
    expect(values).toEqual(new Map([[MUSIC_SOURCE_KEY, 'rix']]))
    expect(readMusicSource(storage)).toBe('rix')
    expect(readMusicSource({ getItem: () => 'unknown' })).toBe('midi')
    source.dispose?.()
  })

  it('replaces the effective nonlooping victory track with the same gain and releases the old output', () => {
    const midi = backend(),
      rix = backend()
    const source = createMusicSourceController((kind) => (kind === 'midi' ? midi : rix), 'midi')
    const manager = createAudioManager()
    manager.setMusicBackend(source)
    source.setVolume?.(0.24)
    manager.sync([], { track: 3, loop: false })
    source.setSource('rix')
    expect(midi.stop).toHaveBeenCalledOnce()
    expect(midi.dispose).toHaveBeenCalledOnce()
    expect(rix.setVolume).toHaveBeenCalledWith(0.24)
    expect(rix.play).toHaveBeenCalledWith(3, false)
    expect(rix.resume).toHaveBeenCalledOnce()
    source.dispose?.()
  })

  it('keeps music disabled while switching and restores the latest same-track loop intention on enabling', () => {
    const midi = backend(),
      rix = backend()
    const source = createMusicSourceController((kind) => (kind === 'midi' ? midi : rix), 'midi')
    const manager = createAudioManager()
    manager.setMusicBackend(source)
    manager.sync([], { track: 2, loop: true })
    manager.setMusicEnabled(false)
    manager.sync([], { track: 2, loop: false })
    source.setSource('rix')
    expect(rix.play).not.toHaveBeenCalled()
    manager.setMusicEnabled(true)
    expect(rix.play).toHaveBeenCalledExactlyOnceWith(2, false)
    source.dispose?.()
  })

  it('does not turn mute or track zero into audible music after a pending switch', async () => {
    const loading = deferred(),
      rix = backend(loading.promise)
    const source = createMusicSourceController(
      (kind) => (kind === 'midi' ? backend() : rix),
      'midi',
    )
    const manager = createAudioManager()
    manager.setMusicBackend(source)
    source.setVolume?.(0)
    manager.sync([], { track: 49, loop: true })
    source.setSource('rix')
    manager.sync([], { track: 0, loop: false })
    loading.resolve()
    await loading.promise
    expect(rix.setVolume).toHaveBeenCalledWith(0)
    expect(rix.stop).toHaveBeenCalledOnce()
    expect(rix.play).toHaveBeenCalledExactlyOnceWith(49, true)
    source.dispose?.()
  })

  it('ignores a retired initialization failure and allows retrying the current failed source', async () => {
    const pendingMidi = deferred(),
      pendingRix = deferred()
    const midi = backend(pendingMidi.promise),
      rix = backend(pendingRix.promise),
      retry = backend()
    let rixCount = 0
    const source = createMusicSourceController(
      (kind) => (kind === 'midi' ? midi : ++rixCount === 1 ? rix : retry),
      'midi',
    )
    source.play(18, true)
    source.setSource('rix')
    pendingMidi.reject(new Error('retired'))
    await Promise.resolve()
    expect(source.getState()).toEqual({ source: 'rix', status: 'loading' })
    pendingRix.reject(new Error('resource unavailable'))
    await Promise.resolve()
    expect(source.getState()).toEqual({
      source: 'rix',
      status: 'error',
      error: 'Error: resource unavailable',
    })
    expect(rix.dispose).toHaveBeenCalledOnce()
    source.setSource('rix')
    await Promise.resolve()
    expect(source.getState()).toEqual({ source: 'rix', status: 'ready' })
    expect(retry.play).toHaveBeenCalledExactlyOnceWith(18, true)
    source.dispose?.()
  })
})
