// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import {
  minimalMidi,
  restoreBrowserMidiFixture,
  riffBytes,
  roleReader,
  spessa,
  stubAudioContext,
} from './browser-midi-fixture.js'
import { createBrowserMidiPreviewRuntime } from './midi-preview.js'

afterEach(restoreBrowserMidiFixture)

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

test('试听关闭使模块加载提前结束，迟到的模块不会创建合成器', async () => {
  let release = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const { addModuleCalls, context } = stubAudioContext({ holdModule: gate })
  const runtime = createBrowserMidiPreviewRuntime(roleReader(riffBytes()))!
  const pending = runtime.initialize().catch((error: unknown) => error)
  try {
    await vi.waitFor(() => expect(addModuleCalls).toEqual(['/spessasynth_processor.min.js']))
    runtime.dispose()
    await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(context.state).toBe('closed'))
    release()
    await vi.dynamicImportSettled()
    expect(spessa.worklets).toHaveLength(0)
    expect(spessa.sequencers).toHaveLength(0)
    expect(spessa.disposalEvents).toEqual(['close context'])
  } finally {
    release()
    runtime.dispose()
    await pending
  }
})
