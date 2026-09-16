/**
 * TEST-FOUNDATION-COVERAGE-1 C3：法术 wrapper（OBJECT_MAGIC 段）/ MAGIC 表（chunk 4）
 * / object 三视图边界（spells.ts:38-320）。合成字节；OBJECT 与 MAGIC 表不混用：
 * parseSpells 吃 SSS chunk2 OBJECT 段，parseMagicTable 吃 DATA chunk4 32B 记录。
 */
import { describe, expect, test } from 'vitest'
import { parseMagicTable, parseObjectMagics, parseSpells } from '../spells.js'
import { mkTable, mkWords } from './glm-foundation-fixtures.js'

const OBJ_SIZE = 14
const SPELL_OBJ_START = 296
const SPELL_COUNT = 102
const MENGSHE_OBJ_ID = 295
const OBJ_BYTES = (SPELL_OBJ_START + SPELL_COUNT) * OBJ_SIZE
const MAGIC_SIZE = 32

describe('parseSpells · OBJECT_MAGIC 段', () => {
  test('非空正控：flags 位拆解 + id=wObjectID + 末尾追加梦蛇 295', () => {
    const writes: Array<[number, number]> = [
      // 段首 spell id296：magicNumber=7,scriptOnSuccess=100,scriptOnUse=200,scriptDesc=300,flags=0b10011
      [SPELL_OBJ_START * OBJ_SIZE + 0, 7],
      [SPELL_OBJ_START * OBJ_SIZE + 4, 100],
      [SPELL_OBJ_START * OBJ_SIZE + 6, 200],
      [SPELL_OBJ_START * OBJ_SIZE + 10, 300],
      [SPELL_OBJ_START * OBJ_SIZE + 12, 0b10011], // 外用|战内|敌用|全体
      // 末段 spell id397：flags=0b10（仅战内）
      [(SPELL_OBJ_START + SPELL_COUNT - 1) * OBJ_SIZE + 12, 0b10],
      // 梦蛇 295：flags=0b1（仅外用）
      [MENGSHE_OBJ_ID * OBJ_SIZE + 12, 0b1],
    ]
    const words = mkWords({
      items: Array.from({ length: 235 }, (_, i) => `物${i}`),
      spells: Array.from({ length: SPELL_COUNT }, (_, i) => `术${i}`),
    })
    const out = parseSpells(mkTable(OBJ_BYTES, writes), words)
    expect(out).toHaveLength(SPELL_COUNT + 1) // 102 段内 + 梦蛇
    expect(out[0]!.id).toBe(296)
    expect(out[0]!.magicNumber).toBe(7)
    expect(out[0]!.scriptOnSuccess).toBe(100)
    expect(out[0]!.scriptOnUse).toBe(200)
    expect(out[0]!.scriptDesc).toBe(300)
    expect(out[0]!.flags).toEqual({
      usableOutsideBattle: true,
      usableInBattle: true,
      usableToEnemy: false, // 0b10011 = bit0|bit1|bit4，bit3 未置
      applyToAll: true,
    })
    expect(out[0]!._name).toBe('术0')
    const last = out[SPELL_COUNT - 1]!
    expect(last.id).toBe(397)
    expect(last.flags).toEqual({
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: false,
    })
    const mengshe = out.at(-1)!
    expect(mengshe.id).toBe(295)
    expect(mengshe.flags.usableOutsideBattle).toBe(true)
    expect(mengshe.flags.usableInBattle).toBe(false)
  })
  test('截断：< (296+102)×14B 拒绝', () => {
    expect(() => parseSpells(mkTable(OBJ_BYTES - 1, []))).toThrow(/truncated/)
  })
})

describe('parseObjectMagics · 全 OBJECT 数组 magic 视图', () => {
  test('逐 14B 遍历，id=绝对下标，count=floor(len/14)（尾部半条不计）', () => {
    const buf = mkTable(OBJ_SIZE * 3 + 6, [
      [0, 5], // id0 magicNumber
      [2 * OBJ_SIZE + 12, 0b1000], // id2 flags=usableToEnemy(bit3)
    ])
    const views = parseObjectMagics(buf)
    expect(views).toHaveLength(3)
    expect(views[0]!.id).toBe(0)
    expect(views[0]!.magicNumber).toBe(5)
    expect(views[2]!.flags.usableToEnemy).toBe(true)
    expect(views[1]!.magicNumber).toBe(0)
  })
})

describe('parseMagicTable · DATA chunk 4（32B/条）', () => {
  test('字段映射：type 枚举与 other 兜底、signed speed/sound', () => {
    const writes: Array<[number, number]> = [
      [0, 1], // effect
      [2, 9], // type=9 → summon
      [4, 12], // xOffset
      [6, -8 & 0xffff], // yOffset(u16 原样)
      [8, 77], // special(union raw)
      [10, 0xffff], // speed(SHORT → -1)
      [24, 40], // costMP
      [26, 250], // baseDamage
      [28, 2], // elemental
      [30, 0xffff], // sound(SHORT → -1)
      // 第二条 type=6 → 'other' 兜底
      [MAGIC_SIZE + 2, 6],
    ]
    const out = parseMagicTable(mkTable(MAGIC_SIZE * 2, writes))
    expect(out).toHaveLength(2)
    expect(out[0]!.type).toBe('summon')
    expect(out[0]!.speed).toBe(-1)
    expect(out[0]!.sound).toBe(-1)
    expect(out[0]!.costMP).toBe(40)
    expect(out[0]!.baseDamage).toBe(250)
    expect(out[1]!.type).toBe('other')
  })
  test('长度不能被 32 整除：已定义拒绝', () => {
    expect(() => parseMagicTable(mkTable(MAGIC_SIZE + 1, []))).toThrow(
      /不能被 MAGIC_SIZE=32 整除/,
    )
  })
  test('零长度 → 空数组（合法边界）', () => {
    expect(parseMagicTable(Uint8Array.of())).toEqual([])
  })
})
