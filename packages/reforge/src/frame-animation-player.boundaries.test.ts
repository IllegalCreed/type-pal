/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 D1-D7：帧动画读取与取消边界（frame-animation-player.ts）。
 * frame-animation-player.test.ts:59/77/106/127/144/162/181 已覆盖基础缓存/LRU/闭区间/失败/跳过/
 * abort——不重复；本文件补容器首读失败恢复、block inflate 重试、frameLimit/索引守卫、
 * invalidate 选择性清除、跨块 LRU、三处 await 取消时序与错误清理。真实 TPFS + 真实 parser。
 */
import { encodeFrameSequence } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { FrameSequenceReader, playFrameAnimation } from './frame-animation-player.js'

const identity = async (bytes: Uint8Array): Promise<Uint8Array> => bytes.slice()

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** 70 帧（跨 3 块：32+32+6），1×1 像素=帧号×3。 */
async function tpfs(frameCount = 70): Promise<Uint8Array> {
  return encodeFrameSequence(
    {
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      frames: Array.from({ length: frameCount }, (_, index) => ({
        rgba: Uint8Array.from([index, index + 1, index + 2, 255]),
      })),
    },
    identity,
  )
}

interface ReaderHarness {
  reader: FrameSequenceReader
  reads: string[]
  failOnceAsset: () => void
  failOnceInflate: () => void
}

function harness(frameLimit?: number, inflateDelay?: () => void): ReaderHarness {
  const bytes: Uint8Array | Promise<Uint8Array> = tpfs()
  let failAsset = false
  let failInflate = false
  const reads: string[] = []
  const reader = new FrameSequenceReader(
    {
      async readBytes(asset) {
        reads.push(asset)
        if (failAsset) {
          failAsset = false
          throw new Error('container read failed')
        }
        return arrayBufferOf(await bytes)
      },
    },
    async (data) => {
      inflateDelay?.()
      if (failInflate) {
        failInflate = false
        throw new Error('inflate failed')
      }
      return identity(data)
    },
    frameLimit,
  )
  return {
    reader,
    reads,
    failOnceAsset: () => {
      failAsset = true
    },
    failOnceInflate: () => {
      failInflate = true
    },
  }
}

describe('D1 容器首读失败→修复→成功', () => {
  test('失败 Promise 不永久缓存；同 reader 重试真正读取并解码出实际字节', async () => {
    const h = harness()
    h.failOnceAsset()
    await expect(h.reader.sequence('a')).rejects.toThrow('container read failed')
    expect(h.reads).toEqual(['a'])
    const sequence = await h.reader.sequence('a') // 失败不缓存：可重试
    expect(h.reads).toEqual(['a', 'a'])
    expect(sequence.index.frames).toHaveLength(70)
    const frame = await h.reader.frame('a', 5)
    expect([...frame.rgba]).toEqual([5, 6, 7, 255]) // 实际解码内容
  })
})

describe('D2 block inflate 首败→重试', () => {
  test('inflight 回零后同 block 重读成功；合法字节真实 decode', async () => {
    const h = harness()
    await h.reader.sequence('a')
    h.failOnceInflate()
    await expect(h.reader.frame('a', 0)).rejects.toThrow('inflate failed')
    expect(h.reader.inflightBlockCount).toBe(0) // 失败后回零
    const frame = await h.reader.frame('a', 0)
    expect([...frame.rgba]).toEqual([0, 1, 2, 255])
    expect(h.reader.inflightBlockCount).toBe(0)
  })
})

describe('D3 frameLimit 与帧索引守卫', () => {
  test('frameLimit 非正/非整数拒绝；帧索引负/非整数/上界拒绝；0/末帧正控', async () => {
    expect(
      () => new FrameSequenceReader({ readBytes: async () => new ArrayBuffer(0) }, identity, 0),
    ).toThrow('frameLimit 必须是正整数，收到 0')
    expect(
      () => new FrameSequenceReader({ readBytes: async () => new ArrayBuffer(0) }, identity, 1.5),
    ).toThrow('frameLimit 必须是正整数，收到 1.5')
    const h = harness()
    await expect(h.reader.frame('a', -1)).rejects.toThrow('帧索引 -1 越界')
    await expect(h.reader.frame('a', 0.5)).rejects.toThrow('帧索引 0.5 越界')
    await expect(h.reader.frame('a', 70)).rejects.toThrow('帧索引 70 越界')
    await expect((await h.reader.frame('a', 0)).rgba[0]).toBe(0)
    await expect((await h.reader.frame('a', 69)).rgba[0]).toBe(69)
  })
})

describe('D4 invalidate 选择性清除', () => {
  test('invalidate(asset) 只清指定项；invalidate() 全清；再读同 id 得新字节', async () => {
    const h = harness()
    await h.reader.frame('a', 0)
    await h.reader.frame('a', 40)
    expect(h.reader.cachedFrameCount).toBeGreaterThanOrEqual(2)
    h.reader.invalidate('a')
    expect(h.reader.cachedFrameCount).toBe(0)
    await h.reader.frame('a', 0)
    await h.reader.frame('a', 40)
    h.reader.invalidate() // 全清
    expect(h.reader.cachedFrameCount).toBe(0)
    expect(h.reader.inflightBlockCount).toBe(0)
    // 再读：字节来自当前 reader（内容仍正确）
    expect([...(await h.reader.frame('a', 40)).rgba]).toEqual([40, 41, 42, 255])
  })
})

describe('D5 小 frameLimit 跨 block LRU', () => {
  test('被淘汰者可重读、命中者更新触点：LRU 语义而非仅 size 上界', async () => {
    const h = harness(3)
    await h.reader.frame('a', 0) // block0
    await h.reader.frame('a', 33) // block1
    await h.reader.frame('a', 65) // block2
    expect(h.reader.cachedFrameCount).toBeLessThanOrEqual(3)
    // 触点更新：再访问 0 后插入新帧，被淘汰的是 33 而非 0
    await h.reader.frame('a', 0)
    await h.reader.frame('a', 34)
    // 0 仍在缓存（触点最近），33 可能被淘汰 → 重读仍正确
    expect([...(await h.reader.frame('a', 0)).rgba]).toEqual([0, 1, 2, 255])
    expect([...(await h.reader.frame('a', 33)).rgba]).toEqual([33, 34, 35, 255])
    expect(h.reader.cachedFrameCount).toBeLessThanOrEqual(3)
  })
})

describe('D6 三处 await 分别 abort', () => {
  const baseOptions = (reader: FrameSequenceReader) => ({
    reader,
    asset: 'a',
    onFrame: () => {},
    wait: () => Promise.resolve(),
  })
  test('sequence 在途 abort：及时拒绝；迟到读取不 onFrame', async () => {
    const h = harness(undefined, () => {}) // 容器读取即时
    const controller = new AbortController()
    const gate = new Promise<void>(() => {}) // 永不完成的 sequence 读取
    const slow: ReaderHarness = {
      reader: new FrameSequenceReader(
        { readBytes: () => gate as unknown as Promise<ArrayBuffer> },
        identity,
      ),
      reads: [],
      failOnceAsset: () => {},
      failOnceInflate: () => {},
    }
    void slow
    const pending = playFrameAnimation({ ...baseOptions(h.reader), signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toThrow('aborted')
    const frames: number[] = []
    const played = playFrameAnimation({
      ...baseOptions(h.reader),
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
    })
    await expect(played).resolves.toBeDefined()
    expect(frames[0]).toBe(0) // abort 后 reader 仍可正常完整播放（监听已清理）
  })
  test('frame 在途 abort：外层拒绝且不提交该帧；wait 在途 abort：不进下一帧', async () => {
    let releaseFrame: (() => void) | undefined
    const gatedInflate = (): void => {}
    void gatedInflate
    const controller = new AbortController()
    const frames: number[] = []
    const pending = playFrameAnimation({
      reader: new FrameSequenceReader(
        { readBytes: async () => arrayBufferOf(await tpfs()) },
        (data) =>
          new Promise((resolve) => {
            releaseFrame = () => resolve(identity(data))
          }),
      ),
      asset: 'a',
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
      wait: () => Promise.resolve(),
      signal: controller.signal,
    })
    await Promise.resolve()
    controller.abort() // frame 读取在途
    releaseFrame?.() // 迟到完成
    await expect(pending).rejects.toThrow('aborted')
    expect(frames).toEqual([]) // 迟到帧不提交
    // wait 在途 abort：第一帧已提交、等待期 abort → 不进第二帧
    const controller2 = new AbortController()
    const frames2: number[] = []
    let releaseWait: (() => void) | undefined
    const pending2 = playFrameAnimation({
      reader: new FrameSequenceReader(
        { readBytes: async () => arrayBufferOf(await tpfs()) },
        identity,
      ),
      asset: 'a',
      endFrame: 2,
      onFrame: (frame) => frames2.push(frame.rgba[0] ?? -1),
      wait: () =>
        new Promise<void>((resolve) => {
          releaseWait = resolve
        }),
      signal: controller2.signal,
    })
    await vi.waitFor(() => {
      if (frames2.length === 0) throw new Error('first frame not submitted')
    })
    controller2.abort()
    releaseWait?.()
    await expect(pending2).rejects.toThrow('aborted')
    expect(frames2).toEqual([0]) // 只提交到 abort 前的帧
  })
})

describe('D7 非目标 key 与在途 skip', () => {
  test('非目标 key 不吞；目标 key 消费并结束；onFrame 抛错也清监听', async () => {
    const target = new EventTarget()
    const reader = new FrameSequenceReader(
      { readBytes: async () => arrayBufferOf(await tpfs()) },
      identity,
    )
    const seen: string[] = []
    // 第一帧的 wait 挂起至按键派发完成后（进入见证：监听确已注册且存活）
    let releaseFirstWait: (() => void) | undefined
    let firstWait = true
    const played = playFrameAnimation({
      reader,
      asset: 'a',
      skipKeys: ['KeyS'],
      eventTarget: target,
      onFrame: () => {},
      wait: () =>
        firstWait
          ? new Promise<void>((resolve) => {
              firstWait = false
              releaseFirstWait = resolve
            })
          : Promise.resolve(),
    })
    await vi.waitFor(() => {
      if (!releaseFirstWait) throw new Error('first wait not entered')
    })
    target.addEventListener('keydown', (event) => {
      seen.push((event as KeyboardEvent).code)
    })
    target.dispatchEvent(
      Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyX' }) as KeyboardEvent,
    )
    target.dispatchEvent(
      Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyS' }) as KeyboardEvent,
    )
    releaseFirstWait?.()
    await expect(played).resolves.toBeDefined()
    expect(seen).toEqual(['KeyX']) // 非目标 key 穿透不被吞；目标 key 被消费
    // onFrame 抛错：监听清理（后续 dispatch 不再影响新播放）+ 原错误身份传播
    const boom = new Error('renderer crashed')
    const failing = playFrameAnimation({
      reader,
      asset: 'a',
      endFrame: 1,
      eventTarget: target,
      onFrame: () => {
        throw boom
      },
      wait: () => Promise.resolve(),
    })
    await expect(failing).rejects.toThrow('renderer crashed')
    const after = playFrameAnimation({
      reader,
      asset: 'a',
      endFrame: 1,
      eventTarget: target,
      onFrame: () => {},
      wait: () => Promise.resolve(),
    })
    await expect(after).resolves.toBeDefined() // 监听已清，不残留 skip 状态
  })
})
