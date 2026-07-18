/**
 * Reforge engine chrome 生成器：PAL indexed PNG + palette 0 → bundler-owned RGBA PNG。
 * 工程内容图像不在这里生成；portrait/face/item-icon/battle-background 由 migrate-content
 * 直接从 extracted 源写入项目 catalog。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { bakeIndexedRgba } from '../src/bake-indexed-rgba.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const EXTRACTED = resolve(ROOT, 'data/extracted')
const CHROME = resolve(ROOT, 'packages/reforge/src/engine-chrome/assets')
const UI = resolve(CHROME, 'ui')

const palette = (
  JSON.parse(readFileSync(resolve(EXTRACTED, 'data/palette/0.json'), 'utf8')) as {
    colors: [number, number, number][]
  }
).colors

function bakeFile(src: string, dst: string): void {
  const png = PNG.sync.read(readFileSync(src))
  const out = new PNG({ width: png.width, height: png.height })
  out.data = Buffer.from(bakeIndexedRgba(png.data, palette))
  mkdirSync(dirname(dst), { recursive: true })
  writeFileSync(dst, PNG.sync.write(out))
}

function bakeSlice(src: string, dst: string, sx: number, sy: number, sw: number, sh: number): void {
  const png = PNG.sync.read(readFileSync(src))
  const baked = bakeIndexedRgba(png.data, palette)
  const out = new PNG({ width: sw, height: sh })
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const source = ((sy + y) * png.width + (sx + x)) * 4
      const target = (y * sw + x) * 4
      out.data[target] = baked[source] ?? 0
      out.data[target + 1] = baked[source + 1] ?? 0
      out.data[target + 2] = baked[source + 2] ?? 0
      out.data[target + 3] = baked[source + 3] ?? 0
    }
  }
  mkdirSync(dirname(dst), { recursive: true })
  writeFileSync(dst, PNG.sync.write(out))
}

function pngSize(src: string): { width: number; height: number } {
  const png = PNG.sync.read(readFileSync(src))
  return { width: png.width, height: png.height }
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function listFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(root, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    })
    .sort()
}

// 黄框/红框九宫格。
for (let i = 0; i <= 8; i++) {
  const name = `frame-${String(i).padStart(2, '0')}.png`
  bakeFile(resolve(EXTRACTED, `images/ui/${name}`), resolve(UI, `box/${name}`))
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(9 + i).padStart(2, '0')}.png`),
    resolve(UI, `box-red/${name}`),
  )
}

// 黄/蓝/青数字和斜杠。
for (let digit = 0; digit <= 9; digit++) {
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(19 + digit).padStart(2, '0')}.png`),
    resolve(UI, `num/${digit}.png`),
  )
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(29 + digit).padStart(2, '0')}.png`),
    resolve(UI, `num-blue/${digit}.png`),
  )
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${String(56 + digit).padStart(2, '0')}.png`),
    resolve(UI, `num-cyan/${digit}.png`),
  )
}
bakeFile(resolve(EXTRACTED, 'images/ui/frame-39.png'), resolve(UI, 'num/slash.png'))

// 单行卷轴 44/45/46 → 可伸缩九宫格。
const scrollBorder = 4
;[44, 45, 46].forEach((frame, column) => {
  const src = resolve(EXTRACTED, `images/ui/frame-${frame}.png`)
  const { width, height } = pngSize(src)
  const bands: [number, number][] = [
    [0, scrollBorder],
    [scrollBorder, height - scrollBorder * 2],
    [height - scrollBorder, scrollBorder],
  ]
  bands.forEach(([sy, sh], row) => {
    bakeSlice(
      src,
      resolve(UI, `scroll/frame-${String(row * 3 + column).padStart(2, '0')}.png`),
      0,
      sy,
      width,
      sh,
    )
  })
})

// 通用光标、仙术面板和战斗主按钮。
bakeFile(resolve(EXTRACTED, 'images/ui/frame-18.png'), resolve(UI, 'magic/playerbox.png'))
for (const [frame, name] of [
  [66, 'up-red'],
  [67, 'up'],
  [68, 'down'],
  [69, 'grid'],
  [47, 'settle-arrow'],
] as const)
  bakeFile(resolve(EXTRACTED, `images/ui/frame-${frame}.png`), resolve(UI, `cursor/${name}.png`))
for (const [index, name] of ['attack', 'magic', 'coop', 'misc'].entries())
  bakeFile(
    resolve(EXTRACTED, `images/ui/frame-${40 + index}.png`),
    resolve(UI, `battle/icon-${name}.png`),
  )

// 物品详情 frame 70 → 九宫格。
const itemSource = resolve(EXTRACTED, 'images/ui/frame-70.png')
const itemBorder = 8
const itemSize = pngSize(itemSource)
const xs = [0, itemBorder, itemSize.width - itemBorder]
const widths = [itemBorder, itemSize.width - itemBorder * 2, itemBorder]
const ys = [0, itemBorder, itemSize.height - itemBorder]
const heights = [itemBorder, itemSize.height - itemBorder * 2, itemBorder]
for (let row = 0; row < 3; row++)
  for (let column = 0; column < 3; column++)
    bakeSlice(
      itemSource,
      resolve(UI, `itembox/frame-${String(row * 3 + column).padStart(2, '0')}.png`),
      xs[column] ?? 0,
      ys[row] ?? 0,
      widths[column] ?? 0,
      heights[row] ?? 0,
    )

// 状态页的 6 张历史装备示例属于已发布 chrome 槽位，仍从原物品 sprite 确定性生成。
for (const [chunk, slot] of [
  [56, 'weapon'],
  [176, 'head'],
  [78, 'body'],
  [97, 'feet'],
  [224, 'accessory'],
  [95, 'amulet'],
] as const)
  bakeFile(
    resolve(EXTRACTED, `images/items/${String(chunk).padStart(3, '0')}.png`),
    resolve(UI, `status/equip-demo/${slot}.png`),
  )

// 两张作者制作的状态页 seed 没有提取源；冻结来源 commit 与 hash，缺失/漂移都必须显式处理。
for (const [name, expected] of [
  ['status/bg.png', '345e53a445569f2addb8528c6e99cd1301342117543639fa35e58ce2db27ede2'],
  ['status/slot.png', '0fe3ab3527c3d7018c0fd84e50931b9c0d6983b8df915414c0f2dc5294285bd2'],
] as const) {
  const actual = sha256(readFileSync(resolve(UI, name)))
  if (actual !== expected)
    throw new Error(`engine chrome 作者 seed ${name} hash 漂移:${actual}，期望 ${expected}`)
}

// 当前默认标题(FBP2)与 DATA chunk12 对话光标均属于 engine chrome。
bakeFile(resolve(EXTRACTED, 'images/battle/bg/002.png'), resolve(CHROME, 'title.png'))
writeFileSync(
  resolve(CHROME, 'dialog-icons-raw.json'),
  `${readFileSync(resolve(EXTRACTED, 'data/dialog-icons-raw.json'), 'utf8').trimEnd()}\n`,
)

const uiFiles = listFiles(UI).filter((path) => path.endsWith('.png'))
const uiBytes = uiFiles.reduce((sum, path) => sum + statSync(path).size, 0)
const uiDigest = sha256(
  uiFiles
    .map((path) => `${sha256(readFileSync(path))}  ${relative(UI, path).split(sep).join('/')}\n`)
    .join(''),
)
if (
  uiFiles.length !== 85 ||
  uiBytes !== 48_629 ||
  uiDigest !== '5e5315f85945b35e9df2ae3a205d0d6fcd4faaa524c12082b6ba91ff55888485'
)
  throw new Error(
    `engine chrome UI 冻结基线漂移:files=${uiFiles.length}, bytes=${uiBytes}, sha256=${uiDigest}`,
  )

console.log('baked Reforge engine chrome (85 UI / 48,629 B + default title + dialog cursor)')
