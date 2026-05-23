import { describe, expect, it } from 'vitest'
import { lookupOpcode, lookupVerb, opcodeTable } from './opcodes.js'

describe('opcode registry', () => {
  it('包含所有 ~97 个 opcode(0x0000-0x00A6 + 0xFFFF)', () => {
    expect(opcodeTable[0x0000]).toBeDefined()
    expect(opcodeTable[0x00a6]).toBeDefined()
    expect(opcodeTable[0xffff]).toBeDefined()
  })

  it('lookupVerb / lookupOpcode 双向(showDialog ↔ 0xFFFF)', () => {
    expect(lookupVerb(0xffff)).toBe('showDialog')
    expect(lookupOpcode('showDialog')).toBe(0xffff)
  })

  it('lookupVerb / lookupOpcode 双向(goto ↔ 0x0003)', () => {
    expect(lookupVerb(0x0003)).toBe('goto')
    expect(lookupOpcode('goto')).toBe(0x0003)
  })

  it('未具名的 opcode 仍有 3 个 kind 占位', () => {
    // 0x0050 — 某个不在 ~15 列表的 opcode
    const entry = opcodeTable[0x0050]
    expect(entry).toBeDefined()
    expect(entry?.fields).toHaveLength(3)
    expect(entry?.named).toBe(false)
    expect(entry?.name).toBe('raw')
  })

  it('end 命令三种形态(0x0000 / 0x0001 / 0x0002)', () => {
    expect(lookupVerb(0x0000)).toBe('end')
    expect(lookupVerb(0x0001)).toBe('end')
    expect(lookupVerb(0x0002)).toBe('end')
    expect(opcodeTable[0x0001]?.endAdvance).toBe(true)
    expect(opcodeTable[0x0002]?.endReset).toBe(true)
  })

  it('未具名 opcode 不进入 lookupOpcode', () => {
    expect(() => lookupOpcode('raw')).toThrow(/unknown verb/)
  })

  it('lookupVerb / lookupOpcode 双向(startBattle ↔ 0x0007)', () => {
    expect(lookupVerb(0x0007)).toBe('startBattle')
    expect(lookupOpcode('startBattle')).toBe(0x0007)
  })

  it('lookupVerb / lookupOpcode 双向(waitFrames ↔ 0x0009)', () => {
    expect(lookupVerb(0x0009)).toBe('waitFrames')
    expect(lookupOpcode('waitFrames')).toBe(0x0009)
  })

  it('lookupVerb / lookupOpcode 双向(setObjectState ↔ 0x0049)', () => {
    expect(lookupVerb(0x0049)).toBe('setObjectState')
    expect(lookupOpcode('setObjectState')).toBe(0x0049)
  })

  it('lookupVerb / lookupOpcode 双向(setScriptEntry ↔ 0x0025)', () => {
    expect(lookupVerb(0x0025)).toBe('setScriptEntry')
    expect(lookupOpcode('setScriptEntry')).toBe(0x0025)
  })

  it('lookupVerb / lookupOpcode 双向(playMusic ↔ 0x0043)', () => {
    expect(lookupVerb(0x0043)).toBe('playMusic')
    expect(lookupOpcode('playMusic')).toBe(0x0043)
  })

  it('lookupVerb / lookupOpcode 双向(playSfx ↔ 0x0047)', () => {
    expect(lookupVerb(0x0047)).toBe('playSfx')
    expect(lookupOpcode('playSfx')).toBe(0x0047)
  })

  it('lookupVerb / lookupOpcode 双向(ifItemLess ↔ 0x0058)', () => {
    expect(lookupVerb(0x0058)).toBe('ifItemLess')
    expect(lookupOpcode('ifItemLess')).toBe(0x0058)
  })

  it('lookupVerb / lookupOpcode 双向(changeScene ↔ 0x0059)', () => {
    expect(lookupVerb(0x0059)).toBe('changeScene')
    expect(lookupOpcode('changeScene')).toBe(0x0059)
  })

  it('lookupVerb / lookupOpcode 双向(giveItem ↔ 0x001F)', () => {
    expect(lookupVerb(0x001f)).toBe('giveItem')
    expect(lookupOpcode('giveItem')).toBe(0x001f)
  })

  it('lookupVerb / lookupOpcode 双向(setDialogStyleCenter ↔ 0x003B)', () => {
    expect(lookupVerb(0x003b)).toBe('setDialogStyleCenter')
    expect(lookupOpcode('setDialogStyleCenter')).toBe(0x003b)
  })

  it('lookupVerb / lookupOpcode 双向(setDialogStyleTop ↔ 0x003C)', () => {
    expect(lookupVerb(0x003c)).toBe('setDialogStyleTop')
    expect(lookupOpcode('setDialogStyleTop')).toBe(0x003c)
  })

  it('lookupVerb / lookupOpcode 双向(setDialogStyleBottom ↔ 0x003D)', () => {
    expect(lookupVerb(0x003d)).toBe('setDialogStyleBottom')
    expect(lookupOpcode('setDialogStyleBottom')).toBe(0x003d)
  })

  it('lookupVerb / lookupOpcode 双向(setDialogStyleNarration ↔ 0x003E)', () => {
    expect(lookupVerb(0x003e)).toBe('setDialogStyleNarration')
    expect(lookupOpcode('setDialogStyleNarration')).toBe(0x003e)
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
