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

console.log('done.')
