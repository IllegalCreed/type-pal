import { concatBytes, mkfContainer, u16Bytes, u32Bytes } from '../__tests__/binary-fixtures.js'
/** roundtrip自检的成功及失败报告；原始结构合法，未用操作数非零是明确不支持的反例。
 * 非零指令位置的首差异须给出准确offset/index/opcode。源流与编解码器不mock。
 */

import { describe, expect, test } from 'vitest'
import { roundtripCheck } from './roundtrip.js'

const MSG_TEXT = 'HELLO MSG'

function buildSss(bytecode: Uint8Array): Uint8Array {
  const eventObjects = new Uint8Array(32) // 1 条全 0 EO
  const scene = new Uint8Array(8)
  const sceneView = new DataView(scene.buffer)
  sceneView.setUint16(0, 1, true) // mapNum
  sceneView.setUint16(2, 1, true) // scriptOnEnter
  const objects = new Uint8Array(551 * 14) // OBJECT 表全 0
  const messageOffsets = u32Bytes(0, MSG_TEXT.length)
  return mkfContainer([eventObjects, scene, objects, messageOffsets, bytecode])
}

describe('KIMI-R1 roundtripCheck 合成输入', () => {
  test('合法事件 round-trip：ok=true 且尺寸相等', () => {
    // bytecode: showDialog(msg 0) → end advance
    const bytecode = concatBytes([u16Bytes(0xffff, 0, 0, 0), u16Bytes(1, 0, 0, 0)])
    const sssBuf = buildSss(bytecode)
    const msgBuf = new TextEncoder().encode(MSG_TEXT)
    const result = roundtripCheck(sssBuf, msgBuf)
    expect(result).toEqual({ ok: true, originalSize: 16, recompiledSize: 16 })
  })

  test('内容不一致：ok=false 报告首个差异 offset/instruction/opcode', () => {
    // 在第1条指令的第二操作数制造差异，不能由恒定instruction=0的错误报告蒙混。
    const bytecode = concatBytes([
      u16Bytes(0, 0, 0, 0),
      u16Bytes(0x008b, 9, 1, 0),
      u16Bytes(0, 0, 0, 0),
    ])
    const sssBuf = buildSss(bytecode)
    const msgBuf = new TextEncoder().encode(MSG_TEXT)
    const result = roundtripCheck(sssBuf, msgBuf)
    expect(result).toEqual({
      ok: false,
      originalSize: 24,
      recompiledSize: 24,
      firstDiffOffset: 12,
      firstDiffInstruction: 1,
      firstDiffOpcode: 0x008b,
    })
  })
})
