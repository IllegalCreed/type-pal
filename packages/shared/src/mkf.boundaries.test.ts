/**
 * TEST-FOUNDATION-COVERAGE-1 A1：MKF 归档边界（合同见 mkf.ts:1-5）。
 * 头为 N+1 个 u32 LE 偏移；子文件数 = (head[0] - 4) / 4；chunk i = [offsets[i], offsets[i+1])。
 * 已定义错误：头过小 / 首偏移非 4 倍数 / count<0。越界损坏偏移为未定义行为，不设合同（仅注释）。
 */
import { describe, expect, it } from 'vitest'
import { mkMkf } from './__tests__/glm-foundation-fixtures.js'
import { chunkCount, openMkf, readChunk } from './mkf.js'

describe('openMkf 头合同', () => {
  it('N+1 偏移：count=(firstOffset/4)-1，offsets 完整读出头', () => {
    const buf = mkMkf([
      Uint8Array.from([1, 2, 3, 4]),
      Uint8Array.from([5, 6]),
      Uint8Array.from([9]),
    ])
    const mkf = openMkf(buf)
    expect(chunkCount(mkf)).toBe(3)
    expect(Array.from(mkf.offsets)).toEqual([16, 20, 22, 23])
  })

  it('单 chunk 容器：首 chunk 即末 chunk，边界为头后首字节', () => {
    const mkf = openMkf(mkMkf([Uint8Array.from([0xaa])]))
    expect(chunkCount(mkf)).toBe(1)
    expect(Array.from(readChunk(mkf, 0))).toEqual([0xaa])
  })

  it('头 <4 字节：已定义拒绝', () => {
    expect(() => openMkf(Uint8Array.from([1, 2, 3]))).toThrow(/too small for header/)
  })

  it('首偏移非 4 倍数：已定义拒绝', () => {
    const bad = new Uint8Array(8)
    new DataView(bad.buffer).setUint32(0, 6, true)
    expect(() => openMkf(bad)).toThrow(/not multiple of 4/)
  })

  it('首偏移 0（count<0）：已定义拒绝', () => {
    const bad = new Uint8Array(8)
    new DataView(bad.buffer).setUint32(0, 0, true)
    expect(() => openMkf(bad)).toThrow(/bad first offset/)
  })

  it('子 array 输入：byteOffset 非零时头与 chunk 仍按自身偏移读取', () => {
    const container = mkMkf([Uint8Array.from([0x11, 0x22]), Uint8Array.from([0x33])])
    const padded = new Uint8Array(5 + container.byteLength)
    padded.set(container, 5)
    const mkf = openMkf(padded.subarray(5))
    expect(chunkCount(mkf)).toBe(2)
    expect(Array.from(readChunk(mkf, 1))).toEqual([0x33])
  })
})

describe('readChunk 边界', () => {
  const mkf = openMkf(mkMkf([Uint8Array.from([1]), Uint8Array.of(), Uint8Array.from([7, 8])]))

  it('首/末 chunk 索引边界均可达，返回 subarray 视图', () => {
    expect(Array.from(readChunk(mkf, 0))).toEqual([1])
    expect(Array.from(readChunk(mkf, 2))).toEqual([7, 8])
    const view = readChunk(mkf, 0)
    expect(view).toBeInstanceOf(Uint8Array)
    expect(view.byteOffset).toBeGreaterThan(0)
  })

  it('空 chunk（相邻偏移相等）：长度 0 视图，非错误', () => {
    const empty = readChunk(mkf, 1)
    expect(empty.byteLength).toBe(0)
  })

  it('索引越界（-1 与 count）：已定义拒绝且消息含 count', () => {
    expect(() => readChunk(mkf, -1)).toThrow(/chunk -1 out of range \(count=3\)/)
    expect(() => readChunk(mkf, 3)).toThrow(/chunk 3 out of range \(count=3\)/)
  })

  // 未定义行为（不设合同）：偏移指向 buffer 之外或乱序时 subarray 会截断/返回空，
  // 与已定义头错误不同类；原版对损坏 MKF 亦无契约（palcommon.c 只读头不校验体）。
})
