/**
 * MKF 归档 —— 原版打包格式。
 * 头:N+1 个 u32 LE 偏移;[i] 是子文件 i 起点;子文件数 = (head[0] - 4) / 4。
 * 参考 reference/sdlpal/palcommon.c::PAL_MKFGetChunkCount / PAL_MKFReadChunk。
 *
 * SDLPal 按首偏移计算块数,读块时按需读取相邻两个偏移;本入口在建索引时集中校验:
 * 首偏移须 4 字节对齐且表完整,所有偏移须单调不减并在 buffer 界内。
 */

export interface Mkf {
  /** 整个归档字节;借用调用方输入,本模块不复制、不修改。 */
  readonly buffer: Uint8Array
  /** N+1 个字节偏移;首项为 4 对齐的表长,各项均单调不减且在 buffer 界内。 */
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
 * 接受 openMkf 的解析结果:这里只校验索引(整数、[0, chunkCount)),
 * 不重复校验由 openMkf 统一核定的 offset 表。
 */
export function readChunk(mkf: Mkf, index: number): Uint8Array {
  if (!Number.isInteger(index) || index < 0 || index >= chunkCount(mkf)) {
    throw new Error(`MKF: chunk ${index} out of range (count=${chunkCount(mkf)})`)
  }
  const start = mkf.offsets[index]!
  const end = mkf.offsets[index + 1]!
  return mkf.buffer.subarray(start, end)
}
