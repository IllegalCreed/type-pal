/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · roundtripCheck 失败路径合同（events/roundtrip.ts）。
 *
 * 排重 basis：src/events/roundtrip.test.ts 走真实数据且被 fast profile 排除
 * （scripts/coverage/config.mjs fastTestExcludes），不重复、不改动；本文件用全合成
 * SSS.MKF/M.MSG 覆盖 fast 下未覆盖 edge（fast lcov 一手测量）：
 * - 合法 round-trip：ok=true、originalSize=recompiledSize（roundtrip.ts:38-53 主路径）。
 * - 内容不一致：ok=false + firstDiffOffset/firstDiffInstruction/firstDiffOpcode 精确
 *   （:38-49）—— setPalette operand[1] 非 0 尾巴被 disasm 丢弃、recompile 写 0，
 *   与 CLI `ROUND-TRIP FAILED`(exit 2) 共用同一根因。
 * - 合成 bytecode/SSS/M.MSG 的原始 bytes 与 sha256 硬断言（证据锚）。
 * 不覆盖（ledger）：长度不等分支（:29-36）——disasm 每 8 字节恒产 1 条命令、
 * recompile 每条命令恒产 8 字节，byteLength 结构相等，任何输入不可达。
 */

import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import { roundtripCheck } from './roundtrip.js'

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4)
  new DataView(out.buffer).setUint32(0, value, true)
  return out
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2)
  new DataView(out.buffer).setUint16(0, value, true)
  return out
}

/** MKF 归档：N+1 个 u32 LE 偏移头 + 顺序 chunk 数据（shared/mkf.ts 合同）。 */
function mkf(chunks: Uint8Array[]): Uint8Array {
  const headerSize = (chunks.length + 1) * 4
  const bodyLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const buf = new Uint8Array(headerSize + bodyLength)
  const view = new DataView(buf.buffer)
  let offset = headerSize
  for (const [index, chunk] of chunks.entries()) {
    view.setUint32(index * 4, offset, true)
    buf.set(chunk, offset)
    offset += chunk.length
  }
  view.setUint32(chunks.length * 4, offset, true)
  return buf
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

const MSG_TEXT = 'HELLO MSG'

function buildSss(bytecode: Uint8Array): Uint8Array {
  const eventObjects = new Uint8Array(32) // 1 条全 0 EO
  const scene = new Uint8Array(8)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true) // mapNum
  sceneView.setUint16(2, 1, true) // scriptOnEnter
  const objects = new Uint8Array(551 * 14) // OBJECT 表全 0
  const messageOffsets = new Uint8Array([...u32(0), ...u32(MSG_TEXT.length)])
  return mkf([eventObjects, scene, objects, messageOffsets, bytecode])
}

describe('KIMI-R1 roundtripCheck 合成输入', () => {
  test('合法事件 round-trip：ok=true 且尺寸相等（合成 bytes/hash 锚）', () => {
    // bytecode: showDialog(msg 0) → end advance
    const bytecode = new Uint8Array([
      ...u16(0xffff),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0x0001),
      ...u16(0),
      ...u16(0),
      ...u16(0),
    ])
    const sssBuf = buildSss(bytecode)
    const msgBuf = new TextEncoder().encode(MSG_TEXT)
    expect(sha256(bytecode)).toBe(
      'cbca68c6246c1d552c13f457aead253fa85cde4084d2736a96b66fb93987d3d3',
    )
    const result = roundtripCheck(sssBuf, msgBuf)
    expect(result).toEqual({ ok: true, originalSize: 16, recompiledSize: 16 })
  })

  test('内容不一致：ok=false 报告首个差异 offset/instruction/opcode', () => {
    // setPalette(9, op1=1)：disasm 丢 operand[1] → recompile 写 0 → offset 4 起差异
    const bytecode = new Uint8Array([
      ...u16(0x008b),
      ...u16(9),
      ...u16(1),
      ...u16(0),
      ...u16(0x0000),
      ...u16(0),
      ...u16(0),
      ...u16(0),
    ])
    const sssBuf = buildSss(bytecode)
    const msgBuf = new TextEncoder().encode(MSG_TEXT)
    const result = roundtripCheck(sssBuf, msgBuf)
    expect(result).toEqual({
      ok: false,
      originalSize: 16,
      recompiledSize: 16,
      firstDiffOffset: 4,
      firstDiffInstruction: 0,
      firstDiffOpcode: 0x008b,
    })
  })
})
