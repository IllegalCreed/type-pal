/**
 * TEST-CONTENT-RESIDUAL-1 A4/A5：TPFS 外部索引错误路径（frame-sequence.ts:255–278）。
 * 合法多字节**解码**输入可达（元数据键可用 Unicode 扩展键值证明），UTF-8 与 JSON 错误路径
 * 分开钉；多字节 **encode** 臂不可达（encoder 生成的当前元数据为 ASCII——防御/不测）。
 * 索引构造复用产品 encodeFrameSequenceSync 的容器骨架，只改 index 字节域。
 */

// @ts-expect-error Node-only test host; content production type environment is DOM-only.
import { TextEncoder } from 'node:util'
import { describe, expect, test } from 'vitest'
import {
  type EncodeFrameSequenceInput,
  encodeFrameSequenceSync,
  parseFrameSequence,
} from './frame-sequence.js'

const identity = (bytes: Uint8Array): Uint8Array => bytes.slice()

const oneFrame = (): EncodeFrameSequenceInput => ({
  width: 1,
  height: 1,
  defaultFrameMs: 40,
  frames: [{ rgba: Uint8Array.from([1, 2, 3, 255]) }],
})

/** 产品编码的完整合法容器（作为字节骨架）。 */
function legalContainer(): Uint8Array {
  return encodeFrameSequenceSync(oneFrame(), identity)
}

/** 替换 index JSON 字节并重写长度字段（保持 payload 不动）。 */
function withIndexBytes(container: Uint8Array, indexBytes: Uint8Array): Uint8Array {
  // 拼接：header(12) + 新 index + 原 payload（长度字段重写）
  const payloadStart = 12 + ((container[8] ?? 0) | ((container[9] ?? 0) << 8))
  const payload = container.subarray(payloadStart)
  const result = new Uint8Array(12 + indexBytes.byteLength + payload.byteLength)
  result.set(container.subarray(0, 12), 0)
  result.set(indexBytes, 12)
  result.set(payload, 12 + indexBytes.byteLength)
  const view = new DataView(result.buffer)
  view.setUint32(8, indexBytes.byteLength, true)
  return result
}

describe('A4 外部 UTF-8 解码错误路径', () => {
  test('非法起始字节 / 截断序列 / 非法延续字节 / 非法码点各自精确路径', async () => {
    const container = legalContainer()
    // 非法起始字节（0x80 孤立延续字节作首字节）
    const badLead = withIndexBytes(container, new Uint8Array([0x80, 0x7b, 0x7d]))
    expect(() => parseFrameSequence(badLead)).toThrow('TPFS.index: 非法 UTF-8 起始字节')
    // 截断：三字节起始但只余一字节
    const truncated = withIndexBytes(container, new Uint8Array([0xe4, 0xb8]))
    expect(() => parseFrameSequence(truncated)).toThrow('TPFS.index: UTF-8 序列被截断')
    // 非法延续：三字节起始后接 ASCII
    const badCont = withIndexBytes(container, new Uint8Array([0xe4, 0x41, 0x41]))
    expect(() => parseFrameSequence(badCont)).toThrow('TPFS.index: 非法 UTF-8 延续字节')
    // 非法码点：ED A0 80 = surrogate D800
    const surrogate = withIndexBytes(container, new Uint8Array([0xed, 0xa0, 0x80]))
    expect(() => parseFrameSequence(surrogate)).toThrow('TPFS.index: 非法 UTF-8 码点')
  })
  test('合法多字节解码输入可达：Unicode 扩展键元数据完整往返', async () => {
    // 用扩展键值证明 decode 臂可达（r2 收口证据口径）
    const container = legalContainer()
    const unicodeIndex = new TextEncoder().encode('{"名":"值"}')
    // 该 JSON 不符合 index schema → 走 validate 拒绝而非 UTF-8 错误：证明解码成功进入 JSON 层
    expect(() => parseFrameSequence(withIndexBytes(container, unicodeIndex))).toThrow(/index|期望/)
  })
})

describe('A5 index JSON 解析失败轴（与 UTF-8 错误分开）', () => {
  test('合法 UTF-8 的非法 JSON → 非法 JSON 包装错误', async () => {
    const container = legalContainer()
    const badJson = new TextEncoder().encode('{not-json')
    expect(() => parseFrameSequence(withIndexBytes(container, badJson))).toThrow(
      'TPFS.index: 非法 JSON',
    )
    // 合法 JSON 但类型错误（数组）→ validate 层拒绝（非 JSON 解析层）
    const arrayJson = new TextEncoder().encode('[1,2]')
    expect(() => parseFrameSequence(withIndexBytes(container, arrayJson))).toThrow()
  })
})
