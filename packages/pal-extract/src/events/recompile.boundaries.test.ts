/**
 * TEST-RESOURCE-TOOLS-COVERAGE-1 R04：recompile 独立字节 oracle（events/recompile.ts）。
 * 既有 recompile.test 已覆盖单条往返/end 变体/空清单——不重复。本文件：手构当前 producer
 * 可出命令对独立字节（opcode 手列 0x0001/0x0003/0xFFFF/0x001F/0x0059/0x008B/0x003D）、
 * 同文本不同 messageIndex 字节不同、raw 全位型、输入深快照不变。
 */

import type { Command } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { recompile } from './recompile.js'

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
    expect([...bytes]).toEqual([
      0x01, 0, 0, 0, 0, 0, 0, 0, 0x03, 0, 1, 0, 7, 0, 0, 0, 0xff, 0xff, 2, 0, 0, 0, 0, 0, 0x1f, 0,
      61, 0, 0, 0x80, 0, 0, 0x59, 0, 9, 0, 0, 0, 0, 0, 0x8b, 0, 4, 0, 0, 0, 0, 0, 0x3d, 0, 5, 0, 0,
      0, 0, 0, 0x77, 0x01, 0x34, 0x12, 0x78, 0x56, 0xbc, 0x9a,
    ])
    expect(commands).toEqual(snapshot) // 输入命令不被改写
  })
  test('同文本不同 messageIndex 字节不同（文本不参与、messageIndex 保真）', () => {
    const same: Command[] = [
      { op: 'showDialog', messageIndex: 0, text: '同文' },
      { op: 'showDialog', messageIndex: 2, text: '同文' },
    ]
    const bytes = recompile(same, [])
    expect([...bytes]).toEqual([0xff, 0xff, 0, 0, 0, 0, 0, 0, 0xff, 0xff, 2, 0, 0, 0, 0, 0])
    // 注：缺 label 目标的默认值政策在 R04 设计中明确未定，本批不为其新增正确绿测。
  })
})
