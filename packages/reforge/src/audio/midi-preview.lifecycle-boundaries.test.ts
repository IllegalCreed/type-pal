import { describe, expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/glm-runtime-contract-fixtures.js'
import type { AudioAssetReader } from './bgm.js'
import {
  createMidiPreviewTransport,
  type MidiPreviewRuntimeAdapter,
  type MidiPreviewSequencerAdapter,
} from './midi-preview.js'

function score(pitch = 60, ticks = 96): ArrayBuffer {
  // Each fixture is one Format 0 note with a one-byte duration at 96 ticks per quarter note.
  return Uint8Array.from([
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    0,
    96,
    0x4d,
    0x54,
    0x72,
    0x6b,
    0,
    0,
    0,
    12,
    0,
    0x90,
    pitch,
    64,
    ticks,
    0x80,
    pitch,
    64,
    0,
    0xff,
    0x2f,
    0,
  ]).buffer
}

function harness(initialState: AudioContextState = 'running') {
  let paused = true
  const loads: Array<{ fileName: string; bytes: number[] }> = []
  const sequencer = {
    load(binary: ArrayBuffer, fileName: string) {
      loads.push({ fileName, bytes: [...new Uint8Array(binary)] })
    },
    play: vi.fn(() => {
      paused = false
    }),
    pause: vi.fn(() => {
      paused = true
    }),
    currentTime: 0,
    duration: 0.5,
    get paused() {
      return paused
    },
    finished: false,
  } satisfies MidiPreviewSequencerAdapter
  const initialization = deferred<MidiPreviewSequencerAdapter>()
  const resume = deferred<void>()
  let state = initialState
  const runtime = {
    context: {
      get state() {
        return state
      },
      resume: vi.fn(async () => {
        await resume.promise
        state = 'running'
      }),
    },
    initialize: vi.fn(() => initialization.promise),
    dispose: vi.fn(),
  } satisfies MidiPreviewRuntimeAdapter
  return { runtime, sequencer, loads, initialization, resume }
}

function reader(readBytes = vi.fn<AudioAssetReader['readBytes']>(async () => score())) {
  return {
    readBytes,
    async readRoleBytes() {
      throw new Error('the injected preview runtime does not read the soundfont')
    },
  } satisfies AudioAssetReader
}

describe('MIDI selection and in-flight reads', () => {
  test('a late selection cannot overwrite the newer track or its bytes', async () => {
    const h = harness()
    const firstRead = deferred<ArrayBuffer>()
    const assetReader = reader(
      vi.fn(async (asset) => (asset === 'music.a' ? firstRead.promise : score(62, 48))),
    )
    const transport = createMidiPreviewTransport(assetReader, h.runtime)
    const slow = transport.load('music.a')
    try {
      const latest = await transport.load('music.b')
      expect(latest.duration).toBe(0.25)
      firstRead.resolve(score(60, 96))
      await expect(slow).rejects.toMatchObject({ name: 'AbortError', message: 'MIDI 选择已变化' })
      expect(transport.snapshot()).toEqual({
        asset: 'music.b',
        duration: 0.25,
        currentTime: 0,
        paused: true,
      })

      h.initialization.resolve(h.sequencer)
      await transport.play()
      expect(h.loads).toEqual([{ fileName: 'music.b', bytes: [...new Uint8Array(score(62, 48))] }])
    } finally {
      firstRead.resolve(score())
      await slow.catch(() => {})
      transport.dispose()
    }
  })

  test('concurrent requests for the same track and cache key share one read and result', async () => {
    const take = deferred<ArrayBuffer>()
    const readBytes = vi.fn(() => take.promise)
    const transport = createMidiPreviewTransport(reader(readBytes), harness().runtime)
    const first = transport.load('music.a', 'sha-a')
    const duplicate = transport.load('music.a', 'sha-a')
    take.resolve(score())

    const [a, b] = await Promise.all([first, duplicate])
    expect(a).toBe(b)
    expect(a.duration).toBe(0.5)
    expect(readBytes).toHaveBeenCalledExactlyOnceWith('music.a', 'music')
    transport.dispose()
  })

  test('completing an obsolete request does not clear the current in-flight read', async () => {
    const firstRead = deferred<ArrayBuffer>()
    const latestRead = deferred<ArrayBuffer>()
    const readBytes = vi.fn(async (asset) =>
      asset === 'music.a' ? firstRead.promise : latestRead.promise,
    )
    const transport = createMidiPreviewTransport(reader(readBytes), harness().runtime)
    const obsolete = transport.load('music.a', 'sha-a')
    const latest = transport.load('music.b', 'sha-b')
    expect(readBytes.mock.calls).toEqual([
      ['music.a', 'music'],
      ['music.b', 'music'],
    ])

    firstRead.resolve(score(60, 96))
    await expect(obsolete).rejects.toMatchObject({ name: 'AbortError' })
    const duplicate = transport.load('music.b', 'sha-b')
    latestRead.resolve(score(62, 48))
    const [original, shared] = await Promise.all([latest, duplicate])
    expect(shared).toBe(original)
    expect(readBytes.mock.calls).toEqual([
      ['music.a', 'music'],
      ['music.b', 'music'],
    ])
    expect(transport.snapshot()).toMatchObject({ asset: 'music.b', duration: 0.25 })
    transport.dispose()
  })
})

describe('MIDI retry', () => {
  test('the first read failure is visible and loading the same track can recover', async () => {
    const h = harness()
    const failure = new Error('read failed')
    const readBytes = vi.fn(async () => score()).mockRejectedValueOnce(failure)
    const transport = createMidiPreviewTransport(reader(readBytes), h.runtime)

    await expect(transport.load('music.a')).rejects.toBe(failure)
    expect(transport.snapshot()).toMatchObject({ asset: 'music.a', duration: 0.0 })
    await expect(transport.play()).rejects.toThrow('请等待 MIDI 读取完成。')
    expect(h.runtime.initialize).not.toHaveBeenCalled()
    await expect(transport.load('music.a')).resolves.toMatchObject({ noteCount: 1, duration: 0.5 })
    expect(readBytes).toHaveBeenCalledTimes(2)
    transport.dispose()
  })

  test('a failed initialization does not prevent playback on the next attempt', async () => {
    const h = harness()
    const failure = new Error('worklet boom')
    h.runtime.initialize.mockRejectedValueOnce(failure).mockResolvedValueOnce(h.sequencer)
    const transport = createMidiPreviewTransport(reader(), h.runtime)
    await transport.load('music.a')
    await expect(transport.play()).rejects.toBe(failure)
    expect(h.sequencer.play).not.toHaveBeenCalled()

    await transport.play()
    expect(h.runtime.initialize).toHaveBeenCalledTimes(2)
    expect(h.sequencer.play).toHaveBeenCalledOnce()
    expect(transport.snapshot().paused).toBe(false)
    transport.dispose()
  })
})

describe('MIDI playback while resume is pending', () => {
  async function pendingPlayback() {
    const h = harness('suspended')
    const transport = createMidiPreviewTransport(reader(), h.runtime)
    await transport.load('music.a')
    const pending = transport.play()
    expect(h.runtime.context.resume).toHaveBeenCalledOnce()
    expect(h.runtime.initialize).not.toHaveBeenCalled()
    return { h, transport, pending }
  }

  test('two requests resume and start playback only once', async () => {
    const { h, transport, pending } = await pendingPlayback()
    const second = transport.play()
    h.initialization.resolve(h.sequencer)
    h.resume.resolve()
    await Promise.all([pending, second])
    expect(h.runtime.context.resume).toHaveBeenCalledOnce()
    expect(h.sequencer.play).toHaveBeenCalledOnce()
    expect(transport.snapshot().paused).toBe(false)
    transport.dispose()
  })

  test('pausing cancels pending playback before initializing the backend', async () => {
    const { h, transport, pending } = await pendingPlayback()
    transport.pause()
    h.resume.resolve()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(h.runtime.initialize).not.toHaveBeenCalled()
    expect(transport.snapshot()).toMatchObject({ currentTime: 0, paused: true })
    transport.dispose()
  })

  test('seeking cancels pending playback and retains the requested position', async () => {
    const { h, transport, pending } = await pendingPlayback()
    transport.seek(0.125)
    h.resume.resolve()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(h.runtime.initialize).not.toHaveBeenCalled()
    expect(transport.snapshot()).toMatchObject({ currentTime: 0.125, paused: true })
    transport.dispose()
  })

  test('disposing cancels pending playback and releases the runtime before initialization', async () => {
    const { h, transport, pending } = await pendingPlayback()
    transport.dispose()
    h.resume.resolve()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(h.runtime.initialize).not.toHaveBeenCalled()
    expect(h.runtime.dispose).toHaveBeenCalledOnce()
    expect(transport.snapshot()).toMatchObject({ asset: undefined, duration: 0, paused: true })
  })
})
