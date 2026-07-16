import {
  decodeFrameSequenceBlock,
  encodeFrameSequenceFromProvider,
  type FrameSequenceFrameV1,
  parseFrameSequence,
} from '@type-pal/content'
import {
  type FrameQuantization,
  quantizeCompleteFrame,
  type RgbColor,
} from './frame-animation-draft.js'

export type FrameAnimationEncodeFrame =
  | { readonly sourceFrame: number; readonly durationMs?: number }
  | { readonly rgba: ArrayBuffer; readonly durationMs?: number }

export interface FrameAnimationEncodeRequest {
  width: number
  height: number
  defaultFrameMs: number
  colorTreatment: 'preserve' | 'project-standard'
  /** 旧容器仅供惰性恢复未修改帧；新动画或已全量替换时省略。 */
  source?: ArrayBuffer
  frames: readonly FrameAnimationEncodeFrame[]
}

export interface FrameAnimationQuantizeRequest {
  width: number
  height: number
  colors: readonly RgbColor[]
  mode: FrameQuantization
  frames: readonly ArrayBuffer[]
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function transform(bytes: Uint8Array, kind: 'compress' | 'decompress'): Promise<Uint8Array> {
  const stream = new Blob([ownedBuffer(bytes)]).stream()
  const output =
    kind === 'compress'
      ? stream.pipeThrough(new CompressionStream('deflate'))
      : stream.pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(output).arrayBuffer())
}

/** Worker 和无 Worker 降级路径共用的保存核；一次只恢复两个旧 block。 */
export async function encodeFrameAnimationRequest(
  request: FrameAnimationEncodeRequest,
): Promise<Uint8Array> {
  const source = request.source ? parseFrameSequence(new Uint8Array(request.source)) : undefined
  const blockCache = new Map<number, Promise<Uint8Array[]>>()
  const sourceFrame = async (frameIndex: number): Promise<Uint8Array> => {
    if (!source) throw new Error(`保存帧 ${frameIndex}: 缺旧动画来源`)
    if (
      !Number.isSafeInteger(frameIndex) ||
      frameIndex < 0 ||
      frameIndex >= source.index.frames.length
    )
      throw new Error(`保存帧来源索引 ${frameIndex} 越界`)
    const blockIndex = Math.floor(frameIndex / source.index.blockFrames)
    let frames = blockCache.get(blockIndex)
    if (!frames) {
      frames = decodeFrameSequenceBlock(source, blockIndex, (bytes) =>
        transform(bytes, 'decompress'),
      )
      blockCache.set(blockIndex, frames)
      void frames.catch(() => blockCache.delete(blockIndex))
    }
    const decoded = await frames
    for (const cached of [...blockCache.keys()]) {
      if (blockCache.size <= 2) break
      if (cached !== blockIndex) blockCache.delete(cached)
    }
    const block = source.index.blocks[blockIndex]
    const frame = block ? decoded[frameIndex - block.firstFrame] : undefined
    if (!frame) throw new Error(`保存帧来源 ${frameIndex} 解码失败`)
    return frame
  }

  const metadata: FrameSequenceFrameV1[] = request.frames.map((frame) =>
    frame.durationMs === undefined ? {} : { durationMs: frame.durationMs },
  )
  return encodeFrameSequenceFromProvider(
    {
      width: request.width,
      height: request.height,
      defaultFrameMs: request.defaultFrameMs,
      colorTreatment: request.colorTreatment,
      frames: metadata,
      frame(index) {
        const frame = request.frames[index]
        if (!frame) throw new Error(`保存帧 ${index} 不存在`)
        return 'rgba' in frame ? new Uint8Array(frame.rgba) : sourceFrame(frame.sourceFrame)
      },
    },
    (bytes) => transform(bytes, 'compress'),
  )
}

/** Worker 可复用的完整帧量化核；输入输出都不包含任何 TPFS 存储细节。 */
export function quantizeFrameAnimationRequest(
  request: FrameAnimationQuantizeRequest,
): ArrayBuffer[] {
  return request.frames.map((frame) => {
    const rgba = quantizeCompleteFrame(
      new Uint8Array(frame),
      request.width,
      request.height,
      request.colors,
      request.mode,
    )
    return rgba.buffer.slice(rgba.byteOffset, rgba.byteOffset + rgba.byteLength) as ArrayBuffer
  })
}
