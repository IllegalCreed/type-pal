/**
 * SOUNDS.MKF metadata 抽(M4 P2 T5)。
 * 含 505 个音效 chunk,sdlpal sound.c 解码播放。
 * M4 只抽 metadata(chunk count + 大小 + emptiness),实际 ogg 转换留 M6。
 */

export interface SoundsChunkInfo {
  index: number
  size: number
  isEmpty: boolean
}

export interface SoundsMetadata {
  chunkCount: number
  chunks: SoundsChunkInfo[]
}

export function dumpSoundsMetadata(chunkBufs: Uint8Array[]): SoundsMetadata {
  return {
    chunkCount: chunkBufs.length,
    chunks: chunkBufs.map((buf, i) => ({
      index: i,
      size: buf.byteLength,
      isEmpty: buf.byteLength === 0,
    })),
  }
}
