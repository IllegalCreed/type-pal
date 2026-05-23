/**
 * 数据表解析测试 —— 物品 / 法术 / 敌人。
 *
 * 数据来源:
 *   SSS.MKF chunk 2  — OBJECT 数组(物品 & 法术 & 敌人对象)
 *   DATA.MKF chunk 1 — ENEMY 结构体数组
 *   DATA.MKF chunk 4 — MAGIC 结构体数组
 *   WORD.DAT         — 名称表
 *
 * 参考 reference/sdlpal/global.c::PAL_LoadDefaultGame 中的 LOAD_DATA 调用:
 *   line 293: ENEMY  ← DATA.MKF chunk 1
 *   line 296: MAGIC  ← DATA.MKF chunk 4
 *   line 408: OBJECT ← SSS.MKF chunk 2
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { openMkf, readChunk } from '../io/mkf.js'
import { parseWordDat } from '../io/word.js'
import { parseEnemies, parseItems, parseMagicTable, parseSpells } from './tables.js'

const SSS_MKF = resolve(__dirname, '../../../../data/raw/SSS.MKF')
const DATA_MKF = resolve(__dirname, '../../../../data/raw/DATA.MKF')
const WORD_DAT = resolve(__dirname, '../../../../data/raw/WORD.DAT')

// 共享 fixture:只读一次文件
const sssMkf = openMkf(new Uint8Array(readFileSync(SSS_MKF)))
const dataMkf = openMkf(new Uint8Array(readFileSync(DATA_MKF)))
const words = parseWordDat(new Uint8Array(readFileSync(WORD_DAT)))

// SSS.MKF chunk 2 = OBJECT 数组 (物品/法术/敌人均在此)
const objBuf = readChunk(sssMkf, 2)
// DATA.MKF chunk 1 = ENEMY 结构体 (global.c line 293)
const enemyBuf = readChunk(dataMkf, 1)
// DATA.MKF chunk 4 = MAGIC 结构体 (global.c line 296)
const magicBuf = readChunk(dataMkf, 4)

describe('parseItems', () => {
  const items = parseItems(objBuf, words)

  it('解出 235 条物品', () => {
    expect(items).toHaveLength(235)
  })

  it('第一条带 _name(注释)', () => {
    expect(items[0]!._name).toBeTruthy()
  })

  it('id 从 0 顺序递增', () => {
    expect(items[0]!.id).toBe(0)
    expect(items[234]!.id).toBe(234)
  })

  it('至少有一条价格 > 0', () => {
    const anyPriced = items.some((it) => it.price > 0)
    expect(anyPriced).toBe(true)
  })

  it('第一条物品价格为 150(item[0])', () => {
    // 实测:item[0].price=150
    expect(items[0]!.price).toBe(150)
  })

  it('flags 已拆为 ItemFlags 具名 bool', () => {
    const it0 = items[0]!
    expect(typeof it0.flags.usable).toBe('boolean')
    expect(typeof it0.flags.equipable).toBe('boolean')
    expect(it0.flags.equipableBy).toHaveLength(6)
  })

  it('至少一条 usable + scriptOnUse 非零(可用品)', () => {
    const usableItems = items.filter((it) => it.flags.usable && it.scriptOnUse !== 0)
    expect(usableItems.length).toBeGreaterThan(0)
  })

  it('scriptDesc 字段被解析(至少一条非零)', () => {
    const anyDesc = items.some((it) => it.scriptDesc !== 0)
    expect(anyDesc).toBe(true)
  })

  it('without words(不传 words)→ 所有 _name undefined,其他字段正常', () => {
    const itemsNoName = parseItems(objBuf)
    expect(itemsNoName).toHaveLength(235)
    expect(itemsNoName.every((it) => it._name === undefined)).toBe(true)
    // 字段仍正常 dump
    expect(itemsNoName[0]!.price).toBe(150)
  })

  it('flag bit 顺序对(fake fixture:usable + equipable)', () => {
    // 构造一片够大的 fake bytes(支持 235 条 item),在 ITEM_OBJ_START=61 位置写入特定 flags
    const fake = new Uint8Array((61 + 235) * 14)
    const view = new DataView(fake.buffer)
    // bit 0 (usable) + bit 1 (equipable) = 0b0000_0011
    view.setUint16(61 * 14 + 12, 0b0000_0011, true)
    const fakeItems = parseItems(fake)
    expect(fakeItems[0]!.id).toBe(0)
    expect(fakeItems[0]!.flags.usable).toBe(true)
    expect(fakeItems[0]!.flags.equipable).toBe(true)
    expect(fakeItems[0]!.flags.throwable).toBe(false)
    expect(fakeItems[0]!.flags.consuming).toBe(false)
  })

  it('equipableBy bit 6..11 对(fake fixture:全 6 个 role)', () => {
    // bit 6 + 7 + 8 + 9 + 10 + 11 = 0b1111_1100_0000 = 0xFC0
    const fake = new Uint8Array((61 + 235) * 14)
    const view = new DataView(fake.buffer)
    view.setUint16(61 * 14 + 12, 0xfc0, true)
    const fakeItems = parseItems(fake)
    expect(fakeItems[0]!.flags.equipableBy).toEqual([true, true, true, true, true, true])
    // bit 0..5 都应为 false
    expect(fakeItems[0]!.flags.usable).toBe(false)
  })

  it('截断时 throw(T5 review #1 修:与 parseEnemies / parseMagicTable 一致)', () => {
    const tiny = new Uint8Array(100)
    expect(() => parseItems(tiny)).toThrow(/truncated/)
  })
})

describe('parseSpells (M3 T6)', () => {
  const spells = parseSpells(objBuf, words)

  it('解出 102 条法术 wrapper', () => {
    expect(spells).toHaveLength(102)
  })

  it('第一条带 _name(注释)', () => {
    expect(spells[0]!._name).toBeTruthy()
  })

  it('id 从 0 顺序递增', () => {
    expect(spells[0]!.id).toBe(0)
    expect(spells[101]!.id).toBe(101)
  })

  it('flags 已拆为 SpellFlags 具名 bool', () => {
    const s0 = spells[0]!
    expect(typeof s0.flags.usableOutsideBattle).toBe('boolean')
    expect(typeof s0.flags.usableInBattle).toBe('boolean')
    expect(typeof s0.flags.usableToEnemy).toBe('boolean')
    expect(typeof s0.flags.applyToAll).toBe('boolean')
  })

  it('第一条法术 magicNumber = 33(实测)', () => {
    // spell[0].wMagicNumber=33 → MAGIC[33].wCostMP=6 (T5 之前用此值断言)
    expect(spells[0]!.magicNumber).toBe(33)
  })

  it('至少一条 magicNumber > 0(指向 Magic table)', () => {
    const anyLinked = spells.some((s) => s.magicNumber > 0)
    expect(anyLinked).toBe(true)
  })

  it('without words(不传 words)→ 所有 _name undefined,其他字段正常', () => {
    const spellsNoName = parseSpells(objBuf)
    expect(spellsNoName).toHaveLength(102)
    expect(spellsNoName.every((s) => s._name === undefined)).toBe(true)
    // 字段仍正常 dump
    expect(spellsNoName[0]!.magicNumber).toBe(33)
  })

  it('SpellFlags bit 顺序对(fake fixture)', () => {
    // 构造一片够大的 fake bytes(支持 102 条 spell),在 SPELL_OBJ_START=296 位置写入特定 flags
    // bit 0 (usableOutsideBattle) + bit 1 (usableInBattle) + bit 3 (usableToEnemy)
    // = 0b0000_1011 = 0x0B (bit 2 跳了 — sdlpal MAGICFLAG 真值)
    const fake = new Uint8Array((296 + 102) * 14)
    const view = new DataView(fake.buffer)
    view.setUint16(296 * 14 + 12, 0x0b, true)
    const fakeSpells = parseSpells(fake)
    expect(fakeSpells[0]!.flags.usableOutsideBattle).toBe(true)
    expect(fakeSpells[0]!.flags.usableInBattle).toBe(true)
    expect(fakeSpells[0]!.flags.usableToEnemy).toBe(true)
    expect(fakeSpells[0]!.flags.applyToAll).toBe(false)
  })

  it('applyToAll bit 4(fake fixture)', () => {
    // bit 4 = 0b0001_0000 = 0x10
    const fake = new Uint8Array((296 + 102) * 14)
    const view = new DataView(fake.buffer)
    view.setUint16(296 * 14 + 12, 0x10, true)
    const fakeSpells = parseSpells(fake)
    expect(fakeSpells[0]!.flags.applyToAll).toBe(true)
    expect(fakeSpells[0]!.flags.usableOutsideBattle).toBe(false)
    expect(fakeSpells[0]!.flags.usableInBattle).toBe(false)
    expect(fakeSpells[0]!.flags.usableToEnemy).toBe(false)
  })

  it('截断时 throw(与 parseEnemies / parseMagicTable 一致)', () => {
    const tiny = new Uint8Array(100)
    expect(() => parseSpells(tiny)).toThrow(/truncated/)
  })
})

describe('parseMagicTable (M3 T6)', () => {
  const magics = parseMagicTable(magicBuf)

  it('从 DATA.MKF chunk 4 解出 N 条 Magic(每条 32B)', () => {
    expect(magics.length).toBe(magicBuf.byteLength / 32)
    expect(magics.length).toBeGreaterThan(0)
  })

  it('id 从 0 顺序递增', () => {
    expect(magics[0]!.id).toBe(0)
    expect(magics[magics.length - 1]!.id).toBe(magics.length - 1)
  })

  it('至少有一条 costMP > 0', () => {
    const anyMp = magics.some((m) => m.costMP > 0)
    expect(anyMp).toBe(true)
  })

  it('Magic[33].costMP = 6(实测,spell[0] 引用)', () => {
    // T5 之前 parseSpells 用 spell[0].wMagicNumber=33 → MAGIC[33].wCostMP=6 做断言。
    // 现在 Magic 独立 dump,直接断言原值。
    expect(magics[33]!.costMP).toBe(6)
  })

  it('type 字段是 MagicType 具名 string', () => {
    const validTypes = new Set<string>([
      'normal',
      'attackAll',
      'attackWhole',
      'attackField',
      'applyToPlayer',
      'applyToParty',
      'trance',
      'summon',
      'other',
    ])
    for (const m of magics) {
      expect(validTypes.has(m.type)).toBe(true)
    }
  })

  it('至少一条 type = "normal"(实测,大部分 Magic 默认 normal)', () => {
    const anyNormal = magics.some((m) => m.type === 'normal')
    expect(anyNormal).toBe(true)
  })

  it('完整 16 字段全部存在', () => {
    const m = magics[33]!
    const keys = Object.keys(m).sort()
    expect(keys).toContain('effect')
    expect(keys).toContain('type')
    expect(keys).toContain('xOffset')
    expect(keys).toContain('yOffset')
    expect(keys).toContain('special')
    expect(keys).toContain('speed')
    expect(keys).toContain('keepEffect')
    expect(keys).toContain('fireDelay')
    expect(keys).toContain('effectTimes')
    expect(keys).toContain('shake')
    expect(keys).toContain('wave')
    expect(keys).toContain('unknown')
    expect(keys).toContain('costMP')
    expect(keys).toContain('baseDamage')
    expect(keys).toContain('elemental')
    expect(keys).toContain('sound')
  })

  it('signed 字段(speed / sound)可负(fake fixture:0xFFFF → -1)', () => {
    // 32B fake record,在 speed(offset 10) / sound(offset 30) 位置写入 0xFFFF
    const fake = new Uint8Array(32)
    const view = new DataView(fake.buffer)
    view.setUint16(10, 0xffff, true) // speed
    view.setUint16(30, 0xffff, true) // sound
    const fakeMagics = parseMagicTable(fake)
    expect(fakeMagics[0]!.speed).toBe(-1)
    expect(fakeMagics[0]!.sound).toBe(-1)
  })

  it('type 6 / 7 / >9 → "other" 兜底(fake fixture)', () => {
    const fake = new Uint8Array(32 * 3)
    const view = new DataView(fake.buffer)
    view.setUint16(0 * 32 + 2, 6, true) // type 6
    view.setUint16(1 * 32 + 2, 7, true) // type 7
    view.setUint16(2 * 32 + 2, 99, true) // type 99
    const fakeMagics = parseMagicTable(fake)
    expect(fakeMagics[0]!.type).toBe('other')
    expect(fakeMagics[1]!.type).toBe('other')
    expect(fakeMagics[2]!.type).toBe('other')
  })

  it('截断时 throw', () => {
    // 非 32 倍数 → throw
    const tiny = new Uint8Array(31)
    expect(() => parseMagicTable(tiny)).toThrow(/不能被.*整除/)
  })
})

describe('parseEnemies (M3 D28 全字段)', () => {
  const enemies = parseEnemies(enemyBuf, objBuf, words)

  it('解出 154 条 ENEMY 记录(DATA.MKF chunk 1 / 70B)', () => {
    // 实测:chunk 1 = 10780 字节 / 70 = 154 条(index 0 = 空 placeholder)
    expect(enemies).toHaveLength(154)
  })

  it('id 从 0 顺序递增', () => {
    expect(enemies[0]!.id).toBe(0)
    expect(enemies[153]!.id).toBe(153)
  })

  it('至少有一条 health > 0', () => {
    const anyHp = enemies.some((e) => e.health > 0)
    expect(anyHp).toBe(true)
  })

  it('elemResistance 是 5 个具名字段(wind/thunder/water/fire/earth)', () => {
    const e = enemies.find((x) => x.health > 0)!
    expect(e.elemResistance).toHaveProperty('wind')
    expect(e.elemResistance).toHaveProperty('thunder')
    expect(e.elemResistance).toHaveProperty('water')
    expect(e.elemResistance).toHaveProperty('fire')
    expect(e.elemResistance).toHaveProperty('earth')
  })

  it('signed 字段真能为负(0xFFFF → -1,modifier 语义)', () => {
    // sdlpal fight.c:4634 把 wAttackStrength 强制 cast SHORT;
    // M1 简化版误把这些当 unsigned dump,验证修复:至少一条 attackStrength < 0。
    const negStr = enemies.some((e) => e.attackStrength < 0)
    expect(negStr).toBe(true)
  })

  it('_name 可通过 OBJECT_ENEMY + words 反向填(对于战斗中真实出现的怪)', () => {
    // 至少一条 enemy(被 OBJECT_ENEMY 引用的)有 _name
    const named = enemies.some((e) => e._name && e._name.length > 0)
    expect(named).toBe(true)
  })

  it('without objBuf/words:所有 _name 都是 undefined,其他字段照常解析', () => {
    // parseEnemies 的 objBuf/words 是 optional;只传 enemyBuf 的代码路径覆盖。
    const enemiesNoName = parseEnemies(enemyBuf)
    expect(enemiesNoName).toHaveLength(154)
    expect(enemiesNoName.every((e) => e._name === undefined)).toBe(true)
    // 字段仍然正常 dump:至少一条 health > 0,signed 字段仍可为负
    expect(enemiesNoName.some((e) => e.health > 0)).toBe(true)
    expect(enemiesNoName.some((e) => e.attackStrength < 0)).toBe(true)
  })

  it('完整 30+ 字段全部存在', () => {
    const e = enemies.find((x) => x.health > 0)!
    const keys = Object.keys(e).sort()
    // 关键字段抽查
    expect(keys).toContain('idleFrames')
    expect(keys).toContain('attackStrength')
    expect(keys).toContain('elemResistance')
    expect(keys).toContain('collectValue')
    expect(keys).toContain('dualMove')
    expect(keys).toContain('physicalResistance')
  })
})
