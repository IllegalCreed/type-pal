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
import {
  buildEnemyObjectNameMap,
  buildObjectIndexToEnemyIdMap,
  parseBattleFields,
  parseEnemies,
  parseEnemyTeams,
  parseItems,
  parseMagicTable,
  parseObjectMagics,
  parseObjectPlayers,
  parseObjectPoisons,
  parsePlayerRoles,
  parseSpells,
  parseStores,
} from './tables.js'

const SSS_MKF = resolve(__dirname, '../../../../data/raw/SSS.MKF')
const DATA_MKF = resolve(__dirname, '../../../../data/raw/DATA.MKF')
const WORD_DAT = resolve(__dirname, '../../../../data/raw/WORD.DAT')

// 共享 fixture:只读一次文件
const dataMkfBytes = new Uint8Array(readFileSync(DATA_MKF))
const sssMkf = openMkf(new Uint8Array(readFileSync(SSS_MKF)))
const dataMkf = openMkf(dataMkfBytes)
const words = parseWordDat(new Uint8Array(readFileSync(WORD_DAT)))

// SSS.MKF chunk 2 = OBJECT 数组 (物品/法术/敌人均在此)
const objBuf = readChunk(sssMkf, 2)
// DATA.MKF chunk 1 = ENEMY 结构体 (global.c line 293)
const enemyBuf = readChunk(dataMkf, 1)
// DATA.MKF chunk 4 = MAGIC 结构体 (global.c line 296)
const magicBuf = readChunk(dataMkf, 4)
// DATA.MKF chunk 2 = ENEMYTEAM 数组 (global.c line 294)
const teamBuf = readChunk(dataMkf, 2)
// DATA.MKF chunk 5 = BATTLEFIELD 数组 (global.c line 297)
const fieldBuf = readChunk(dataMkf, 5)
// DATA.MKF chunk 0 = STORE 商店表 (global.c line 292)
const storeBuf = readChunk(dataMkf, 0)

describe('parseItems', () => {
  const items = parseItems(objBuf, words)

  it('解出 235 条物品', () => {
    expect(items).toHaveLength(235)
  })

  it('第一条带 _name(注释)', () => {
    expect(items[0]!._name).toBeTruthy()
  })

  it('id = wObjectID(61..295,2026-05-29 id 体系统一)', () => {
    expect(items[0]!.id).toBe(61)     // ITEM_OBJ_START
    expect(items[234]!.id).toBe(295)  // 61 + 234
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
    expect(fakeItems[0]!.id).toBe(61) // wObjectID = ITEM_OBJ_START + 0
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

  it('id = wObjectID(296..397,2026-05-29 id 体系统一)', () => {
    expect(spells[0]!.id).toBe(296)   // SPELL_OBJ_START
    expect(spells[101]!.id).toBe(397) // 296 + 101
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

describe('parseObjectMagics (rgObject magic-union 视图,0x42 SimulateMagic)', () => {
  const objMagics = parseObjectMagics(objBuf)

  it('覆盖整个 OBJECT 数组(每条 14B)', () => {
    expect(objMagics.length).toBe(Math.floor(objBuf.byteLength / 14))
    expect(objMagics.length).toBeGreaterThan(397) // 至少覆盖到法术段尾
    // id = 数组绝对 index
    expect(objMagics[0]!.id).toBe(0)
    expect(objMagics[24]!.id).toBe(24)
    expect(objMagics[349]!.id).toBe(349)
  })

  it('法术段 [296..397] 与 parseSpells 逐字段一致(magicNumber/scripts/flags)', () => {
    const spells = parseSpells(objBuf)
    for (let id = 296; id <= 397; id++) {
      const v = objMagics[id]!
      const s = spells[id - 296]!
      expect(v.magicNumber).toBe(s.magicNumber)
      expect(v.scriptOnUse).toBe(s.scriptOnUse)
      expect(v.scriptOnSuccess).toBe(s.scriptOnSuccess)
      expect(v.flags).toEqual(s.flags)
    }
  })

  it('object 349(天师符法,0x42 op0 真实引用)→ magicNumber 54', () => {
    expect(objMagics[349]!.magicNumber).toBe(54)
  })

  it('object 24(梅花镖/银针/卵 共用,0x42 op0=24)可解析 —— 与原始字节一致', () => {
    // 直接从 objBuf 读 OBJECT_MAGIC offset(wMagicNumber@0, wFlags@12),独立核对 parser
    const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
    const rawMagicNumber = view.getUint16(24 * 14 + 0, true)
    expect(objMagics[24]!.magicNumber).toBe(rawMagicNumber)
    // 该 magicNumber 必须 > 0(真指向 magic.json 一条),否则 65% 投掷物算不出伤害
    expect(objMagics[24]!.magicNumber).toBeGreaterThan(0)
  })

  it('fake fixture:applyToAll(bit4)+ magicNumber offset 对', () => {
    const fake = new Uint8Array(64 * 14)
    const view = new DataView(fake.buffer)
    view.setUint16(24 * 14 + 0, 0x37, true) // wMagicNumber@0 = 55
    view.setUint16(24 * 14 + 12, 0x10, true) // wFlags@12 = applyToAll
    const parsed = parseObjectMagics(fake)
    expect(parsed[24]!.magicNumber).toBe(0x37)
    expect(parsed[24]!.flags.applyToAll).toBe(true)
    expect(parsed[24]!.flags.usableInBattle).toBe(false)
  })
})

describe('parseObjectPoisons (rgObject poison-union 视图,0x28 apply poison)', () => {
  const poisons = parseObjectPoisons(objBuf)

  it('覆盖整个 OBJECT 数组(每条 14B)', () => {
    expect(poisons.length).toBe(Math.floor(objBuf.byteLength / 14))
    expect(poisons[551]!.id).toBe(551)
  })

  it('poison object 551(0x28 op1 真实引用)enemyScript 与原始字节一致', () => {
    // tagOBJECT_POISON:wEnemyScript@8
    const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
    expect(poisons[551]!.enemyScript).toBe(view.getUint16(551 * 14 + 8, true))
    expect(poisons[551]!.level).toBe(view.getUint16(551 * 14 + 0, true))
  })

  it('fake fixture:wEnemyScript@8 / wPoisonLevel@0 offset 对', () => {
    const fake = new Uint8Array(600 * 14)
    const view = new DataView(fake.buffer)
    view.setUint16(555 * 14 + 0, 3, true) // level
    view.setUint16(555 * 14 + 8, 12345, true) // enemyScript
    const parsed = parseObjectPoisons(fake)
    expect(parsed[555]!.level).toBe(3)
    expect(parsed[555]!.enemyScript).toBe(12345)
  })
})

describe('parseObjectPlayers (rgObject player-union 视图,队友死亡/濒死脚本)', () => {
  const players = parseObjectPlayers(objBuf)

  it('解出 6 条 OBJECT_PLAYER(36..41)', () => {
    expect(players).toHaveLength(6)
    expect(players.map((p) => p.id)).toEqual([36, 37, 38, 39, 40, 41])
  })

  it('真实数据含队友死亡/濒死脚本入口', () => {
    expect(players.some((p) => p.scriptOnFriendDeath > 0)).toBe(true)
    expect(players.some((p) => p.scriptOnDying > 0)).toBe(true)
  })

  it('fake fixture:wScriptOnFriendDeath@4 / wScriptOnDying@6 offset 对', () => {
    const fake = new Uint8Array((36 + 6) * 14)
    const view = new DataView(fake.buffer)
    view.setUint16(36 * 14 + 4, 1234, true)
    view.setUint16(36 * 14 + 6, 5678, true)
    const parsed = parseObjectPlayers(fake)
    expect(parsed[0]).toEqual({ id: 36, scriptOnFriendDeath: 1234, scriptOnDying: 5678 })
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

describe('parseEnemyTeams (M3 T7)', () => {
  const enemyNames = buildEnemyObjectNameMap(objBuf, words)
  const teams = parseEnemyTeams(teamBuf, enemyNames)

  it('从 DATA.MKF chunk 2 解出 N 条 EnemyTeam(每条 10B = 5 × WORD)', () => {
    // chunk 2 size 必须可被 10 整除
    expect(teamBuf.byteLength % 10).toBe(0)
    expect(teams.length).toBe(teamBuf.byteLength / 10)
    expect(teams.length).toBeGreaterThan(0)
  })

  it('id 从 0 顺序递增', () => {
    expect(teams[0]!.id).toBe(0)
    expect(teams[teams.length - 1]!.id).toBe(teams.length - 1)
  })

  it('每条 team 都是 5 个槽位 tuple', () => {
    for (const t of teams) {
      expect(t.enemies).toHaveLength(5)
    }
  })

  it('至少有一条 team 含 0xFFFF 空槽位(对照 sdlpal battle.c:1602)', () => {
    const anyEmpty = teams.some((t) => t.enemies.includes(0xffff))
    expect(anyEmpty).toBe(true)
  })

  it('至少有一条 team 第一槽位非空(指向 OBJECT_ENEMY 段,398-550)', () => {
    // OBJECT_ENEMY 段:398-550(ENEMY_OBJ_START=398, ENEMY_OBJ_COUNT=153)
    const anyEnemy = teams.some(
      (t) => t.enemies[0] !== 0 && t.enemies[0] !== 0xffff,
    )
    expect(anyEnemy).toBe(true)
  })

  it('至少一条 team 带 _names(反查成功)', () => {
    const named = teams.some((t) => t._names && t._names.length > 0)
    expect(named).toBe(true)
  })

  it('without enemyObjectNames:所有 _names 都是 undefined,enemies 仍正常', () => {
    const teamsNoName = parseEnemyTeams(teamBuf)
    expect(teamsNoName.length).toBe(teams.length)
    expect(teamsNoName.every((t) => t._names === undefined)).toBe(true)
    // enemies tuple 仍正常 dump
    expect(teamsNoName[0]!.enemies).toHaveLength(5)
  })

  it('fake fixture:解出 5 槽位 + 0xFFFF 空位 + 名字反查', () => {
    // 一条 team:slot 0 = 421(假设是某 OBJECT_ENEMY index), 其他 0xFFFF
    const fake = new Uint8Array(10)
    const view = new DataView(fake.buffer)
    view.setUint16(0, 421, true)
    view.setUint16(2, 0xffff, true)
    view.setUint16(4, 0xffff, true)
    view.setUint16(6, 0xffff, true)
    view.setUint16(8, 0xffff, true)
    const fakeNames = new Map<number, string>([[421, 'fake-enemy']])
    const fakeTeams = parseEnemyTeams(fake, fakeNames)
    expect(fakeTeams).toHaveLength(1)
    expect(fakeTeams[0]!.enemies).toEqual([421, 0xffff, 0xffff, 0xffff, 0xffff])
    expect(fakeTeams[0]!._names).toEqual(['fake-enemy'])
  })

  it('fake fixture:0 槽位也被 _names 反查跳过(对照 sdlpal battle.c:1602)', () => {
    const fake = new Uint8Array(10)
    const view = new DataView(fake.buffer)
    view.setUint16(0, 0, true) // 0 = 跳过
    view.setUint16(2, 0xffff, true)
    view.setUint16(4, 0xffff, true)
    view.setUint16(6, 0xffff, true)
    view.setUint16(8, 0xffff, true)
    const fakeNames = new Map<number, string>([[0, 'should-not-appear']])
    const fakeTeams = parseEnemyTeams(fake, fakeNames)
    expect(fakeTeams[0]!._names).toBeUndefined()
  })

  it('截断时 throw(非 10 倍数)', () => {
    const tiny = new Uint8Array(9)
    expect(() => parseEnemyTeams(tiny)).toThrow(/不能被.*整除/)
  })

  it('M3.30 翻译模式:传入 objectIndexToEnemyId 时,enemies tuple 槽位变 enemies.json id', () => {
    // 一条 team:slot 0 = 398(实际 OBJECT_ENEMY 段第一个),其他 0xFFFF
    const fake = new Uint8Array(10)
    const view = new DataView(fake.buffer)
    view.setUint16(0, 398, true)
    view.setUint16(2, 0xffff, true)
    view.setUint16(4, 0xffff, true)
    view.setUint16(6, 0xffff, true)
    view.setUint16(8, 0xffff, true)
    const indexMap = new Map<number, number>([[398, 7]]) // OBJECT 398 → enemy.id 7
    const fakeTeams = parseEnemyTeams(fake, undefined, indexMap)
    expect(fakeTeams[0]!.enemies).toEqual([7, 0xffff, 0xffff, 0xffff, 0xffff])
    expect(fakeTeams[0]!.enemyObjectIndexes).toEqual([398, 0xffff, 0xffff, 0xffff, 0xffff])
  })

  it('M3.30 翻译模式:OBJECT 索引不在 map 中 → 槽位标 0xFFFF + warn', () => {
    const fake = new Uint8Array(10)
    const view = new DataView(fake.buffer)
    view.setUint16(0, 999, true) // 999 不在 map 中
    view.setUint16(2, 0xffff, true)
    view.setUint16(4, 0xffff, true)
    view.setUint16(6, 0xffff, true)
    view.setUint16(8, 0xffff, true)
    const indexMap = new Map<number, number>()
    const fakeTeams = parseEnemyTeams(fake, undefined, indexMap)
    expect(fakeTeams[0]!.enemies[0]).toBe(0xffff)
  })

  it('M3.30 buildObjectIndexToEnemyIdMap:真原版 OBJECT_ENEMY 段映射非空 + wEnemyID 在 enemies.json 范围内', () => {
    const map = buildObjectIndexToEnemyIdMap(objBuf)
    expect(map.size).toBeGreaterThan(0)
    // 所有 key 都在 398-550 范围
    for (const [objIdx, enemyId] of map) {
      expect(objIdx).toBeGreaterThanOrEqual(398)
      expect(objIdx).toBeLessThanOrEqual(550)
      // wEnemyID 应在 enemies.json 范围(0..153)— sdlpal `lprgEnemy[wEnemyID]` 直接索引
      expect(enemyId).toBeGreaterThan(0)
      expect(enemyId).toBeLessThan(154)
    }
  })

  it('M3.30 端到端:用真原版 buildObjectIndexToEnemyIdMap 翻译 enemy-teams 后,所有非空槽位都在 enemies.json id 范围', () => {
    const indexMap = buildObjectIndexToEnemyIdMap(objBuf)
    const teamsTranslated = parseEnemyTeams(teamBuf, undefined, indexMap)
    // enemies.json 实测 154 条;非空 / 非 0xFFFF 槽位都应在 [1..153]
    for (const team of teamsTranslated) {
      expect(team.enemyObjectIndexes).toHaveLength(5)
      for (const slot of team.enemies) {
        if (slot === 0 || slot === 0xffff) continue
        expect(slot).toBeGreaterThan(0)
        expect(slot).toBeLessThan(154)
      }
    }
  })
})

describe('parseBattleFields (M3 T7)', () => {
  const fields = parseBattleFields(fieldBuf)

  it('从 DATA.MKF chunk 5 解出 N 条 BattleField(每条 12B = WORD + SHORT × 5)', () => {
    expect(fieldBuf.byteLength % 12).toBe(0)
    expect(fields.length).toBe(fieldBuf.byteLength / 12)
    expect(fields.length).toBeGreaterThan(0)
  })

  it('id 从 0 顺序递增', () => {
    expect(fields[0]!.id).toBe(0)
    expect(fields[fields.length - 1]!.id).toBe(fields.length - 1)
  })

  it('每条都含 5 元素 magicEffect(wind/thunder/water/fire/earth)', () => {
    for (const f of fields) {
      expect(f.magicEffect).toHaveProperty('wind')
      expect(f.magicEffect).toHaveProperty('thunder')
      expect(f.magicEffect).toHaveProperty('water')
      expect(f.magicEffect).toHaveProperty('fire')
      expect(f.magicEffect).toHaveProperty('earth')
    }
  })

  it('signed 字段真能为负(fake fixture:0xFFFF → -1,对照 sdlpal SHORT)', () => {
    // 12B record:wind(offset 2) = 0xFFFF → -1
    const fake = new Uint8Array(12)
    const view = new DataView(fake.buffer)
    view.setUint16(0, 10, true) // screenWave
    view.setUint16(2, 0xffff, true) // wind = -1
    view.setUint16(4, 5, true) // thunder = 5
    view.setUint16(6, 0xfffe, true) // water = -2
    view.setUint16(8, 0, true) // fire
    view.setUint16(10, 3, true) // earth
    const fakeFields = parseBattleFields(fake)
    expect(fakeFields).toHaveLength(1)
    expect(fakeFields[0]!.screenWave).toBe(10)
    expect(fakeFields[0]!.magicEffect.wind).toBe(-1)
    expect(fakeFields[0]!.magicEffect.thunder).toBe(5)
    expect(fakeFields[0]!.magicEffect.water).toBe(-2)
    expect(fakeFields[0]!.magicEffect.fire).toBe(0)
    expect(fakeFields[0]!.magicEffect.earth).toBe(3)
  })

  it('截断时 throw(非 12 倍数)', () => {
    const tiny = new Uint8Array(11)
    expect(() => parseBattleFields(tiny)).toThrow(/不能被.*整除/)
  })
})

describe('parsePlayerRoles (M3 T8)', () => {
  const playerRoles = parsePlayerRoles(dataMkfBytes, words)

  it('解出 6 个 role(MAX_PLAYER_ROLES=6)', () => {
    expect(playerRoles.roles).toHaveLength(6)
  })

  it('id 从 0..5 顺序递增', () => {
    expect(playerRoles.roles[0]!.id).toBe(0)
    expect(playerRoles.roles[5]!.id).toBe(5)
  })

  it('leader spriteNum=2(M2 实施过程发现 #5 实证)', () => {
    // M2 切片硬编码 PARTY_LEADER_SPRITE=2,实测 DATA.MKF chunk 3 第 12 个 u16(=
    // rgwSpriteNum[0])= 2。T9 删 cli.ts 硬编码后接此 dump。
    expect(playerRoles.roles[0]!.spriteNum).toBe(2)
  })

  it('6 个 spriteNum = [2, 3, 7, 525, 5, 26](实测,cli.ts 注释)', () => {
    const sprites = playerRoles.roles.map((r) => r.spriteNum)
    expect(sprites).toEqual([2, 3, 7, 525, 5, 26])
  })

  it('队长有合理 level / maxHP / maxMP(非全 0)', () => {
    const leader = playerRoles.roles[0]!
    expect(leader.level).toBeGreaterThan(0)
    expect(leader.maxHP).toBeGreaterThan(0)
    // maxMP 在游戏初始也应非 0(队长初始有法术)
    expect(leader.maxMP).toBeGreaterThan(0)
  })

  it('elemResistance 是 5 个具名字段(wind/thunder/water/fire/earth)', () => {
    const r = playerRoles.roles[0]!
    expect(r.elemResistance).toHaveProperty('wind')
    expect(r.elemResistance).toHaveProperty('thunder')
    expect(r.elemResistance).toHaveProperty('water')
    expect(r.elemResistance).toHaveProperty('fire')
    expect(r.elemResistance).toHaveProperty('earth')
  })

  it('完整 25+ 字段全部存在(M3 dump 范围)', () => {
    const r = playerRoles.roles[0]!
    const keys = Object.keys(r).sort()
    expect(keys).toContain('avatar')
    expect(keys).toContain('spriteNumInBattle')
    expect(keys).toContain('spriteNum')
    expect(keys).toContain('name')
    expect(keys).toContain('attackAll')
    expect(keys).toContain('level')
    expect(keys).toContain('maxHP')
    expect(keys).toContain('maxMP')
    expect(keys).toContain('hp')
    expect(keys).toContain('mp')
    expect(keys).toContain('attackStrength')
    expect(keys).toContain('magicStrength')
    expect(keys).toContain('defense')
    expect(keys).toContain('dexterity')
    expect(keys).toContain('fleeRate')
    expect(keys).toContain('poisonResistance')
    expect(keys).toContain('elemResistance')
    expect(keys).toContain('walkFrames')
    expect(keys).toContain('attackSound')
    expect(keys).toContain('weaponSound')
    expect(keys).toContain('criticalSound')
    expect(keys).toContain('magicSound')
    expect(keys).toContain('deathSound')
  })

  it('_name 通过 words.persons 反查填(at least one)', () => {
    const named = playerRoles.roles.some((r) => r._name && r._name.length > 0)
    expect(named).toBe(true)
  })

  it('without words(不传 words)→ 所有 _name undefined,其他字段正常', () => {
    const prNoName = parsePlayerRoles(dataMkfBytes)
    expect(prNoName.roles).toHaveLength(6)
    expect(prNoName.roles.every((r) => r._name === undefined)).toBe(true)
    // 字段仍正常 dump(leader spriteNum=2 仍对)
    expect(prNoName.roles[0]!.spriteNum).toBe(2)
  })

  it('signed modifier 字段按 s16 解码(初始数据全正,与 Enemy 不同)', () => {
    // 实测 DATA.MKF chunk 3 队员初始 stats 全是正值(队长 attackStrength=33 等),
    // 与 Enemy(常有 -1 modifier)行为不同。验证 s16 解码保留:
    // - 所有值都在 SHORT 范围(-32768..32767),且 dump 数值合理(非 65535+)。
    for (const r of playerRoles.roles) {
      expect(r.attackStrength).toBeGreaterThanOrEqual(-32768)
      expect(r.attackStrength).toBeLessThan(32768)
      expect(r.magicStrength).toBeGreaterThanOrEqual(-32768)
      expect(r.magicStrength).toBeLessThan(32768)
      expect(r.defense).toBeGreaterThanOrEqual(-32768)
      expect(r.defense).toBeLessThan(32768)
      expect(r.dexterity).toBeGreaterThanOrEqual(-32768)
      expect(r.dexterity).toBeLessThan(32768)
    }
  })

  it('signed modifier 解码逻辑(fake 0xFFFF → -1)', () => {
    // 构造一个最小 fake DATA.MKF,chunk 3 = 900 字节,attackStrength[0] 位置写 0xFFFF。
    // cursor: 11 PLAYERS = 132 + equipment(6*12=72) = 204 → attackStrength[0]
    const tableSize = 5 * 4 // 4 个 chunk: 0..3 indices, table = (n+1)*4
    const chunk3Size = 900
    const fake = new Uint8Array(tableSize + chunk3Size)
    const tableView = new DataView(fake.buffer)
    tableView.setUint32(0, tableSize, true) // chunk 0 start
    tableView.setUint32(4, tableSize, true) // chunk 1 start
    tableView.setUint32(8, tableSize, true) // chunk 2 start
    tableView.setUint32(12, tableSize, true) // chunk 3 start
    tableView.setUint32(16, tableSize + chunk3Size, true) // chunk 3 end
    const chunkView = new DataView(fake.buffer, tableSize, chunk3Size)
    chunkView.setUint16(204, 0xffff, true) // attackStrength[0] = -1
    chunkView.setUint16(204 + 12, 0xfffe, true) // magicStrength[0] = -2
    // 5 个 sound 字段从 816 起。deathSound[0] 在 816。
    chunkView.setUint16(816, 0xffff, true) // deathSound[0] = -1
    const pr = parsePlayerRoles(fake)
    expect(pr.roles[0]!.attackStrength).toBe(-1)
    expect(pr.roles[0]!.magicStrength).toBe(-2)
    expect(pr.roles[0]!.deathSound).toBe(-1)
  })

  it('chunk size ≠ 900 时 throw(对 fake .MKF 做 sanity check)', () => {
    // 构造一个最小 fake .MKF,其 chunk 3 size != 900
    // .MKF 格式:[offsetTable: (count+1)×u32] + [chunks...]
    // 4 个 chunk: 0..3,只在 chunk 3 放 100 字节
    const offsetTable = new Uint8Array(5 * 4) // count+1=5
    const view = new DataView(offsetTable.buffer)
    const tableSize = 5 * 4
    view.setUint32(0, tableSize, true) // chunk 0 start
    view.setUint32(4, tableSize, true) // chunk 1 start
    view.setUint32(8, tableSize, true) // chunk 2 start
    view.setUint32(12, tableSize, true) // chunk 3 start
    view.setUint32(16, tableSize + 100, true) // chunk 3 end (size=100)
    const fakeChunk = new Uint8Array(100)
    const fake = new Uint8Array(tableSize + 100)
    fake.set(offsetTable, 0)
    fake.set(fakeChunk, tableSize)
    expect(() => parsePlayerRoles(fake)).toThrow(/sizeof\(PLAYERROLES\)|cursor/)
  })
})

describe('parseStores (2026-05-29 商店买菜单)', () => {
  const stores = parseStores(storeBuf)

  it('从 DATA.MKF chunk 0 解出 N 条 STORE(每条 18B = WORD × 9)', () => {
    expect(storeBuf.byteLength % 18).toBe(0)
    expect(stores.length).toBe(storeBuf.byteLength / 18)
    expect(stores.length).toBeGreaterThan(0)
  })

  it('id 从 0 顺序递增', () => {
    expect(stores[0]!.id).toBe(0)
    expect(stores[stores.length - 1]!.id).toBe(stores.length - 1)
  })

  it('items 全是绝对 OBJECT id(61..295,= items.json id 范围)', () => {
    for (const s of stores) {
      for (const obj of s.items) {
        expect(obj).toBeGreaterThanOrEqual(61)
        expect(obj).toBeLessThanOrEqual(295)
      }
    }
  })

  it('首个 0 截断列表(fake fixture:[100, 95, 0, 99, ...] → [100, 95])', () => {
    const fake = new Uint8Array(18)
    const view = new DataView(fake.buffer)
    view.setUint16(0, 100, true)
    view.setUint16(2, 95, true)
    view.setUint16(4, 0, true) // 截断
    view.setUint16(6, 99, true) // 0 之后的不读
    const fakeStores = parseStores(fake)
    expect(fakeStores).toHaveLength(1)
    expect(fakeStores[0]!.items).toEqual([100, 95])
  })

  it('满 9 项无 0(fake fixture:9 个非 0 → 全保留)', () => {
    const fake = new Uint8Array(18)
    const view = new DataView(fake.buffer)
    for (let j = 0; j < 9; j++) view.setUint16(j * 2, 61 + j, true)
    const fakeStores = parseStores(fake)
    expect(fakeStores[0]!.items).toEqual([61, 62, 63, 64, 65, 66, 67, 68, 69])
  })

  it('非 18 整除时 throw(与其他 parser 一致)', () => {
    expect(() => parseStores(new Uint8Array(17))).toThrow(/STORE_RECORD_SIZE|整除/)
  })
})
