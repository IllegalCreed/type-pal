import { vi } from 'vitest'

/** External Web Audio/Spessa protocol only; no PCM, device or audible-timing oracle. */
export function installShellAudioHost() {
  const contexts: ShellAudioContext[] = []
  class ShellAudioContext {
    state: AudioContextState = 'suspended'
    readonly destination = {}
    readonly currentTime = 0
    readonly audioWorklet = {
      async addModule(url: string): Promise<void> {
        if (url !== '/spessasynth_processor.min.js') throw new Error(`unexpected worklet: ${url}`)
      },
    }
    resumeCalls = 0
    constructor() {
      contexts.push(this)
    }
    async resume(): Promise<void> {
      this.resumeCalls++
      this.state = 'running'
    }
    async close(): Promise<void> {
      this.state = 'closed'
    }
    async decodeAudioData(bytes: ArrayBuffer): Promise<unknown> {
      // The real SFX player still resolves assets and checks their RIFF/WAVE header.
      return { bytes: bytes.slice(0) }
    }
    createBufferSource() {
      const source: {
        buffer: unknown
        onended: (() => void) | null
        connect(destination: unknown): void
        start(): void
        stop(): void
      } = {
        buffer: undefined,
        onended: null,
        connect: (destination) => {
          if (destination !== this.destination) throw new Error('unexpected audio destination')
        },
        start: () => {
          if (!source.buffer) throw new Error('audio source has no decoded buffer')
        },
        stop: () => source.onended?.(),
      }
      return source
    }
    createGain() {
      return {
        connect: (destination: unknown) => {
          if (destination !== this.destination) throw new Error('unexpected gain destination')
        },
        gain: {
          value: 1,
          cancelScheduledValues(_time: number) {},
          setValueAtTime(value: number, _time: number) {
            this.value = value
          },
          linearRampToValueAtTime(value: number, _time: number) {
            this.value = value
          },
        },
      }
    }
  }
  // Keep production BGM/SFX modules real. Only the external synthesis library is replaced.
  vi.doMock('spessasynth_lib', () => ({
    WorkletSynthesizer: class {
      readonly midiChannels = []
      readonly isReady = Promise.resolve()
      readonly soundBankManager = { async addSoundBank(_bytes: ArrayBuffer, _name: string) {} }
      connect(_destination: unknown) {}
      controllerChange(_channel: number, _controller: number, _value: number) {}
      destroy() {}
    },
    Sequencer: class {
      loopCount = 1
      loadNewSongList(_songs: unknown) {}
      play() {}
      pause() {}
    },
  }))
  vi.stubGlobal('AudioContext', ShellAudioContext)
  return {
    contexts,
    close() {
      for (const context of contexts) void context.close()
      vi.doUnmock('spessasynth_lib')
    },
  }
}
