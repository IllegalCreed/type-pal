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
  // 拼接：header(12) + 新 index + 原 payload（长度字段按完整 u32 LE 重写/读取）
  const headerView = new DataView(container.buffer, container.byteOffset, container.byteLength)
  const payloadStart = 12 + headerView.getUint32(8, true)
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
  test('合法 Unicode 扩展键的完整 index：parse 成功且数据/像素内容正确（真实成功正控）', () => {
    const container = legalContainer()
    const payloadStartFull = new DataView(
      container.buffer,
      container.byteOffset,
      container.byteLength,
    ).getUint32(8, true)
    const payload = container.subarray(12 + payloadStartFull)
    // 完整合法 index（保留全部必需字段）+ 允许的 Unicode 扩展键值；payload 原样保留
    const unicodeIndex = new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        codec: 'deflate-rgba8-xor-v1',
        pixelFormat: 'rgba8',
        width: 1,
        height: 1,
        defaultFrameMs: 40,
        blockFrames: 32,
        元数据键: '值·扩展',
        frames: [{}],
        blocks: [
          {
            firstFrame: 0,
            frameCount: 1,
            offset: 0,
            bytes: payload.byteLength,
            rawBytes: 4,
          },
        ],
      }),
    )
    // 解码结局落成值断言（业务红可判别：坏实现拒合法 Unicode 时 outcome 是 Error）
    const outcome = (() => {
      try {
        return { parsed: parseFrameSequence(withIndexBytes(container, unicodeIndex)) }
      } catch (error) {
        return { error: error as Error }
      }
    })()
    expect(outcome.error).toBeUndefined() // 合法 Unicode index 必须 parse 成功
    const parsed = outcome.parsed!
    // 内容正确：多字节键经 UTF-8 解码后进入 JSON/validate 层，
    // 规范化输出重建为 canonical 字段（未知扩展键按现行合同不透传——不发明透传合同）
    expect(parsed.index.width).toBe(1)
    expect(parsed.index.height).toBe(1)
    expect(parsed.index.defaultFrameMs).toBe(40)
    expect(parsed.index.frames).toEqual([{}])
    expect(parsed.index.blocks).toEqual([
      {
        firstFrame: 0,
        frameCount: 1,
        offset: 0,
        bytes: payload.byteLength,
        rawBytes: 4,
      },
    ])
  })
})

describe('A5 index JSON 解析失败轴（与 UTF-8 错误分开）', () => {
  test('合法 UTF-8 的非法 JSON → 非法 JSON 包装错误', async () => {
    const container = legalContainer()
    const badJson = new TextEncoder().encode('{not-json')
    expect(() => parseFrameSequence(withIndexBytes(container, badJson))).toThrow(
      'TPFS.index: 非法 JSON',
    )
    // 合法 JSON 但 schema 不符（数组）→ validate 层精确拒绝（非 JSON 解析层）
    const arrayJson = new TextEncoder().encode('[1,2]')
    expect(() => parseFrameSequence(withIndexBytes(container, arrayJson))).toThrow(
      'TPFS.index: 期望对象',
    )
    // 合法 JSON 对象但缺必需字段 → schema 精确路径
    const missingField = new TextEncoder().encode('{"version":1}')
    expect(() => parseFrameSequence(withIndexBytes(container, missingField))).toThrow(
      /index\.|期望/,
    )
  })
})
