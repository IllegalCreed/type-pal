/** 一次性:把 FBP chunk(indexed battle bg PNG)套 palette 0 上色 → 真彩 PNG,供肉眼看 / 定裁剪坐标。
 *  跑:pnpm --filter @type-pal/migrate exec tsx scripts/preview-fbp.mts <chunkId> <out.png> */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { bakeIndexedRgba } from '../src/bake-indexed-rgba.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const EXTRACTED = resolve(ROOT, 'data/extracted')
const palette = (
  JSON.parse(readFileSync(resolve(EXTRACTED, 'data/palette/0.json'), 'utf8')) as {
    colors: [number, number, number][]
  }
).colors

const chunkId = Number(process.argv[2] ?? 1)
const dst = process.argv[3] ?? resolve(ROOT, 'fbp-preview.png')
const src = resolve(EXTRACTED, 'images/battle/bg', `${String(chunkId).padStart(3, '0')}.png`)
const png = PNG.sync.read(readFileSync(src))
const out = new PNG({ width: png.width, height: png.height })
out.data = Buffer.from(bakeIndexedRgba(png.data, palette))
writeFileSync(dst, PNG.sync.write(out))
console.log(`baked FBP chunk ${chunkId} (${png.width}x${png.height}) → ${dst}`)
