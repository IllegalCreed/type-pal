import { describe, expect, test, vi } from 'vitest'
import { encodeWavPcm16 } from '../__tests__/audio-fixtures.js'
import {
  createWavPreviewTransport,
  type WavDecodedAudio,
  type WavPreviewRuntimeAdapter,
} from './audio-preview.js'
import type { EditorAssetReader } from './editor-asset-reader.js'

const readSoundBytes: EditorAssetReader['readBytes'] = async () =>
  Uint8Array.from(encodeWavPcm16([0, 0.5, -0.5])).buffer

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

describe('WAV preview transport', () => {
  test('disposing a transport before loading never allocates an AudioContext', async () => {
    const AudioContext = vi.fn(() => {
      throw new Error('a disposed transport must not create a context')
    })
    vi.stubGlobal('window', { AudioContext })
    try {
      const transport = createWavPreviewTransport({ readBytes: vi.fn() })
      expect(AudioContext).not.toHaveBeenCalled()
      transport.dispose()
      await expect(transport.load('sound.test')).rejects.toMatchObject({ name: 'AbortError' })
      expect(AudioContext).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  test('an unsuccessful source start disconnects the node and leaves the transport paused', async () => {
    const error = new DOMException('sound output failed', 'OperationError')
    const disconnect = vi.fn()
    const backend = {
      currentTime: 0,
      state: 'running',
      resume: async () => {},
      decode: async () => decoded([0, 1, -1]),
      createSource: vi.fn(() => ({
        start() {
          throw error
        },
        stop() {},
        disconnect,
      })),
      dispose() {},
    } satisfies WavPreviewRuntimeAdapter
    const transport = createWavPreviewTransport({ readBytes: readSoundBytes }, backend)

    await transport.load('sound.test')
    try {
      await expect(transport.play()).rejects.toBe(error)
      expect(transport.snapshot()).toMatchObject({ currentTime: 0, paused: true })
      expect(disconnect).toHaveBeenCalledOnce()
    } finally {
      transport.dispose()
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
    const reader = { readBytes: vi.fn<typeof readSoundBytes>(() => bytes.promise) }
    const transport = createWavPreviewTransport(reader, backend)

    const first = transport.load('sound.test', 'project\0sound.test\0sha-a')
    const duplicate = transport.load('sound.test', 'project\0sound.test\0sha-a')
    bytes.resolve(await readSoundBytes('sound.test', 'sound'))
    const peaks = await first
    await expect(duplicate).resolves.toBe(peaks)
    expect(reader.readBytes.mock.calls).toEqual([['sound.test', 'sound']])
    expect(backend.decode).toHaveBeenCalledOnce()

    const cached = { ...peaks, minimums: [-0.25], maximums: [0.25] }
    await expect(transport.load('sound.test', 'project\0sound.test\0sha-b', cached)).resolves.toBe(
      cached,
    )
    expect(reader.readBytes.mock.calls).toEqual([
      ['sound.test', 'sound'],
      ['sound.test', 'sound'],
    ])
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
    const reader = { readBytes: vi.fn(readSoundBytes) }
    const transport = createWavPreviewTransport(reader, backend)

    const peaks = await transport.load('sound.test')
    expect(peaks.duration).toBe(2)
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

    await transport.play()
    expect(starts).toEqual([0, 0, 0])
    transport.seek(2)
    expect(transport.snapshot()).toMatchObject({ currentTime: 2, paused: true })
    expect(starts).toEqual([0, 0, 0])
    expect(stops.at(-1)).toHaveBeenCalledOnce()
    expect(disconnects.at(-1)).toHaveBeenCalledOnce()

    transport.dispose()
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
    const transport = createWavPreviewTransport({ readBytes: readSoundBytes }, backend)

    await transport.load('sound.test')
    const playing = transport.play()
    transport.stop()
    resume.resolve()

    await expect(playing).rejects.toMatchObject({ name: 'AbortError' })
    expect(createSource).not.toHaveBeenCalled()
  })

  test('starts empty and refuses playback without a decoded sound', async () => {
    const transport = createWavPreviewTransport({ readBytes: readSoundBytes })
    expect(transport.snapshot()).toEqual({
      asset: undefined,
      currentTime: 0,
      duration: 0,
      paused: true,
    })
    await expect(transport.play()).rejects.toThrow('请等待 WAV 读取完成')
    transport.dispose()
  })

  test('closing during the sound read prevents the late decoder from touching the closed backend', async () => {
    const pending = deferred<ArrayBuffer>()
    const decode = vi.fn(async () => decoded([0, 0.5, -0.5]))
    const backend = {
      currentTime: 0,
      state: 'running',
      resume: async () => {},
      decode,
      createSource() {
        throw new Error('loading must not start playback')
      },
      dispose: vi.fn(),
    } satisfies WavPreviewRuntimeAdapter
    const transport = createWavPreviewTransport({ readBytes: () => pending.promise }, backend)
    const loading = transport.load('sound.test')
    transport.dispose()
    pending.resolve(await readSoundBytes('sound.test', 'sound'))

    await expect(loading).rejects.toMatchObject({ name: 'AbortError' })
    expect(decode).not.toHaveBeenCalled()
    expect(backend.dispose).toHaveBeenCalledOnce()
  })
})
