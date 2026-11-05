import type { Command } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isolateLanguagePreference } from '../../localization/language.test-fixtures.js'
import { setGlobalEvents } from '../script-catalog.js'
import { getScriptDescLines } from './script-desc.js'

const FIXTURE_COMMANDS: Command[] = [
  // L_40133 木剑(idx 0)
  { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_40133' },
  { op: 'showDialog', messageIndex: 12718, text: '用木材雕刻的剑，小孩玩具。' },
  { op: 'showDialog', messageIndex: 12719, text: '武术+2 身法+3' },
  { op: 'end' },
  // L_40265 玉佛珠(idx 4)
  { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_40265' },
  { op: 'showDialog', messageIndex: 12796, text: '西方如来檀前的念珠，经佛法薰陶' },
  { op: 'showDialog', messageIndex: 12797, text: '变化通灵。合体法术：佛法无边' },
  { op: 'showDialog', messageIndex: 12798, text: '灵力+88 防御+18 避毒率+30' },
  { op: 'end' },
]

describe('getScriptDescLines', () => {
  let restoreLanguage: () => void
  beforeEach(() => {
    restoreLanguage = isolateLanguagePreference('zh-CN')
    // Relocated description blocks still resolve through global labels, not numeric array indices.
    setGlobalEvents(FIXTURE_COMMANDS)
  })

  afterEach(() => {
    setGlobalEvents([])
    restoreLanguage()
  })

  it('木剑描述跳过0xA7且在end处停止，不混入下一段', () => {
    expect(getScriptDescLines(40133)).toEqual(['用木材雕刻的剑，小孩玩具。', '武术+2 身法+3'])
  })

  it('玉佛珠 40265 → 3 行真值描述', () => {
    expect(getScriptDescLines(40265)).toEqual([
      '西方如来檀前的念珠，经佛法薰陶',
      '变化通灵。合体法术：佛法无边',
      '灵力+88 防御+18 避毒率+30',
    ])
  })

  it('scriptDesc=0 表示没有描述入口', () => {
    expect(getScriptDescLines(0)).toEqual([])
  })

  it('合法WORD范围内的未知入口返回空数组', () => {
    expect(getScriptDescLines(60000)).toEqual([])
  })

  it('缺少终止指令时最多扫描32条源指令', () => {
    const commands: Command[] = [
      { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_1' },
      ...Array.from(
        { length: 30 },
        (): Command => ({
          op: 'raw',
          opcode: 0xa7,
          operands: [0, 0, 0],
        }),
      ),
      { op: 'showDialog', messageIndex: 10, text: '最后允许的源指令' },
      { op: 'showDialog', messageIndex: 11, text: '超出扫描范围' },
    ]
    setGlobalEvents(commands)
    expect(getScriptDescLines(1)).toEqual(['最后允许的源指令'])
  })
})
