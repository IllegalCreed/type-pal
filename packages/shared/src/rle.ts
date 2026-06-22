/**
 * RLE 精灵解码 —— 原版精灵格式。
 * 参考 reference/sdlpal/palcommon.c::PAL_RLEBlitToSurfaceWithShadow。
 *
 * 本模块是纯函数解码器,extractor 与 runtime 共用,保证两端用同一份逻辑解出像素
 * (S1 of tileset 资源管线优化:tileset 从 per-tile PNG 改为每地图 gzip RLE blob)。
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

/**
 * 解码一帧 RLE 精灵数据。
 * 帧头 = 宽 u16 LE + 高 u16 LE;后接指令流。
 * 指令字节 b:
 *   b >= 0x80 → 跳 b-0x80 个像素(留透明 opaque=0;pixels 默认 0)
 *   else      → 接下来 b 个字节是像素值(opaque=1,palette index 即使 0 也合法)
 */
export function decodeRle(buf: Uint8Array): RleFrame {
  let offset = 0

  // biome-ignore lint/style/noNonNullAssertion: buf bounds guaranteed by RLE frame structure
  const width = buf[offset]! | (buf[offset + 1]! << 8)
  // biome-ignore lint/style/noNonNullAssertion: buf bounds guaranteed by RLE frame structure
  const height = buf[offset + 2]! | (buf[offset + 3]! << 8)
  offset += 4

  const total = width * height
  const pixels = new Uint8Array(total) // zero-filled,RLE-skip 位置维持 0
  const opaque = new Uint8Array(total) // 默认全 0 = transparent

  let dst = 0
  while (dst < total) {
    // biome-ignore lint/style/noNonNullAssertion: within-frame read
    const b = buf[offset++]!
    if (b >= 0x80) {
      // 跳过 b-0x80 个像素(opaque 保持 0,pixels 保持 0)
      dst += b - 0x80
    } else {
      // 接下来 b 个字节是直接像素值(opaque = 1)
      for (let k = 0; k < b; k++) {
        // biome-ignore lint/style/noNonNullAssertion: within-frame pixel read
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
