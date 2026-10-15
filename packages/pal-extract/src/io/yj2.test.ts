import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { chunkCount, openMkf, readChunk } from './mkf.js'
import { decompressYj2 } from './yj2.js'

// Win9x 的 MAP/MGO/F/FBP 等资源由 caller 指定 YJ2 解压；DATA/SSS/PAT 表直接读取。
// 此 oracle 来自 CODE2b 复审中未改 SDLPal YJ2_Decompress 的 native 输出，非 TS 回算。
// Digest 输入逐 chunk 为 index u32LE + output length u32LE + 完整解压字节，按 1..20 顺序。
// 原函数/输入 SHA 与生成步骤见 docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/2b/native-proof.json。
const MGO_MKF = resolve(__dirname, '../../../../data/raw/MGO.MKF')
const MGO_FIRST_20_NATIVE_DIGEST =
  'a11bddbf05f34665269fe77d72411c28db45b44878d0ab8ead36d13aa5f924c1'

describe('yj2', () => {
  it('MGO.MKF 前20个chunk的完整输出与独立SDLPal字节oracle一致', () => {
    const mkf = openMkf(new Uint8Array(readFileSync(MGO_MKF)))
    expect(chunkCount(mkf)).toBeGreaterThan(20)
    const hash = createHash('sha256')
    for (let index = 1; index <= 20; index++) {
      const chunk = readChunk(mkf, index)
      expect(chunk.byteLength).toBeGreaterThan(4)
      const output = decompressYj2(chunk)
      const header = Buffer.alloc(8)
      header.writeUInt32LE(index, 0)
      header.writeUInt32LE(output.byteLength, 4)
      hash.update(header)
      hash.update(output)
    }
    expect(hash.digest('hex')).toBe(MGO_FIRST_20_NATIVE_DIGEST)
  })
})
