import { describe, expect, test } from 'vitest'
import {
  DEFAULT_LEGACY_DIALOG_STATE,
  decodeLegacyDialogueLine,
  putLegacyDialogueText,
} from './legacy-dialog.js'

describe('legacy dialogue decoder', () => {
  test('用户选择 A：减益负号按原版 cyan toggle 消费，不显示负号', () => {
    expect(decodeLegacyDialogueLine('防御+13　身法-10').text).toBe('防御+13　身法<cyan>10</cyan>')
    expect(decodeLegacyDialogueLine('HP-30').plainText).toBe('HP30')
  })

  test('颜色状态跨源行持续，但每个 locale 值独立闭合', () => {
    const first = decodeLegacyDialogueLine('默认"黄色')
    expect(first.text).toBe('默认<yellow>黄色</yellow>')
    expect(first.state.color).toBe('yellow')
    const second = decodeLegacyDialogueLine('续黄"默认', first.state)
    expect(second.text).toBe('<yellow>续黄</yellow>默认')
    expect(second.state.color).toBe('default')
  })

  test('narration 双引号只消费，不改变颜色', () => {
    const decoded = decodeLegacyDialogueLine('"旁白"', DEFAULT_LEGACY_DIALOG_STATE, 'narration')
    expect(decoded.text).toBe('旁白')
    expect(decoded.state.color).toBe('default')
  })

  test('$NN 换算并跨行持续；U+3000 明确按非语义缩进分类', () => {
    const first = decodeLegacyDialogueLine('\u3000$10正文')
    expect(first.text).toBe('\u3000正文')
    expect(first.speed).toBe(112)
    expect(first.state.speed).toBe(112)
    expect(decodeLegacyDialogueLine('续行', first.state).speed).toBe(112)
  })

  test('真正的可见正文中途变速 fail-loud', () => {
    expect(() => decodeLegacyDialogueLine('前$02后')).toThrow(/中途变速/)
  })

  test('~ 终止当前源行，其后文字、$NN 与颜色码全部死亡', () => {
    const before = decodeLegacyDialogueLine('正文$02~70后$10-死码')
    expect(before.autoAdvance).toBe(800)
    expect(before.state.speed).toBe(16)
    expect(before.state.color).toBe('default')

    const after = decodeLegacyDialogueLine('正文~50$02-死码')
    expect(after.autoAdvance).toBe(571)
    expect(after.state.speed).toBe(24)
    expect(after.state.color).toBe('default')
  })

  test('光标与转义变成结构字段/字面文本', () => {
    const decoded = decodeLegacyDialogueLine('价\\$5(字)')
    expect(decoded.text).toBe('价$5字')
    expect(decoded.cursorFrame).toBe(1)
  })

  test('同原文不同进入颜色产生确定变体，正序逆序完全一致', () => {
    const yellow = decodeLegacyDialogueLine('文字', { color: 'yellow', speed: 24 })
    const normal = decodeLegacyDialogueLine('文字')
    const build = (reverse: boolean): Record<string, string> => {
      const locale: Record<string, string> = {}
      const entries = reverse ? [yellow, normal] : [normal, yellow]
      for (const decoded of entries) putLegacyDialogueText(locale, 9, '文字', decoded.text)
      return Object.fromEntries(Object.entries(locale).sort(([a], [b]) => a.localeCompare(b)))
    }
    expect(build(false)).toEqual(build(true))
    expect(Object.keys(build(false))).toEqual(['dlg.9', expect.stringMatching(/^dlg\.9\.v-/)])
  })
})
