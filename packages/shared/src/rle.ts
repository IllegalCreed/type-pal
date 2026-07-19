/**
 * RLE 精灵解码 —— 原版精灵格式。
 * 参考 reference/sdlpal/palcommon.c::PAL_RLEBlitToSurfaceWithShadow。
 *
 * 本模块是纯函数解码器,extractor 与 runtime 共用,保证两端用同一份逻辑解出像素
 * (S1 of tileset 资源管线优化:tileset 从 per-tile PNG 改为每地图 gzip RLE blob)。
 *
 * **唯一解码器**:此前 game `rle-decode.ts` 另有一份带 `0x02000000` 前缀跳过的 decodeRle
 * (单帧整-chunk 用),与本份分叉。现已用 `decodeRle(buf, { skipFilePrefix })` 参数统一 ——
 * game `rle-decode.ts` 改为 re-export 本份;sprite-group 路径不传(默认不跳),单帧整-chunk 传 true。
 */

export interface RleFrame {
  width: number
  height: number
  /** 长度 = width * height,值 = 调色板下标。
   *  注意:**只有 `opaque[i] === 1` 时该下标才有效**;`opaque[i] === 0` 表示
   *  RLE-skip 透明像素,此位置 pixels 默认 0 仅为占位,不应被渲染。 */
  pixels: Uint8Array
  /** 长度 = width * height。1 = opaque(写入像素),0 = RLE-skip transparent。
   *  之前用「`pixels[i] === 0` 即透明」做语义,把 RLE-skip 与 opaque-palette-0
   *  合并;dense scene 16 通道 tile + 角色 sprite 头发暗部凡 palette 0 全被
   *  误判为透明 → "梯子状"杂乱 tile + 人物半透明。M3.5 修。 */
  opaque: Uint8Array
}

export type IndexedRleChunkProfile = 'canonical' | 'legacy-migrated'
/** @deprecated 使用 IndexedRleChunkProfile；保留给 A7-3W 调用方源码兼容。 */
export type WorldSpriteChunkProfile = IndexedRleChunkProfile

/**
 * 大世界精灵容器的严格解析报告。
 *
 * PAL MGO 有少量“声明表尾多出坏 offset”的历史数据。它们的有效帧始终是连续前缀；
 * `legacy-migrated` 只允许跳过这个不可解尾后缀。普通作者/生成资源必须使用 canonical，
 * 任何坏槽都直接失败。
 */
export interface IndexedRleChunkResult {
  frames: RleFrame[]
  declaredSlots: number
  /** PAL 正常容器末尾的零 offset；作者编码器通常没有。 */
  trailingSentinel: boolean
  /** 不含正常零 sentinel；仅统计 legacy profile 跳过的坏尾槽。 */
  skippedLegacyTailSlots: number
}
/** @deprecated 使用 IndexedRleChunkResult；保留给 A7-3W 调用方源码兼容。 */
export type WorldSpriteChunkResult = IndexedRleChunkResult

/**
 * 解码一帧 RLE 精灵数据。
 * 帧头 = 宽 u16 LE + 高 u16 LE;后接指令流。
 * 指令字节 b:
 *   b >= 0x80 → 跳 b-0x80 个像素(留透明 opaque=0;pixels 默认 0)
 *   else      → 接下来 b 个字节是像素值(opaque=1,palette index 即使 0 也合法)
 *
 * `opts.skipFilePrefix`(默认 false):**单帧整-chunk** RLE bitmap(如 RGM 头像 / 标题屏,
 * 「整个 chunk = 一帧」)首部带 `0x00000002` file-header 前缀,须跳过(sdlpal palcommon.c:722-728);
 * 而 **sprite-group** chunk 的帧经 `parseSpriteChunk` 取真 offset 后喂入,首字节即真 width,**不跳**。
 * 故由调用方按数据来源决定 —— 这一个参数统一了原先 shared / game 两份分叉的 decodeRle。
 */
export function decodeRle(buf: Uint8Array, opts?: { skipFilePrefix?: boolean }): RleFrame {
  let offset = 0

  // 单帧整-chunk 的 0x00000002 前缀跳过(仅 skipFilePrefix 时;sprite-group 帧无此前缀)
  if (
    opts?.skipFilePrefix &&
    buf.length >= 4 &&
    buf[0] === 0x02 &&
    buf[1] === 0x00 &&
    buf[2] === 0x00 &&
    buf[3] === 0x00
  ) {
    offset = 4
  }

  const width = buf[offset]! | (buf[offset + 1]! << 8)
  const height = buf[offset + 2]! | (buf[offset + 3]! << 8)
  offset += 4

  const total = width * height
  const pixels = new Uint8Array(total) // zero-filled,RLE-skip 位置维持 0
  const opaque = new Uint8Array(total) // 默认全 0 = transparent

  let dst = 0
  while (dst < total) {
    const b = buf[offset++]!
    if (b >= 0x80) {
      // 跳过 b-0x80 个像素(opaque 保持 0,pixels 保持 0)
      dst += b - 0x80
    } else {
      // 接下来 b 个字节是直接像素值(opaque = 1)
      for (let k = 0; k < b; k++) {
        pixels[dst] = buf[offset++]!
        opaque[dst] = 1
        dst++
      }
    }
  }

  return { width, height, pixels, opaque }
}

/**
 * 精灵 chunk 解析(sdlpal `palcommon.c::PAL_SpriteGetFrame` 真值)。
 *
 * 精灵 chunk 头:byte 0..1 = u16 LE imagecount(同时充当 frame[0] 的 word-offset)。
 * 偏移表在 byte 0..2*imagecount-2,每条 u16 word offset(乘 2 得字节偏移)。
 *   imagecount = (lpSprite[0] | (lpSprite[1] << 8));
 *   iFrameNum <<= 1;
 *   offset = ((lpSprite[iFrameNum] | (lpSprite[iFrameNum + 1] << 8)) << 1);
 *   → frame 0 的 offset 同 imagecount * 2(因为 byte 0..1 双重身份)
 *   → frame i 的 offset = u16 at byte 2*i,左移 1
 *
 * offset = 0 表示帧空缺(跳过,不进返回数组)。
 *
 * **dimensions sanity guard**(M3 T24 发现 — ABC.MKF 战斗 sprite chunk 30 / 等):
 * sdlpal `palcommon.c::PAL_SpriteGetFrame` 注释 "Hack for broken sprites like the
 * Bloody-Mouth Bug" —— `imagecount` 字段可能比实际帧数多 1,多出来的尾帧 offset
 * 指向 chunk 内任意位置,被当作 RLE 解读会得到天文数字 width/height,decodeRle
 * 死循环。原版引擎从不显式索引该尾帧,所以无感。我们静态提全部帧,必须 guard:
 * width / height > 400(屏 320×200,sprite 远小于此)即跳过尾帧。
 *
 * **键一致性铁律**:返回数组的下标 i 就是 tile 索引(地图 cells 引用它)。
 * runtime 与 extractor 必须用同一份本函数,保证下标对齐。
 */
const SPRITE_DIM_MAX = 400

function decodeStrictSpriteFrame(
  buf: Uint8Array,
  view: DataView,
  offset: number,
  end: number,
  index: number,
): RleFrame {
  if (offset + 4 > end || end > buf.byteLength)
    throw new Error(`sprite chunk frame ${index} offset 越界`)
  const width = view.getUint16(offset, true)
  const height = view.getUint16(offset + 2, true)
  if (width <= 0 || height <= 0 || width > SPRITE_DIM_MAX || height > SPRITE_DIM_MAX)
    throw new Error(`sprite chunk frame ${index} 尺寸非法`)
  const total = width * height
  const pixels = new Uint8Array(total)
  const opaque = new Uint8Array(total)
  let source = offset + 4
  let target = 0
  while (target < total) {
    if (source >= end) throw new Error(`sprite chunk frame ${index} 指令流截断`)
    const command = buf[source++]!
    if (command === 0) throw new Error(`sprite chunk frame ${index} 含零长度指令`)
    if (command >= 0x80) {
      target += command - 0x80
      if (target > total) throw new Error(`sprite chunk frame ${index} 透明段越界`)
      continue
    }
    if (source + command > end || target + command > total)
      throw new Error(`sprite chunk frame ${index} 像素段越界`)
    pixels.set(buf.subarray(source, source + command), target)
    opaque.fill(1, target, target + command)
    source += command
    target += command
  }
  // offset table 是帧边界的唯一真值。PAL 原始块允许未被指令消费的对齐/历史 payload；
  // 只要本帧在下一 offset 上界内完整解码，这些字节必须逐字节保留而不参与帧语义。
  return { width, height, pixels, opaque }
}

export function parseSpriteChunk(buf: Uint8Array): RleFrame[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const frameCount = view.getUint16(0, true)
  const frames: RleFrame[] = []
  for (let i = 0; i < frameCount; i++) {
    const wordOffset = view.getUint16(i * 2, true)
    const offset = wordOffset << 1
    if (offset === 0 || offset >= buf.byteLength) continue
    // sanity guard:width/height 都必须 ≤ 400(实际 sprite 在屏内 320×200)
    if (offset + 4 > buf.byteLength) continue
    const w = view.getUint16(offset, true)
    const h = view.getUint16(offset + 2, true)
    if (w === 0 || h === 0 || w > SPRITE_DIM_MAX || h > SPRITE_DIM_MAX) continue
    frames.push(decodeRle(buf.subarray(offset)))
  }
  return frames
}

/**
 * 工程 catalog 的 canonical tileset 使用严格解析：每个登记帧都必须可达且完整，
 * 不能沿用旧 PAL sprite 容错解析器的“跳坏帧后压缩下标”行为。
 */
export function parseSpriteChunkStrict(buf: Uint8Array): RleFrame[] {
  if (buf.byteLength < 2) throw new Error('sprite chunk 过短')
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const declaredCount = view.getUint16(0, true)
  if (declaredCount <= 0) throw new Error('sprite chunk 不含帧')
  const tableBytes = declaredCount * 2
  if (tableBytes > buf.byteLength) throw new Error('sprite chunk offset table 越界')
  // PAL GOP/MAP 原始块的 imagecount 包含一个且仅一个末尾 0 sentinel；作者编码器则
  // 不写 sentinel。两者都是可逆的合法容器，但绝不接受中间空洞或多个空帧。
  const hasTrailingSentinel = view.getUint16((declaredCount - 1) * 2, true) === 0
  const frameCount = declaredCount - (hasTrailingSentinel ? 1 : 0)
  if (frameCount <= 0) throw new Error('sprite chunk 只有 sentinel，不含有效帧')
  const offsets: number[] = []
  for (let index = 0; index < frameCount; index++) {
    const offset = view.getUint16(index * 2, true) << 1
    if (offset < tableBytes || offset + 4 > buf.byteLength)
      throw new Error(`sprite chunk frame ${index} offset 越界`)
    if (index > 0 && offset <= offsets[index - 1]!)
      throw new Error(`sprite chunk frame ${index} offset 非递增`)
    offsets.push(offset)
  }
  if (offsets[0] !== tableBytes) throw new Error('sprite chunk frame 0 offset 与表长不一致')
  return offsets.map((offset, index) =>
    decodeStrictSpriteFrame(buf, view, offset, offsets[index + 1] ?? buf.byteLength, index),
  )
}

/**
 * 大世界精灵专用严格解析。
 *
 * canonical 直接沿用完整严格容器规则。legacy-migrated 先尝试 canonical；仅失败时才
 * 逐槽验证连续有效前缀，并要求余下所有非零槽都不可严格解成帧。这样保留 PAL 的坏尾
 * 历史事实，同时拒绝中间空洞后又出现有效帧的损坏容器。
 */
export function parseIndexedRleChunk(
  buf: Uint8Array,
  profile: IndexedRleChunkProfile,
): IndexedRleChunkResult {
  if (profile !== 'canonical' && profile !== 'legacy-migrated')
    throw new Error(`未知 world sprite profile: ${String(profile)}`)
  if (buf.byteLength < 2) throw new Error('sprite chunk 过短')
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const declaredSlots = view.getUint16(0, true)
  if (declaredSlots <= 0) throw new Error('sprite chunk 不含帧')
  const tableBytes = declaredSlots * 2
  if (tableBytes > buf.byteLength) throw new Error('sprite chunk offset table 越界')
  const trailingSentinel = view.getUint16((declaredSlots - 1) * 2, true) === 0

  try {
    return {
      frames: parseSpriteChunkStrict(buf),
      declaredSlots,
      trailingSentinel,
      skippedLegacyTailSlots: 0,
    }
  } catch (canonicalError) {
    if (profile === 'canonical') throw canonicalError
  }

  const offsets = Array.from(
    { length: declaredSlots },
    (_, index) => view.getUint16(index * 2, true) << 1,
  )
  const frames: RleFrame[] = []
  let previous = -1
  let firstInvalid = declaredSlots
  for (let index = 0; index < declaredSlots; index++) {
    const offset = offsets[index]!
    if (offset === 0 || offset < tableBytes || offset + 4 > buf.byteLength || offset <= previous) {
      firstInvalid = index
      break
    }
    const next = offsets[index + 1]
    const end =
      next !== undefined && next > offset && next <= buf.byteLength ? next : buf.byteLength
    try {
      frames.push(decodeStrictSpriteFrame(buf, view, offset, end, index))
      previous = offset
    } catch {
      firstInvalid = index
      break
    }
  }
  if (frames.length === 0) throw new Error('sprite chunk legacy 尾槽前不含有效帧')
  if (firstInvalid >= declaredSlots)
    throw new Error('sprite chunk legacy profile 未找到可解释的坏尾槽')

  // 后缀中若还能独立严格解出一帧，就不是“坏尾”，而是中间损坏/空洞；必须拒绝。
  for (let index = firstInvalid; index < declaredSlots; index++) {
    const offset = offsets[index]!
    if (offset === 0 || offset < tableBytes || offset + 4 > buf.byteLength) continue
    try {
      // 这里验证“这个槽是否独立指向一帧”，不能让另一个可能损坏的后续 offset
      // 人为截短它并把本可解帧伪装成坏尾。
      decodeStrictSpriteFrame(buf, view, offset, buf.byteLength, index)
    } catch {
      continue
    }
    throw new Error(`sprite chunk frame ${index} 在坏尾后仍可解，拒绝中间空洞`)
  }

  const suffix = offsets.slice(firstInvalid)
  const sentinelSlots = suffix.filter((offset) => offset === 0).length
  const skippedLegacyTailSlots = suffix.length - sentinelSlots
  if (skippedLegacyTailSlots <= 0)
    throw new Error('sprite chunk 只有普通 sentinel，不应进入 legacy 坏尾兼容')
  return { frames, declaredSlots, trailingSentinel, skippedLegacyTailSlots }
}

/** A7-3W 兼容别名；world/battle/tileset 的 indexed-RLE 结构校验只允许这一份实现。 */
export const parseWorldSpriteChunk = parseIndexedRleChunk
