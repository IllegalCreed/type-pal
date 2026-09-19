/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R04：recompile 独立字节 oracle（events/recompile.ts）。
 * 既有 recompile.test 已覆盖单条往返/end 变体/空清单——不重复。本文件：手构当前 producer
 * 可出命令对独立字节（opcode 手列 0x0001/0x0003/0xFFFF/0x001F/0x0059/0x008B/0x003D）、
 * 同文本不同 messageIndex 字节不同、raw 全位型、输入深快照不变。
 */

import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { recompile } from './recompile.js'

function expectU16(bytes: Uint8Array, byteOffset: number, value: number): void {
  expect(
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(byteOffset, true),
  ).toBe(value)
}

describe('R04 recompile 独立字节 oracle', () => {
  test('八类命令各 8B 手列：opcode 与 operand 位型精确', () => {
    const commands: Command[] = [
      { op: 'end', advance: true },
      { op: 'goto', to: 'L_1', frameDelay: 7, label: 'L_1' }, // label 同时是重写目标
      { op: 'showDialog', messageIndex: 2, text: 'ignored' }, // recompile 不读 text（接口对称保留）
      { op: 'giveItem', itemId: 61, count: 0x8000 },
      { op: 'loadScene', sceneId: 9 },
      { op: 'setPalette', paletteIndex: 4 },
      { op: 'setDialogStyleBottom', arg0: 5 },
      { op: 'raw', opcode: 0x0177, operands: [0x1234, 0x5678, 0x9abc] },
    ]
    const snapshot = structuredClone(commands)
    const bytes = recompile(commands, [])
    expect(bytes).toHaveLength(64)
    expectU16(bytes, 0, 0x0001) // end advance
    expectU16(bytes, 2, 0)
    expectU16(bytes, 4, 0)
    expectU16(bytes, 6, 0)
    expectU16(bytes, 8, 0x0003) // goto
    expectU16(bytes, 10, 1) // labels 命中 L_1 → 指令 1
    expectU16(bytes, 12, 7) // frameDelay
    expectU16(bytes, 16, 0xffff) // showDialog
    expectU16(bytes, 18, 2) // messageIndex
    expectU16(bytes, 24, 0x001f) // giveItem
    expectU16(bytes, 26, 61)
    expectU16(bytes, 28, 0x8000)
    expectU16(bytes, 32, 0x0059) // loadScene
    expectU16(bytes, 34, 9)
    expectU16(bytes, 40, 0x008b) // setPalette
    expectU16(bytes, 42, 4)
    expectU16(bytes, 48, 0x003d) // setDialogStyleBottom
    expectU16(bytes, 50, 5)
    expectU16(bytes, 56, 0x0177) // raw
    expectU16(bytes, 58, 0x1234)
    expectU16(bytes, 60, 0x5678)
    expectU16(bytes, 62, 0x9abc)
    expect(commands).toEqual(snapshot) // 输入命令不被改写
  })
  test('同文本不同 messageIndex 字节不同；未命中 label 目标写 0', () => {
    const same = [
      { op: 'showDialog', messageIndex: 0, text: '同文' },
      { op: 'showDialog', messageIndex: 2, text: '同文' },
    ] as unknown as Command[]
    const bytes = recompile(same, [])
    expectU16(bytes, 2, 0)
    expectU16(bytes, 10, 2) // 文本不参与，messageIndex 保真
    const dangling = recompile([{ op: 'goto', to: 'L_missing', frameDelay: 0 } as Command], [])
    expectU16(dangling, 2, 0) // 缺 label 默认 0（现行合同）
  })
})
