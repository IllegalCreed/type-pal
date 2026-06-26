import { describe, expect, test } from 'vitest'
import { parseRichText } from './rich-text.js'

describe('parseRichText', () => {
  test('纯文本 → 单 span', () => {
    expect(parseRichText('你终于醒了')).toEqual([{ text: '你终于醒了' }])
  })

  test('空串 → 单个空 span', () => {
    expect(parseRichText('')).toEqual([{ text: '' }])
  })

  test('句中颜色标记 → 前/色/后三段', () => {
    expect(parseRichText('他递来一柄<cyan>青锋剑</cyan>。')).toEqual([
      { text: '他递来一柄' },
      { text: '青锋剑', color: 'cyan' },
      { text: '。' },
    ])
  })

  test('行首颜色标记 → 色/后两段', () => {
    expect(parseRichText('<red>住手</red>！')).toEqual([
      { text: '住手', color: 'red' },
      { text: '！' },
    ])
  })

  test('多个颜色标记', () => {
    expect(parseRichText('<yellow>金</yellow>和<cyan>青</cyan>')).toEqual([
      { text: '金', color: 'yellow' },
      { text: '和' },
      { text: '青', color: 'cyan' },
    ])
  })

  // 契约:迁移器/手写 locale 可能写出半截标记;未闭合必须按纯文本,不吞字符、不崩。
  test('未闭合标记 → 按纯文本处理(不吞字符不崩)', () => {
    expect(parseRichText('他<cyan>青锋剑')).toEqual([{ text: '他<cyan>青锋剑' }])
  })
})
