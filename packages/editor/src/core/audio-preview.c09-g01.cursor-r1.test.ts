/**
 * C09-G01：audio-preview transport/缓存 IO（排重 audio-preview.test.ts 已证 LRU/播放链）。
 */
import type { AssetId, AssetKind } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  AudioPreviewCache,
  computePcmPeaks,
  createWavPreviewTransport,
  type WavPreviewRuntimeAdapter,
} from './audio-preview.js'
import type { EditorAssetReader } from './editor-asset-reader.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** 仅 transport 需要的 typed reader 面；未用方法显式抛错，禁止 as never。 */
function stubReader(readBytes: EditorAssetReader['readBytes']): EditorAssetReader {
  return {
    projectId: 'c09-audio',
    record: () => {
      throw new Error('stubReader.record unused')
    },
    readBytes,
    readRoleBytes: async () => {
      throw new Error('stubReader.readRoleBytes unused')
    },
    urlFor: async (_asset: AssetId, _kind?: AssetKind) => {
      throw new Error('stubReader.urlFor unused')
    },
  }
}

function fakeBackend(): WavPreviewRuntimeAdapter {
  return {
    currentTime: 0,
    state: 'running',
    resume: vi.fn(async () => {}),
    decode: vi.fn(async () => ({
      duration: 1,
      numberOfChannels: 1,
      getChannelData: () => Float32Array.from([0, 0.5, -0.5]),
    })),
    createSource: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    })),
    dispose: vi.fn(),
  }
}

describe('C09-G01 audio-preview IO 与峰值', () => {
  test('C09-G01-01 computePcmPeaks 零帧返回零 bucket', () => {
    const peaks = computePcmPeaks([], 0, 4)
    expect(peaks.minimums).toEqual([0, 0, 0, 0])
    expect(peaks.duration).toBe(0)
  })

  test('C09-G01-02 computePcmPeaks 单采样填满全部 bucket', () => {
    const peaks = computePcmPeaks([Float32Array.from([0.75])], 0.1, 3)
    expect(peaks.minimums.every((v) => v === 0.75)).toBe(true)
    expect(peaks.maximums.every((v) => v === 0.75)).toBe(true)
  })

  test('C09-G01-03 AudioPreviewCache 拒绝 loader 时不写入条目', async () => {
    const cache = new AudioPreviewCache<number>(4)
    await expect(
      cache.load('bad', async () => {
        throw new Error('read failed')
      }),
    ).rejects.toThrow('read failed')
    expect(cache.get('bad')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  test('C09-G01-04 AudioPreviewCache.get 刷新 LRU 顺序', async () => {
    const cache = new AudioPreviewCache<number>(2)
    await cache.load('a', async () => 1)
    await cache.load('b', async () => 2)
    expect(cache.get('a')).toBe(1)
    await cache.load('c', async () => 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
  })

  test('C09-G01-05 transport.play 未 load 抛错', async () => {
    const transport = createWavPreviewTransport(stubReader(vi.fn()), fakeBackend())
    await expect(transport.play()).rejects.toThrow('请等待 WAV 读取完成')
    transport.dispose()
  })

  test('C09-G01-06 readBytes 使用 sound kind', async () => {
    const readBytes = vi.fn(async () => new ArrayBuffer(4))
    const transport = createWavPreviewTransport(stubReader(readBytes), fakeBackend())
    await transport.load('sound.c09')
    expect(readBytes).toHaveBeenCalledWith('sound.c09', 'sound')
    transport.dispose()
  })

  test('C09-G01-07 不同 cacheKey 触发第二次 readBytes', async () => {
    const readBytes = vi.fn(async () => new ArrayBuffer(4))
    const transport = createWavPreviewTransport(stubReader(readBytes), fakeBackend())
    await transport.load('sound.c09', 'key-a')
    await transport.load('sound.c09', 'key-b')
    expect(readBytes).toHaveBeenCalledTimes(2)
    transport.dispose()
  })

  test('C09-G01-08 dispose 后 load 以 AbortError 拒绝', async () => {
    const hold = deferred<ArrayBuffer>()
    const transport = createWavPreviewTransport(
      stubReader(() => hold.promise),
      fakeBackend(),
    )
    const loading = transport.load('sound.c09')
    transport.dispose()
    hold.resolve(new ArrayBuffer(4))
    await expect(loading).rejects.toMatchObject({ name: 'AbortError' })
  })

  test('C09-G01-09 seek 到时长末端不再 start 源', async () => {
    const starts: number[] = []
    const backend = fakeBackend()
    backend.createSource = vi.fn(() => ({
      start: (offset: number) => starts.push(offset),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }))
    const transport = createWavPreviewTransport(
      stubReader(vi.fn(async () => new ArrayBuffer(4))),
      backend,
    )
    await transport.load('sound.c09')
    await transport.play()
    transport.seek(1)
    expect(starts.length).toBeGreaterThan(0)
    const count = starts.length
    transport.seek(1)
    expect(starts.length).toBe(count)
    transport.dispose()
  })

  test('C09-G01-10 snapshot 在未 load 时 duration 为 0', () => {
    const transport = createWavPreviewTransport(stubReader(vi.fn()), fakeBackend())
    expect(transport.snapshot()).toEqual({
      asset: undefined,
      currentTime: 0,
      duration: 0,
      paused: true,
    })
    transport.dispose()
  })
})
