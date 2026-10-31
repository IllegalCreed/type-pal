/**
 * TEST-FOUNDATION-COVERAGE-1 A1：MKF 归档边界（合同见 mkf.ts 模块头）。
 * 头为 N+1 个 u32 LE 偏移；子文件数 = (head[0] - 4) / 4；chunk i = [offsets[i], offsets[i+1])。
 * openMkf 拒绝不完整表、越界与倒序 offset；readChunk 只消费该入口产出的 Mkf，
 * 拒绝越界或非整数索引，返回借用原输入 buffer 的视图。
 */
import { describe, expect, it } from 'vitest'
import { mkMkf } from './__tests__/mkf-container.js'
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

  it('offset table 超出 buffer 时拒绝，不让 DataView 越界读取成为裸异常', () => {
    const bad = new Uint8Array(8)
    new DataView(bad.buffer).setUint32(0, 12, true)
    expect(() => openMkf(bad)).toThrow(/offset table truncated/)
  })

  it('offset 超出 buffer 或倒序时拒绝', () => {
    const outside = new Uint8Array(8)
    const outsideView = new DataView(outside.buffer)
    outsideView.setUint32(0, 8, true)
    outsideView.setUint32(4, 9, true)
    expect(() => openMkf(outside)).toThrow(/outside buffer/)

    const descending = new Uint8Array(12)
    const descendingView = new DataView(descending.buffer)
    descendingView.setUint32(0, 12, true)
    descendingView.setUint32(4, 8, true)
    descendingView.setUint32(8, 12, true)
    expect(() => openMkf(descending)).toThrow(/not monotonic/)
  })
})

describe('readChunk 边界', () => {
  const mkf = openMkf(mkMkf([Uint8Array.from([1]), Uint8Array.of(), Uint8Array.from([7, 8])]))

  it('首/末 chunk 索引边界均可达，返回 subarray 视图', () => {
    expect(Array.from(readChunk(mkf, 0))).toEqual([1])
    expect(Array.from(readChunk(mkf, 2))).toEqual([7, 8])
    const view = readChunk(mkf, 0)
    expect(view).toBeInstanceOf(Uint8Array)
    expect(view.buffer).toBe(mkf.buffer.buffer)
    expect(view.byteOffset).toBe(mkf.buffer.byteOffset + mkf.offsets[0]!)
  })

  it('空 chunk（相邻偏移相等）：长度 0 视图，非错误', () => {
    const empty = readChunk(mkf, 1)
    expect(empty.byteLength).toBe(0)
  })

  it('越界、非整数与 NaN 索引均拒绝且消息含 count', () => {
    expect(() => readChunk(mkf, -1)).toThrow(/chunk -1 out of range \(count=3\)/)
    expect(() => readChunk(mkf, 3)).toThrow(/chunk 3 out of range \(count=3\)/)
    expect(() => readChunk(mkf, 0.5)).toThrow(/chunk 0.5 out of range \(count=3\)/)
    expect(() => readChunk(mkf, Number.NaN)).toThrow(/chunk NaN out of range \(count=3\)/)
  })

  // offset 合法性由 openMkf 统一核定；不绕过真实入口伪造 Mkf 来替 readChunk 发明错误合同。
})
