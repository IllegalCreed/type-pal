/**
 * TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 L4-L5：MIDI 试听“播放中替换”合同（midi-preview.ts）。
 * 排重：midi-preview.test.ts 已证单曲 load/play/pause/stop/seek、自然完成重置、缓存复用；
 * lifecycle-boundaries.test.ts 已证 A/B 载入逆序、同 key 去重、读失败/初始化失败重试、
 * 挂起 play 的 pause/stop/seek/dispose 失效；play-guards.glm-n 已证读未完成 play 拒绝与
 * dispose 后 load 的 AbortError。本文件只补“旧曲正在播放时替换选择”的两条残差：
 * 替换成功（旧曲停 + 新曲就绪归零 + 随后 play 从头）与替换读取失败（新选择空态、
 * 不半提交旧字节、修复后可重载）。cachedActivity 为公开参数（编辑器 SHA 缓存同款合法输入）。
 */
import { describe, expect, test } from 'vitest'
import type { AudioAssetReader } from './bgm.js'
import {
  createMidiNoteActivity,
  createMidiPreviewTransport,
  type MidiPreviewRuntimeAdapter,
  type MidiPreviewSequencerAdapter,
} from './midi-preview.js'

interface PreviewHarness {
  runtime: MidiPreviewRuntimeAdapter
  adapter: MidiPreviewSequencerAdapter
  /** sequencer.load 即捕获的字节身份（fileName + 内容）。 */
  loads: Array<{ fileName: string; bytes: number[] }>
  plays: number[]
}

function harness(sequencerDuration = 10): PreviewHarness {
  const loads: PreviewHarness['loads'] = []
  const plays: number[] = []
  let currentTime = 0
  let paused = true
  // 只通过 pause()/play() 调用改变 paused：load 本身不隐式暂停（适配器合同面），
  // 这样“替换后旧曲是否被停”才可由 paused 观测。
  const adapter: MidiPreviewSequencerAdapter = {
    load(binary, fileName) {
      loads.push({ fileName, bytes: [...new Uint8Array(binary)] })
    },
    play() {
      plays.push(1)
      paused = false
    },
    pause() {
      paused = true
    },
    get currentTime() {
      return currentTime
    },
    set currentTime(value) {
      currentTime = value
    },
    get duration() {
      return sequencerDuration
    },
    get paused() {
      return paused
    },
    get finished() {
      return false
    },
  }
  const runtime: MidiPreviewRuntimeAdapter = {
    context: { state: 'running', resume: async () => {} },
    initialize: async () => adapter,
    dispose() {},
  }
  return { runtime, adapter, loads, plays }
}

function resolver(
  bytesByAsset: Map<string, Uint8Array>,
  failOnce = new Set<string>(),
): AudioAssetReader & { reads: string[] } {
  const reads: string[] = []
  return {
    reads,
    async readBytes(asset) {
      reads.push(asset)
      if (failOnce.has(asset)) {
        failOnce.delete(asset)
        throw new Error('read failed')
      }
      const bytes = bytesByAsset.get(asset)
      if (!bytes) throw new Error(`no fixture bytes for ${asset}`)
      return bytes.slice().buffer
    },
    async readRoleBytes() {
      return new ArrayBuffer(8)
    },
  }
}

function singleNoteMidi(pitch: number, ticks: number): Uint8Array {
  // Format 0, one track, 96 ticks per quarter note. Both test durations fit one delta byte.
  return Uint8Array.from([
    0x4d,
    0x54,
    0x68,
    0x64,
    0,
    0,
    0,
    6,
    0,
    0,
    0,
    1,
    0,
    96,
    0x4d,
    0x54,
    0x72,
    0x6b,
    0,
    0,
    0,
    12,
    0,
    0x90,
    pitch,
    64,
    ticks,
    0x80,
    pitch,
    64,
    0,
    0xff,
    0x2f,
    0,
  ])
}

describe('L4 播放中替换选择（停止/替换轴）', () => {
  test('旧曲播放中 load 新曲：旧曲被停、新曲字节真入 sequencer、快照归零换时长，play 从头开播', async () => {
    const h = harness()
    const bytesA = singleNoteMidi(60, 96)
    const bytesB = singleNoteMidi(62, 48)
    const activityA = createMidiNoteActivity([{ start: 0, length: 0.5, velocity: 64 }], 0.5, 8)
    const activityB = createMidiNoteActivity([{ start: 0, length: 0.25, velocity: 64 }], 0.25, 8)
    const t = createMidiPreviewTransport(
      resolver(
        new Map([
          ['music.a', bytesA],
          ['music.b', bytesB],
        ]),
      ),
      h.runtime,
    )
    await t.load('music.a', 'music.a', activityA)
    await t.play()
    h.adapter.currentTime = 0.125 // 旧曲播放推进中

    const returned = await t.load('music.b', 'music.b', activityB)
    expect(returned).toBe(activityB) // cachedActivity 原样回传
    expect(h.loads).toEqual([
      { fileName: 'music.a', bytes: [...bytesA] },
      { fileName: 'music.b', bytes: [...bytesB] },
    ])
    expect(h.adapter.paused).toBe(true) // 旧曲已被替换路径停止
    expect(t.snapshot()).toMatchObject({
      asset: 'music.b',
      currentTime: 0,
      duration: 0.25, // 新曲自己的时长
      paused: true,
    })

    await t.play()
    expect(h.plays).toHaveLength(2)
    expect(h.adapter.paused).toBe(false)
    expect(h.adapter.currentTime).toBe(0) // 从头开播
    expect(h.loads).toHaveLength(2) // 同曲 play 不重载
    expect(t.snapshot()).toMatchObject({ asset: 'music.b', paused: false, duration: 0.25 })
  })
})

describe('L5 播放中替换读取失败（失败轴）', () => {
  test('新曲读取失败时，停止后的快照不沿用旧曲时长，重试后报告新曲时长', async () => {
    const h = harness(0.5)
    const bytesA = singleNoteMidi(60, 96)
    const bytesB = singleNoteMidi(62, 48)
    const t = createMidiPreviewTransport(
      resolver(
        new Map([
          ['music.a', bytesA],
          ['music.b', bytesB],
        ]),
        new Set(['music.b']),
      ),
      h.runtime,
    )
    await t.load('music.a')
    await t.play()
    h.adapter.currentTime = 0.125
    expect(t.snapshot()).toEqual({
      asset: 'music.a',
      currentTime: 0.125,
      duration: 0.5,
      paused: false,
    })

    await expect(t.load('music.b')).rejects.toThrow('read failed')
    expect(h.loads).toHaveLength(1) // 新曲从未进入 sequencer
    expect(h.adapter.paused).toBe(true) // 旧曲不残留出声
    t.stop()
    expect(t.snapshot()).toEqual({
      asset: 'music.b',
      duration: 0,
      currentTime: 0,
      paused: true,
    })
    // 旧字节/旧 activity 均已失效：不能把旧曲当新选择播放
    await expect(t.play()).rejects.toThrow('请等待 MIDI 读取完成。')

    await t.load('music.b') // reader 修复后重载
    expect(t.snapshot()).toMatchObject({ asset: 'music.b', duration: 0.25 })
    await t.play()
    expect(h.loads).toHaveLength(2)
    expect(h.loads[1]).toEqual({ fileName: 'music.b', bytes: [...bytesB] })
    expect(t.snapshot().paused).toBe(false)
  })
})
