import { type AssetCatalogV1, encodeFrameSequence } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'
import { FrameSequenceReader, playFrameAnimation } from './frame-animation-player.js'

const asset = 'frame-animation.test'
const identity = async (bytes: Uint8Array): Promise<Uint8Array> => bytes.slice()

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function fixture(frameCount = 70): Promise<Uint8Array> {
  return encodeFrameSequence(
    {
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      frames: Array.from({ length: frameCount }, (_, index) => ({
        rgba: Uint8Array.from([index, index + 1, index + 2, 255]),
        ...(index === 1 ? { durationMs: 75 } : {}),
      })),
    },
    identity,
  )
}

function resolver(bytes: Uint8Array, readBytes?: FileSource['readBytes']): AssetResolver {
  const catalog: AssetCatalogV1 = {
    version: 1,
    assets: {
      [asset]: {
        kind: 'frame-animation',
        path: 'assets/authored/test.tpfs',
        mediaType: 'application/vnd.type-pal.frame-sequence',
        bytes: bytes.byteLength,
        sha256: 'a'.repeat(64),
        origin: { kind: 'authored' },
      },
    },
  }
  const source: FileSource = {
    readText: async () => '',
    readJson: async <T>() => ({}) as T,
    readBytes: readBytes ?? (async () => arrayBufferOf(bytes)),
    urlFor: async (path) => path,
  }
  return new AssetResolver('test', catalog, {}, source)
}

function keydown(code: string): Event {
  const event = new Event('keydown', { cancelable: true })
  Object.defineProperty(event, 'code', { value: code })
  return event
}

describe('FrameSequenceReader', () => {
  test('容器 Promise 在 await 前缓存，并发读取只访问一次文件', async () => {
    const bytes = await fixture(2)
    let release: ((value: ArrayBuffer) => void) | undefined
    const readBytes = vi.fn(
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          release = resolve
        }),
    )
    const reader = new FrameSequenceReader(resolver(bytes, readBytes), identity)
    const first = reader.sequence(asset)
    const second = reader.sequence(asset)
    expect(first).toBe(second)
    expect(readBytes).toHaveBeenCalledOnce()
    release?.(arrayBufferOf(bytes))
    await expect(first).resolves.toMatchObject({ index: { width: 1, height: 1 } })
  })

  test('同 block 并发 seek 只解压一次，完整帧 LRU 不超过 64 张', async () => {
    const bytes = await fixture()
    let release: (() => void) | undefined
    const inflate = vi.fn(async (compressed: Uint8Array) => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return compressed.slice()
    })
    const reader = new FrameSequenceReader(resolver(bytes), inflate)
    const frame0 = reader.frame(asset, 0)
    const frame7 = reader.frame(asset, 7)
    await vi.waitFor(() => expect(inflate).toHaveBeenCalledOnce())
    expect(reader.inflightBlockCount).toBe(1)
    release?.()
    await expect(frame0).resolves.toMatchObject({ rgba: Uint8Array.from([0, 1, 2, 255]) })
    await expect(frame7).resolves.toMatchObject({ rgba: Uint8Array.from([7, 8, 9, 255]) })

    const direct = vi.fn(identity)
    const secondReader = new FrameSequenceReader(resolver(bytes), direct)
    await secondReader.frame(asset, 0)
    await secondReader.frame(asset, 32)
    await secondReader.frame(asset, 64)
    expect(secondReader.cachedFrameCount).toBe(64)
    expect(direct).toHaveBeenCalledTimes(3)
  })
})

describe('playFrameAnimation', () => {
  test('按闭合区间和 frameRate 顺序输出完整帧，返回最后一帧', async () => {
    const bytes = await fixture(4)
    const reader = new FrameSequenceReader(resolver(bytes), identity)
    const frames: number[] = []
    const waits: number[] = []
    const result = await playFrameAnimation({
      reader,
      asset,
      startFrame: 1,
      endFrame: 3,
      frameRate: 25,
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
      wait: async (ms) => {
        waits.push(ms)
      },
    })
    expect(frames).toEqual([1, 2, 3])
    expect(waits).toEqual([40, 40, 40])
    expect(result?.rgba[0]).toBe(3)
  })

  test('越界区间与加载失败均 fail-loud', async () => {
    const bytes = await fixture(2)
    const reader = new FrameSequenceReader(resolver(bytes), identity)
    await expect(
      playFrameAnimation({ reader, asset, endFrame: 2, onFrame: () => {}, wait: async () => {} }),
    ).rejects.toThrow('越界')
    const broken = new FrameSequenceReader(
      resolver(bytes, async () => {
        throw new Error('NotFound')
      }),
      identity,
    )
    await expect(
      playFrameAnimation({ reader: broken, asset, onFrame: () => {}, wait: async () => {} }),
    ).rejects.toThrow(/test.*frame-animation\.test.*NotFound/)
  })

  test('剧情默认不可用空格跳过，仍输出完整帧序列', async () => {
    const bytes = await fixture(3)
    const reader = new FrameSequenceReader(resolver(bytes), identity)
    const target = new EventTarget()
    const frames: number[] = []
    let waits = 0
    await playFrameAnimation({
      reader,
      asset,
      eventTarget: target,
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
      wait: async () => {
        if (waits++ === 0) target.dispatchEvent(keydown('Space'))
      },
    })
    expect(frames).toEqual([0, 1, 2])
  })

  test('开发预览显式声明 skipKeys 后才允许空格提前结束', async () => {
    const bytes = await fixture(3)
    const reader = new FrameSequenceReader(resolver(bytes), identity)
    const target = new EventTarget()
    const frames: number[] = []
    const result = await playFrameAnimation({
      reader,
      asset,
      skipKeys: ['Space'],
      eventTarget: target,
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
      wait: async () => {
        target.dispatchEvent(keydown('Space'))
      },
    })
    expect(frames).toEqual([0])
    expect(result?.rgba[0]).toBe(0)
  })

  test('runner signal 取消会立即终止等待且不再提交后续帧', async () => {
    const bytes = await fixture(3)
    const reader = new FrameSequenceReader(resolver(bytes), identity)
    const controller = new AbortController()
    const gate = new Promise<void>(() => {})
    const frames: number[] = []
    const running = playFrameAnimation({
      reader,
      asset,
      signal: controller.signal,
      onFrame: (frame) => frames.push(frame.rgba[0] ?? -1),
      wait: () => gate,
    })
    await vi.waitFor(() => expect(frames).toEqual([0]))
    controller.abort()
    await expect(running).rejects.toMatchObject({ name: 'AbortError' })
    expect(frames).toEqual([0])
  })
})
