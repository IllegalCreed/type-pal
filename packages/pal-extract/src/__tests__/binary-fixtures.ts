/** 纯二进制测试输入；固定LE/拼接/MKF布局，不依赖资源语义或业务parser。 */
/** u16 LE 帧造器（收尾 pad 到偶数由调用方决定）。 */
export function u16Bytes(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 2)
  const view = new DataView(out.buffer)
  values.forEach((value, index) => {
    view.setUint16(index * 2, value & 0xffff, true)
  })
  return out
}

export function u32Bytes(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4)
  const view = new DataView(out.buffer)
  values.forEach((value, index) => {
    view.setUint32(index * 4, value >>> 0, true)
  })
  return out
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

/** 合法 MKF 容器：N+1 个 u32 LE offset（头长 4 对齐；非递减，允许空 chunk）。 */
export function mkfContainer(chunks: readonly Uint8Array[]): Uint8Array {
  const headerBytes = (chunks.length + 1) * 4
  const offsets: number[] = [headerBytes]
  for (const chunk of chunks) offsets.push(offsets[offsets.length - 1]! + chunk.byteLength)
  const header = u32Bytes(...offsets)
  return concatBytes([header, ...chunks])
}
