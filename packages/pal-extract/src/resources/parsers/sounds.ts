/**
 * SOUNDS.MKF metadata 抽(M4 P2 T5)。
 * 含 505 个 chunk(实测 363 非空,各为完整 **RIFF/WAVE**;WIN95 build sounds.mkf = WAV,
 * sdlpal sound.c SDL_LoadWAV_RW 直接读),142 空槽。
 * 本函数只产 metadata 索引(index→size/empty);完整 WAV 整块 dump 在 cli.ts(2026-05-29 补),
 * runtime 音频系统接入留 M6。
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
