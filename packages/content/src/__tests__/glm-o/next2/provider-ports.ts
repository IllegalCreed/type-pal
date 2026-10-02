/** TEST-GLM-WAVE-O-1 O-NEXT2 专属夹具：provider/压缩/解压端口的记录、延迟与故障注入。
 *  全部为声明式 port 包装（FrameSequenceByteTransform 与 frame() 是产品公开端口）；
 *  真实往返用真 zlib（node:zlib deflateSync/inflateSync），不复制算法、不改 oracle。
 */
// @ts-expect-error Node-only test host; content production type environment is DOM-only.
import { deflateSync, inflateSync } from 'node:zlib'

export interface ProviderJournal {
  frameReads: number[]
  deflatedRawByteLengths: number[]
  inflatedBlockBytes: number[]
}

const newJournal = (): ProviderJournal => ({
  frameReads: [],
  deflatedRawByteLengths: [],
  inflatedBlockBytes: [],
})

/** 真实 zlib 压缩 port + 记录。 */
export const recordedDeflate =
  (journal: ProviderJournal) =>
  (bytes: Uint8Array): Uint8Array => {
    journal.deflatedRawByteLengths.push(bytes.byteLength)
    return new Uint8Array(deflateSync(bytes))
  }

/** 真实 zlib 解压 port + 记录。 */
export const recordedInflate =
  (journal: ProviderJournal) =>
  (bytes: Uint8Array): Uint8Array => {
    journal.inflatedBlockBytes.push(bytes.byteLength)
    return new Uint8Array(inflateSync(bytes))
  }

/** 记录 frame() 读序的 provider 包装。 */
export function recordedProvider(
  frame: (index: number) => Uint8Array | Promise<Uint8Array>,
  journal: ProviderJournal,
): (index: number) => Uint8Array | Promise<Uint8Array> {
  return (index: number) => {
    journal.frameReads.push(index)
    return frame(index)
  }
}

/** 1×1 RGBA 帧：4 字节，值 = 帧号（可预测且可区分）。 */
export const tinyFrame = (index: number): Uint8Array => Uint8Array.from([index, index, index, 255])

export const descriptors = (count: number): Array<{ durationMs?: number }> =>
  Array.from({ length: count }, () => ({}))

export { newJournal }
