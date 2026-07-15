import { describe, expect, test } from 'vitest'
import { scriptTreeText } from './ScriptTree.js'

describe('scriptTreeText', () => {
  test('脚本树摘要只显示富文本可见正文', () => {
    expect(
      scriptTreeText('dlg.yellow', {
        'dlg.yellow': '<yellow>好吧．．．</yellow>',
      }),
    ).toBe('好吧．．．')
  })

  test('缺翻译仍明确显示 text id', () => {
    expect(scriptTreeText('dlg.missing', {})).toBe('⟨dlg.missing⟩')
  })
})
