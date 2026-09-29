/** TEST-GLM-NEW-J-1 J04：legacy-dialog locale id 与光标/转义边界臂。
 * 旧证：legacy-dialog.test.ts 盖解码器颜色/速度/终止/变速 fail-loud 与
 * putLegacyDialogueText 正逆序确定性；
 * `legacyDialogueTextId` 直接合同（基准 key vs 变体 key/哈希形状/稳定性）、
 * locale id 冲突 fail-loud、cursorFrame=2、行尾反斜杠在旧测试零断言。纯函数。
 */
import { describe, expect, test } from 'vitest'
import {
  decodeLegacyDialogueLine,
  legacyDialogueTextId,
  putLegacyDialogueText,
} from './legacy-dialog.js'

describe('legacyDialogueTextId：基准 key 与稳定变体 key', () => {
  test('与基准形态（默认颜色 bottom）一致 → 裸 dlg.N；否则 dlg.N.v-<8hex> 且确定性', () => {
    const raw = '文字'
    expect(legacyDialogueTextId(9, raw, '文字')).toBe('dlg.9')
    const variant = legacyDialogueTextId(9, raw, '<yellow>文字</yellow>')
    expect(variant).toMatch(/^dlg\.9\.v-[0-9a-f]{8}$/)
    expect(legacyDialogueTextId(9, raw, '<yellow>文字</yellow>')).toBe(variant)
    expect(legacyDialogueTextId(9, raw, '<cyan>文字</cyan>')).not.toBe(variant)
    expect(legacyDialogueTextId(12, raw, '文字')).toBe('dlg.12')
  })
})

describe('putLegacyDialogueText', () => {
  test('同 messageIndex 不同原文都落基准 key 时冲突 fail-loud 并给出双方 JSON；同值幂等', () => {
    const locale: Record<string, string> = {}
    expect(putLegacyDialogueText(locale, 9, '甲', '甲')).toBe('dlg.9')
    expect(() => putLegacyDialogueText(locale, 9, '乙', '乙')).toThrow(
      '对话 locale id 冲突 dlg.9: "甲" / "乙"',
    )
    expect(putLegacyDialogueText(locale, 9, '甲', '甲')).toBe('dlg.9')
    expect(locale).toEqual({ 'dlg.9': '甲' })
  })
})

describe('decodeLegacyDialogueLine：光标与转义剩余臂', () => {
  test('`(` 标记第二光标帧（旧证只盖了 `(` 后再 `)` 的末值覆盖）', () => {
    const decoded = decodeLegacyDialogueLine('请选择(字')
    expect(decoded.cursorFrame).toBe(2)
    expect(decoded.text).toBe('请选择字')
  })

  test('行尾孤立反斜杠不产生字符也不抛', () => {
    const decoded = decodeLegacyDialogueLine('abc\\')
    expect(decoded.plainText).toBe('abc')
    expect(decoded.text).toBe('abc')
    expect(decoded.endedWithTilde).toBe(false)
  })

  test('空行返回基准默认态', () => {
    const decoded = decodeLegacyDialogueLine('')
    expect(decoded.text).toBe('')
    expect(decoded.plainText).toBe('')
    expect(decoded.speed).toBe(24)
    expect(decoded.endedWithTilde).toBe(false)
    expect(decoded.state).toEqual({ color: 'default', speed: 24 })
  })
})
