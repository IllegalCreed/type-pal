/** TEST-GLM-WAVE-O-1 O09：parseRichText 残余合同（新文件，不触碰已有反控执行集）。
 *  旧证（existing-proof，不计净新）：rich-text.test.ts:5-39 已覆盖纯文本/空串/
 *  句中标记三段/行首两段/多标记夹文本/未闭合按纯文本。
 *  本文件按源码逐臂补未覆盖轴：未知色名、错配闭合、空内容、相邻无间隔、
 *  同名嵌套首闭合语义、redAlt 与 red 的交替区分、大小写敏感、孤儿闭合、内容含 '<'。
 */

import { describe, expect, test } from 'vitest'
import { parseRichText } from './rich-text.js'

describe('O09 parseRichText：标记识别残余轴', () => {
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
    expect(parseRichText('<redAlt>x</redAlt>')).toEqual([{ text: 'x', color: 'redAlt' }])
    expect(parseRichText('<red>y</red>')).toEqual([{ text: 'y', color: 'red' }])
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
