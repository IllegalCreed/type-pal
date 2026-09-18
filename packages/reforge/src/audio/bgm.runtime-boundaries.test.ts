/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 C1-C3：BGM 异步调度（bgm.ts，注入 RuntimeAdapter）。
 * bgm.test.ts 已覆盖 stop 清账/fade 接管/开关/同曲续播；本文件补 resume 并发去重、
 * 换曲读取逆序的串行门、读失败重试。全部 entered/deferred 驱动，不用固定 sleep；
 * 不调用真实 AudioContext，不作听感验收。
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/glm-runtime-contract-fixtures.js'
import {
  type AudioAssetReader,
  type BgmRuntimeAdapter,
  type BgmSequencerAdapter,
  createBgmPlayerWithRuntime,
} from './bgm.js'

afterEach(() => {
  vi.restoreAllMocks()
})

interface BgmHarness {
  runtime: BgmRuntimeAdapter
  seq: BgmSequencerAdapter & {
    loadNewSongList: ReturnType<typeof vi.fn>
    play: ReturnType<typeof vi.fn>
    pause: ReturnType<typeof vi.fn>
    fadeTo: ReturnType<typeof vi.fn>
    cancelFade: ReturnType<typeof vi.fn>
  }
  init: ReturnType<typeof deferred<BgmSequencerAdapter>>
  resumeGate: ReturnType<typeof deferred<void>>
  setState: (state: AudioContextState) => void
  reads: Array<{ asset: string; kind: string }>
}

/** 可控后端：init/ctx.resume 各一个 deferred；readBytes 按 asset 永挂起（可注入一次性失败）。 */
function harness(): BgmHarness {
  const seq = {
    pause: vi.fn(),
    loadNewSongList: vi.fn(),
    play: vi.fn(),
    fadeTo: vi.fn(),
    cancelFade: vi.fn(),
    loopCount: 0,
  }
  const init = deferred<BgmSequencerAdapter>()
  const resumeGate = deferred<void>()
  let state: AudioContextState = 'running'
  const reads: Array<{ asset: string; kind: string }> = []
  const _resolver: AudioAssetReader = {
    async readBytes(asset, expectedKind) {
      reads.push({ asset, kind: expectedKind ?? '' })
      return new ArrayBuffer(8)
    },
    async readRoleBytes() {
      return new ArrayBuffer(8)
    },
  }
  const runtime: BgmRuntimeAdapter = {
    context: {
      get state() {
        return state
      },
      resume: vi.fn(() => resumeGate.promise),
    },
    initialize: vi.fn(() => init.promise),
  }
  return {
    runtime,
    seq: seq as unknown as BgmHarness['seq'],
    init,
    resumeGate,
    setState: (next) => {
      state = next
    },
    reads,
  }
}

const bytes = (): ArrayBuffer => new ArrayBuffer(8)

describe('C1 resume 并发去重与被拒后可再次手势', () => {
  test('挂起期间并发 resume 只触发一次 ctx.resume；被拒后清旗标，后续手势可再次调用', async () => {
    const h = harness()
    h.setState('suspended')
    const p = createBgmPlayerWithRuntime(
      { readBytes: async () => bytes(), readRoleBytes: async () => bytes() },
      h.runtime,
    )
    p.resume()
    p.resume() // 并发去重
    p.resume()
    expect(h.runtime.context.resume).toHaveBeenCalledTimes(1)
    h.resumeGate.reject(new Error('autoplay denied'))
    await Promise.resolve().then(() => {})
    await Promise.resolve().then(() => {})
    // 被拒后旗标复位：下一次手势（如真实点击）可再次 resume
    p.resume()
    expect(h.runtime.context.resume).toHaveBeenCalledTimes(2)
  })
})

describe('C2 换曲读取逆序完成：仅当前请求真正 load/play', () => {
  test('后发请求先完成 → 唯一 loadNewSongList/play；先发旧读迟到被串行门丢弃', async () => {
    const h = harness()
    // 读取顺序可控：B 先被请求但挂起，A 后发且立即可读
    const gates = new Map<string, ReturnType<typeof deferred<ArrayBuffer>>>()
    gates.set('music.b', deferred<ArrayBuffer>())
    const resolver: AudioAssetReader = {
      async readBytes(asset, expectedKind) {
        h.reads.push({ asset, kind: expectedKind ?? '' })
        const gate = gates.get(asset)
        return gate ? gate.promise : new ArrayBuffer(8)
      },
      async readRoleBytes() {
        return new ArrayBuffer(8)
      },
    }
    const p = createBgmPlayerWithRuntime(resolver, h.runtime)
    p.play('music.b') // 懒初始化：last=b，init 未完成
    p.play('music.a') // last=a（后发接管）
    h.init.resolve(h.seq) // init 完成 → playCurrent 只跑 last=a
    await Promise.resolve().then(() => {})
    await Promise.resolve().then(() => {})
    expect(h.reads.map((r) => r.asset)).toEqual(['music.a']) // 只有当前请求真正读取
    // a 的读取完成（当前）→ 唯一 load/play
    gates.get('music.b')!.resolve(new ArrayBuffer(8)) // 迟到的 b 若被错误接受将在此后暴露
    expect(h.seq.loadNewSongList).toHaveBeenCalledTimes(1)
    expect(h.seq.loadNewSongList).toHaveBeenCalledWith([
      { binary: expect.any(ArrayBuffer), fileName: 'music.a' },
    ])
    expect(h.seq.play).toHaveBeenCalledTimes(1)
    expect(h.seq.loopCount).toBe(Infinity) // loop 默认 true
  })
})

describe('C3 读取失败不提交且同曲可重试', () => {
  test('readBytes 失败 → 不 loadNewSongList/不 play；修复读取后同曲 play 真正提交', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const h = harness()
    const resolver: AudioAssetReader = {
      readBytes: async (asset, expectedKind) => {
        h.reads.push({ asset, kind: expectedKind ?? '' })
        if (h.reads.filter((r) => r.asset === asset).length === 1) throw new Error('disk error') // 首次读取失败
        return new ArrayBuffer(8)
      },
      async readRoleBytes() {
        return new ArrayBuffer(8)
      },
    }
    const p = createBgmPlayerWithRuntime(resolver, h.runtime)
    p.play('music.x')
    h.init.resolve(h.seq)
    await vi.waitFor(() => {
      expect(h.reads.map((r) => r.asset)).toEqual(['music.x'])
    })
    await Promise.resolve().then(() => {})
    await Promise.resolve().then(() => {})
    // 失败可观察（warn 带上下文）且错误不提交：无 load/play
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0])).toContain('music.x')
    expect(h.seq.loadNewSongList).not.toHaveBeenCalled()
    expect(h.seq.play).not.toHaveBeenCalled()
    // 同曲重试（读取已修复）→ 真正提交
    p.play('music.x')
    await vi.waitFor(() => {
      expect(h.seq.loadNewSongList).toHaveBeenCalledTimes(1)
    })
    expect(h.seq.loadNewSongList).toHaveBeenCalledWith([
      { binary: expect.any(ArrayBuffer), fileName: 'music.x' },
    ])
    expect(h.seq.play).toHaveBeenCalledTimes(1)
  })
})
