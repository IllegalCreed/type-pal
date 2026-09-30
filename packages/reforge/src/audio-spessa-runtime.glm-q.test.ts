// @vitest-environment jsdom
// Q03 · spessa 合成初始化与 MIDI 试听浏览器 runtime 残差（排重：midi-preview transport/play-guards/
// lifecycle 与 bgm 生命周期旧测已证适配器层；本文件只覆盖 initializeBrowserSpessaSynth 门、
// createBrowserMidiPreviewRuntime 装配/取消/释放与 analyzeMidiBytes 真实 MIDI 解析）。
// 外部合成库与宿主 AudioContext 以 typed 替身注入（外部 IO 边界，非项目业务核心）；
// 初始化门全部经由 runtime 公开入口驱动，产品内部自行构造替身上下文，测试零强转。
import { afterEach, expect, test, vi } from 'vitest'
import {
  analyzeMidiBytes,
  createBrowserMidiPreviewRuntime,
} from './audio/midi-preview.js'

const spessaLog = vi.hoisted(() => ({
  worklets: [] as { self?: { destroyed: boolean } }[],
  sequencers: [] as { self?: unknown }[],
  forceReadyFail: false,
}))

vi.mock('spessasynth_lib', () => {
  class WorkletSynthesizer {
    destroyed = false
    connected: unknown
    soundBanks: { bytes: ArrayBuffer; name: string }[] = []
    controllerChanges: [number, number, number][] = []
    midiChannels: ({ lockController: ReturnType<typeof vi.fn> } | undefined)[] = []
    constructor(destination: unknown) {
      this.connected = destination
      for (let i = 0; i < 16; i++) this.midiChannels.push({ lockController: vi.fn() })
      const entry: { self?: WorkletSynthesizer } = {}
      entry.self = this
      spessaLog.worklets.push(entry)
    }
    connect(destination: unknown): void {
      this.connected = destination
    }
    get soundBankManager() {
      return {
        addSoundBank: async (bytes: ArrayBuffer, name: string) => {
          this.soundBanks.push({ bytes, name })
        },
      }
    }
    get isReady(): Promise<void> {
      return spessaLog.forceReadyFail
        ? Promise.reject(new Error('synth not ready'))
        : Promise.resolve()
    }
    controllerChange(channel: number, controller: number, value: number): void {
      this.controllerChanges.push([channel, controller, value])
    }
    destroy(): void {
      this.destroyed = true
    }
  }
  class Sequencer {
    loopCount = 1
    currentTimeValue = 0
    readonly durationValue = 12.5
    pausedValue = true
    readonly finishedValue = false
    loaded: { binary: ArrayBuffer; fileName: string }[] = []
    playCalls = 0
    pauseCalls = 0
    constructor(public synth: unknown, public options: unknown) {
      const entry: { self?: Sequencer } = {}
      entry.self = this
      spessaLog.sequencers.push(entry)
    }
    loadNewSongList(list: { binary: ArrayBuffer; fileName: string }[]): void {
      this.loaded = list
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
  return { WorkletSynthesizer, Sequencer }
})

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
  audioWorklet: { addModule: ReturnType<typeof vi.fn> } | undefined
  destination: unknown
  state: AudioContextState
  resume: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

/** AudioContext 替身经 stubGlobal 注入（宿主边界），不做类型强转。 */
function stubAudioContext(options: { worklet?: boolean; holdModule?: Promise<void> } = {}) {
  const context: FakeContext = {
    audioWorklet:
      options.worklet === false
        ? undefined
        : {
            addModule: vi.fn(() => options.holdModule ?? Promise.resolve()),
          },
    destination: { kind: 'destination' },
    state: 'running',
    resume: vi.fn(async () => {}),
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
  return { context, Ctor }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('Q03 spessa 初始化：无 audioWorklet 按 secure context 指路拒绝', async () => {
  vi.stubGlobal('isSecureContext', true)
  stubAudioContext({ worklet: false })
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  await expect(runtime.initialize()).rejects.toThrow(
    'AudioWorklet 不可用（secure context=true），请使用 HTTPS 或 localhost。',
  )
})

test('Q03 spessa 初始化成功链：模块 URL、RIFF 音色库、16 通道混响 91 锁定', async () => {
  const { context } = stubAudioContext()
  const bytes = riffBytes()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(bytes))!
  const adapter = await runtime.initialize()
  expect(context.audioWorklet?.addModule).toHaveBeenCalledWith('/spessasynth_processor.min.js')
  const impl = spessaLog.worklets.at(-1)?.self as unknown as {
    destroyed: boolean
    connected: unknown
    soundBanks: { bytes: ArrayBuffer; name: string }[]
    controllerChanges: [number, number, number][]
    midiChannels: ({ lockController: ReturnType<typeof vi.fn> } | undefined)[]
  }
  expect(impl.destroyed).toBe(false)
  expect(impl.connected).toBe(context.destination)
  expect(impl.soundBanks).toEqual([{ bytes, name: 'preview' }])
  expect(impl.controllerChanges).toHaveLength(16)
  expect(
    impl.controllerChanges.every(([, controller, value]) => controller === 91 && value === 0),
  ).toBe(true)
  expect(
    impl.midiChannels.map((channel) => channel?.lockController.mock.calls[0]?.[1]),
  ).toEqual(Array.from({ length: 16 }, () => true))
  adapter.play()
  expect((spessaLog.sequencers.at(-1)?.self as { playCalls: number }).playCalls).toBe(1)
})

test('Q03 spessa 初始化：非 RIFF 音色库拒绝并销毁合成器，可重试', async () => {
  stubAudioContext()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(new TextEncoder().encode('XIFFxxxx').buffer as ArrayBuffer))!
  await expect(runtime.initialize()).rejects.toThrow(
    'MIDI 音色库不是有效 RIFF 文件，请检查 audio.midiSoundfont。',
  )
  expect(spessaLog.worklets.at(-1)?.self?.destroyed).toBe(true)
  // 失败后初始化承诺被重置：修好输入可重试成功。
  const runtime2 = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  await expect(runtime2.initialize()).resolves.toBeDefined()
})

test('Q03 spessa 初始化：音色库读取失败销毁合成器并原样抛出', async () => {
  stubAudioContext()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(new Error('soundfont io')))!
  await expect(runtime.initialize()).rejects.toThrow('soundfont io')
  expect(spessaLog.worklets.at(-1)?.self?.destroyed).toBe(true)
})

test('Q03 spessa 初始化：isReady 拒绝销毁合成器并原样抛出', async () => {
  stubAudioContext()
  spessaLog.forceReadyFail = true
  try {
    const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
    await expect(runtime.initialize()).rejects.toThrow('synth not ready')
  } finally {
    spessaLog.forceReadyFail = false
  }
  expect(spessaLog.worklets.at(-1)?.self?.destroyed).toBe(true)
})

test('Q03 试听 runtime：无任何 AudioContext 构造器返回 undefined', () => {
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('webkitAudioContext', undefined)
  expect(createBrowserMidiPreviewRuntime(roleReader(riffBytes()))).toBeUndefined()
})

test('Q03 试听 runtime：webkitAudioContext 回退可用', async () => {
  const { context, Ctor } = stubAudioContext()
  vi.stubGlobal('AudioContext', undefined)
  vi.stubGlobal('webkitAudioContext', Ctor)
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))
  expect(runtime).toBeDefined()
  await runtime!.initialize()
  expect(context.audioWorklet?.addModule).toHaveBeenCalled()
})

test('Q03 试听 runtime：适配器透传 sequencer 传输操作与快照字段，二次 initialize 复用', async () => {
  stubAudioContext()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const adapter = await runtime.initialize()
  adapter.load(new TextEncoder().encode('MThd').buffer as ArrayBuffer, 'q3.mid')
  adapter.play()
  adapter.pause()
  const instance = spessaLog.sequencers.at(-1)?.self as unknown as {
    loaded: { fileName: string }[]
    playCalls: number
    pauseCalls: number
    loopCount: number
    options: { skipToFirstNoteOn: boolean }
  }
  expect(instance.loaded).toHaveLength(1)
  expect(instance.loaded[0]?.fileName).toBe('q3.mid')
  expect(instance.playCalls).toBe(1)
  expect(instance.pauseCalls).toBe(1)
  expect(instance.loopCount).toBe(0)
  expect(instance.options).toMatchObject({ skipToFirstNoteOn: false })
  adapter.currentTime = 3
  expect(adapter.currentTime).toBe(3)
  expect(adapter.duration).toBe(12.5)
  expect(adapter.paused).toBe(true)
  expect(adapter.finished).toBe(false)
  await expect(runtime.initialize()).resolves.toBe(adapter)
})

test('Q03 试听 runtime：dispose 暂停并销毁合成器、关闭 context；之后 initialize AbortError', async () => {
  stubAudioContext()
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const adapter = await runtime.initialize()
  adapter.play()
  runtime.dispose()
  expect((spessaLog.sequencers.at(-1)?.self as { pauseCalls: number }).pauseCalls).toBe(1)
  expect(spessaLog.worklets.at(-1)?.self?.destroyed).toBe(true)
  await expect(runtime.initialize()).rejects.toMatchObject({ name: 'AbortError' })
})

test('Q03 试听 runtime：初始化中途 dispose 销毁迟到合成器并以 AbortError 收尾', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const { context } = stubAudioContext({ holdModule: gate })
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const pending = runtime.initialize()
  await vi.waitFor(() => expect(context.audioWorklet?.addModule).toHaveBeenCalled())
  runtime.dispose()
  release()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(spessaLog.worklets.at(-1)?.self?.destroyed).toBe(true)
})

test('Q03 analyzeMidiBytes 解析真实 MIDI 字节并产出 note-activity', async () => {
  const activity = await analyzeMidiBytes(minimalMidi(), 32)
  expect(activity.kind).toBe('note-activity')
  expect(activity.noteCount).toBeGreaterThan(0)
  expect(activity.buckets).toHaveLength(32)
  expect(Math.max(...activity.buckets)).toBeLessThanOrEqual(1)
  expect(Math.max(...activity.buckets)).toBeGreaterThan(0)
})

test('Q03 analyzeMidiBytes 对非 MIDI 字节 fail-loud', async () => {
  const garbage = new TextEncoder().encode('this is not a midi file at all').buffer as ArrayBuffer
  await expect(analyzeMidiBytes(garbage)).rejects.toThrow()
})

/** 最小合法 MIDI：format0 / 480tpqn / 单音轨 note on(60,100) → note off。 */
function minimalMidi(): ArrayBuffer {
  const track = [
    0x00, 0x90, 0x3c, 0x64,
    0x83, 0x60, 0x80, 0x3c, 0x00,
    0x00, 0xff, 0x2f, 0x00,
  ]
  const header = [
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xe0,
  ]
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b,
    (track.length >> 24) & 0xff,
    (track.length >> 16) & 0xff,
    (track.length >> 8) & 0xff,
    track.length & 0xff,
  ]
  return new Uint8Array([...header, ...trackHeader, ...track]).buffer as ArrayBuffer
}
