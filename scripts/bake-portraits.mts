/**
 * 第二阶段迁移脚本(阶段 A):头像 indexed PNG + palette → RGBA PNG。
 * 读 pal-extract 产物 data/extracted,烘成 reforge 运行时直接 drawImage 的 RGBA。
 * 一次性迁移:鬼话用的 chunk 1/2 先烘(后续可扩到全 88 个)。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const palette = JSON.parse(readFileSync('data/extracted/data/palette/0.json', 'utf8')).colors as [
  number,
  number,
  number,
][]
const CHUNKS = [1, 2] // 鬼话用的;后续可扩到全 88 个
mkdirSync('packages/reforge/public/portraits', { recursive: true })

for (const chunk of CHUNKS) {
  const src = PNG.sync.read(
    readFileSync(`data/extracted/images/portraits/${String(chunk).padStart(2, '0')}.png`),
  )
  const out = new PNG({ width: src.width, height: src.height })
  for (let i = 0; i < src.width * src.height; i++) {
    const r = src.data[i * 4]
    const a = src.data[i * 4 + 3]
    if (a > 0) {
      // 不透明像素:index(R=G=B)→ palette 真彩
      const c = palette[r] ?? [0, 0, 0]
      out.data[i * 4] = c[0]
      out.data[i * 4 + 1] = c[1]
      out.data[i * 4 + 2] = c[2]
      out.data[i * 4 + 3] = 255
    }
    // 透明像素(A=0)保持透明(默认 0)
  }
  writeFileSync(`packages/reforge/public/portraits/${chunk}.png`, PNG.sync.write(out))
  console.log(`baked portrait ${chunk} → RGBA`)
}
