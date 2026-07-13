import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSss } from './sss.js'

describe('parseSss', () => {
  const buf = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/SSS.MKF')))
  const sss = parseSss(buf)

  it('字节码 chunk 非空', () => {
    expect(sss.bytecode.byteLength).toBeGreaterThan(0)
  })
  it('字节码长度是 8 的倍数(每指令 8 字节)', () => {
    expect(sss.bytecode.byteLength % 8).toBe(0)
  })
  it('至少有 1 个场景', () => {
    expect(sss.scenes.length).toBeGreaterThan(0)
  })
  it('至少有 1 个事件对象', () => {
    expect(sss.eventObjects.length).toBeGreaterThan(0)
  })
  it('消息偏移表非空', () => {
    expect(sss.messageOffsets.length).toBeGreaterThan(0)
  })
  it('chunk 0 长度是 EventObject 整数倍(struct size 验证)', () => {
    // 每个 EVENTOBJECT = 16 个 WORD/SHORT = 32 字节
    // raw.byteLength 应为 32,且 byteLength % 2 == 0 保证无对齐损坏
    expect(sss.eventObjects[0]!.raw.byteLength % 2).toBe(0)
    // 每条 raw 的 u16 数量应等于 EVENT_OBJECT_SIZE_BYTES / 2 = 16
    expect(sss.eventObjects[0]!.raw.length).toBe(16)
  })
})
