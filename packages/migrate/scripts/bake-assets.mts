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

// 4) 金钱横卷轴(gpSpriteUI frame 44/45/46 = 左/中/右;PAL_CreateSingleLineBox)
mkdirSync(resolve(PUBLIC, 'ui/cashbox'), { recursive: true })
const cashFrames: [number, string][] = [
  [44, 'left'],
  [45, 'mid'],
  [46, 'right'],
]
for (const [frame, name] of cashFrames) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(frame).padStart(2, '0')}.png`),
    resolve(PUBLIC, `ui/cashbox/${name}.png`),
  )
  console.log(`baked cashbox ${name}`)
}

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
const itemIconChunks = [56, 176, 78, 95, 97, 224, 6] // 木剑/头巾/布袍/披风/草鞋/护腕/土灵珠 的 bitmap(DEMO_ITEMS.icon)
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

// 9) 物品详情框(SPRITENUM_ITEMBOX 70;物品/装备列表底部选中物图标框)
bakeFile(resolve(EXTRACTED, 'images/ui/frame-70.png'), resolve(PUBLIC, 'ui/itembox.png'))
console.log('baked itembox')

console.log('done.')
