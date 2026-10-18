/**
 * MKF 归档 —— 原版打包格式。
 * 头:N+1 个 u32 LE 偏移;[i] 是子文件 i 起点;子文件数 = (head[0] - 4) / 4。
 * 参考 reference/sdlpal/palcommon.c::PAL_MKFGetChunkCount / PAL_MKFReadChunk。
 *
 * 与 sdlpal 的差异:sdlpal 信任式读取(计数公式即 (head[0]-4)>>2,坏档读出垃圾/超短);
 * 本入口在解析时显式校验对齐、单调与界内,坏档 fail-loud。原盘全量 chunk 均可通过该校验。
 */

export interface Mkf {
  /** 整个归档字节;借用调用方输入,本模块不复制、不修改。 */
  readonly buffer: Uint8Array
  /** N+1 个偏移;由 openMkf 验证过 4 对齐、单调不减且都在 buffer 界内。 */
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

/**
 * 取子文件 i 的字节。返回**借用**原输入 buffer 的 subarray 视图(零拷贝):
 * 调用方不得通过它修改归档;需要可变/独立副本时自行复制。
 * 仅校验索引(整数、[0, chunkCount));offset 合法性由 openMkf 统一核定,
 * 不绕过真实入口伪造 Mkf 来为 readChunk 发明错误合同。
 */
export function readChunk(mkf: Mkf, index: number): Uint8Array {
  if (!Number.isInteger(index) || index < 0 || index >= chunkCount(mkf)) {
    throw new Error(`MKF: chunk ${index} out of range (count=${chunkCount(mkf)})`)
  }
  const start = mkf.offsets[index]!
  const end = mkf.offsets[index + 1]!
  return mkf.buffer.subarray(start, end)
}
