#!/usr/bin/env node
// 生成 data/baked/baked-manifest.json —— 克隆自包含工程时枚举 baked 素材(portraits/ui)。
// 格式对齐 pal-extract 的 asset-manifest.json(path 相对 data/baked;version=sha256(path:size) 前16)。
// ⚠ 临时落点:baked 由 migrate `bake` 产出,本清单**应折进 bake pipeline** 一起再生(P4 后续)。
// 现状:bake 后手动 `node scripts/gen-baked-manifest.mjs`。
import { createHash } from 'node:crypto'
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = 'data/baked'
const SELF = 'baked-manifest.json'

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full)
    } else if (name !== '.DS_Store' && name !== SELF) {
      files.push({ path: relative(ROOT, full).split('\\').join('/'), size: statSync(full).size })
    }
  }
}
walk(ROOT)
files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

const hash = createHash('sha256')
let totalBytes = 0
for (const f of files) {
  hash.update(`${f.path}:${f.size}\n`)
  totalBytes += f.size
}
const manifest = { version: hash.digest('hex').slice(0, 16), totalBytes, fileCount: files.length, files }
writeFileSync(join(ROOT, SELF), JSON.stringify(manifest))
console.log(`baked-manifest: ${files.length} 文件, ${totalBytes} 字节 → ${ROOT}/${SELF}`)
