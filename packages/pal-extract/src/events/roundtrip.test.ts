import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { roundtripCheck } from './roundtrip.js'

const SSS_MKF = resolve(__dirname, '../../../../data/raw/SSS.MKF')
const M_MSG = resolve(__dirname, '../../../../data/raw/M.MSG')

describe('全量 events round-trip', () => {
  it('真实 SSS.MKF chunk 4 字节完全一致', () => {
    const sssBuf = new Uint8Array(readFileSync(SSS_MKF))
    const msgBuf = new Uint8Array(readFileSync(M_MSG))
    const result = roundtripCheck(sssBuf, msgBuf)
    // 固定原盘chunk4长度由独立MKF头读取，不能让两边同样选错空数据而通过。
    expect(result).toEqual({ ok: true, originalSize: 348024, recompiledSize: 348024 })
  })
})
