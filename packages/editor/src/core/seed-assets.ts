/**
 * 空白工程的占位素材(W-blank;**零原版字节**)—— 现生成:合成色盘 + 起始地形瓦片集 +
 * 占位主角行走精灵。全部手工指定调色板索引作画(非量化 —— 量化是给任意 RGBA 找近色用的,
 * 手绘直接指定索引更精确),经 encodeSpriteChunk + gzip 落成原版同构 .rle,与引擎资产管线一致。
 * 作者随后在编辑器里把这些占位替换成自己的素材(瓦片集/精灵/色盘皆可换)。
 */
import { compressGzip, encodeSpriteChunk, type Palette, type RleFrame } from '@type-pal/reforge'

// ── 合成色盘(工程自有的「盘 0」,非 PAL 原盘):前若干为占位美术用色,补黑到 256 ──
// 索引即语义;渲染层照 D25 经色盘着色。作者永远看不到 palId,这是内部机制。
const ART: [number, number, number][] = [
  [26, 30, 22], // 0 底/描边黑
  [104, 158, 74], // 1 草·亮
  [70, 118, 52], // 2 草·暗
  [150, 116, 74], // 3 土/靴
  [140, 142, 150], // 4 石
  [58, 44, 34], // 5 发/深褐
  [232, 194, 154], // 6 肤
  [74, 108, 176], // 7 衣·蓝
  [44, 68, 116], // 8 衣·深(腿)
  [222, 226, 232], // 9 高光/白
  [200, 84, 68], // 10 红点缀
  [30, 30, 34], // 11 描边/眼
]
export const SEED_PALETTE: Palette = {
  colors: [
    ...ART,
    ...Array.from({ length: 256 - ART.length }, () => [0, 0, 0] as [number, number, number]),
  ],
  cycles: [], // 静态盘,无色盘循环动画
}

// ── 起始地形瓦片集:32×15 实心菱形(铺满错排 lattice 无缝),4 块基础地面 ──
/** 索引 idx 填充的菱形瓦;edge = 最外像素描边色(勾出格线,便于作者看清格子)。 */
function diamondTile(idx: number, edge: number): RleFrame {
  const w = 32
  const h = 15
  const pixels = new Uint8Array(w * h)
  const opaque = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const dy = Math.abs(y - 7)
    const half = Math.max(0, 16 - Math.ceil((dy * 16) / 8))
    for (let x = 16 - half; x < 16 + half; x++) {
      const rim = x === 16 - half || x === 16 + half - 1
      pixels[y * w + x] = rim ? edge : idx
      opaque[y * w + x] = 1
    }
  }
  return { width: w, height: h, pixels, opaque }
}
const TILE_FRAMES: RleFrame[] = [
  diamondTile(1, 2), // 0 草·亮
  diamondTile(2, 0), // 1 草·暗
  diamondTile(3, 0), // 2 土
  diamondTile(4, 0), // 3 石
]

// ── 占位主角:18×26 行走精灵,4 向 × 3 帧(脚底居底 = 锚点 anchorY=height 落格中心) ──
const HW = 18
const HH = 26
type Dir = 0 | 1 | 2 | 3 // down/left/up/right(FACING_TO_DIR)

/** 一帧占位小人;pose 0=站,1=抬左脚,2=抬右脚(走序 [0,1,0,2])。 */
function heroFrame(dir: Dir, pose: 0 | 1 | 2): RleFrame {
  const px = new Uint8Array(HW * HH)
  const op = new Uint8Array(HW * HH)
  const set = (x: number, y: number, idx: number): void => {
    if (x < 0 || x >= HW || y < 0 || y >= HH) return
    px[y * HW + x] = idx
    op[y * HW + x] = 1
  }
  const rect = (x0: number, x1: number, y0: number, y1: number, idx: number): void => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, idx)
  }
  // 头脸(肤)+ 发帽
  rect(6, 11, 3, 9, 6)
  rect(5, 12, 2, 4, 5)
  set(5, 5, 5)
  set(12, 5, 5)
  if (dir === 2) rect(6, 11, 3, 9, 5) // 背面:后脑勺全发,无脸
  // 眼(朝向指示)
  if (dir === 0) {
    set(8, 7, 11)
    set(10, 7, 11)
  } else if (dir === 1) {
    set(7, 7, 11)
  } else if (dir === 3) {
    set(11, 7, 11)
  }
  // 身(蓝衣)+ 手臂
  rect(6, 11, 10, 11, 7)
  rect(5, 12, 12, 17, 7)
  rect(4, 4, 11, 15, 7)
  rect(13, 13, 11, 15, 7)
  set(4, 16, 6)
  set(13, 16, 6)
  // 腰带(棕)
  rect(5, 12, 18, 18, 3)
  // 腿(深蓝)+ 靴(棕);抬脚 = 该脚底上移 1px
  const footL = pose === 1 ? 24 : 25
  const footR = pose === 2 ? 24 : 25
  rect(6, 8, 19, footL - 1, 8)
  rect(6, 8, footL, footL, 3)
  rect(10, 12, 19, footR - 1, 8)
  rect(10, 12, footR, footR, 3)
  return { width: HW, height: HH, pixels: px, opaque: op }
}

// 12 帧 = dir(0..3) × pose(0..2),下标 dir*3+pose(sprite-anim 通式)。
const HERO_FRAMES: RleFrame[] = ([0, 1, 2, 3] as Dir[]).flatMap((d) =>
  ([0, 1, 2] as const).map((p) => heroFrame(d, p)),
)

/** Uint8Array → 独立 ArrayBuffer(writeProject 二进制值须是 ArrayBuffer 实例)。 */
async function toGzBuffer(frames: RleFrame[]): Promise<ArrayBuffer> {
  const gz = await compressGzip(encodeSpriteChunk(frames))
  const ab = new ArrayBuffer(gz.byteLength)
  new Uint8Array(ab).set(gz)
  return ab
}

/** 生成空白工程占位素材:合成色盘 + 地形瓦片集 .rle + 主角精灵 .rle。 */
export async function buildSeedAssets(): Promise<{
  palette: Palette
  tilesetRle: ArrayBuffer
  spriteRle: ArrayBuffer
}> {
  return {
    palette: SEED_PALETTE,
    tilesetRle: await toGzBuffer(TILE_FRAMES),
    spriteRle: await toGzBuffer(HERO_FRAMES),
  }
}
