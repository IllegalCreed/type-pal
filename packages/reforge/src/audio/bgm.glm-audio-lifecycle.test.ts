/**
 * TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 L1-L3：BGM 生命周期残差（bgm.ts，注入 RuntimeAdapter）。
 * 排重：bgm.test.ts 已证 stop 清账/开关续播/K2a/K2b/K5/G2/G3c/K3；bgm.runtime-boundaries.test.ts
 * 已证 resume 并发去重与被拒后可重试、懒初始化/读取乱序串行门、读失败重试；bgm.dispose.test.ts
 * 已证 dispose 幂等与迟到后端/迟到读取不播放；bgm.glm-n.test.ts 已证静音工厂与 init 失败降级。
 * 本文件只补三者未覆盖的公开合同：autoplay 解锁后的补播（正/负臂）、同曲 steady-state
 * 重复调用不重启、setEnabled 同值幂等。全部 deferred/gate 驱动，不用固定 sleep 表达时序。
 */
import { describe, expect, test, vi } from 'vitest'
import { deferred } from '../__tests__/glm-runtime-contract-fixtures.js'
import {
  type AudioAssetReader,
  type BgmRuntimeAdapter,
  type BgmSequencerAdapter,
  createBgmPlayerWithRuntime,
} from './bgm.js'

interface BgmHarness {
  resolver: AudioAssetReader
  runtime: BgmRuntimeAdapter
  seq: BgmSequencerAdapter
  init: ReturnType<typeof deferred<BgmSequencerAdapter>>
  /** 每次 ctx.resume 调用按序压入一个可控 gate；resumePlan 决定该次 resolve（解锁）或 reject（autoplay 拒）。 */
  resumeGates: Array<ReturnType<typeof deferred<void>>>
  resumeCalls: number[]
  setState: (state: AudioContextState) => void
  reads: Array<{ asset: string; kind: string }>
  loads: Array<Array<{ fileName: string; bytes: number[] }>>
  plays: number[]
  pauses: number[]
  fadeCalls: Array<[value: number, ms: number]>
  cancelFades: number[]
}

function harness(
  options: { state?: AudioContextState; resumePlan?: Array<'resolve' | 'reject'> } = {},
) {
  const loads: BgmHarness['loads'] = []
  const plays: number[] = []
  const pauses: number[] = []
  const fadeCalls: Array<[value: number, ms: number]> = []
  const cancelFades: number[] = []
  let loopCount = 0
  const seq: BgmSequencerAdapter = {
    pause: () => {
      pauses.push(1)
    },
    loadNewSongList: (songs) => {
      loads.push(
        songs.map((song) => ({ fileName: song.fileName, bytes: [...new Uint8Array(song.binary)] })),
      )
    },
    get loopCount() {
      return loopCount
    },
    set loopCount(value) {
      loopCount = value
    },
    play: () => {
      plays.push(1)
    },
    fadeTo: (value, ms) => {
      fadeCalls.push([value, ms])
    },
    cancelFade: () => {
      cancelFades.push(1)
    },
  }
  const init = deferred<BgmSequencerAdapter>()
  const resumeGates: BgmHarness['resumeGates'] = []
  const resumePlan = options.resumePlan ?? []
  let state: AudioContextState = options.state ?? 'running'
  const resumeCalls: number[] = []
  const runtime: BgmRuntimeAdapter = {
    context: {
      get state() {
        return state
      },
      resume: () => {
        resumeCalls.push(1)
        const gate = deferred<void>()
        resumeGates.push(gate)
        const outcome = resumePlan[resumeGates.length - 1] ?? 'resolve'
        return gate.promise.then(() => {
          if (outcome === 'resolve') state = 'running'
          else throw new Error('autoplay denied')
        })
      },
    },
    initialize: () => init.promise,
  }
  const reads: BgmHarness['reads'] = []
  const resolver: AudioAssetReader = {
    async readBytes(asset, expectedKind) {
      reads.push({ asset, kind: expectedKind ?? '' })
      const bytes = new Uint8Array(8)
      bytes.fill(asset.charCodeAt(asset.length - 1))
      return bytes.buffer
    },
    async readRoleBytes() {
      return new ArrayBuffer(8)
    },
  }
  return {
    resolver,
    runtime,
    seq,
    init,
    resumeGates,
    resumeCalls,
    setState: (next: AudioContextState) => {
      state = next
    },
    reads,
    loads,
    plays,
    pauses,
    fadeCalls,
    cancelFades,
  }
}

/** 释放全部在途微任务（macrotask 边界），用于“无进一步动作”的缺席断言。 */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('L1 autoplay 解锁补播（bgm 头注释合同：resume 成功后补播记账曲）', () => {
  test('挂起 ctx 上 autoplay 被拒仍完成一次静默提交；手势 resume 成功 → 补播记账曲', async () => {
    const h = harness({ state: 'suspended', resumePlan: ['reject', 'resolve'] })
    const player = createBgmPlayerWithRuntime(h.resolver, h.runtime)
    player.play('music.menu', true)
    h.init.resolve(h.seq)
    await vi.waitFor(() => expect(h.resumeGates).toHaveLength(1))
    // doPlay 先尝试解锁 ctx：被 autoplay 拒（.catch 吞掉）→ 仍在挂起 ctx 上完成一次静默提交
    h.resumeGates[0]!.reject(new Error('autoplay denied'))
    await vi.waitFor(() => expect(h.loads).toHaveLength(1))
    expect(h.plays).toHaveLength(1)
    // 用户手势：resume() 成功解锁并翻 running → 补播 last（重新读取并提交记账曲）
    player.resume()
    h.resumeGates[1]!.resolve()
    await vi.waitFor(() => expect(h.loads).toHaveLength(2))
    expect(h.plays).toHaveLength(2)
    expect(h.resumeCalls).toHaveLength(2)
    expect(h.loads.map((load) => load[0]?.fileName)).toEqual(['music.menu', 'music.menu'])
    expect(h.loads[1]).toEqual(h.loads[0]) // 同 AssetId 同内容：补播提交完整字节身份
  })

  test('负臂：stop 清账后手势解锁不补播（补播只由记账曲驱动，不无条件重放）', async () => {
    const h = harness()
    const player = createBgmPlayerWithRuntime(h.resolver, h.runtime)
    player.play('music.field', true)
    h.init.resolve(h.seq)
    await vi.waitFor(() => expect(h.plays).toHaveLength(1))
    player.stop() // 清账：last=undefined；ready/seq 仍有效
    expect(h.pauses).toHaveLength(1)
    h.setState('suspended')
    player.resume()
    h.resumeGates[0]!.resolve()
    await flush()
    expect(h.resumeCalls).toHaveLength(1)
    expect(h.plays).toHaveLength(1) // 无记账曲：解锁后零补播
    expect(h.loads).toHaveLength(1)
  })
})

describe('L2 同曲 steady-state 重复调用（接口合同：同曲重复调用不重启）', () => {
  test('运行中重复 play 同曲：零重读/零重载/零重启，恢复全增益；stop 后再 play 真重载', async () => {
    const h = harness()
    const player = createBgmPlayerWithRuntime(h.resolver, h.runtime)
    player.play('music.town', true)
    h.init.resolve(h.seq)
    await vi.waitFor(() => expect(h.plays).toHaveLength(1))
    expect(h.reads).toHaveLength(1)

    player.play('music.town', true) // steady-state 重复（无进行中换曲/停止窗口）
    await flush()
    expect(h.reads).toHaveLength(1) // 不重读
    expect(h.loads).toHaveLength(1) // 不重载
    expect(h.plays).toHaveLength(1) // 不重启
    expect(h.cancelFades).toHaveLength(1) // 接管动作仍在：取消旧 ramp
    expect(h.fadeCalls).toContainEqual([1, 0]) // 显式回全增益

    player.stop()
    player.play('music.town', true) // 防护未烂：真换轨路径仍完整重载
    await vi.waitFor(() => expect(h.plays).toHaveLength(2))
    expect(h.loads).toHaveLength(2)
    expect(h.reads).toHaveLength(2)
  })
})

describe('L3 setEnabled 同值幂等（接口合同：无变化不重启/不重停）', () => {
  test('重复开不重启；重复关只停一次（pause/cancelFade 恰一次）；重开补播记账曲', async () => {
    const h = harness()
    const player = createBgmPlayerWithRuntime(h.resolver, h.runtime)
    player.play('music.menu', true)
    h.init.resolve(h.seq)
    await vi.waitFor(() => expect(h.plays).toHaveLength(1))

    player.setEnabled(true) // 已开：幂等早退
    await flush()
    expect(h.plays).toHaveLength(1)
    expect(h.pauses).toHaveLength(0)
    expect(h.cancelFades).toHaveLength(0)

    player.setEnabled(false) // 关：cancelFade + 归零 + pause
    player.setEnabled(false) // 重复关：幂等早退
    await flush()
    expect(h.pauses).toHaveLength(1)
    expect(h.cancelFades).toHaveLength(1)
    expect(h.fadeCalls).toContainEqual([0, 0])

    player.setEnabled(true) // 重开：补播记账曲（一次完整重载）
    await vi.waitFor(() => expect(h.plays).toHaveLength(2))
    expect(h.loads).toHaveLength(2)
  })
})
