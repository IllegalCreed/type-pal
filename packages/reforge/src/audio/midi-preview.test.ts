import { describe, expect, test, vi } from 'vitest'
import {
  createMidiNoteActivity,
  createMidiPreviewTransport,
  type MidiPreviewRuntimeAdapter,
  type MidiPreviewSequencerAdapter,
} from './midi-preview.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function midiBytes(): ArrayBuffer {
  return Uint8Array.from([
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x60,
    0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00, 0x00, 0x0c,
    0x00, 0x90, 0x3c, 0x40,
    0x60, 0x80, 0x3c, 0x40,
    0x00, 0xff, 0x2f, 0x00,
  ]).buffer
}

function sequencer() {
  let currentTime = 0
  let paused = true
  const load = vi.fn()
  const play = vi.fn(() => {
    paused = false
  })
  const pause = vi.fn(() => {
    paused = true
  })
  const adapter: MidiPreviewSequencerAdapter = {
    load,
    play,
    pause,
    duration: 8,
    get currentTime() {
      return currentTime
    },
    set currentTime(value: number) {
      currentTime = value
    },
    get paused() {
      return paused
    },
  }
  return { adapter, load, play, pause }
}

describe('MIDI preview analysis', () => {
  test('normalizes real note activity deterministically and preserves empty tracks', () => {
    const notes = [
      { start: 0, length: 1, velocity: 127 },
      { start: 1, length: 1, velocity: 64 },
    ]
    const first = createMidiNoteActivity(notes, 2, 4)
    expect(first).toEqual(createMidiNoteActivity(notes, 2, 4))
    expect(first.noteCount).toBe(2)
    expect(Math.max(...first.buckets)).toBe(1)
    expect(createMidiNoteActivity([], 0, 4).buckets).toEqual([0, 0, 0, 0])
  })
})

describe('MIDI preview transport', () => {
  test('does not allocate an AudioContext until the user requests playback', () => {
    const AudioContext = vi.fn()
    vi.stubGlobal('window', { AudioContext })
    try {
      const transport = createMidiPreviewTransport({ readBytes: vi.fn() } as never)
      expect(AudioContext).not.toHaveBeenCalled()
      transport.dispose()
      expect(AudioContext).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  test('deduplicates the same identity and reuses cached note activity on a new SHA', async () => {
    const bytes = deferred<ArrayBuffer>()
    const runtime = {
      context: { state: 'running' as AudioContextState, resume: vi.fn(async () => {}) },
      initialize: vi.fn(async () => sequencer().adapter),
      dispose: vi.fn(),
    } satisfies MidiPreviewRuntimeAdapter
    const reader = { readBytes: vi.fn(() => bytes.promise) }
    const transport = createMidiPreviewTransport(reader as never, runtime)

    const first = transport.load('music.test', 'project\0music.test\0sha-a')
    const duplicate = transport.load('music.test', 'project\0music.test\0sha-a')
    bytes.resolve(midiBytes())
    const activity = await first
    await expect(duplicate).resolves.toBe(activity)
    expect(reader.readBytes).toHaveBeenCalledOnce()

    const cached = { ...activity, noteCount: 99 }
    await expect(
      transport.load('music.test', 'project\0music.test\0sha-b', cached),
    ).resolves.toBe(cached)
    expect(reader.readBytes).toHaveBeenCalledTimes(2)
  })

  test('loads a canonical MIDI and exposes play, pause, stop and clamped seek', async () => {
    const backend = sequencer()
    const runtime = {
      context: { state: 'running' as AudioContextState, resume: vi.fn(async () => {}) },
      initialize: vi.fn(async () => backend.adapter),
      dispose: vi.fn(),
    } satisfies MidiPreviewRuntimeAdapter
    const reader = { readBytes: vi.fn(async () => midiBytes()) }
    const transport = createMidiPreviewTransport(reader as never, runtime)

    const activity = await transport.load('music.test')
    expect(activity.noteCount).toBe(1)
    await transport.play()
    expect(backend.load).toHaveBeenCalledOnce()
    expect(backend.play).toHaveBeenCalledOnce()

    backend.adapter.currentTime = activity.duration / 2
    transport.pause()
    expect(transport.snapshot().paused).toBe(true)
    transport.seek(99)
    expect(transport.snapshot().currentTime).toBe(activity.duration)
    transport.stop()
    expect(transport.snapshot().currentTime).toBe(0)

    await transport.play()
    backend.adapter.currentTime = activity.duration
    backend.adapter.pause()
    await transport.play()
    expect(backend.adapter.currentTime).toBe(0)
    transport.dispose()
    expect(runtime.dispose).toHaveBeenCalledOnce()
  })

  test('stop cancels a pending resume and dispose cancels late synthesizer initialization', async () => {
    const backend = sequencer()
    const resume = deferred<void>()
    const initialize = deferred<MidiPreviewSequencerAdapter>()
    const runtime = {
      context: { state: 'suspended' as AudioContextState, resume: vi.fn(() => resume.promise) },
      initialize: vi.fn(() => initialize.promise),
      dispose: vi.fn(),
    } satisfies MidiPreviewRuntimeAdapter
    const transport = createMidiPreviewTransport(
      { readBytes: vi.fn(async () => midiBytes()) } as never,
      runtime,
    )

    await transport.load('music.test')
    const canceledByStop = transport.play()
    transport.stop()
    resume.resolve()
    await expect(canceledByStop).rejects.toMatchObject({ name: 'AbortError' })
    expect(runtime.initialize).not.toHaveBeenCalled()

    runtime.context.state = 'running'
    const canceledByDispose = transport.play()
    await vi.waitFor(() => expect(runtime.initialize).toHaveBeenCalledOnce())
    transport.dispose()
    initialize.resolve(backend.adapter)
    await expect(canceledByDispose).rejects.toMatchObject({ name: 'AbortError' })
    expect(backend.play).not.toHaveBeenCalled()
    expect(runtime.dispose).toHaveBeenCalledOnce()
  })
})
