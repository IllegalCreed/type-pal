import { describe, expect, it } from 'vitest'
import { lookupOpcode, lookupVerb, opcodeTable } from './opcodes.js'

const lookups: ReadonlyArray<{ title: string; opcode: number; verb: string }> = [
  {
    title: 'lookupVerb / lookupOpcode 双向(showDialog ↔ 0xFFFF)',
    opcode: 65535,
    verb: 'showDialog',
  },
  { title: 'lookupVerb / lookupOpcode 双向(goto ↔ 0x0003)', opcode: 3, verb: 'goto' },
  { title: 'lookupVerb / lookupOpcode 双向(startBattle ↔ 0x0007)', opcode: 7, verb: 'startBattle' },
  { title: 'lookupVerb / lookupOpcode 双向(waitFrames ↔ 0x0009)', opcode: 9, verb: 'waitFrames' },
  {
    title: 'lookupVerb / lookupOpcode 双向(setObjectState ↔ 0x0049)',
    opcode: 73,
    verb: 'setObjectState',
  },
  {
    title: 'lookupVerb / lookupOpcode 双向(setScriptEntry ↔ 0x0025)',
    opcode: 37,
    verb: 'setScriptEntry',
  },
  { title: 'lookupVerb / lookupOpcode 双向(playMusic ↔ 0x0043)', opcode: 67, verb: 'playMusic' },
  { title: 'lookupVerb / lookupOpcode 双向(playSfx ↔ 0x0047)', opcode: 71, verb: 'playSfx' },
  { title: 'lookupVerb / lookupOpcode 双向(ifItemLess ↔ 0x0058)', opcode: 88, verb: 'ifItemLess' },
  {
    title: 'lookupVerb / lookupOpcode 双向(loadScene ↔ 0x0059,M3.5 重命名)',
    opcode: 89,
    verb: 'loadScene',
  },
  { title: 'lookupVerb / lookupOpcode 双向(giveItem ↔ 0x001F)', opcode: 31, verb: 'giveItem' },
  {
    title: 'lookupVerb / lookupOpcode 双向(setDialogStyleCenter ↔ 0x003B)',
    opcode: 59,
    verb: 'setDialogStyleCenter',
  },
  {
    title: 'lookupVerb / lookupOpcode 双向(setDialogStyleTop ↔ 0x003C)',
    opcode: 60,
    verb: 'setDialogStyleTop',
  },
  {
    title: 'lookupVerb / lookupOpcode 双向(setDialogStyleBottom ↔ 0x003D)',
    opcode: 61,
    verb: 'setDialogStyleBottom',
  },
  {
    title: 'lookupVerb / lookupOpcode 双向(setDialogStyleNarration ↔ 0x003E)',
    opcode: 62,
    verb: 'setDialogStyleNarration',
  },
]

describe('opcode registry', () => {
  for (const { title, opcode, verb } of lookups) {
    it(title, () => {
      expect(lookupVerb(opcode)).toBe(verb)
      expect(lookupOpcode(verb)).toBe(opcode)
    })
  }

  it('包含 script.c opcode 范围(0x0000-0x00A7 + 0xFFFF)', () => {
    expect(
      Object.keys(opcodeTable)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([...Array.from({ length: 168 }, (_, opcode) => opcode), 0xffff])
  })

  it('未具名的 opcode 仍有 3 个 kind 占位', () => {
    // 0x0050 — 某个不在 ~15 列表的 opcode
    expect(opcodeTable[0x0050]).toEqual({
      name: 'raw',
      named: false,
      fields: [
        { name: 'op0', kind: 'value' },
        { name: 'op1', kind: 'value' },
        { name: 'op2', kind: 'value' },
      ],
    })
  })

  it('end 命令三种形态(0x0000 / 0x0001 / 0x0002)', () => {
    expect(lookupVerb(0x0000)).toBe('end')
    expect(lookupVerb(0x0001)).toBe('end')
    expect(lookupVerb(0x0002)).toBe('end')
    expect(opcodeTable[0x0001]?.endAdvance).toBe(true)
    expect(opcodeTable[0x0002]?.endReset).toBe(true)
    expect(lookupOpcode('end')).toBe(0) // 多个end变体的规范反向入口是最低opcode。
  })

  it('未具名 opcode 不进入 lookupOpcode', () => {
    expect(() => lookupOpcode('raw')).toThrow(/unknown verb/)
  })

  it('具名 opcode 的 named 标志为 true', () => {
    expect(opcodeTable[0x0003]?.named).toBe(true)
    expect(opcodeTable[0x0043]?.named).toBe(true)
    expect(opcodeTable[0x0059]?.named).toBe(true)
  })

  it('lookupVerb 对未登记 opcode 返回 raw', () => {
    expect(lookupVerb(0x9999)).toBe('raw')
  })
})
