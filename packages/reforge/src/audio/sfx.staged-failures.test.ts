/**
 * TEST-REFORGE-ASSET-IO-1 B1/B3：sfx 分阶段失败与真实 browserAdapter 复制（sfx.ts）。
 * sfx.test.ts 12 项已覆盖 decode/read/play 失败、resume 重试、dispose 旧 prepare、错误上下文——
 * 不重复；本文件补：RIFF 标记门三轴（拒于 decode 前）、真实 browserAdapter 的字节复制与
 * AudioContext 宿主事件（connect/start/stop/close）、同 reader 修复重试的字节身份。
 */
import type { AssetRecordV1 } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { deepSnapshot, deferred, legalWav } from '../__tests__/glm-asset-io-fixtures.js'
import { type SfxAudioAdapter, SfxPlayer } from './sfx.js'

const recordOf = (path: string): AssetRecordV1 => ({
  kind: 'sound',
  path,
  mediaType: 'audio/wav',
  bytes: 24,
  sha256: 'a'.repeat(64),
  origin: { kind: 'authored' },
})

/** WAV 合法性自证：产品 assertWave 只查长度/RIFF/WAVE 标记（r2 确认的现行合同域）。 */
test('fixture 合法性：legalWav 过产品 RIFF/WAVE 门（构造正控）', () => {
  const reader = { record: () => recordOf('x.wav'), readBytes: async () => legalWav() }
  const adapter: SfxAudioAdapter = {
    state: 'running',
    resume: async () => {},
    decode: async () => ({}),
    play: () => ({ stop: () => {} }),
  }
  const player = new SfxPlayer(reader, adapter)
  void expect(player.prepare(['sfx.ok'])).resolves.toBeUndefined()
})

describe('B1 RIFF 标记门三轴：坏输入在 decode 前拒绝（decode 零调用见证）', () => {
  const brokenWav = (mutate: (view: Uint8Array) => void): ArrayBuffer => {
    const bytes = new Uint8Array(24)
    bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45], 0)
    mutate(bytes)
    return bytes.buffer
  }
  test('RIFF 首标记错 / WAVE 标记错 / 长度不足 三轴各自拒绝且 decode 零调用', async () => {
    for (const bytes of [
      brokenWav((v) => v.set([0x52, 0x49, 0x46, 0x45], 0)), // RIFF→RIFE
      brokenWav((v) => v.set([0x57, 0x41, 0x56, 0x46], 8)), // WAVE→WAVF
      new ArrayBuffer(8), // <12
    ]) {
      const decode = vi.fn(async () => ({}))
      const adapter: SfxAudioAdapter = {
        state: 'running',
        resume: async () => {},
        decode,
        play: () => ({ stop: () => {} }),
      }
      const reader = { record: () => recordOf('bad.wav'), readBytes: async () => bytes }
      const player = new SfxPlayer(reader, adapter)
      // 拒绝落成值断言（业务红可判别）
      const outcome = await player.prepare(['sfx.bad']).then(
        () => undefined,
        (error: unknown) => error as Error,
      )
      expect(outcome).toBeInstanceOf(Error)
      expect(outcome?.message).toContain('不是 RIFF/WAVE')
      expect(decode).not.toHaveBeenCalled() // 标记门在 decode 之前
    }
  })
})

describe('B2 真实 browserAdapter：字节复制与 AudioContext 宿主事件（协议级，非 PCM 证明）', () => {
  const originalWindow = (globalThis as { window?: unknown }).window
  afterEach(() => {
    if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window
    else (globalThis as { window?: unknown }).window = originalWindow
  })
  test('window.AudioContext 双替身下产品 browserAdapter 构造：decode 收到字节副本、宿主事件齐', async () => {
    const source = new Uint8Array(legalWav(32))
    const sourceSnapshot = deepSnapshot([...source])
    const events: string[] = []
    const decodedBytes: Uint8Array[] = []
    class FakeContext {
      readonly state = 'running'
      readonly destination = {}
      async resume(): Promise<void> {
        events.push('resume')
      }
      async decodeAudioData(bytes: ArrayBuffer): Promise<unknown> {
        decodedBytes.push(new Uint8Array(bytes))
        events.push('decode')
        return { marker: 'buffer' }
      }
      createBufferSource(): {
        buffer: unknown
        connect: (dest: unknown) => void
        onended: (() => void) | null
        start: () => void
        stop: () => void
      } {
        events.push('create-source')
        return {
          buffer: undefined,
          connect: () => events.push('connect'),
          onended: null,
          start: () => events.push('start'),
          stop: () => events.push('stop'),
        }
      }
      async close(): Promise<void> {
        events.push('close')
      }
    }
    ;(globalThis as { window?: unknown }).window = { AudioContext: FakeContext }
    const reader = {
      projectId: 'p-host',
      record: () => recordOf('host.wav'),
      // 返回同一 buffer 身份：adapter 若不复制，decode 收到的就是源本身（可观察污染）
      readBytes: async () => source.buffer as ArrayBuffer,
    }
    // 不传 adapter → 产品 browserAdapter() 真实构造（复制发生在产品代码 bytes.slice(0)）
    const player = new SfxPlayer(reader, undefined, 4)
    await player.prepare(['sfx.host'])
    expect(decodedBytes).toHaveLength(1)
    // 复制合同：decode 收到的副本被改写不影响源字节
    decodedBytes[0]!.set([0xff, 0xff, 0xff, 0xff], 0)
    expect([...source]).toEqual(sourceSnapshot)
    // 播放走宿主 connect/start；同号拒绝；dispose 走 stop/close
    expect(player.play('sfx.host')).toBe(true)
    expect(player.play('sfx.host')).toBe(false) // 同号不重播（sfx.test 已钉，此处仅事件链正控）
    await player.dispose()
    expect(events).toEqual(['decode', 'create-source', 'connect', 'start', 'stop', 'close'])
  })
})

describe('B1 同 reader 修复重试：真实字节身份与读取轨迹', () => {
  test('首次读坏 RIFF → 同 reader 修好字节后同 asset 成功；读取次数与内容见证', async () => {
    let wavBytes = new Uint8Array(24) // 先放坏标记
    wavBytes.set([0x52, 0x49, 0x46, 0x45, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45], 0)
    const reads: number[] = []
    const adapter: SfxAudioAdapter = {
      state: 'running',
      resume: async () => {},
      decode: async () => ({ n: 1 }),
      play: () => ({ stop: () => {} }),
    }
    const reader = {
      record: () => recordOf('retry.wav'),
      readBytes: async () => {
        reads.push(wavBytes.byteLength)
        return wavBytes.buffer.slice(0) as ArrayBuffer
      },
    }
    const player = new SfxPlayer(reader, adapter)
    const firstOutcome = await player.prepare(['sfx.retry']).then(
      () => undefined,
      (error: unknown) => error as Error,
    )
    expect(firstOutcome).toBeInstanceOf(Error)
    expect(firstOutcome?.message).toContain('不是 RIFF/WAVE')
    expect(player.play('sfx.retry')).toBe(false) // 失败不半提交
    wavBytes = new Uint8Array(new Uint8Array(legalWav(24))) // 修复为合法 WAV
    await expect(player.prepare(['sfx.retry'])).resolves.toBeUndefined()
    expect(player.play('sfx.retry')).toBe(true)
    expect(reads).toEqual([24, 24]) // 真实重读了两次，字节身份可观察
  })
})

describe('B1 prepare 在途取消：entered 见证 + 可释放读取 + 迟到不回填', () => {
  test('readBytes 挂起期间 dispose → 原调用以资源错误收尾、迟到完成不回填', async () => {
    const gate = deferred<void>()
    let entered = false
    const adapter: SfxAudioAdapter = {
      state: 'running',
      resume: async () => {},
      decode: async () => ({ n: 1 }),
      play: () => ({ stop: () => {} }),
    }
    const reader = {
      record: () => recordOf('late.wav'),
      readBytes: () => {
        entered = true
        return gate.promise.then(() => legalWav())
      },
    }
    const player = new SfxPlayer(reader, adapter)
    const pending = player.prepare(['sfx.late'])
    while (!entered) await Promise.resolve()
    await player.dispose() // 在途 dispose（完成态之外的政策不在此固化，只核本路径）
    gate.resolve()
    // 原调用以资源错误收尾（读取已放行，会真实 settle——与 never-settle 场景不同，可直接消费）
    const settled = await pending.then(
      () => 'fulfilled',
      (error: unknown) => (error as Error).message,
    )
    expect(settled).toContain('dispose') // dispose 使旧 prepare 收尾为错误
    expect(player.play('sfx.late')).toBe(false) // 迟到字节不回填
  })
})
