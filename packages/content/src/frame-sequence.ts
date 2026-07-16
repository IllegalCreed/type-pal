export const FRAME_SEQUENCE_MAGIC = 'TPFS'
export const FRAME_SEQUENCE_VERSION = 1
export const FRAME_SEQUENCE_BLOCK_FRAMES = 32
export const FRAME_SEQUENCE_CODEC = 'deflate-rgba8-xor-v1'
export const FRAME_SEQUENCE_MEDIA_TYPE = 'application/vnd.type-pal.frame-sequence'

export interface FrameSequenceFrameV1 {
  durationMs?: number
}

export interface FrameSequenceBlockV1 {
  firstFrame: number
  frameCount: number
  offset: number
  bytes: number
  rawBytes: number
}

export interface FrameSequenceIndexV1 {
  version: 1
  codec: typeof FRAME_SEQUENCE_CODEC
  pixelFormat: 'rgba8'
  width: number
  height: number
  defaultFrameMs: number
  blockFrames: typeof FRAME_SEQUENCE_BLOCK_FRAMES
  colorTreatment?: 'preserve' | 'project-standard'
  frames: FrameSequenceFrameV1[]
  blocks: FrameSequenceBlockV1[]
}

export interface ParsedFrameSequenceV1 {
  index: FrameSequenceIndexV1
  payload: Uint8Array
}

export interface FrameSequenceFrameInput {
  rgba: Uint8Array
  durationMs?: number
}

export interface EncodeFrameSequenceInput {
  width: number
  height: number
  defaultFrameMs: number
  colorTreatment?: 'preserve' | 'project-standard'
  frames: readonly FrameSequenceFrameInput[]
}

/** 流式完整帧提供器；允许保存端每次只恢复一个 32 帧块。 */
export interface EncodeFrameSequenceProviderInput {
  width: number
  height: number
  defaultFrameMs: number
  colorTreatment?: 'preserve' | 'project-standard'
  frames: readonly FrameSequenceFrameV1[]
  frame(index: number): Promise<Uint8Array> | Uint8Array
}

export type FrameSequenceByteTransform = (bytes: Uint8Array) => Promise<Uint8Array> | Uint8Array

export interface FrameSequencePlaybackOptions {
  startFrame?: number
  endFrame?: number
  frameRate?: number
}

export interface FrameSequencePlaybackRange {
  startFrame: number
  endFrame: number
  frameRate?: number
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function integerAt(value: unknown, path: string, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum)
    throw new Error(`${path}: 期望不小于 ${minimum} 的安全整数`)
  return value as number
}

function positiveNumberAt(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    throw new Error(`${path}: 期望正有限数`)
  return value
}

function checkedProduct(left: number, right: number, path: string): number {
  const result = left * right
  if (!Number.isSafeInteger(result)) throw new Error(`${path}: 数值溢出`)
  return result
}

function encodeUtf8(value: string): Uint8Array {
  const out: number[] = []
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x7f) out.push(code)
    else if (code <= 0x7ff) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code <= 0xffff)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
  }
  return Uint8Array.from(out)
}

function decodeUtf8(bytes: Uint8Array, path: string): string {
  const out: string[] = []
  for (let offset = 0; offset < bytes.length; ) {
    const first = bytes[offset]
    if (first === undefined) break
    let code = 0
    let length = 0
    let minimum = 0
    if (first <= 0x7f) {
      code = first
      length = 1
    } else if (first >= 0xc2 && first <= 0xdf) {
      code = first & 0x1f
      length = 2
      minimum = 0x80
    } else if (first >= 0xe0 && first <= 0xef) {
      code = first & 0x0f
      length = 3
      minimum = 0x800
    } else if (first >= 0xf0 && first <= 0xf4) {
      code = first & 0x07
      length = 4
      minimum = 0x10000
    } else throw new Error(`${path}: 非法 UTF-8 起始字节`)
    if (offset + length > bytes.length) throw new Error(`${path}: UTF-8 序列被截断`)
    for (let index = 1; index < length; index++) {
      const next = bytes[offset + index]
      if (next === undefined || (next & 0xc0) !== 0x80)
        throw new Error(`${path}: 非法 UTF-8 延续字节`)
      code = (code << 6) | (next & 0x3f)
    }
    if (code < minimum || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff))
      throw new Error(`${path}: 非法 UTF-8 码点`)
    out.push(String.fromCodePoint(code))
    offset += length
  }
  return out.join('')
}

function readU32Le(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  )
}

function writeU32Le(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

export function validateFrameSequenceIndex(
  value: unknown,
  payloadBytes: number,
  where = 'TPFS.index',
): FrameSequenceIndexV1 {
  const index = recordAt(value, where)
  if (index.version !== FRAME_SEQUENCE_VERSION)
    throw new Error(`${where}.version: 期望 ${FRAME_SEQUENCE_VERSION}`)
  if (index.codec !== FRAME_SEQUENCE_CODEC)
    throw new Error(`${where}.codec: 期望 ${FRAME_SEQUENCE_CODEC}`)
  if (index.pixelFormat !== 'rgba8') throw new Error(`${where}.pixelFormat: 期望 rgba8`)
  const width = integerAt(index.width, `${where}.width`, 1)
  const height = integerAt(index.height, `${where}.height`, 1)
  const defaultFrameMs = positiveNumberAt(index.defaultFrameMs, `${where}.defaultFrameMs`)
  if (index.blockFrames !== FRAME_SEQUENCE_BLOCK_FRAMES)
    throw new Error(`${where}.blockFrames: 期望 ${FRAME_SEQUENCE_BLOCK_FRAMES}`)
  if (
    index.colorTreatment !== undefined &&
    index.colorTreatment !== 'preserve' &&
    index.colorTreatment !== 'project-standard'
  )
    throw new Error(`${where}.colorTreatment: 期望 preserve 或 project-standard`)
  if (!Array.isArray(index.frames) || index.frames.length === 0)
    throw new Error(`${where}.frames: 期望非空数组`)
  const frames = index.frames.map((value, frameIndex) => {
    const frame = recordAt(value, `${where}.frames[${frameIndex}]`)
    if (frame.durationMs !== undefined)
      positiveNumberAt(frame.durationMs, `${where}.frames[${frameIndex}].durationMs`)
    return frame as FrameSequenceFrameV1
  })
  if (!Array.isArray(index.blocks) || index.blocks.length === 0)
    throw new Error(`${where}.blocks: 期望非空数组`)

  const frameBytes = checkedProduct(checkedProduct(width, height, where), 4, where)
  const expectedBlockCount = Math.ceil(frames.length / FRAME_SEQUENCE_BLOCK_FRAMES)
  if (index.blocks.length !== expectedBlockCount)
    throw new Error(`${where}.blocks: 期望 ${expectedBlockCount} 块`)
  let expectedFrame = 0
  let expectedOffset = 0
  const blocks = index.blocks.map((value, blockIndex) => {
    const path = `${where}.blocks[${blockIndex}]`
    const block = recordAt(value, path)
    const firstFrame = integerAt(block.firstFrame, `${path}.firstFrame`, 0)
    const frameCount = integerAt(block.frameCount, `${path}.frameCount`, 1)
    const offset = integerAt(block.offset, `${path}.offset`, 0)
    const bytes = integerAt(block.bytes, `${path}.bytes`, 1)
    const rawBytes = integerAt(block.rawBytes, `${path}.rawBytes`, 1)
    const expectedFrameCount = Math.min(FRAME_SEQUENCE_BLOCK_FRAMES, frames.length - expectedFrame)
    if (firstFrame !== expectedFrame)
      throw new Error(`${path}.firstFrame: 帧覆盖不连续，期望 ${expectedFrame}`)
    if (frameCount !== expectedFrameCount)
      throw new Error(`${path}.frameCount: 期望 ${expectedFrameCount}`)
    if (offset !== expectedOffset)
      throw new Error(`${path}.offset: payload 必须连续，期望 ${expectedOffset}`)
    const expectedRawBytes = checkedProduct(frameBytes, frameCount, `${path}.rawBytes`)
    if (rawBytes !== expectedRawBytes) throw new Error(`${path}.rawBytes: 期望 ${expectedRawBytes}`)
    const end = offset + bytes
    if (!Number.isSafeInteger(end) || end > payloadBytes) throw new Error(`${path}: payload 越界`)
    expectedFrame += frameCount
    expectedOffset = end
    return { firstFrame, frameCount, offset, bytes, rawBytes }
  })
  if (expectedFrame !== frames.length) throw new Error(`${where}.blocks: 未覆盖全部帧`)
  if (expectedOffset !== payloadBytes)
    throw new Error(`${where}.blocks: payload 存在尾随数据或未登记字节`)

  return {
    version: FRAME_SEQUENCE_VERSION,
    codec: FRAME_SEQUENCE_CODEC,
    pixelFormat: 'rgba8',
    width,
    height,
    defaultFrameMs,
    blockFrames: FRAME_SEQUENCE_BLOCK_FRAMES,
    ...(index.colorTreatment === undefined
      ? {}
      : { colorTreatment: index.colorTreatment as 'preserve' | 'project-standard' }),
    frames,
    blocks,
  }
}

export function parseFrameSequence(bytes: Uint8Array): ParsedFrameSequenceV1 {
  if (bytes.byteLength < 12) throw new Error('TPFS: 文件头被截断')
  for (let index = 0; index < FRAME_SEQUENCE_MAGIC.length; index++) {
    if (bytes[index] !== FRAME_SEQUENCE_MAGIC.charCodeAt(index))
      throw new Error('TPFS.magic: 非法魔数')
  }
  if (bytes[4] !== FRAME_SEQUENCE_VERSION)
    throw new Error(`TPFS.version: 期望 ${FRAME_SEQUENCE_VERSION}`)
  if (bytes[5] !== 0 || bytes[6] !== 0 || bytes[7] !== 0)
    throw new Error('TPFS.reserved: 保留位必须为 0')
  const indexBytes = readU32Le(bytes, 8)
  const payloadStart = 12 + indexBytes
  if (!Number.isSafeInteger(payloadStart) || payloadStart > bytes.byteLength)
    throw new Error('TPFS.indexLength: 索引越界或端序错误')
  let rawIndex: unknown
  try {
    rawIndex = JSON.parse(decodeUtf8(bytes.subarray(12, payloadStart), 'TPFS.index'))
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('TPFS.index')) throw error
    throw new Error(
      `TPFS.index: 非法 JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  const payload = bytes.subarray(payloadStart)
  return {
    index: validateFrameSequenceIndex(rawIndex, payload.byteLength),
    payload,
  }
}

interface PreparedFrameSequenceInput {
  width: number
  height: number
  defaultFrameMs: number
  colorTreatment?: 'preserve' | 'project-standard'
  inputFrames: readonly FrameSequenceFrameInput[]
  frames: FrameSequenceFrameV1[]
  frameBytes: number
}

interface EncodedFrameSequenceBlock {
  firstFrame: number
  frameCount: number
  rawBytes: number
  compressed: Uint8Array
}

type FrameSequenceEncodingMetadata = Pick<
  PreparedFrameSequenceInput,
  'width' | 'height' | 'defaultFrameMs' | 'colorTreatment' | 'frames' | 'frameBytes'
>

function prepareFrameSequenceInput(input: EncodeFrameSequenceInput): PreparedFrameSequenceInput {
  const width = integerAt(input.width, 'TPFS.encode.width', 1)
  const height = integerAt(input.height, 'TPFS.encode.height', 1)
  const defaultFrameMs = positiveNumberAt(input.defaultFrameMs, 'TPFS.encode.defaultFrameMs')
  if (
    input.colorTreatment !== undefined &&
    input.colorTreatment !== 'preserve' &&
    input.colorTreatment !== 'project-standard'
  )
    throw new Error('TPFS.encode.colorTreatment: 期望 preserve 或 project-standard')
  if (input.frames.length === 0) throw new Error('TPFS.encode.frames: 期望非空数组')
  const frameBytes = checkedProduct(checkedProduct(width, height, 'TPFS.encode'), 4, 'TPFS.encode')
  const frames = input.frames.map((frame, index) => {
    if (frame.rgba.byteLength !== frameBytes)
      throw new Error(`TPFS.encode.frames[${index}].rgba: 期望 ${frameBytes} 字节`)
    if (frame.durationMs !== undefined)
      positiveNumberAt(frame.durationMs, `TPFS.encode.frames[${index}].durationMs`)
    return frame.durationMs === undefined ? {} : { durationMs: frame.durationMs }
  })

  return {
    width,
    height,
    defaultFrameMs,
    ...(input.colorTreatment === undefined ? {} : { colorTreatment: input.colorTreatment }),
    inputFrames: input.frames,
    frames,
    frameBytes,
  }
}

function buildRawFrameSequenceBlock(
  input: PreparedFrameSequenceInput,
  firstFrame: number,
): { frameCount: number; raw: Uint8Array } {
  const frameCount = Math.min(FRAME_SEQUENCE_BLOCK_FRAMES, input.inputFrames.length - firstFrame)
  const rawBytes = checkedProduct(input.frameBytes, frameCount, 'TPFS.encode.block.rawBytes')
  const raw = new Uint8Array(rawBytes)
  for (let local = 0; local < frameCount; local++) {
    const current = input.inputFrames[firstFrame + local]?.rgba
    if (!current) throw new Error('TPFS.encode: 内部帧索引越界')
    const targetOffset = local * input.frameBytes
    if (local === 0) raw.set(current, targetOffset)
    else {
      const previous = input.inputFrames[firstFrame + local - 1]?.rgba
      if (!previous) throw new Error('TPFS.encode: 内部前帧索引越界')
      for (let byte = 0; byte < input.frameBytes; byte++)
        raw[targetOffset + byte] = (current[byte] ?? 0) ^ (previous[byte] ?? 0)
    }
  }
  return { frameCount, raw }
}

function finishFrameSequenceEncoding(
  input: FrameSequenceEncodingMetadata,
  encoded: readonly EncodedFrameSequenceBlock[],
): Uint8Array {
  const blocks: FrameSequenceBlockV1[] = []
  let payloadOffset = 0
  for (const block of encoded) {
    if (!(block.compressed instanceof Uint8Array) || block.compressed.byteLength === 0)
      throw new Error('TPFS.encode: Deflate 必须返回非空 Uint8Array')
    blocks.push({
      firstFrame: block.firstFrame,
      frameCount: block.frameCount,
      offset: payloadOffset,
      bytes: block.compressed.byteLength,
      rawBytes: block.rawBytes,
    })
    payloadOffset += block.compressed.byteLength
    if (!Number.isSafeInteger(payloadOffset)) throw new Error('TPFS.encode: payload 过大')
  }

  const index: FrameSequenceIndexV1 = {
    version: FRAME_SEQUENCE_VERSION,
    codec: FRAME_SEQUENCE_CODEC,
    pixelFormat: 'rgba8',
    width: input.width,
    height: input.height,
    defaultFrameMs: input.defaultFrameMs,
    blockFrames: FRAME_SEQUENCE_BLOCK_FRAMES,
    ...(input.colorTreatment === undefined ? {} : { colorTreatment: input.colorTreatment }),
    frames: input.frames,
    blocks,
  }
  const indexBytes = encodeUtf8(JSON.stringify(index))
  if (indexBytes.byteLength > 0xffffffff) throw new Error('TPFS.encode: JSON 索引过大')
  const output = new Uint8Array(12 + indexBytes.byteLength + payloadOffset)
  for (let index = 0; index < FRAME_SEQUENCE_MAGIC.length; index++)
    output[index] = FRAME_SEQUENCE_MAGIC.charCodeAt(index)
  output[4] = FRAME_SEQUENCE_VERSION
  writeU32Le(output, 8, indexBytes.byteLength)
  output.set(indexBytes, 12)
  let offset = 12 + indexBytes.byteLength
  for (const { compressed } of encoded) {
    output.set(compressed, offset)
    offset += compressed.byteLength
  }
  return output
}

function prepareFrameSequenceProviderInput(
  input: EncodeFrameSequenceProviderInput,
): FrameSequenceEncodingMetadata {
  const width = integerAt(input.width, 'TPFS.encode.width', 1)
  const height = integerAt(input.height, 'TPFS.encode.height', 1)
  const defaultFrameMs = positiveNumberAt(input.defaultFrameMs, 'TPFS.encode.defaultFrameMs')
  if (
    input.colorTreatment !== undefined &&
    input.colorTreatment !== 'preserve' &&
    input.colorTreatment !== 'project-standard'
  )
    throw new Error('TPFS.encode.colorTreatment: 期望 preserve 或 project-standard')
  if (input.frames.length === 0) throw new Error('TPFS.encode.frames: 期望非空数组')
  const frames = input.frames.map((frame, index) => {
    if (frame.durationMs !== undefined)
      positiveNumberAt(frame.durationMs, `TPFS.encode.frames[${index}].durationMs`)
    return frame.durationMs === undefined ? {} : { durationMs: frame.durationMs }
  })
  return {
    width,
    height,
    defaultFrameMs,
    ...(input.colorTreatment === undefined ? {} : { colorTreatment: input.colorTreatment }),
    frames,
    frameBytes: checkedProduct(checkedProduct(width, height, 'TPFS.encode'), 4, 'TPFS.encode'),
  }
}

export async function encodeFrameSequence(
  input: EncodeFrameSequenceInput,
  deflate: FrameSequenceByteTransform,
): Promise<Uint8Array> {
  const prepared = prepareFrameSequenceInput(input)
  const encoded: EncodedFrameSequenceBlock[] = []
  for (
    let firstFrame = 0;
    firstFrame < prepared.inputFrames.length;
    firstFrame += FRAME_SEQUENCE_BLOCK_FRAMES
  ) {
    const { frameCount, raw } = buildRawFrameSequenceBlock(prepared, firstFrame)
    encoded.push({
      firstFrame,
      frameCount,
      rawBytes: raw.byteLength,
      compressed: await deflate(raw),
    })
  }
  return finishFrameSequenceEncoding(prepared, encoded)
}

export function encodeFrameSequenceSync(
  input: EncodeFrameSequenceInput,
  deflate: (bytes: Uint8Array) => Uint8Array,
): Uint8Array {
  const prepared = prepareFrameSequenceInput(input)
  const encoded: EncodedFrameSequenceBlock[] = []
  for (
    let firstFrame = 0;
    firstFrame < prepared.inputFrames.length;
    firstFrame += FRAME_SEQUENCE_BLOCK_FRAMES
  ) {
    const { frameCount, raw } = buildRawFrameSequenceBlock(prepared, firstFrame)
    encoded.push({
      firstFrame,
      frameCount,
      rawBytes: raw.byteLength,
      compressed: deflate(raw),
    })
  }
  return finishFrameSequenceEncoding(prepared, encoded)
}

/**
 * 从完整帧提供器分块编码。调用方可惰性解码旧资产；本函数在任一时刻只持有一个原始 block，
 * 不要求把整段动画的所有 RGBA 帧同时放进内存。
 */
export async function encodeFrameSequenceFromProvider(
  input: EncodeFrameSequenceProviderInput,
  deflate: FrameSequenceByteTransform,
): Promise<Uint8Array> {
  const prepared = prepareFrameSequenceProviderInput(input)
  const encoded: EncodedFrameSequenceBlock[] = []
  for (
    let firstFrame = 0;
    firstFrame < prepared.frames.length;
    firstFrame += FRAME_SEQUENCE_BLOCK_FRAMES
  ) {
    const frameCount = Math.min(FRAME_SEQUENCE_BLOCK_FRAMES, prepared.frames.length - firstFrame)
    const raw = new Uint8Array(prepared.frameBytes * frameCount)
    let previous: Uint8Array | undefined
    for (let local = 0; local < frameCount; local++) {
      const frameIndex = firstFrame + local
      const current = await input.frame(frameIndex)
      if (!(current instanceof Uint8Array) || current.byteLength !== prepared.frameBytes)
        throw new Error(`TPFS.encode.frames[${frameIndex}].rgba: 期望 ${prepared.frameBytes} 字节`)
      const offset = local * prepared.frameBytes
      if (!previous) raw.set(current, offset)
      else {
        for (let byte = 0; byte < prepared.frameBytes; byte++)
          raw[offset + byte] = (current[byte] ?? 0) ^ (previous[byte] ?? 0)
      }
      previous = current
    }
    encoded.push({
      firstFrame,
      frameCount,
      rawBytes: raw.byteLength,
      compressed: await deflate(raw),
    })
  }
  return finishFrameSequenceEncoding(prepared, encoded)
}

export async function decodeFrameSequenceBlock(
  sequence: ParsedFrameSequenceV1,
  blockIndex: number,
  inflate: FrameSequenceByteTransform,
): Promise<Uint8Array[]> {
  if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= sequence.index.blocks.length)
    throw new Error(`TPFS.block: 非法块索引 ${String(blockIndex)}`)
  const block = sequence.index.blocks[blockIndex]
  if (!block) throw new Error(`TPFS.block: 缺块 ${blockIndex}`)
  const compressed = sequence.payload.subarray(block.offset, block.offset + block.bytes)
  const raw = await inflate(compressed)
  if (!(raw instanceof Uint8Array) || raw.byteLength !== block.rawBytes)
    throw new Error(`TPFS.block[${blockIndex}]: 解压长度应为 ${block.rawBytes}`)
  const frameBytes = sequence.index.width * sequence.index.height * 4
  const frames: Uint8Array[] = []
  for (let local = 0; local < block.frameCount; local++) {
    const sourceOffset = local * frameBytes
    const frame = new Uint8Array(frameBytes)
    if (local === 0) frame.set(raw.subarray(sourceOffset, sourceOffset + frameBytes))
    else {
      const previous = frames[local - 1]
      if (!previous) throw new Error(`TPFS.block[${blockIndex}]: 缺前帧`)
      for (let byte = 0; byte < frameBytes; byte++)
        frame[byte] = (raw[sourceOffset + byte] ?? 0) ^ (previous[byte] ?? 0)
    }
    frames.push(frame)
  }
  return frames
}

export async function decodeFrameSequenceFrame(
  sequence: ParsedFrameSequenceV1,
  frameIndex: number,
  inflate: FrameSequenceByteTransform,
): Promise<Uint8Array> {
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= sequence.index.frames.length)
    throw new Error(`TPFS.frame: 非法帧索引 ${String(frameIndex)}`)
  const blockIndex = Math.floor(frameIndex / FRAME_SEQUENCE_BLOCK_FRAMES)
  const block = sequence.index.blocks[blockIndex]
  if (!block) throw new Error(`TPFS.frame: 缺块 ${blockIndex}`)
  const frames = await decodeFrameSequenceBlock(sequence, blockIndex, inflate)
  const frame = frames[frameIndex - block.firstFrame]
  if (!frame) throw new Error(`TPFS.frame: 缺帧 ${frameIndex}`)
  return frame
}

export function resolveFrameSequencePlayback(
  index: FrameSequenceIndexV1,
  options: FrameSequencePlaybackOptions = {},
): FrameSequencePlaybackRange {
  const startFrame = options.startFrame ?? 0
  const endFrame = options.endFrame ?? index.frames.length - 1
  for (const [name, value] of [
    ['startFrame', startFrame],
    ['endFrame', endFrame],
  ] as const) {
    if (!Number.isInteger(value) || value < 0 || value >= index.frames.length)
      throw new Error(`TPFS.playback.${name}: 帧索引 ${String(value)} 越界`)
  }
  if (startFrame > endFrame) throw new Error('TPFS.playback: startFrame 不能大于 endFrame')
  if (
    options.frameRate !== undefined &&
    (!Number.isFinite(options.frameRate) || options.frameRate <= 0)
  )
    throw new Error('TPFS.playback.frameRate: 期望正有限数')
  return {
    startFrame,
    endFrame,
    ...(options.frameRate === undefined ? {} : { frameRate: options.frameRate }),
  }
}

export function frameSequenceFrameDurationMs(
  index: FrameSequenceIndexV1,
  frameIndex: number,
  frameRate?: number,
): number {
  const range = resolveFrameSequencePlayback(index, {
    startFrame: frameIndex,
    endFrame: frameIndex,
    ...(frameRate === undefined ? {} : { frameRate }),
  })
  if (range.frameRate !== undefined) return 1000 / range.frameRate
  return index.frames[frameIndex]?.durationMs ?? index.defaultFrameMs
}
