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

describe('D4 invalidate 选择性清除（双 asset + 同 id 换字节）', () => {
  test('invalidate(a) 只清 a 保留 b；invalidate() 全清；同 id 换字节后读到新内容', async () => {
    let bytesA = await tpfs()
    const bytesB = await tpfs()
    const reads: string[] = []
    const reader = new FrameSequenceReader(
      {
        async readBytes(asset) {
          reads.push(asset)
          return arrayBufferOf(asset === 'a' ? bytesA : bytesB)
        },
      },
      identity,
    )
    await reader.frame('a', 0)
    await reader.frame('b', 0)
    expect(reader.cachedFrameCount).toBeGreaterThanOrEqual(2)
    reader.invalidate('a')
    expect(reader.cachedFrameCount).toBeGreaterThanOrEqual(1) // b 的帧仍在
    expect([...(await reader.frame('b', 0)).rgba]).toEqual([0, 1, 2, 255]) // b 命中未重读
    expect(reads.filter((entry) => entry === 'b')).toHaveLength(1)
    // 同 id 换字节：换掉底层容器后 invalidate(a) → 再读 a 得新字节
    bytesA = await encodeFrameSequence(
      {
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        frames: Array.from({ length: 3 }, () => ({ rgba: Uint8Array.from([9, 9, 9, 255]) })),
      },
      identity,
    )
    reader.invalidate('a')
    expect([...(await reader.frame('a', 0)).rgba]).toEqual([9, 9, 9, 255]) // 新字节生效
    reader.invalidate() // 全清
    expect(reader.cachedFrameCount).toBe(0)
    expect(reader.inflightBlockCount).toBe(0)
  })
})

describe('D5 小 frameLimit LRU：命中/淘汰以解码轨迹见证', () => {
  test('命中刷新触点：最近命中者存活、被淘汰者重解码；解码计数精确', async () => {
    // 2 帧小容器（单 block）×3 asset；frameLimit=3：跨三个容器轮流命中/淘汰
    const binary = async (value: number): Promise<Uint8Array> =>
      encodeFrameSequence(
        {
          width: 1,
          height: 1,
          defaultFrameMs: 40,
          frames: [
            { rgba: Uint8Array.from([value, 0, 0, 255]) },
            { rgba: Uint8Array.from([value, 1, 0, 255]) },
          ],
        },
        identity,
      )
    const table: Record<string, Uint8Array> = {
      a: await binary(1),
      b: await binary(2),
      c: await binary(3),
    }
    let decodes = 0
    const reader = new FrameSequenceReader(
      {
        async readBytes(asset) {
          return arrayBufferOf(table[asset]!)
        },
      },
      async (data) => {
        decodes += 1
        return identity(data)
      },
      3,
    )
    await reader.frame('a', 0)
    await reader.frame('b', 0)
    expect(decodes).toBe(2)
    await reader.frame('a', 1) // a 块两帧都在缓存 → 命中（a 触点更新）
    await reader.frame('b', 0) // b 命中
    expect(decodes).toBe(2) // 两次都是真实命中，零新解码
    await reader.frame('c', 0) // c 解码入缓存，淘汰最旧触点（a 的帧）
    expect(decodes).toBe(3)
    await reader.frame('b', 0) // b 是最近触点，仍存活
    expect(decodes).toBe(3)
    await reader.frame('a', 0) // a 已被淘汰 → 重解码
    expect(decodes).toBe(4)
    expect(reader.cachedFrameCount).toBeLessThanOrEqual(3)
  })
})

describe('D6 三处 await 分别 abort（真实在途取消 + 进入见证）', () => {
  const baseOptions = (reader: FrameSequenceReader) => ({
    reader,
    asset: 'a',
    onFrame: () => {},
    wait: () => Promise.resolve(),
  })
  /** 真实事件循环一拍（abort 拒绝传播不依赖底层放行）。 */
  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
  test('sequence 在途 abort：及时拒绝；迟到读取不 onFrame', async () => {
    const h = harness(undefined, () => {})
    const controller = new AbortController()
    const gate = new Promise<void>(() => {})
    const slow = new FrameSequenceReader(
      { readBytes: () => gate as unknown as Promise<ArrayBuffer> },
      identity,
    )
    const pendingSlow = playFrameAnimation({ ...baseOptions(slow), signal: controller.signal })
    // 结局观察器同步挂接（不留 unhandled 窗口；vitest 把异步补处理当非零退出）
    const outcome = pendingSlow.then(
      () => 'fulfilled',
      (error: unknown) => (error as Error).name,
    )
    await tick() // 容器读取确已进入
    controller.abort()
    expect(await outcome).toBe('AbortError') // 底层未放行时外层已及时结束
    const frames: number[] = []
    const played = playFrameAnimation({
      ...baseOptions(h.reader),
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
    })
    await expect(played).resolves.toBeDefined()
    expect(frames[0]).toBe(0)
  })
  test('frame 在途 abort：进入 inflate 后取消仍及时拒绝、迟到帧不提交', async () => {
    let enteredInflate = false
    let releaseInflate: (() => void) | undefined
    const controller = new AbortController()
    const frames: number[] = []
    const pending = playFrameAnimation({
      reader: new FrameSequenceReader(
        { readBytes: async () => arrayBufferOf(await tpfs()) },
        (data) =>
          new Promise((resolve) => {
            enteredInflate = true
            releaseInflate = () => resolve(identity(data))
          }),
      ),
      asset: 'a',
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
      wait: () => Promise.resolve(),
      signal: controller.signal,
    })
    await vi.waitFor(() => {
      if (!enteredInflate) throw new Error('inflate not entered')
    })
    const outcome = pending.then(
      () => 'fulfilled',
      (error: unknown) => (error as Error).name,
    )
    controller.abort() // inflate 确已进入且挂起
    await tick()
    expect(await outcome).toBe('AbortError') // 不等底层放行即拒绝
    releaseInflate?.() // 迟到完成：不提交帧
    await Promise.resolve()
    await Promise.resolve()
    expect(frames).toEqual([])
  })
  test('wait 在途 abort：第一帧已提交、等待期 abort → 不进第二帧', async () => {
    const controller = new AbortController()
    const frames: number[] = []
    let releaseWait: (() => void) | undefined
    const pending = playFrameAnimation({
      reader: new FrameSequenceReader(
        { readBytes: async () => arrayBufferOf(await tpfs()) },
        identity,
      ),
      asset: 'a',
      endFrame: 2,
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
      wait: () =>
        new Promise<void>((resolve) => {
          releaseWait = resolve
        }),
      signal: controller.signal,
    })
    await vi.waitFor(() => {
      if (frames.length === 0) throw new Error('first frame not submitted')
    })
    controller.abort()
    releaseWait?.()
    await expect(pending).rejects.toThrow('aborted')
    expect(frames).toEqual([0])
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
