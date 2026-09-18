/**
 * sprite blob 真值对拍:npc / battle / magic(资源管线优化 · 补 GLM 审查缺口)。
 *
 * 这四类 blob = gzip(喂给 parseSpriteChunk 的 chunk 字节)。故 `decompressGzip(blob)` 必须与
 * 「原版 MKF 对应 chunk(按需 YJ2 解压)」逐字节一致 —— 一致即保证 runtime parseSpriteChunk
 * 解出的帧与 extractor 端完全相同。
 *
 *   npc        : data/sprite/{id}.rle           vs decompressYj2(MGO.MKF[id])
 *   battle enemy: data/battle-sprite/enemy/{id}.rle vs tryYj2(ABC.MKF[id])
 *   battle player: data/battle-sprite/player/{id}.rle vs tryYj2(F.MKF[id])
 *   magic effect : data/magic/effect.rle        vs DATA.MKF[10](无 YJ2)
 *   magic fire   : data/magic/fire-{NN}.rle      vs tryYj2(FIRE.MKF[NN])
 *
 * 整组可选输入缺席时显式 skip；已提供输入组却缺文件/样本则失败。
 * 这里只定义本套件合同，不承诺整个仓库 check 在无 PAL 数据时通过。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decompressYj2, type Mkf, openMkf, parseSpriteChunk, readChunk } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { decompressGzip } from './tileset-blob.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../..')
const RAW = resolve(REPO_ROOT, 'data/raw')
const EXT = resolve(REPO_ROOT, 'data/extracted/data')

const hasData = existsSync(RAW) && existsSync(EXT)

/** extractor 的「try YJ2,失败回 raw」语义(battle/fire 个别 chunk 可能未压缩)。 */
function tryYj2(raw: Uint8Array): Uint8Array {
  try {
    return decompressYj2(raw)
  } catch {
    return raw
  }
}

function openRaw(name: string): Mkf {
  return openMkf(new Uint8Array(readFileSync(resolve(RAW, name))))
}

/** 输入组已提供时，每一类样本必须非空，不能用零次循环冒充验证通过。 */
function sampleBlobs(dir: string, n: number, prefix = ''): string[] {
  expect(existsSync(dir), `缺少对拍样本目录: ${dir}`).toBe(true)
  const blobs = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.rle'))
    .sort()
    .slice(0, n)
  expect(blobs.length, `对拍样本为空: ${dir}/${prefix}*.rle`).toBeGreaterThan(0)
  return blobs
}

/** 对拍核心:decompressGzip(blob) 逐字节 == 真值 chunk。 */
async function assertBlobBytes(blobPath: string, truthChunk: Uint8Array): Promise<void> {
  const blobBytes = new Uint8Array(readFileSync(blobPath))
  expect(blobBytes[0]).toBe(0x1f) // gzip 魔数
  expect(blobBytes[1]).toBe(0x8b)
  const decompressed = await decompressGzip(new Blob([Buffer.from(blobBytes)]))
  expect(decompressed.byteLength).toBe(truthChunk.byteLength)
  // 逐字节比较(转 string 对比避免逐元素 expect 噪声)
  let diffs = 0
  for (let i = 0; i < truthChunk.byteLength; i++) if (decompressed[i] !== truthChunk[i]) diffs++
  expect(diffs).toBe(0)
  // 二次保险:解出的帧数一致
  expect(parseSpriteChunk(decompressed).length).toBe(parseSpriteChunk(truthChunk).length)
}

describe.skipIf(!hasData)('sprite blob 真值对拍(npc / battle / magic)', () => {
  it('npc: data/sprite/{id}.rle == decompressYj2(MGO.MKF[id])', async () => {
    const mgo = openRaw('MGO.MKF')
    const dir = resolve(EXT, 'sprite')
    const blobs = sampleBlobs(dir, 5)
    expect(blobs.length).toBeGreaterThan(0)
    for (const f of blobs) {
      const id = Number(f.replace('.rle', ''))
      await assertBlobBytes(resolve(dir, f), decompressYj2(readChunk(mgo, id)))
    }
  })

  it('battle enemy: data/battle-sprite/enemy/{id}.rle == tryYj2(ABC.MKF[id])', async () => {
    const abc = openRaw('ABC.MKF')
    const dir = resolve(EXT, 'battle-sprite', 'enemy')
    for (const f of sampleBlobs(dir, 4)) {
      const id = Number(f.replace('.rle', ''))
      await assertBlobBytes(resolve(dir, f), tryYj2(readChunk(abc, id)))
    }
  })

  it('battle player: data/battle-sprite/player/{id}.rle == tryYj2(F.MKF[id])', async () => {
    const fmkf = openRaw('F.MKF')
    const dir = resolve(EXT, 'battle-sprite', 'player')
    for (const f of sampleBlobs(dir, 4)) {
      const id = Number(f.replace('.rle', ''))
      await assertBlobBytes(resolve(dir, f), tryYj2(readChunk(fmkf, id)))
    }
  })

  it('magic effect: data/magic/effect.rle == DATA.MKF[10]', async () => {
    const effPath = resolve(EXT, 'magic', 'effect.rle')
    expect(existsSync(effPath), `缺少对拍样本: ${effPath}`).toBe(true)
    const data = openRaw('DATA.MKF')
    await assertBlobBytes(effPath, readChunk(data, 10))
  })

  it('magic fire: data/magic/fire-{NN}.rle == tryYj2(FIRE.MKF[NN])', async () => {
    const fire = openRaw('FIRE.MKF')
    const dir = resolve(EXT, 'magic')
    const blobs = sampleBlobs(dir, 4, 'fire-')
    for (const f of blobs) {
      const n = Number(f.replace('fire-', '').replace('.rle', ''))
      await assertBlobBytes(resolve(dir, f), tryYj2(readChunk(fire, n)))
    }
  })
})

if (!hasData) {
  console.warn('[sprite-blob-snapshot skip] data/raw 或 data/extracted 缺失')
}
