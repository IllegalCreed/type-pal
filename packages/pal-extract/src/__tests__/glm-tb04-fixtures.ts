/**
 * TEST-PAL-TABLES-COVERAGE-1 test-only fixture（TB-04，pal-extract 表格/文本自包含输入）。
 * 只放独立 LE 字节/合法 MKF/GBK 构造与视图小工具；预期值手列，不导入被测偏移反算；
 * 输入前后留保护字节、实际输入不变。GBK 编码用 iconv-lite（与产品解码同库的逆操作）。
 */
import iconv from 'iconv-lite'

/** u16 LE 帧造器（收尾 pad 到偶数由调用方决定）。 */
export function u16Bytes(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 2)
  const view = new DataView(out.buffer)
  values.forEach((value, index) => {
    view.setUint16(index * 2, value & 0xffff, true)
  })
  return out
}

export function u32Bytes(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4)
  const view = new DataView(out.buffer)
  values.forEach((value, index) => {
    view.setUint32(index * 4, value >>> 0, true)
  })
  return out
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

/** 合法 MKF 容器：N+1 个 u32 LE offset（头长 4 对齐；chunk 严格相邻递增）。 */
export function mkfContainer(chunks: readonly Uint8Array[]): Uint8Array {
  const headerBytes = (chunks.length + 1) * 4
  const offsets: number[] = [headerBytes]
  for (const chunk of chunks) offsets.push(offsets[offsets.length - 1]! + chunk.byteLength)
  const header = u32Bytes(...offsets)
  return concatBytes([header, ...chunks])
}

/** GBK 编码（产品 decodeGbk 的逆；纯 ASCII 输入等价手写）。 */
export function gbk(text: string): Uint8Array {
  return iconv.encode(text, 'gbk')
}

/** SSS 五 chunk 合成数据：两条非对称 16 字段 EO + 两 scene + WORD 数组 + u32 表 + 3 条字节码。 */
export function sssChunks(): Uint8Array[] {
  const eo0 = u16Bytes(
    0x8000, // vanishTime = -32768 (signed)
    0xffff, // x（unsigned 高位）
    0x1234, // y
    0xfffe, // layer = -2 (signed)
    0x000a, // triggerScript
    0x000b, // autoScript
    0xfffb, // state = -5 (signed)
    0x00c3, // triggerMode
    0x0abc, // spriteNum
    0x0003, // nSpriteFrames
    0x0002, // direction
    0x0001, // currentFrameNum
    0x0009, // scriptIdleFrame
    0x0fed, // spritePtrOffset
    0x0012, // nSpriteFramesAuto
    0x0034, // scriptIdleFrameCountAuto
  )
  const eo1 = u16Bytes(
    0x7fff, // vanishTime = 32767
    0x0001,
    0x0002,
    0x0001, // layer = 1
    0x1110,
    0x2220,
    0x0002, // state
    0x0004,
    0x0005,
    0x0006,
    0x0007,
    0x0008,
    0x0009,
    0x000a,
    0x000b,
    0x000c,
  )
  const scene0 = u16Bytes(0x0102, 0x0304, 0x0506, 0x0708)
  const scene1 = u16Bytes(0x1122, 0x3344, 0x5566, 0x7788)
  const objects = u16Bytes(0x0001, 0x8000, 0xfffe, 0x7fff, 0x1234, 0xabcd)
  const messageOffsets = u32Bytes(0, 3, 3, 7, 0x0000beef)
  const bytecode = concatBytes([
    u16Bytes(0x0001, 0x0011, 0x0022, 0x0033),
    u16Bytes(0x00ff, 0x0111, 0x0222, 0x0333),
    u16Bytes(0x8000, 0x0444, 0x0555, 0x0666),
  ])
  return [
    concatBytes([eo0, eo1]), // 64B = 2 × 32
    concatBytes([scene0, scene1]), // 16B = 2 × 8
    objects,
    messageOffsets,
    bytecode, // 24B = 3 × 8
  ]
}

/**
 * WORD.DAT 合成全表：565 条 × 10B。
 * 约定：条目 i 文本 = `<段标记><i>`，persons 段用「灵<i>」中文（GBK 双字节轴）；
 * 尾部不足 10B 用空格补齐（产品先剥尾空格再解码）。另含三条特殊轴（见 word.boundaries）。
 */
export const WORD_SEGMENT_TABLE: ReadonlyArray<{ mark: string; start: number; count: number }> = [
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

/** M.MSG 合成正文 + 偏移表（含空条与 sentinel：末 offset 只作下界，不产出消息）。 */
export function msgRegion(): { bytes: Uint8Array; offsets: Uint32Array } {
  const bytes = concatBytes([gbk('甲'), gbk('乙丙'), gbk(''), gbk('丁'), gbk('尾哨兵不产出')])
  // 甲@0..2 乙丙@2..6 (空)@6 丁@6..8 尾哨兵@8..（不读）
  const offsets = new Uint32Array([0, 2, 6, 6, 8])
  return { bytes, offsets }
}

/** 全量 OBJECT 物品段输入：(61+235)×14B，七 WORD 每条各异（串位/别名即检出）。 */
export function itemsObjectBytes(): Uint8Array {
  const total = (61 + 235) * 14
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  for (let id = 0; id < 61 + 235; id++) {
    const base = id * 14
    // 七 WORD 互异且随 id 变化；flags 轴在 61..294 内轮流点亮六基础位与六装备位之一
    view.setUint16(base + 0, (id * 7 + 1) & 0xffff, true) // bitmap
    view.setUint16(base + 2, (id * 11 + 2) & 0xffff, true) // price
    view.setUint16(base + 4, (id * 13 + 3) & 0xffff, true) // scriptOnUse
    view.setUint16(base + 6, (id * 17 + 4) & 0xffff, true) // scriptOnEquip
    view.setUint16(base + 8, (id * 19 + 5) & 0xffff, true) // scriptOnThrow
    view.setUint16(base + 10, (id * 23 + 6) & 0xffff, true) // scriptDesc
    const local = id - 61
    let flags = 0
    if (local >= 0 && local < 234) {
      flags = 1 << (local % 6) // 六基础 flag 一热
      flags |= 1 << (6 + (local % 6)) // 六装备位一热（同一 role 号）
    } else {
      flags = 0x2a // 295（梦蛇）非物品段位形，不参与断言
    }
    view.setUint16(base + 12, flags, true)
  }
  return out
}

export function expectedItemWords(id: number): [number, number, number, number, number, number] {
  return [
    (id * 7 + 1) & 0xffff,
    (id * 11 + 2) & 0xffff,
    (id * 13 + 3) & 0xffff,
    (id * 17 + 4) & 0xffff,
    (id * 19 + 5) & 0xffff,
    (id * 23 + 6) & 0xffff,
  ]
}

/** 商店 3×18B：空首槽 / 首 0 截断 / 满 9 并存。 */
export function storesBytes(): Uint8Array {
  const record = (items: number[]): Uint8Array => {
    const out = new Uint8Array(18)
    const view = new DataView(out.buffer)
    items.forEach((item, index) => {
      view.setUint16(index * 2, item, true)
    })
    return out
  }
  return concatBytes([
    record([0, 90, 91, 92, 93, 94, 95, 96, 97]), // 首槽空 → items []
    record([201, 202, 0, 203, 204, 205, 206, 207, 208]), // 首 0 截断 → [201,202]
    record([301, 302, 303, 304, 305, 306, 307, 308, 309]), // 满 9 无 0
  ])
}

/** 战场 2×12B：unsigned 高位 screenWave + 五维 signed 正负极值。 */
export function battleFieldsBytes(): Uint8Array {
  return concatBytes([
    u16Bytes(0xffff, 0x0001, 0xfffe, 0x7fff, 0x8000, 0x0000),
    u16Bytes(0x0100, 0x8001, 0x0002, 0xfffd, 0x0064, 0xff9c),
  ])
}

/** 敌队 2×10B：两 OBJECT 映同 enemyId、0/0xFFFF 槽、缺映射槽。 */
export function enemyTeamsBytes(): Uint8Array {
  return concatBytes([u16Bytes(400, 401, 0, 0xffff, 402), u16Bytes(0xffff, 402, 403, 0, 0)])
}

/** DATA.MKF chunk 6 学习表 20 条 × 5 角色 × 4B（level/magic 随 entry、role 双向异）。 */
export function levelUpMagicBytes(): Uint8Array {
  const out = new Uint8Array(20 * 5 * 4)
  const view = new DataView(out.buffer)
  for (let e = 0; e < 20; e++) {
    for (let r = 0; r < 5; r++) {
      const off = (e * 5 + r) * 4
      view.setUint16(off, e * 5 + r + 1, true) // level
      view.setUint16(off + 2, e * 7 + r + 2, true) // magic
    }
  }
  return out
}

/** chunk 14 经验表 100 WORD（值 = i*3+1）。 */
export function levelUpExpBytes(): Uint8Array {
  const out = new Uint8Array(200)
  const view = new DataView(out.buffer)
  for (let i = 0; i < 100; i++) view.setUint16(i * 2, i * 3 + 1, true)
  return out
}

/** chunk 11 战斗效果索引 20 WORD（值 = i*5+3）。 */
export function battleEffectBytes(): Uint8Array {
  const out = new Uint8Array(40)
  const view = new DataView(out.buffer)
  for (let i = 0; i < 20; i++) view.setUint16(i * 2, i * 5 + 3, true)
  return out
}

/** chunk 13 敌位 100B：坐标 k=(enemyIdx*5+maxIdx) → x=k*2+1, y=k*2+2（非对称，转置即检出）。 */
export function enemyPosBytes(): Uint8Array {
  const out = new Uint8Array(100)
  const view = new DataView(out.buffer)
  for (let k = 0; k < 25; k++) {
    view.setUint16(k * 4, k * 2 + 1, true)
    view.setUint16(k * 4 + 2, k * 2 + 2, true)
  }
  return out
}

export function expectedEnemyPos(enemyIdx: number, maxIdx: number): { x: number; y: number } {
  const k = enemyIdx * 5 + maxIdx
  return { x: k * 2 + 1, y: k * 2 + 2 }
}
