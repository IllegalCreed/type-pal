/**
 * TEST-PAL-TABLES-COVERAGE-1 P02：WORD.DAT 边界（io/word.ts）。
 * 既有 word.test 已覆盖真实表 565 计数、content-pin、剥尾 '1'——不重复。
 * 本文件用 565×10 手写合成表钉段界（36/42/61/296/398/551/564 边界不同标记）、
 * flat 完整性、内部空格保留与尾空格/尾 '1' 语义、GBK 双字节 persons。
 * 条目尾缀 'q' 使段界断言可直用字面值（产品会剥词条尾标记 '1'，见专门轴）。
 */
import { describe, expect, test } from 'vitest'
import { gbk, wordDat, wordEntryText } from '../__tests__/glm-tb04-fixtures.js'
import { parseWordDat } from './word.js'

/** 文本 + 尾空格补齐到 10B（真实词条布局：标记紧贴正文、空格只在尾）。 */
const entry = (text: string): Uint8Array => {
  const out = new Uint8Array(10)
  const encoded = gbk(text)
  if (encoded.byteLength > 10) throw new Error(`fixture 词条超长: ${text}`)
  out.set(encoded)
  for (let i = encoded.byteLength; i < 10; i++) out[i] = 0x20
  return out
}

describe('P02 parseWordDat 合成全表段界', () => {
  test('persons36..41 / battleUi42..60 / items61..295 / spells296..397 / enemies398..550 / scenes551..564 / system0..35 段界精确', () => {
    const words = parseWordDat(wordDat())
    expect(words.system).toHaveLength(36)
    expect(words.persons).toHaveLength(6)
    expect(words.battleUi).toHaveLength(19)
    expect(words.items).toHaveLength(235)
    expect(words.spells).toHaveLength(102)
    expect(words.enemies).toHaveLength(153)
    expect(words.scenes).toHaveLength(14)
    // 段边界两侧标记不同：偏一位即红
    expect(words.system[0]).toBe('s0q')
    expect(words.system[35]).toBe('s35q')
    expect(words.persons[0]).toBe('灵36q')
    expect(words.persons[5]).toBe('灵41q')
    expect(words.battleUi[0]).toBe('b42q')
    expect(words.battleUi[18]).toBe('b60q')
    expect(words.items[0]).toBe('i61q')
    expect(words.items[234]).toBe('i295q')
    expect(words.spells[0]).toBe('m296q')
    expect(words.spells[101]).toBe('m397q')
    expect(words.enemies[0]).toBe('e398q')
    expect(words.enemies[152]).toBe('e550q')
    expect(words.scenes[0]).toBe('x551q')
    expect(words.scenes[13]).toBe('x564q')
  })
  test('flat 全 565 条逐条等于手列文本', () => {
    const words = parseWordDat(wordDat())
    expect(words.flat).toHaveLength(565)
    for (let i = 0; i < 565; i++) expect(words.flat[i]).toBe(wordEntryText(i))
    expect(words.flat[7]).toBe('s7q')
    expect(words.flat[564]).toBe('x564q')
  })
  test('内部空格保留；尾空格剥除；尾标记 1 剥除；满 10B 不截', () => {
    const buf = wordDat()
    buf.set(entry('A C'), 0 * 10) // 内部空格 + 尾空格
    buf.set(entry('p361'), 36 * 10) // 尾标记 '1' 紧贴正文（真实词条布局）
    buf.set(entry('BBBBBBBBBB'), 37 * 10) // 满 10B ASCII
    const words = parseWordDat(buf)
    expect(words.flat[0]).toBe('A C') // 内部空格保留、尾空格剥
    expect(words.persons[0]).toBe('p36') // 尾 '1' 剥（text.c:785-786）
    expect(words.flat[37]).toBe('BBBBBBBBBB') // 满长不截
  })
})
