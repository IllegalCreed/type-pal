// Q10 r18 · CLI 全管线合成输入共享 fixture（Q 专属；纯构造器，无测试）。
//
// 背景：cli-isolated.glm-q.test.ts 与 cli-battle-assets.glm-q.test.ts 各自持有本地夹具
// （冻结证据，不再改动）；新 CLI 批次统一从本模块导入，避免第三份复制。构造法与前波
// 同源同法（SSS 5 chunk / WORD.DAT 565×10B / M.MSG 平铺 GBK / DATA.MKF 15 chunk /
// RNG·RGM·BALL·FIRE·SOUNDS 合成 / MAP·GOP·PAT·MGO 合法 YJ2 与 sprite group）。
import { encodeSpriteChunk } from '@type-pal/shared'
import { yj2EncodeLiterals } from './yj2-encoder.js'

export function u16le(value: number): Uint8Array {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, value, true)
  return out
}

function u32le(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value, true)
  return out
}

/** MKF 归档：N+1 个 u32 LE 偏移头 + 顺序 chunk 数据（shared/mkf.ts 合同）。 */
export function mkfArchive(chunks: Uint8Array[]): Uint8Array {
  const headerSize = (chunks.length + 1) * 4
  const bodyLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const buf = new Uint8Array(headerSize + bodyLength)
  const view = new DataView(buf.buffer)
  let offset = headerSize
  for (const [index, chunk] of chunks.entries()) {
    view.setUint32(index * 4, offset, true)
    buf.set(chunk, offset)
    offset += chunk.length
  }
  view.setUint32(chunks.length * 4, offset, true)
  return buf
}

const EVENT_OBJECT_SIZE = 32
const SCENE_SIZE = 8
const OBJECT_STRIDE = 14
const OBJECT_TABLE_SLOTS = 551
const WORD_RECORDS = 565
const WORD_LENGTH = 10

/** 场景入口 ip=1：showDialog(msg 0)；ip=2：end advance（与前波同法）。 */
export function buildSssArchive(): Uint8Array {
  const eventObject = new Uint8Array(EVENT_OBJECT_SIZE)
  const scene = new Uint8Array(SCENE_SIZE)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true)
  sceneView.setUint16(2, 1, true)
  sceneView.setUint16(4, 2, true)
  sceneView.setUint16(6, 0, true)
  const objects = new Uint8Array(OBJECT_TABLE_SLOTS * OBJECT_STRIDE)
  const messageOffsets = new Uint8Array([...u32le(0), ...u32le(9)])
  const bytecode = new Uint8Array([
    ...u16le(0x001f),
    ...u16le(61),
    ...u16le(1),
    ...u16le(0),
    ...u16le(0xffff),
    ...u16le(0),
    ...u16le(0),
    ...u16le(0),
    ...u16le(0x0001),
    ...u16le(0),
    ...u16le(0),
    ...u16le(0),
  ])
  return mkfArchive([eventObject, scene, objects, messageOffsets, bytecode])
}

/** WORD.DAT：565×10B 全空格，记录 61='ITEMNAME1'（尾部 '1' 由 parseWordDat 剥除）。 */
export function buildWordDatArchive(): Uint8Array {
  const buf = new Uint8Array(WORD_RECORDS * WORD_LENGTH).fill(0x20)
  const name = 'ITEMNAME1'
  for (const [index, ch] of [...name].entries()) buf[61 * WORD_LENGTH + index] = ch.charCodeAt(0)
  return buf
}

/** DATA.MKF 15 chunk 最小合法表（与前波同法；chunk9/10=SPRITEUI sprite group）。 */
export function buildDataMkfArchive(): Uint8Array {
  const store = new Uint8Array([...u16le(61), ...new Uint8Array(16)])
  const roles = new Uint8Array(900)
  new DataView(roles.buffer).setUint16(24, 2, true)
  const spriteChunk = encodeSpriteChunk([
    { width: 4, height: 4, pixels: new Uint8Array(16).fill(3), opaque: new Uint8Array(16).fill(1) },
  ])
  return mkfArchive([
    store,
    new Uint8Array(70),
    new Uint8Array(10),
    roles,
    new Uint8Array(32),
    new Uint8Array(12),
    new Uint8Array(20),
    new Uint8Array(0),
    new Uint8Array(0),
    spriteChunk,
    spriteChunk,
    new Uint8Array(40),
    new Uint8Array(282).fill(7),
    new Uint8Array(100),
    new Uint8Array(200),
  ])
}

/** 合法 YJ2 字面量压缩（专属编码器 + 0xFFF 终止符；r10 起独立验证）。 */
export function yj2Compress(data: Uint8Array): Uint8Array {
  return yj2EncodeLiterals(data)
}

function rleBitmap2x2(): Uint8Array {
  return new Uint8Array([0x02, 0x00, 0x02, 0x00, 0x04, 9, 8, 7, 6])
}

/** 图像/音频段合成输入（与前波同法；FBP/F/ABC 由调用方按批覆盖）。 */
export function buildTailPipelineInputs(): Record<string, Uint8Array> {
  const palette768 = new Uint8Array(768)
  for (let i = 0; i < 256; i++) {
    palette768[i * 3] = i % 64
    palette768[i * 3 + 1] = (i + 13) % 64
    palette768[i * 3 + 2] = 63 - (i % 64)
  }
  const palette1536 = new Uint8Array(1536)
  palette1536.set(palette768, 0)
  palette1536.set(palette768, 768)
  const withHeader = (rle: Uint8Array): Uint8Array =>
    new Uint8Array([...new Uint8Array([0x02, 0x00, 0x00, 0x00]), ...rle])
  const mapChunkYj2 = yj2Compress(new Uint8Array(65536))
  const empty = new Uint8Array(0)
  return {
    'RNG.MKF': mkfArchive([mkfArchive([empty])]),
    'RGM.MKF': mkfArchive([withHeader(rleBitmap2x2())]),
    'BALL.MKF': mkfArchive([withHeader(rleBitmap2x2())]),
    'FIRE.MKF': mkfArchive([]),
    'SOUNDS.MKF': mkfArchive([empty, new TextEncoder().encode('WAVDATA-1')]),
    'FBP.MKF': mkfArchive([empty, empty, empty, empty, empty]),
    'MAP.MKF': mkfArchive([mapChunkYj2, mapChunkYj2]),
    'GOP.MKF': mkfArchive([
      encodeSpriteChunk([
        {
          width: 4,
          height: 4,
          pixels: new Uint8Array(16).fill(3),
          opaque: new Uint8Array(16).fill(1),
        },
      ]),
      encodeSpriteChunk([
        {
          width: 4,
          height: 4,
          pixels: new Uint8Array(16).fill(5),
          opaque: new Uint8Array(16).fill(1),
        },
      ]),
    ]),
    'PAT.MKF': mkfArchive([palette768, palette1536]),
    'MGO.MKF': mkfArchive([yj2Compress(encodeSpriteChunk([]))]),
    'F.MKF': mkfArchive([]),
    'ABC.MKF': mkfArchive([]),
  }
}
