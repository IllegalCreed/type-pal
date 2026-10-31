/** GBK文本与固定宽度词条/消息区测试输入；不依赖产品decoder或资源表。 */
import iconv from 'iconv-lite'
import { concatBytes } from './binary-fixtures.js'

/** GBK 编码（产品 decodeGbk 的逆；纯 ASCII 输入等价手写）。 */
export function gbk(text: string): Uint8Array {
  return iconv.encode(text, 'gbk')
}

/**
 * WORD.DAT 合成全表：565 条 × 10B。
 * 约定：条目 i 文本 = `<段标记><i>`，persons 段用「灵<i>」中文（GBK 双字节轴）；
 * 尾部不足 10B 用空格补齐（产品先剥尾空格再解码）。另含三条特殊轴（见 word.boundaries）。
 */
const WORD_SEGMENT_TABLE: ReadonlyArray<{ mark: string; start: number; count: number }> = [
  { mark: 's', start: 0, count: 36 }, // system
  { mark: 'p', start: 36, count: 6 }, // persons
  { mark: 'b', start: 42, count: 19 }, // battleUi
  { mark: 'i', start: 61, count: 235 }, // items
  { mark: 'm', start: 296, count: 102 }, // spells
  { mark: 'e', start: 398, count: 153 }, // enemies
  { mark: 'x', start: 551, count: 14 }, // scenes（毒素/特殊）
]

export function wordEntryText(index: number): string {
  const segment = WORD_SEGMENT_TABLE.find((s) => index >= s.start && index < s.start + s.count)!
  // 尾缀 'q'：条目永不以 '1' 结尾，段界断言可直用字面值；剥尾 '1' 语义由专门轴测试
  if (segment.mark === 'p') return `灵${index}q`
  return `${segment.mark}${index}q`
}

/** 565×10 完整 WORD.DAT（条目文本 + 尾空格补齐到 10B）。 */
export function wordDat(): Uint8Array {
  const out = new Uint8Array(565 * 10)
  for (let i = 0; i < 565; i++) {
    const encoded = gbk(wordEntryText(i))
    out.set(encoded, i * 10)
    for (let pad = encoded.byteLength; pad < 10; pad++) out[i * 10 + pad] = 0x20
  }
  return out
}

/** M.MSG 合成正文 + 偏移表（含空条与 sentinel：末 offset 是末条终点，不另产消息）。 */
export function msgRegion(): { bytes: Uint8Array; offsets: Uint32Array } {
  const bytes = concatBytes([gbk('甲'), gbk('乙丙'), gbk(''), gbk('丁'), gbk('尾哨兵不产出')])
  // 甲@0..2 乙丙@2..6 (空)@6 丁@6..8 尾哨兵@8..（不读）
  const offsets = new Uint32Array([0, 2, 6, 6, 8])
  return { bytes, offsets }
}
