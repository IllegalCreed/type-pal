import { describe, expect, test } from 'vitest'
import { guijieMinjuScene } from './index.js'
import { zhLocale } from './locale.js'

/**
 * i18n 完整性守护:场景里每条对话引用的 text/speaker textId,
 * 都必须在 zhLocale 有对应条目(否则运行时 fallback 成显示 id 字符串)。
 */
describe('对话 textId 完整性(zh)', () => {
  for (const dialogue of guijieMinjuScene.dialogues) {
    test(`「${dialogue.id}」所有 textId 都在 zhLocale`, () => {
      for (const line of dialogue.lines) {
        expect(zhLocale[line.text], `正文缺: ${line.text}`).toBeDefined()
        if (line.speaker) expect(zhLocale[line.speaker], `人名缺: ${line.speaker}`).toBeDefined()
      }
    })
  }
})
