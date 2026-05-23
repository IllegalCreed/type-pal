import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from './mkf.js'
import { decompressYj2 } from './yj2.js'

// 1998 柔情版 = Win9x = YJ2 解压。MGO.MKF / FBP.MKF / F.MKF / FIRE.MKF / PAT.MKF 等
// 的 chunk 多为 YJ2 压缩;DATA.MKF / SSS.MKF / MAP.MKF / M.MSG / WORD.DAT 是裸数据。
// 参考 sdlpal global.c:202(Decompress 函数指针选择)。

const MGO_MKF = resolve(__dirname, '../../../../data/raw/MGO.MKF')

describe('yj2', () => {
  it('decompressYj2 能解 MGO.MKF chunk 1(非空 + 长度 = 头声明)', () => {
    const buf = new Uint8Array(readFileSync(MGO_MKF))
    const mkf = openMkf(buf)
    const chunk = readChunk(mkf, 1)
    const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    const declaredLen = view.getUint32(0, true)
    expect(declaredLen).toBeGreaterThan(0)

    const out = decompressYj2(chunk)
    expect(out.byteLength).toBe(declaredLen)
  })

  it('能批量解 MGO.MKF 前 20 个非空 chunk(没有崩 / 长度匹配)', () => {
    const buf = new Uint8Array(readFileSync(MGO_MKF))
    const mkf = openMkf(buf)
    let ok = 0
    for (let i = 1; i < 21; i++) {
      const chunk = readChunk(mkf, i)
      if (chunk.byteLength < 4) continue
      const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
      const declaredLen = view.getUint32(0, true)
      if (declaredLen === 0 || declaredLen > 320 * 200 * 2) continue // 异常 chunk 跳过
      const out = decompressYj2(chunk)
      expect(out.byteLength).toBe(declaredLen)
      ok++
    }
    expect(ok).toBeGreaterThan(5)
  })
})
