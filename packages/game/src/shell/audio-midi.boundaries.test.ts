import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fakeAudioState = vi.hoisted(() => ({
  synths: [] as Array<{ isReady: Promise<void> }>,
  sequencers: [] as unknown[],
  loads: [] as string[],
  plays: [] as number[],
}))

vi.mock('spessasynth_lib', () => {
  class FakeSequencer {
    loopCount = 0

    constructor() {
      fakeAudioState.sequencers.push(this)
    }

    loadNewSongList(items: Array<{ fileName: string }>): void {
      fakeAudioState.loads.push(items[0]?.fileName ?? '')
    }

    play(): void {
      const current = fakeAudioState.loads.at(-1)
      if (current) fakeAudioState.plays.push(Number(current.replace('.mid', '')))
    }

    pause(): void {}
  }

  class FakeWorkletSynthesizer {
    readonly soundBankManager = { addSoundBank: vi.fn(async () => {}) }
    readonly midiChannels = Array.from({ length: 16 }, () => ({ lockController: vi.fn() }))
    readonly isReady = Promise.resolve()

    constructor() {
      fakeAudioState.synths.push(this)
    }

    connect(): void {}

    controllerChange(): void {}
  }

  return { Sequencer: FakeSequencer, WorkletSynthesizer: FakeWorkletSynthesizer }
})

import { createSpessaSynthBackend } from './audio-midi.js'

class FakeAudioContext {
  state = 'running'
  destination = {}
  audioWorklet = { addModule: vi.fn(async () => {}) }

  createGain(): { gain: { value: number }; connect: () => void } {
    return { gain: { value: 1 }, connect: () => {} }
  }

  resume = vi.fn(async () => {})
}

describe('audio-midi latest track ownership', () => {
  const originalAudioContext = window.AudioContext

  beforeEach(() => {
    fakeAudioState.synths.length = 0
    fakeAudioState.sequencers.length = 0
    fakeAudioState.loads.length = 0
    fakeAudioState.plays.length = 0
    window.AudioContext = FakeAudioContext as unknown as typeof AudioContext
  })

  afterEach(() => {
    window.AudioContext = originalAudioContext
    vi.restoreAllMocks()
  })

  it('drops a stale MIDI fetch response after a newer track was requested', async () => {
    const pending = new Map<string, (response: Response) => void>()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => new Promise<Response>((resolve) => pending.set(url, resolve))),
    )
    const backend = createSpessaSynthBackend({
      baseUrl: '/extracted',
      workletUrl: '/spessasynth_processor.min.js',
      soundfontUrl: '/soundfont.sf3',
      soundfontData: Promise.resolve(new TextEncoder().encode('RIFF').buffer),
    })

    await vi.waitFor(() => expect(fakeAudioState.sequencers).toHaveLength(1))
    await new Promise((resolve) => setTimeout(resolve, 0))

    backend.play(1, true)
    backend.play(2, true)
    const track1 = pending.get('/extracted/music/001.mid')
    const track2 = pending.get('/extracted/music/002.mid')
    expect(track1).toBeTypeOf('function')
    expect(track2).toBeTypeOf('function')

    track2?.({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) } as Response)
    await Promise.resolve()
    track1?.({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) } as Response)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fakeAudioState.plays).toEqual([2])
  })

  it('drops an in-flight MIDI response after stop', async () => {
    let resolveTrack: ((response: Response) => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveTrack = resolve
          }),
      ),
    )
    const backend = createSpessaSynthBackend({
      baseUrl: '/extracted',
      workletUrl: '/spessasynth_processor.min.js',
      soundfontUrl: '/soundfont.sf3',
      soundfontData: Promise.resolve(new TextEncoder().encode('RIFF').buffer),
    })

    await vi.waitFor(() => expect(fakeAudioState.sequencers).toHaveLength(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    backend.play(1, true)
    backend.stop()
    resolveTrack?.({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) } as Response)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fakeAudioState.plays).toEqual([])
  })
})
