import type { AssetRecordV1 } from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { sha256Bytes } from '../hash.js'

export async function gzipChunk(chunk: Uint8Array): Promise<ArrayBuffer> {
  const source = new Response(Uint8Array.from(chunk)).body
  if (!source) throw new Error('测试宿主缺少 RLE 字节缓冲')
  return new Response(source.pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
}

export function gzipFrames(...frames: ReadonlyArray<readonly [number, number, number, number]>) {
  const chunk = encodeSpriteChunk(
    frames.map((pixels) => ({
      width: 2,
      height: 2,
      pixels: Uint8Array.from(pixels),
      opaque: Uint8Array.of(1, 1, 1, 1),
    })),
  )
  return gzipChunk(chunk)
}

export async function rleRecord(
  kind: AssetRecordV1['kind'],
  filename: string,
  bytes: ArrayBuffer,
): Promise<AssetRecordV1> {
  return {
    kind,
    path: `assets/generated/${filename}.rle`,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256: await sha256Bytes(new Uint8Array(bytes)),
    origin: { kind: 'generated' },
  }
}
