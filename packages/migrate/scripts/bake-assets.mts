/**
 * 资产迁移 CLI(asset-pipeline §5 Task 2):indexed PNG(R=index)+ palette 0 → 真彩 RGBA PNG。
 * 收编自 scripts/bake-portraits.mts;头像 + UI box 共用核心 bakeIndexedRgba。
 * 输出 packages/reforge/public/(asset-pipeline D-d 权宜,内容工程目录后置)。
 * 跑:pnpm --filter @type-pal/migrate run bake
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { bakeIndexedRgba } from '../src/bake-indexed-rgba.js'

// scripts/ → migrate/ → packages/ → repo 根
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const EXTRACTED = resolve(ROOT, 'data/extracted')
const PUBLIC = resolve(ROOT, 'packages/reforge/public')

// palette 0 = 资产标准 palette(asset-pipeline D-a:UI/头像在 pal0 正确,pal1/2 乱色)
const palette = (
  JSON.parse(readFileSync(resolve(EXTRACTED, 'data/palette/0.json'), 'utf8')) as {
    colors: [number, number, number][]
  }
).colors

/** 读 indexed PNG(R=index)→ bakeIndexedRgba → 写真彩 RGBA PNG。 */
function bakeFile(src: string, dst: string): void {
  const png = PNG.sync.read(readFileSync(src))
  const out = new PNG({ width: png.width, height: png.height })
  out.data = Buffer.from(bakeIndexedRgba(png.data, palette))
  writeFileSync(dst, PNG.sync.write(out))
}

/** bake + 裁子区域 (sx,sy,sw,sh) → 写 PNG。用于把单行卷轴 / itembox 切成九宫格 tile。 */
function bakeSlice(src: string, dst: string, sx: number, sy: number, sw: number, sh: number): void {
  const png = PNG.sync.read(readFileSync(src))
  const baked = bakeIndexedRgba(png.data, palette)
  const out = new PNG({ width: sw, height: sh })
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = ((sy + y) * png.width + (sx + x)) * 4
      const di = (y * sw + x) * 4
      out.data[di] = baked[si] ?? 0
      out.data[di + 1] = baked[si + 1] ?? 0
      out.data[di + 2] = baked[si + 2] ?? 0
      out.data[di + 3] = baked[si + 3] ?? 0
    }
  }
  writeFileSync(dst, PNG.sync.write(out))
}

/** 读 PNG 尺寸(切片前算 band)。 */
function pngSize(src: string): { w: number; h: number } {
  const png = PNG.sync.read(readFileSync(src))
  return { w: png.width, h: png.height }
}

// 1) 头像(收编 bake-portraits):chunk 1/2(鬼话用;后续可扩到全 88)
mkdirSync(resolve(PUBLIC, 'portraits'), { recursive: true })
for (const chunk of [1, 2]) {
  bakeFile(
    resolve(EXTRACTED, `images/portraits/${String(chunk).padStart(2, '0')}.png`),
    resolve(PUBLIC, `portraits/${chunk}.png`),
  )
  console.log(`baked portrait ${chunk}`)
}

// 2) UI box 黄框九宫格 frame-00..08(menu design §4:gpSpriteUI i*3+j iStyle 0)
mkdirSync(resolve(PUBLIC, 'ui/box'), { recursive: true })
for (let i = 0; i <= 8; i++) {
  const name = `frame-${String(i).padStart(2, '0')}.png`
  bakeFile(resolve(EXTRACTED, `images/ui/${name}`), resolve(PUBLIC, `ui/box/${name}`))
  console.log(`baked ui box ${name}`)
}

// 3) 数字(黄,gpSpriteUI frame 19-28 = 数字 0-9;PAL_DrawNumber kNumColorYellow)
mkdirSync(resolve(PUBLIC, 'ui/num'), { recursive: true })
for (let d = 0; d <= 9; d++) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(19 + d).padStart(2, '0')}.png`),
    resolve(PUBLIC, `ui/num/${d}.png`),
  )
  console.log(`baked num ${d}`)
}

// 4) 卷轴 scroll(原「金钱框」frame 44/45/46 = 左/中/右单行卷轴;通用:金钱/否是确认/存档槽都用)。
//    重切九宫格 frame-00..08:每列(左44/中45/右46)纵向切 上边框 / 中段(纯色,平铺) / 下边框。
//    BoxTiles 索引 i*3+j(i 行 0上/1中/2下,j 列 0左/1中/2右)→ drawSlicedBox 撑任意高宽。
mkdirSync(resolve(PUBLIC, 'ui/scroll'), { recursive: true })
const SCROLL_BORDER = 4 // 上下边框各 4px(实测 frame 44/45/46:y0-3 上 / y30-33 下 / y4-29 中段纯色)
const scrollFrames = [44, 45, 46] // 左/中/右
scrollFrames.forEach((frame, j) => {
  const src = resolve(EXTRACTED, `images/ui/frame-${String(frame).padStart(2, '0')}.png`)
  const { h } = pngSize(src)
  const bands: [number, number][] = [
    [0, SCROLL_BORDER], // 上边框
    [SCROLL_BORDER, h - 2 * SCROLL_BORDER], // 中段(平铺)
    [h - SCROLL_BORDER, SCROLL_BORDER], // 下边框
  ]
  bands.forEach(([sy, sh], i) => {
    const idx = i * 3 + j
    const { w } = pngSize(src)
    bakeSlice(
      src,
      resolve(PUBLIC, `ui/scroll/frame-${String(idx).padStart(2, '0')}.png`),
      0,
      sy,
      w,
      sh,
    )
  })
})
console.log('baked scroll 9-slice (frame 00-08)')

// 5) 蓝数字(gpSpriteUI frame 29-38 = 0-9;PAL_DrawNumber kNumColorBlue,HP/MP 最大值)
mkdirSync(resolve(PUBLIC, 'ui/num-blue'), { recursive: true })
for (let d = 0; d <= 9; d++) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(29 + d).padStart(2, '0')}.png`),
    resolve(PUBLIC, `ui/num-blue/${d}.png`),
  )
}
console.log('baked num-blue 0-9')

// 5b) 青数字(gpSpriteUI frame 56-65 = 0-9;PAL_DrawNumber kNumColorCyan,exp 下一级)
mkdirSync(resolve(PUBLIC, 'ui/num-cyan'), { recursive: true })
for (let d = 0; d <= 9; d++) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(56 + d).padStart(2, '0')}.png`),
    resolve(PUBLIC, `ui/num-cyan/${d}.png`),
  )
}
console.log('baked num-cyan 0-9')

// 6) 斜杠(gpSpriteUI frame 39 = SPRITENUM_SLASH;HP/MP 当前/最大分隔)
bakeFile(resolve(EXTRACTED, 'images/ui/frame-39.png'), resolve(PUBLIC, 'ui/num/slash.png'))
console.log('baked slash')

// 7) 物品图标(按 bitmap chunk → ui/items/{bitmap}.png;状态板/装备菜单按 item.icon 数据驱动渲染)
mkdirSync(resolve(PUBLIC, 'ui/items'), { recursive: true })
const itemIconChunks = [56, 176, 78, 95, 97, 224, 6, 197, 30] // 木剑/头巾/布袍/披风/草鞋/护腕/土灵珠/观音符/茶叶蛋 的 bitmap(DEMO_ITEMS.icon)
for (const chunk of itemIconChunks) {
  bakeFile(
    resolve(EXTRACTED, `images/items/${String(chunk).padStart(3, '0')}.png`),
    resolve(PUBLIC, `ui/items/${chunk}.png`),
  )
}
console.log('baked item icons')

// 8) 仙术菜单 sprite:红框九宫格(gpSpriteUI 9-17 = iStyle1)+ PlayerInfoBox(18)+ face(48+roleId)+ cursor(67上/68下/69网格)
mkdirSync(resolve(PUBLIC, 'ui/box-red'), { recursive: true })
for (let i = 0; i <= 8; i++) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(9 + i).padStart(2, '0')}.png`),
    resolve(PUBLIC, `ui/box-red/frame-${String(i).padStart(2, '0')}.png`),
  )
}
mkdirSync(resolve(PUBLIC, 'ui/magic'), { recursive: true })
bakeFile(resolve(EXTRACTED, 'images/ui/frame-18.png'), resolve(PUBLIC, 'ui/magic/playerbox.png'))
bakeFile(resolve(EXTRACTED, 'images/ui/frame-48.png'), resolve(PUBLIC, 'ui/magic/face-0.png')) // 李逍遥 roleId 0
mkdirSync(resolve(PUBLIC, 'ui/cursor'), { recursive: true })
bakeFile(resolve(EXTRACTED, 'images/ui/frame-67.png'), resolve(PUBLIC, 'ui/cursor/up.png'))
bakeFile(resolve(EXTRACTED, 'images/ui/frame-68.png'), resolve(PUBLIC, 'ui/cursor/down.png'))
bakeFile(resolve(EXTRACTED, 'images/ui/frame-69.png'), resolve(PUBLIC, 'ui/cursor/grid.png'))
console.log('baked magic-menu sprites (red box / playerbox / face / cursor)')

// 9) 物品详情框 itembox(SPRITENUM_ITEMBOX 70)。重切九宫格 frame-00..08(角 8px)→ drawSlicedBox 任意尺寸;
//    64×64 处各区恰好 1 tile、无平铺 → 与原图逐像素一致;将来可扩宽高。
mkdirSync(resolve(PUBLIC, 'ui/itembox'), { recursive: true })
const ibSrc = resolve(EXTRACTED, 'images/ui/frame-70.png')
const IB = 8 // itembox 边框(角)
const ib = pngSize(ibSrc)
const ibColX = [0, IB, ib.w - IB]
const ibColW = [IB, ib.w - 2 * IB, IB]
const ibRowY = [0, IB, ib.h - IB]
const ibRowH = [IB, ib.h - 2 * IB, IB]
for (let i = 0; i < 3; i++) {
  const sy = ibRowY[i] ?? 0
  const sh = ibRowH[i] ?? 0
  for (let j = 0; j < 3; j++) {
    const sx = ibColX[j] ?? 0
    const sw = ibColW[j] ?? 0
    bakeSlice(
      ibSrc,
      resolve(PUBLIC, `ui/itembox/frame-${String(i * 3 + j).padStart(2, '0')}.png`),
      sx,
      sy,
      sw,
      sh,
    )
  }
}
console.log('baked itembox 9-slice (frame 00-08)')

console.log('done.')
