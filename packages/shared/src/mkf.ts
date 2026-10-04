/**
 * MKF 归档 —— 原版打包格式。
 * 头:N+1 个 u32 LE 偏移;[i] 是子文件 i 起点;子文件数 = (head[0] - 4) / 4。
 * 参考 reference/sdlpal/palcommon.c::PAL_MKFGetChunkCount / PAL_MKFReadChunk。
 */

export interface Mkf {
  readonly buffer: Uint8Array
  readonly offsets: readonly number[]
}

export function openMkf(buffer: Uint8Array): Mkf {
  if (buffer.byteLength < 4) {
    throw new Error('MKF: buffer too small for header')
  }
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const firstOffset = view.getUint32(0, true)
  if (firstOffset % 4 !== 0) {
    throw new Error(`MKF: first offset ${firstOffset} not multiple of 4`)
  }
  const count = firstOffset / 4 - 1
  if (count < 0) {
    throw new Error(`MKF: bad first offset ${firstOffset}`)
  }
  if (firstOffset > buffer.byteLength) {
    throw new Error(`MKF: offset table truncated (end=${firstOffset}, size=${buffer.byteLength})`)
  }
  const offsets: number[] = []
  let previous = firstOffset
  for (let i = 0; i <= count; i++) {
    const offset = view.getUint32(i * 4, true)
    if (offset < previous) {
      throw new Error(`MKF: offsets not monotonic at ${i} (${offset} < ${previous})`)
    }
    if (offset > buffer.byteLength) {
      throw new Error(`MKF: offset ${offset} outside buffer size ${buffer.byteLength}`)
    }
    offsets.push(offset)
    previous = offset
  }
  return { buffer, offsets }
}

export function chunkCount(mkf: Mkf): number {
  return mkf.offsets.length - 1
}

export function readChunk(mkf: Mkf, index: number): Uint8Array {
  if (!Number.isInteger(index) || index < 0 || index >= chunkCount(mkf)) {
    throw new Error(`MKF: chunk ${index} out of range (count=${chunkCount(mkf)})`)
  }
  const start = mkf.offsets[index]!
  const end = mkf.offsets[index + 1]!
  return mkf.buffer.subarray(start, end)
}
