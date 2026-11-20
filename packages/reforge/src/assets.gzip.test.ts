import { afterEach, expect, test, vi } from 'vitest'
import { gzipFrames } from './__tests__/asset-rle-fixtures.js'
import { compressGzip, decompressGzip } from './assets.js'

afterEach(() => vi.unstubAllGlobals())

test('解压端口收到上游已解的原始字节时原样透传', async () => {
  const raw = Uint8Array.of(1, 2, 3, 4, 5)
  await expect(decompressGzip(new Blob([raw]))).resolves.toEqual(raw)
})

test('压缩端口只读取偏移视图可见范围，不包含前后哨兵', async () => {
  const source = Uint8Array.of(99, 17, 31, 47, 63, 98)
  const compressed = await compressGzip(source.subarray(1, 5))
  const stream = new Response(Uint8Array.from(compressed)).body
  if (!stream) throw new Error('测试宿主缺少 gzip 字节缓冲')
  const decoded = await new Response(
    stream.pipeThrough(new DecompressionStream('gzip')),
  ).arrayBuffer()
  expect(new Uint8Array(decoded)).toEqual(Uint8Array.of(17, 31, 47, 63))
})

test('缺少 CompressionStream 时明确拒绝创建 gzip', async () => {
  vi.stubGlobal('CompressionStream', undefined)
  await expect(compressGzip(Uint8Array.of(1))).rejects.toThrow('reforge: CompressionStream 不可用')
})

test('有 gzip 头但宿主缺少 DecompressionStream 时报告端口错误', async () => {
  vi.stubGlobal('DecompressionStream', undefined)
  await expect(decompressGzip(new Blob([await gzipFrames([17, 31, 47, 63])]))).rejects.toThrow(
    'reforge: DecompressionStream 不可用',
  )
})
