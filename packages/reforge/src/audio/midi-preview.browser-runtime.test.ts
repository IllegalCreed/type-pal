// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { createBrowserMidiPreviewRuntime } from './midi-preview.js'

/** typed 外部库替身：hoisted 内定义真实类，实例直接进 typed 数组，测试按类字段断言。 */
const spessa = vi.hoisted(() => {
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
      for (let i = 0; i < 16; i++)
        this.midiChannels.push({
          lockController: (controller, lock) => {
            this.midiChannels[i]!.lockedWith = [controller, lock]
          },
        })
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
      // 旗标在 getter 求值时读取：测试可在初始化链推进前翻转。
      const error = spessa.ready.error
      return error ? Promise.reject(error) : Promise.resolve()
    }
    controllerChange(channel: number, controller: number, value: number): void {
      this.controllerChanges.push([channel, controller, value])
    }
    destroy(): void {
      this.destroyed = true
    }
  }
  class SequencerDouble {
    loopCount = 1
    private currentTimeValue = 0
    readonly durationValue = 12.5
    private readonly pausedValue = true
    private readonly finishedValue = false
    readonly loaded: { binary: ArrayBuffer; fileName: string }[] = []
    playCalls = 0
    pauseCalls = 0
    constructor(
      readonly synth: WorkletDouble,
      readonly options: { skipToFirstNoteOn: boolean },
    ) {
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
    get duration(): number {
      return this.durationValue
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
  const ready: { error?: Error } = {}
  return { WorkletDouble, SequencerDouble, worklets, sequencers, ready }
})

vi.mock('spessasynth_lib', () => ({
  WorkletSynthesizer: spessa.WorkletDouble,
  Sequencer: spessa.SequencerDouble,
}))

const riffBytes = (): ArrayBuffer => new TextEncoder().encode('RIFFxxxx').buffer as ArrayBuffer

const roleReader = (bytes: ArrayBuffer | Error) => ({
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
function stubAudioContext(options: { worklet?: boolean; holdModule?: Promise<void> } = {}) {
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
    close: vi.fn(async () => {}),
  }
  const Ctor = class AudioContextStub {
    audioWorklet = context.audioWorklet
    destination = context.destination
    state = context.state
    resume = context.resume
    close = context.close
  }
  vi.stubGlobal('AudioContext', Ctor)
  return { context, addModuleCalls, Ctor }
}

afterEach(() => {
  vi.unstubAllGlobals()
  spessa.worklets.length = 0
  spessa.sequencers.length = 0
  spessa.ready.error = undefined
})

test('spessa 初始化：无 audioWorklet 按 secure context 指路拒绝', async () => {
  vi.stubGlobal('isSecureContext', true)
  stubAudioContext({ worklet: false })
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  await expect(runtime.initialize()).rejects.toThrow(
    'AudioWorklet 不可用（secure context=true），请使用 HTTPS 或 localhost。',
  )
  expect(spessa.worklets).toHaveLength(0) // 门在合成器构造前
})

test('spessa 初始化成功链：模块 URL、RIFF 音色库、16 通道混响 91 锁定', async () => {
  const { context, addModuleCalls } = stubAudioContext()
  const bytes = riffBytes()
  const reader = roleReader(bytes)
  const readRoleBytes = vi.spyOn(reader, 'readRoleBytes')
  const runtime = createBrowserMidiPreviewRuntime(reader)!
  const adapter = await runtime.initialize()
  expect(addModuleCalls).toEqual(['/spessasynth_processor.min.js'])
  const worklet = spessa.worklets.at(-1)
  expect(worklet?.destroyed).toBe(false)
  expect(worklet?.connected).toBe(context.destination)
  expect(worklet?.soundBanks).toEqual([{ bytes, name: 'preview' }])
  expect(readRoleBytes).toHaveBeenCalledExactlyOnceWith('audio.midiSoundfont')
  expect(worklet?.controllerChanges).toEqual(
    Array.from({ length: 16 }, (_, channel) => [channel, 91, 0]),
  )
  expect(worklet?.midiChannels.map((channel) => channel.lockedWith)).toEqual(
    Array.from({ length: 16 }, () => [91, true]),
  )
  adapter.play()
  expect(spessa.sequencers.at(-1)?.playCalls).toBe(1)
})

test('spessa 初始化：非 RIFF 音色库拒绝并销毁合成器，可重试', async () => {
  stubAudioContext()
  const reader = roleReader(new TextEncoder().encode('XIFFxxxx').buffer)
  const runtime = createBrowserMidiPreviewRuntime(reader)!
  await expect(runtime.initialize()).rejects.toThrow(
    'MIDI 音色库不是有效 RIFF 文件，请检查 audio.midiSoundfont。',
  )
  expect(spessa.worklets.map((worklet) => worklet.destroyed)).toEqual([true])
  reader.readRoleBytes = async () => riffBytes()
  await expect(runtime.initialize()).resolves.toBeDefined()
  expect(spessa.worklets.map((worklet) => worklet.destroyed)).toEqual([true, false])
  expect(spessa.sequencers).toHaveLength(1)
})

test('spessa 初始化：音色库读取失败销毁合成器并原样抛出', async () => {
  stubAudioContext()
  const failure = new Error('soundfont io')
  const runtime = createBrowserMidiPreviewRuntime(roleReader(failure))!
  await expect(runtime.initialize()).rejects.toBe(failure)
  expect(spessa.worklets.at(-1)?.destroyed).toBe(true)
})

test('spessa 初始化：isReady 拒绝销毁合成器并原样抛出', async () => {
  stubAudioContext()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const failure = new Error('synth not ready')
  spessa.ready.error = failure
  await expect(runtime.initialize()).rejects.toBe(failure)
  expect(spessa.worklets.at(-1)?.destroyed).toBe(true)
})

test('试听 runtime：无任何 AudioContext 构造器返回 undefined', () => {
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('webkitAudioContext', undefined)
  expect(createBrowserMidiPreviewRuntime(roleReader(riffBytes()))).toBeUndefined()
})

test('试听 runtime：webkitAudioContext 回退可用', async () => {
  const { addModuleCalls, Ctor } = stubAudioContext()
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('webkitAudioContext', Ctor)
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))
  expect(runtime).toBeDefined()
  await runtime!.initialize()
  expect(addModuleCalls).toEqual(['/spessasynth_processor.min.js'])
})

test('试听 runtime：适配器透传 sequencer 传输操作与快照字段，二次 initialize 复用', async () => {
  stubAudioContext()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const adapter = await runtime.initialize()
  const binary = minimalMidi()
  adapter.load(binary, 'preview.mid')
  adapter.play()
  adapter.pause()
  const sequencer = spessa.sequencers.at(-1)
  expect(sequencer?.loaded).toEqual([{ binary, fileName: 'preview.mid' }])
  expect(sequencer?.loaded[0]?.binary).toBe(binary)
  expect(sequencer?.playCalls).toBe(1)
  expect(sequencer?.pauseCalls).toBe(1)
  expect(sequencer?.loopCount).toBe(0)
  expect(sequencer?.options).toMatchObject({ skipToFirstNoteOn: false })
  adapter.currentTime = 3
  expect(adapter.currentTime).toBe(3)
  expect(adapter.duration).toBe(12.5)
  expect(adapter.paused).toBe(true)
  expect(adapter.finished).toBe(false)
  await expect(runtime.initialize()).resolves.toBe(adapter)
})

test('试听 runtime：dispose 暂停并销毁合成器、关闭 context；之后 initialize AbortError', async () => {
  const { context } = stubAudioContext()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const adapter = await runtime.initialize()
  adapter.play()
  runtime.dispose()
  runtime.dispose()
  expect(context.close).toHaveBeenCalledOnce()
  expect(spessa.sequencers.at(-1)?.pauseCalls).toBe(1)
  expect(spessa.worklets.at(-1)?.destroyed).toBe(true)
  await expect(runtime.initialize()).rejects.toMatchObject({ name: 'AbortError' })
})

test('试听 runtime：初始化中途 dispose 销毁迟到合成器并以 AbortError 收尾', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const { addModuleCalls, context } = stubAudioContext({ holdModule: gate })
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const pending = runtime.initialize()
  await vi.waitFor(() => expect(addModuleCalls.length).toBeGreaterThan(0))
  runtime.dispose()
  release()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(spessa.worklets.at(-1)?.destroyed).toBe(true)
  expect(spessa.sequencers).toHaveLength(0)
  expect(context.close).toHaveBeenCalledOnce()
})

/** 最小合法 MIDI：format0 / 480tpqn / 单音轨 note on(60,100) → note off。 */
function minimalMidi(): ArrayBuffer {
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
  return new Uint8Array([...header, ...trackHeader, ...track]).buffer as ArrayBuffer
}
