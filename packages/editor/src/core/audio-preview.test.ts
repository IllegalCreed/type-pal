import { describe, expect, test, vi } from 'vitest'
import {
  AudioPreviewCache,
  computePcmPeaks,
  createWavPreviewTransport,
  type WavDecodedAudio,
  type WavPreviewRuntimeAdapter,
} from './audio-preview.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function decoded(...channels: number[][]): WavDecodedAudio {
  return {
    duration: 2,
    numberOfChannels: channels.length,
    getChannelData: (channel) => Float32Array.from(channels[channel] ?? []),
  }
}

describe('WAV preview analysis', () => {
  test('computes deterministic min/max peaks across all channels', () => {
    const first = computePcmPeaks(
      [Float32Array.from([-1, 0.5, 0.25, 0]), Float32Array.from([0.2, 1, -0.5, 0])],
      2,
      2,
    )
    const second = computePcmPeaks(
      [Float32Array.from([-1, 0.5, 0.25, 0]), Float32Array.from([0.2, 1, -0.5, 0])],
      2,
      2,
    )

    expect(first).toEqual(second)
    expect(first.minimums).toEqual([-1, -0.5])
    expect(first.maximums).toEqual([1, 0.25])
  })

  test('preserves full-scale constant buckets instead of treating them as empty sentinels', () => {
    expect(computePcmPeaks([Float32Array.from([1, 1])], 1, 1)).toMatchObject({
      minimums: [1],
      maximums: [1],
    })
    expect(computePcmPeaks([Float32Array.from([-1, -1])], 1, 1)).toMatchObject({
      minimums: [-1],
      maximums: [-1],
    })
  })

  test('deduplicates inflight analysis and evicts the least-recently-used entry', async () => {
    const cache = new AudioPreviewCache<number>(2)
    const pending = deferred<number>()
    const loader = vi.fn(() => pending.promise)
    const first = cache.load('a', loader)
    const duplicate = cache.load('a', loader)
    pending.resolve(1)

    await expect(first).resolves.toBe(1)
    await expect(duplicate).resolves.toBe(1)
    expect(loader).toHaveBeenCalledOnce()
    await cache.load('b', async () => 2)
    expect(cache.get('a')).toBe(1)
    await cache.load('c', async () => 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.size).toBe(2)
  })
})

describe('WAV preview transport', () => {
  test('does not allocate an AudioContext until the committed transport loads', () => {
    const AudioContext = vi.fn()
    vi.stubGlobal('window', { AudioContext })
    try {
      const transport = createWavPreviewTransport({ readBytes: vi.fn() } as never)
      expect(AudioContext).not.toHaveBeenCalled()
      transport.dispose()
      expect(AudioContext).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  test('deduplicates the same identity and can reuse cached peaks while preparing playback', async () => {
    const bytes = deferred<ArrayBuffer>()
    const backend = {
      currentTime: 0,
      state: 'running' as AudioContextState,
      resume: vi.fn(async () => {}),
      decode: vi.fn(async () => decoded([0, 1, 0, -1])),
      createSource: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() })),
      dispose: vi.fn(),
    } satisfies WavPreviewRuntimeAdapter
    const reader = { readBytes: vi.fn(() => bytes.promise) }
    const transport = createWavPreviewTransport(reader as never, backend)

    const first = transport.load('sound.test', 'project\0sound.test\0sha-a')
    const duplicate = transport.load('sound.test', 'project\0sound.test\0sha-a')
    bytes.resolve(new ArrayBuffer(8))
    const peaks = await first
    await expect(duplicate).resolves.toBe(peaks)
    expect(reader.readBytes).toHaveBeenCalledOnce()
    expect(backend.decode).toHaveBeenCalledOnce()

    const cached = { ...peaks, minimums: [-0.25], maximums: [0.25] }
    await expect(
      transport.load('sound.test', 'project\0sound.test\0sha-b', cached),
    ).resolves.toBe(cached)
    expect(reader.readBytes).toHaveBeenCalledTimes(2)
    expect(backend.decode).toHaveBeenCalledTimes(2)
  })

  test('supports play, pause, seek, natural completion and disposal', async () => {
    const starts: number[] = []
    const stops: ReturnType<typeof vi.fn>[] = []
    const disconnects: ReturnType<typeof vi.fn>[] = []
    const endings: Array<() => void> = []
    const backend = {
      currentTime: 0,
      state: 'running' as AudioContextState,
      resume: vi.fn(async () => {}),
      decode: vi.fn(async () => decoded([-1, 0, 1, 0])),
      createSource: vi.fn((_buffer: WavDecodedAudio, onEnded: () => void) => {
        const stop = vi.fn()
        const disconnect = vi.fn()
        stops.push(stop)
        disconnects.push(disconnect)
        endings.push(onEnded)
        return { start: (offset: number) => starts.push(offset), stop, disconnect }
      }),
      dispose: vi.fn(),
    } satisfies WavPreviewRuntimeAdapter
    const reader = { readBytes: vi.fn(async () => new ArrayBuffer(8)) }
    const transport = createWavPreviewTransport(reader as never, backend)

    const peaks = await transport.load('sound.test')
    expect(peaks.kind).toBe('pcm-peaks')
    await transport.play()
    expect(starts).toEqual([0])
    backend.currentTime = 0.75
    transport.pause()
    expect(transport.snapshot()).toMatchObject({ currentTime: 0.75, paused: true })
    expect(stops[0]).toHaveBeenCalledOnce()
    expect(disconnects[0]).toHaveBeenCalledOnce()

    transport.seek(99)
    expect(transport.snapshot().currentTime).toBe(2)
    await transport.play()
    expect(starts.at(-1)).toBe(0)
    endings.at(-1)?.()
    expect(transport.snapshot()).toMatchObject({ currentTime: 2, paused: true })
    expect(disconnects.at(-1)).toHaveBeenCalledOnce()

    transport.dispose()
    expect(backend.dispose).toHaveBeenCalledOnce()
  })

  test('stop invalidates a pending AudioContext resume so playback cannot arrive late', async () => {
    const resume = deferred<void>()
    const createSource = vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }))
    const backend = {
      currentTime: 0,
      state: 'suspended' as AudioContextState,
      resume: vi.fn(() => resume.promise),
      decode: vi.fn(async () => decoded([0, 1, 0, -1])),
      createSource,
      dispose: vi.fn(),
    } satisfies WavPreviewRuntimeAdapter
    const transport = createWavPreviewTransport(
      { readBytes: vi.fn(async () => new ArrayBuffer(8)) } as never,
      backend,
    )

    await transport.load('sound.test')
    const playing = transport.play()
    transport.stop()
    resume.resolve()

    await expect(playing).rejects.toMatchObject({ name: 'AbortError' })
    expect(createSource).not.toHaveBeenCalled()
  })
})
