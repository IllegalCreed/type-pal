import { vi } from 'vitest'

/** Records browser worklet and sequencer operations at the external library boundary. */
export const spessa = (() => {
  class WorkletDouble {
    destroyed = false
    connected: unknown
    readonly soundBanks: { bytes: ArrayBuffer; name: string }[] = []
    readonly controllerChanges: [number, number, number][] = []
    readonly midiChannels: {
      lockedWith?: [controller: number, lock: boolean]
      lockController: (controller: number, lock: boolean) => void
    }[] = []
    constructor(destination: unknown) {
      this.connected = destination
      for (let i = 0; i < 16; i++) {
        const channel: (typeof this.midiChannels)[number] = {
          lockController: (controller, lock) => {
            channel.lockedWith = [controller, lock]
          },
        }
        this.midiChannels.push(channel)
      }
      spessa.worklets.push(this)
    }
    connect(destination: unknown): void {
      this.connected = destination
    }
    get soundBankManager(): { addSoundBank(bytes: ArrayBuffer, name: string): Promise<void> } {
      return {
        addSoundBank: async (bytes, name) => {
          this.soundBanks.push({ bytes, name })
        },
      }
    }
    get isReady(): Promise<void> {
      // Read the controls when the production initializer reaches the ready barrier.
      const error = spessa.ready.error
      spessa.ready.entered?.()
      return error ? Promise.reject(error) : (spessa.ready.pending ?? Promise.resolve())
    }
    controllerChange(channel: number, controller: number, value: number): void {
      this.controllerChanges.push([channel, controller, value])
    }
    destroy(): void {
      spessa.disposalEvents.push('destroy worklet')
      this.destroyed = true
    }
  }
  class SequencerDouble {
    loopCount = 1
    private currentTimeValue = 0
    private readonly pausedValue = true
    private readonly finishedValue = false
    readonly loaded: { binary: ArrayBuffer; fileName: string }[] = []
    playCalls = 0
    pauseCalls = 0
    constructor(
      readonly synth: WorkletDouble,
      readonly options: { skipToFirstNoteOn: boolean },
    ) {
      const failure = spessa.sequencerCreation.error
      if (failure) throw failure
      spessa.sequencers.push(this)
    }
    loadNewSongList(list: { binary: ArrayBuffer; fileName: string }[]): void {
      this.loaded.push(...list)
    }
    play(): void {
      this.playCalls += 1
    }
    pause(): void {
      this.pauseCalls += 1
    }
    get currentTime(): number {
      return this.currentTimeValue
    }
    set currentTime(value: number) {
      this.currentTimeValue = value
    }
    get paused(): boolean {
      return this.pausedValue
    }
    get isFinished(): boolean {
      return this.finishedValue
    }
  }
  const worklets: WorkletDouble[] = []
  const sequencers: SequencerDouble[] = []
  const ready: { error?: Error; entered?: () => void; pending?: Promise<void> } = {}
  const sequencerCreation: { error?: Error } = {}
  const disposalEvents: string[] = []
  return {
    WorkletDouble,
    SequencerDouble,
    worklets,
    sequencers,
    ready,
    sequencerCreation,
    disposalEvents,
  }
})()

vi.mock('spessasynth_lib', () => ({
  WorkletSynthesizer: spessa.WorkletDouble,
  Sequencer: spessa.SequencerDouble,
}))

export const riffBytes = (): ArrayBuffer => new TextEncoder().encode('RIFFxxxx').buffer

export const roleReader = (bytes: ArrayBuffer | Error) => ({
  readBytes: async (): Promise<ArrayBuffer> => {
    if (bytes instanceof Error) throw bytes
    return bytes
  },
  readRoleBytes: async (): Promise<ArrayBuffer> => {
    if (bytes instanceof Error) throw bytes
    return bytes
  },
})

interface FakeContext {
  audioWorklet: { addModule: (url: string) => Promise<void> } | undefined
  destination: unknown
  state: AudioContextState
  resume: () => Promise<void>
  close: () => Promise<void>
}

/** AudioContext 替身经 stubGlobal 注入（宿主边界），不做类型强转。 */
export function stubAudioContext(options: { worklet?: boolean; holdModule?: Promise<void> } = {}) {
  const addModuleCalls: string[] = []
  const context: FakeContext = {
    audioWorklet:
      options.worklet === false
        ? undefined
        : {
            addModule: (url) => {
              addModuleCalls.push(url)
              return options.holdModule ?? Promise.resolve()
            },
          },
    destination: { kind: 'destination' },
    state: 'running',
    resume: async () => {},
    close: vi.fn(async () => {
      spessa.disposalEvents.push('close context')
      context.state = 'closed'
    }),
  }
  const Ctor = class AudioContextStub {
    audioWorklet = context.audioWorklet
    destination = context.destination
    get state() {
      return context.state
    }
    createGain() {
      return {
        connect: () => {},
        disconnect: () => {},
        gain: {
          value: 1,
          cancelScheduledValues: () => {},
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
        },
      }
    }
    resume = context.resume
    close = context.close
  }
  vi.stubGlobal('AudioContext', Ctor)
  return { context, addModuleCalls, Ctor }
}

export function restoreBrowserMidiFixture(): void {
  vi.unstubAllGlobals()
  spessa.worklets.length = 0
  spessa.sequencers.length = 0
  spessa.ready.error = undefined
  spessa.ready.entered = undefined
  spessa.ready.pending = undefined
  spessa.sequencerCreation.error = undefined
  spessa.disposalEvents.length = 0
}

/** 最小合法 MIDI：format0 / 480tpqn / 单音轨 note on(60,100) → note off。 */
export function minimalMidi(): ArrayBuffer {
  const track = [0x00, 0x90, 0x3c, 0x64, 0x83, 0x60, 0x80, 0x3c, 0x00, 0x00, 0xff, 0x2f, 0x00]
  const header = [
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xe0,
  ]
  const trackHeader = [
    0x4d,
    0x54,
    0x72,
    0x6b,
    (track.length >> 24) & 0xff,
    (track.length >> 16) & 0xff,
    (track.length >> 8) & 0xff,
    track.length & 0xff,
  ]
  return new Uint8Array([...header, ...trackHeader, ...track]).buffer
}
