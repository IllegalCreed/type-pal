/**
 * ARCH-REGRESSION-LAB-GLM-1 · V04 隔离 fixture 生成器（一次性工具测试，非候选）。
 *
 * 输出：/tmp/type-pal-glm-lab-r2/v4-fixture/**（{rel: bytes} 文件集，manifest id=lab-v4）。
 * 内容：buildBlankProject 正式种子核 + 1 个镜像世界精灵（复用种子 RLE 字节、超长 label）
 *       + 2 个 item-icon PNG（本文件内置最小 PNG 编码器，字节确定）。
 *       另附 icon-blue-v2.png 替换字节（宿主侧 revision 刷新用）。
 * 正控：目录登记 bytes/sha256 必须与真实字节一致（node 端先验；浏览器端解码由 V04 用例证）。
 * 运行：npx vitest run --config docs/testing/glm-architecture-regression-lab/tools/fixture/fixture-gen.config.mts
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { buildBlankProject } from '@lab/editor/seed'
import { expect, test } from 'vitest'

const OUT_DIR = process.env.LAB_V4_OUT ?? '/tmp/type-pal-glm-lab-r2/v4-fixture'

// ── 最小 PNG 编码器（RGBA，filter 0；zlib deflate；CRC32 自带）──
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(typeBytes, 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(new Uint8Array([...typeBytes, ...data])))
  return out
}

/** 确定性 RGBA → PNG 字节。 */
function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter none
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  }
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const body = deflateSync(raw, { level: 9 })
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const chunks = [
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', new Uint8Array(body)),
    pngChunk('IEND', new Uint8Array(0)),
  ]
  const total = signature.length + chunks.reduce((sum, c) => sum + c.length, 0)
  const png = new Uint8Array(total)
  png.set(signature, 0)
  let offset = signature.length
  for (const chunk of chunks) {
    png.set(chunk, offset)
    offset += chunk.length
  }
  return png
}

/** 图 A：24×24 蓝底红边 item-icon（替换前）。 */
function iconBlueV1(): Uint8Array {
  const w = 24
  const h = 24
  const rgba = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      const border = x < 3 || x >= w - 3 || y < 3 || y >= h - 3
      rgba[o] = border ? 200 : 40
      rgba[o + 1] = border ? 40 : 60
      rgba[o + 2] = border ? 48 : 200
      rgba[o + 3] = 255
    }
  }
  return encodePng(w, h, rgba)
}

/** 替换字节：24×24 绿底黄点（与 v1 明显不同，尺寸同）。 */
function iconBlueV2(): Uint8Array {
  const w = 24
  const h = 24
  const rgba = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      const dot = (x - 12) ** 2 + (y - 12) ** 2 < 25
      rgba[o] = dot ? 240 : 30
      rgba[o + 1] = dot ? 220 : 160
      rgba[o + 2] = dot ? 60 : 40
      rgba[o + 3] = 255
    }
  }
  return encodePng(w, h, rgba)
}

/** 图 B：320×240 水平渐变 item-icon（fit/1:1 缩放用 + 超长 label）。 */
function iconWideGradient(): Uint8Array {
  const w = 320
  const h = 240
  const rgba = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      rgba[o] = Math.round((x / w) * 255)
      rgba[o + 1] = Math.round((y / h) * 255)
      rgba[o + 2] = 128
      rgba[o + 3] = 255
    }
  }
  return encodePng(w, h, rgba)
}

async function sha256Hex(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

test('生成 lab-v4 隔离 fixture 并先验 catalog bytes/sha256', async () => {
  const fileset = await buildBlankProject('lab-v4')

  // ── 追加镜像世界精灵（复用种子 RLE 字节 → 独立 asset id/路径/目录记录）──
  const spritePath = 'assets/generated/sprites/starter.rle'
  const mirrorBytes = fileset[spritePath]
  expect(mirrorBytes).toBeInstanceOf(ArrayBuffer)
  const mirrorAssetId = 'sprite.lab.mirror'
  const mirrorRel = 'assets/generated/sprites/mirror.rle'
  const mirrorSha = await sha256Hex(mirrorBytes as ArrayBuffer)
  const sprites = fileset['content/sprites.json'] as Array<Record<string, unknown>>
  sprites.push({
    id: 'mirror-sprite',
    asset: mirrorAssetId,
    label: '镜像占位主角·超长名称侧栏滚动测试用镜像精灵条目名称特别长以至于需要滚动',
    layout: { kind: 'directional', framesPerDir: 3 },
  })

  // ── 追加两个 item-icon PNG（正式 import 管线同构：PNG 原样入库 + sha 目录记录）──
  const iconA = iconBlueV1()
  const iconB = iconWideGradient()
  const iconASha = await sha256Hex(iconA)
  const iconBSha = await sha256Hex(iconB)
  const iconARecord = {
    kind: 'item-icon',
    path: `assets/authored/item-icon/${iconASha}.png`,
    mediaType: 'image/png',
    bytes: iconA.byteLength,
    sha256: iconASha,
    label: 'LAB 图标·蓝',
    origin: { kind: 'authored', ref: 'lab-icon-blue-v1.png' },
  }
  const iconBRecord = {
    kind: 'item-icon',
    path: `assets/authored/item-icon/${iconBSha}.png`,
    mediaType: 'image/png',
    bytes: iconB.byteLength,
    sha256: iconBSha,
    label: 'LAB 渐变宽图·超长名称侧栏滚动测试条目名称特别长以至于列表必须滚动才能看完',
    origin: { kind: 'authored', ref: 'lab-icon-wide-gradient.png' },
  }

  const catalog = fileset['assets/index.json'] as {
    version: number
    assets: Record<string, Record<string, unknown>>
  }
  catalog.assets[mirrorAssetId] = {
    kind: 'sprite',
    path: mirrorRel,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: (mirrorBytes as ArrayBuffer).byteLength,
    sha256: mirrorSha,
    label: '镜像占位主角',
    origin: { kind: 'generated' },
  }
  catalog.assets['item-icon.lab.blue'] = iconARecord
  catalog.assets['item-icon.lab.wide'] = iconBRecord
  fileset[iconARecord.path as string] = iconA
  fileset[iconBRecord.path as string] = iconB
  fileset[mirrorRel] = mirrorBytes

  // 追加 8 个确定色调方块图标（撑出侧栏滚动，长度可控）
  const extraHues = [8, 30, 55, 95, 150, 185, 220, 275]
  for (const [index, hue] of extraHues.entries()) {
    const size = 20 + index * 2
    const rgba = new Uint8Array(size * size * 4)
    for (let pixel = 0; pixel < size * size; pixel++) {
      const o = pixel * 4
      rgba[o] = (hue * 3) % 256
      rgba[o + 1] = (hue * 7) % 256
      rgba[o + 2] = (hue * 11) % 256
      rgba[o + 3] = 255
    }
    const png = encodePng(size, size, rgba)
    const sha = await sha256Hex(png)
    const record = {
      kind: 'item-icon',
      path: `assets/authored/item-icon/${sha}.png`,
      mediaType: 'image/png',
      bytes: png.byteLength,
      sha256: sha,
      label: `LAB 色样 ${String(index + 1).padStart(2, '0')}（${size}×${size}）`,
      origin: { kind: 'authored', ref: `lab-swatch-${index + 1}.png` },
    }
    catalog.assets[`item-icon.lab.swatch${index + 1}`] = record
    fileset[record.path as string] = png
  }

  // ── 落盘 /tmp（不进仓）──
  const files: Record<string, ArrayBuffer | Uint8Array | string> = {}
  for (const [rel, value] of Object.entries(fileset)) {
    files[rel] =
      value instanceof ArrayBuffer || value instanceof Uint8Array
        ? (value as ArrayBuffer | Uint8Array)
        : // JSON 值统一按 seed 序列化口径：2 空格缩进 + 单个结尾换行（色盘 catalog sha 按此字节计算）
          `${JSON.stringify(value, null, 2)}\n`
  }
  const replacement = iconBlueV2()
  files['__lab__/icon-blue-v2.png'] = replacement // 宿主侧替换源（非工程闭包内文件，宿主启动时剔除）
  const written: Record<string, number | string> = {}
  for (const [rel, value] of Object.entries(files)) {
    const abs = join(OUT_DIR, rel)
    mkdirSync(dirname(abs), { recursive: true })
    if (typeof value === 'string') {
      writeFileSync(abs, value, 'utf8')
      written[rel] = 'json'
    } else {
      writeFileSync(abs, new Uint8Array(value as ArrayBuffer))
      written[rel] = (value as ArrayBuffer).byteLength
    }
  }
  writeFileSync(
    join(OUT_DIR, '__lab__/manifest-summary.json'),
    JSON.stringify(
      {
        id: 'lab-v4',
        mirrorAsset: {
          id: mirrorAssetId,
          rel: mirrorRel,
          sha256: mirrorSha,
          bytes: (mirrorBytes as ArrayBuffer).byteLength,
        },
        iconBlue: {
          id: 'item-icon.lab.blue',
          rel: iconARecord.path,
          sha256: iconASha,
          bytes: iconA.byteLength,
        },
        iconWide: {
          id: 'item-icon.lab.wide',
          rel: iconBRecord.path,
          sha256: iconBSha,
          bytes: iconB.byteLength,
        },
        replacementSha: await sha256Hex(replacement.slice().buffer as ArrayBuffer),
        fileCount: Object.keys(written).length,
      },
      null,
      2,
    ),
    'utf8',
  )

  // ── node 端目录正控：目录登记与真实字节 bytes/sha256 一致（二进制严格；JSON 按序列化口径）──
  for (const [assetId, record] of Object.entries(catalog.assets)) {
    const rel = record.path as string
    const value = files[rel]
    expect(value, `asset ${assetId} 字节缺失`).toBeDefined()
    if (typeof value === 'string') {
      const text = new TextEncoder().encode(value)
      expect(await sha256Hex(text), `asset ${assetId} sha256 不符`).toBe(record.sha256)
      expect(text.byteLength, `asset ${assetId} bytes 不符`).toBe(record.bytes)
    } else {
      expect(await sha256Hex(value as ArrayBuffer), `asset ${assetId} sha256 不符`).toBe(
        record.sha256,
      )
      expect((value as ArrayBuffer | Uint8Array).byteLength, `asset ${assetId} bytes 不符`).toBe(
        record.bytes,
      )
    }
  }
})
