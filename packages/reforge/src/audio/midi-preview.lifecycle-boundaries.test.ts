/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 C4-C6：MIDI 试听 transport 生命周期（midi-preview.ts）。
 * midi-preview.test.ts 已覆盖 seek/自然完成/stop-dispose 取消基础轴；本文件补 A/B 载入逆序、
 * 同 key 在途去重（读取轨迹证明）、读失败/后端初始化失败后的重试、挂起 play 的失效组合。
 * 只注入 PreviewRuntimeAdapter；cachedActivity 明确只测 transport 不测解析器；无听感验收。
 */
import { describe, expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/glm-runtime-contract-fixtures.js'
import type { AudioAssetReader } from './bgm.js'
import {
  createMidiNoteActivity,
  createMidiPreviewTransport,
  type MidiPreviewRuntimeAdapter,
  type MidiPreviewSequencerAdapter,
} from './midi-preview.js'

const activity = () => createMidiNoteActivity([{ start: 0, length: 2, velocity: 100 }], 10, 8)

interface PreviewHarness {
  runtime: MidiPreviewRuntimeAdapter
  seq: MidiPreviewSequencerAdapter & {
    load: ReturnType<typeof vi.fn>
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
  }
  init: ReturnType<typeof deferred<MidiPreviewSequencerAdapter>>
  resumeGate: ReturnType<typeof deferred<void>>
  setState: (state: AudioContextState) => void
  reads: string[]
}

function harness(): PreviewHarness {
  const seq = {
    load: vi.fn(),
    play: vi.fn(function (this: { _paused: boolean }) {
      this._paused = false
    }),
    pause: vi.fn(function (this: { _paused: boolean }) {
      this._paused = true
    }),
    _currentTime: 0,
    _paused: true,
    get currentTime() {
      return this._currentTime
    },
    set currentTime(value: number) {
      this._currentTime = value
    },
    get duration() {
      return 10
    },
    get paused() {
      return this._paused
    },
    get finished() {
      return false
    },
  }
  const init = deferred<MidiPreviewSequencerAdapter>()
  const resumeGate = deferred<void>()
  let state: AudioContextState = 'running'
  const runtime: MidiPreviewRuntimeAdapter = {
    context: {
      get state() {
        return state
      },
      resume: vi.fn(() => resumeGate.promise),
    },
    initialize: vi.fn(() => init.promise),
    dispose: vi.fn(),
  }
  return {
    runtime,
    seq: seq as unknown as PreviewHarness['seq'],
    init,
    resumeGate,
    setState: (next) => {
      state = next
    },
    reads: [],
  }
}

/** 读取可控 resolver：gates 中的 asset 挂起，其余立即成功；fail 集合内一次性失败。 */
function resolver(
  h: PreviewHarness,
  gates = new Map<string, ReturnType<typeof deferred<ArrayBuffer>>>(),
  failOnce = new Set<string>(),
): AudioAssetReader {
  return {
    async readBytes(asset) {
      h.reads.push(asset)
      if (failOnce.has(asset)) {
        failOnce.delete(asset)
        throw new Error('read failed')
      }
      const gate = gates.get(asset)
      return gate ? gate.promise : new ArrayBuffer(16)
    },
    async readRoleBytes() {
      return new ArrayBuffer(16)
    },
  }
}

describe('C4 A/B 载入逆序与同 key 在途去重', () => {
  test('旧选择迟到被拒（AbortError），transport 仍是新选择；不清新请求的成果', async () => {
    const h = harness()
    const gateA = deferred<ArrayBuffer>()
    const t = createMidiPreviewTransport(resolver(h, new Map([['a', gateA]])), h.runtime)
    const slow = t.load('a', 'a', activity())
    const fast = await t.load('b', 'b', activity())
    expect(fast.duration).toBe(10)
    gateA.resolve(new ArrayBuffer(16))
    // 迟到旧读必须被拒：把拒绝落成值断言（错误对象本身即合同结果）
    const slowOutcome = await slow.then(
      () => undefined,
      (error: unknown) => error as Error,
    )
    expect(slowOutcome).toBeInstanceOf(Error)
    expect(slowOutcome?.message).toContain('MIDI 选择已变化')
    expect(t.snapshot().asset).toBe('b') // 新请求成果未被迟到旧读破坏
    expect(t.snapshot().duration).toBe(10)
  })
  test('同 asset+cacheKey 在途去重：读取轨迹只有一次，两次调用同结果', async () => {
    const h = harness()
    const gate = deferred<ArrayBuffer>()
    const t = createMidiPreviewTransport(resolver(h, new Map([['m', gate]])), h.runtime)
    const first = t.load('m', 'key-1', activity())
    const second = t.load('m', 'key-1', activity())
    gate.resolve(new ArrayBuffer(16))
    const [a, b] = await Promise.all([first, second])
    expect(a).toEqual(b)
    expect(h.reads).toEqual(['m']) // 读取/完成轨迹证明去重，不只是 Promise 全等
  })
  test('旧 load 的 finally 不清仍在途的新请求：A 挂起→B entered→A 迟到被拒→重复 B 仍只读一次', async () => {
    const h = harness()
    const gateA = deferred<ArrayBuffer>()
    const gateB = deferred<ArrayBuffer>()
    const t = createMidiPreviewTransport(
      resolver(
        h,
        new Map([
          ['a', gateA],
          ['b', gateB],
        ]),
      ),
      h.runtime,
    )
    const slowA = t.load('a', 'key-a', activity())
    const inFlightB = t.load('b', 'key-b', activity()) // B 已 entered（读取挂起）
    expect(h.reads).toEqual(['a', 'b'])
    // A 迟到完成：被 stale 门拒收；其 finally 必须因 promise 身份不匹配而不清 B 的在途记录
    gateA.resolve(new ArrayBuffer(16))
    const rejected = await slowA.then(
      () => undefined,
      (error: unknown) => error as Error,
    )
    expect(rejected?.message).toContain('MIDI 选择已变化')
    // B 仍在途时重复请求同 key：必须命中在途去重（A 的 finally 不得殃及 loadPromise）
    const duplicateB = t.load('b', 'key-b', activity())
    gateB.resolve(new ArrayBuffer(16))
    const outcomes = await Promise.all(
      [inFlightB, duplicateB, t.load('b', 'key-b', activity())].map((request) =>
        request.then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error: error as Error }),
        ),
      ),
    )
    // 在途请求必须全部兑现（finally 误清会令先发的 B 读被后续 serial 顶掉而拒绝）
    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, true, true])
    expect(outcomes[0]?.ok && outcomes[0].value).toEqual(activity())
    expect(h.reads).toEqual(['a', 'b']) // b 只读取一次；若 finally 误清则会出现第三次读取
    expect(t.snapshot().asset).toBe('b')
    expect(t.snapshot().duration).toBe(10)
  })
})

describe('C5 读取失败与后端初始化失败后的重试', () => {
  test('读取失败可观察；修复 reader 后同 asset 重载成功', async () => {
    const h = harness()
    const t = createMidiPreviewTransport(resolver(h, undefined, new Set(['m'])), h.runtime)
    await expect(t.load('m', 'm', activity())).rejects.toThrow('read failed')
    // 失败不半提交：选择被记账，但 bytes/activity 均未落地（时长 0、无内容可播）
    expect(t.snapshot().asset).toBe('m')
    expect(t.snapshot().duration).toBe(0)
    const fixed = await t.load('m', 'm', activity())
    expect(fixed.noteCount).toBe(1)
    expect(t.snapshot().asset).toBe('m')
  })
  test('后端 initialize 失败 → play 拒绝且不缓存失败；下次 play 重试初始化成功', async () => {
    const h = harness()
    let initAttempts = 0
    h.runtime.initialize = vi.fn(() => {
      initAttempts++
      return initAttempts === 1 ? Promise.reject(new Error('worklet boom')) : Promise.resolve(h.seq)
    })
    const t = createMidiPreviewTransport(resolver(h), h.runtime)
    await t.load('m', 'm', activity())
    await expect(t.play()).rejects.toThrow('worklet boom')
    // 失败不被缓存：同输入重试 → 初始化重跑并真正开播
    await t.play()
    expect(initAttempts).toBe(2)
    expect(h.seq.play).toHaveBeenCalledTimes(1)
    expect(t.snapshot().paused).toBe(false)
  })
})

describe('C6 挂起 play 的失效组合（snapshot 与实际后端动作双断言）', () => {
  async function pendingPlay(): Promise<{
    h: PreviewHarness
    t: ReturnType<typeof createMidiPreviewTransport>
    pending: Promise<void>
  }> {
    const h = harness()
    h.setState('suspended')
    const t = createMidiPreviewTransport(resolver(h), h.runtime)
    await t.load('m', 'm', activity())
    const pending = t.play()
    return { h, t, pending }
  }
  test('并发 play 去重：resume 只发生一次，两调用同一结局', async () => {
    const { h, t, pending } = await pendingPlay()
    const second = t.play()
    h.init.resolve(h.seq)
    h.resumeGate.resolve()
    await Promise.all([pending, second])
    expect(h.runtime.context.resume).toHaveBeenCalledTimes(1)
    expect(h.seq.play).toHaveBeenCalledTimes(1)
  })
  test('pause 使挂起 play 失效：AbortError、后端零 play、snapshot 记录显式位置', async () => {
    const { h, t, pending } = await pendingPlay()
    t.pause()
    h.resumeGate.resolve()
    await expect(pending).rejects.toThrow('MIDI 选择已变化')
    expect(h.seq.play).not.toHaveBeenCalled() // 实际后端动作：未开播
    const snap = t.snapshot()
    expect(snap.paused).toBe(true)
    expect(snap.currentTime).toBe(0) // 显式位置（未开播）
  })
  test('stop/seek/dispose 均使挂起 play 失效；dispose 关闭后端', async () => {
    const stopped = await pendingPlay()
    stopped.t.stop()
    stopped.h.resumeGate.resolve()
    await expect(stopped.pending).rejects.toThrow('MIDI 选择已变化')
    expect(stopped.h.seq.play).not.toHaveBeenCalled()

    const sought = await pendingPlay()
    sought.t.seek(4)
    sought.h.resumeGate.resolve()
    await expect(sought.pending).rejects.toThrow('MIDI 选择已变化')
    expect(sought.t.snapshot().currentTime).toBe(4)

    const disposed = await pendingPlay()
    disposed.t.dispose()
    disposed.h.resumeGate.resolve()
    await expect(disposed.pending).rejects.toThrow('MIDI 选择已变化')
    expect(disposed.h.runtime.dispose).toHaveBeenCalledTimes(1) // 后端确被关闭
    expect(disposed.t.snapshot().asset).toBeUndefined()
  })
})
