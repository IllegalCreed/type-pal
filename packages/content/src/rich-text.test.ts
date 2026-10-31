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

  test('未知色名标记 → 按纯文本（COLOR_TAGS 白名单外）', () => {
    expect(parseRichText('<blue>海</blue>')).toEqual([{ text: '<blue>海</blue>' }])
  })

  test('错配闭合 → 按纯文本（反向引用要求同名开闭）', () => {
    expect(parseRichText('<cyan>青</red>')).toEqual([{ text: '<cyan>青</red>' }])
  })

  test('空标记内容 → 产出带色的空 span（非空数组语义保持）', () => {
    expect(parseRichText('<red></red>')).toEqual([{ text: '', color: 'red' }])
  })

  test('相邻标记无间隔 → 两个着色 span，之间不产生空文本 span', () => {
    expect(parseRichText('<cyan>a</cyan><red>b</red>')).toEqual([
      { text: 'a', color: 'cyan' },
      { text: 'b', color: 'red' },
    ])
  })

  test('同名嵌套 → 非贪婪取首个闭合（文档明示非嵌套语义）', () => {
    expect(parseRichText('a<cyan>b<cyan>c</cyan>d</cyan>')).toEqual([
      { text: 'a' },
      { text: 'b<cyan>c', color: 'cyan' },
      { text: 'd</cyan>' },
    ])
  })

  test('redAlt 与 red 交替序区分（redAlt 不被截成 red）', () => {
    expect(parseRichText('<redAlt>x</redAlt><red>y</red>')).toEqual([
      { text: 'x', color: 'redAlt' },
      { text: 'y', color: 'red' },
    ])
  })

  test('大小写敏感：<CYAN> 不识别 → 纯文本', () => {
    expect(parseRichText('<CYAN>青</CYAN>')).toEqual([{ text: '<CYAN>青</CYAN>' }])
  })

  test('孤儿闭合 → 按纯文本', () => {
    expect(parseRichText('前</cyan>后')).toEqual([{ text: '前</cyan>后' }])
  })

  test('标记内容含 "<" → 着色 span 文本原样保留', () => {
    expect(parseRichText('<cyan>a<b</cyan>')).toEqual([{ text: 'a<b', color: 'cyan' }])
  })
})
