/**
 * Reforge engine chrome 生成器：PAL indexed PNG + palette 0 → bundler-owned RGBA PNG。
 * 工程内容图像不在这里生成；portrait/face/item-icon/battle-background 由 migrate-content
 * 直接从 extracted 源写入项目 catalog。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSpriteChunk } from '@type-pal/shared'
import { PNG } from 'pngjs'
import { bakeIndexedRgba } from '../src/bake-indexed-rgba.js'
import { assertMigrationFilePath } from '../src/migration-path.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const EXTRACTED = resolve(ROOT, 'data/extracted')
const CHROME = resolve(ROOT, 'packages/reforge/src/engine-chrome/assets')
const UI = resolve(CHROME, 'ui')
const pendingAssets = new Map<string, Buffer>()

const palette = (
  JSON.parse(readFileSync(resolve(EXTRACTED, 'data/palette/0.json'), 'utf8')) as {
    colors: [number, number, number][]
  }
).colors

function readBakedImage(src: string): PNG {
  const png = PNG.sync.read(readFileSync(src))
  const out = new PNG({ width: png.width, height: png.height })
  out.data = Buffer.from(bakeIndexedRgba(png.data, palette))
  return out
}

function bakeFile(src: string, dst: string): void {
  pendingAssets.set(dst, PNG.sync.write(readBakedImage(src)))
}

function bakeSlice(png: PNG, dst: string, sx: number, sy: number, sw: number, sh: number): void {
  const out = new PNG({ width: sw, height: sh })
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const source = ((sy + y) * png.width + (sx + x)) * 4
      const target = (y * sw + x) * 4
      out.data[target] = png.data[source] ?? 0
      out.data[target + 1] = png.data[source + 1] ?? 0
      out.data[target + 2] = png.data[source + 2] ?? 0
      out.data[target + 3] = png.data[source + 3] ?? 0
    }
  }
  pendingAssets.set(dst, PNG.sync.write(out))
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function assertChromePath(path: string): string {
  return assertMigrationFilePath(
    ROOT,
    relative(ROOT, path).split(sep).join('/'),
    'engine chrome 输出',
  )
}

function readDialogIcons(path: string): string {
  const raw = readFileSync(path, 'utf8').trimEnd()
  try {
    const entry: unknown = JSON.parse(raw)
    if (!entry || typeof entry !== 'object') throw new Error('期望光标数据对象')
    const base64: unknown = Object.getOwnPropertyDescriptor(entry, 'base64')?.value
    const size: unknown = Object.getOwnPropertyDescriptor(entry, 'size')?.value
    if (typeof base64 !== 'string') throw new Error('缺少 base64 光标数据')
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    if (size !== bytes.byteLength)
      throw new Error(`光标长度不匹配，实际为 ${bytes.byteLength} 字节`)
    if (parseSpriteChunk(bytes).length === 0) throw new Error('光标没有可解码的帧')
  } catch (cause) {
    throw new Error(`engine chrome 对话光标数据无效: ${path}`, { cause })
  }
  return `${raw}\n`
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
  const src = readBakedImage(resolve(EXTRACTED, `images/ui/frame-${frame}.png`))
  const { width, height } = src
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
const itemSource = readBakedImage(resolve(EXTRACTED, 'images/ui/frame-70.png'))
const itemBorder = 8
const xs = [0, itemBorder, itemSource.width - itemBorder]
const widths = [itemBorder, itemSource.width - itemBorder * 2, itemBorder]
const ys = [0, itemBorder, itemSource.height - itemBorder]
const heights = [itemBorder, itemSource.height - itemBorder * 2, itemBorder]
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
  const actual = sha256(readFileSync(assertChromePath(resolve(UI, name))))
  if (actual !== expected)
    throw new Error(`engine chrome 作者 seed ${name} hash 漂移:${actual}，期望 ${expected}`)
}

// 当前默认标题(FBP2)与 DATA chunk12 对话光标均属于 engine chrome。
bakeFile(resolve(EXTRACTED, 'images/battle/bg/002.png'), resolve(CHROME, 'title.png'))
pendingAssets.set(
  resolve(CHROME, 'dialog-icons-raw.json'),
  Buffer.from(readDialogIcons(resolve(EXTRACTED, 'data/dialog-icons-raw.json'))),
)

// Check every destination before the first write, including absent groups to be rebuilt.
for (const path of pendingAssets.keys()) assertChromePath(path)

// Measure the exact post-bake UI, including author seeds and any existing extra PNGs.
const uiFiles = [...new Set([...listFiles(UI), ...pendingAssets.keys()])]
  .filter((path) => path.startsWith(`${UI}${sep}`) && path.endsWith('.png'))
  .sort()
let uiBytes = 0
const uiDigest = createHash('sha256')
for (const path of uiFiles) {
  const bytes = pendingAssets.get(path) ?? readFileSync(assertChromePath(path))
  uiBytes += bytes.length
  uiDigest.update(`${sha256(bytes)}  ${relative(UI, path).split(sep).join('/')}\n`)
}
const digest = uiDigest.digest('hex')
if (
  uiFiles.length !== 85 ||
  uiBytes !== 48_629 ||
  digest !== '5e5315f85945b35e9df2ae3a205d0d6fcd4faaa524c12082b6ba91ff55888485'
)
  throw new Error(
    `engine chrome UI 冻结基线漂移:files=${uiFiles.length}, bytes=${uiBytes}, sha256=${digest}`,
  )

for (const [path, bytes] of pendingAssets) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, bytes)
}

console.log('baked Reforge engine chrome (85 UI / 48,629 B + default title + dialog cursor)')
