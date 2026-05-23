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
import { parseEnemies, parseItems, parseSpells } from './tables.js'

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

  it('第一条带名字', () => {
    expect(items[0]!.name).toBeTruthy()
    expect(items[0]!.name).not.toMatch(/^_item_/)
  })

  it('id 从 0 顺序递增', () => {
    expect(items[0]!.id).toBe(0)
    expect(items[234]!.id).toBe(234)
  })

  it('至少有一条价格 > 0', () => {
    const anyPriced = items.some((it) => it.price > 0)
    expect(anyPriced).toBe(true)
  })

  it('第一条物品价格为 150(筋斗云服)', () => {
    // 实测:item[0] = 筋斗云服, price=150
    expect(items[0]!.price).toBe(150)
  })

  it('flags 字段有效(不全为 0)', () => {
    const anyFlags = items.some((it) => it.flags !== 0)
    expect(anyFlags).toBe(true)
  })
})

describe('parseSpells', () => {
  const spells = parseSpells(objBuf, magicBuf, words)

  it('解出 102 条法术', () => {
    expect(spells).toHaveLength(102)
  })

  it('第一条带名字', () => {
    expect(spells[0]!.name).toBeTruthy()
    expect(spells[0]!.name).not.toMatch(/^_spell_/)
  })

  it('id 从 0 顺序递增', () => {
    expect(spells[0]!.id).toBe(0)
    expect(spells[101]!.id).toBe(101)
  })

  it('至少有一条 mp > 0', () => {
    const anyMp = spells.some((s) => s.mp > 0)
    expect(anyMp).toBe(true)
  })

  it('第一条法术 mp = 6(实测)', () => {
    // spell[0].wMagicNumber=33 → MAGIC[33].wCostMP=6
    expect(spells[0]!.mp).toBe(6)
  })
})

describe('parseEnemies', () => {
  const enemies = parseEnemies(objBuf, enemyBuf, words)

  it('解出 153 条敌人', () => {
    expect(enemies).toHaveLength(153)
  })

  it('第一条带名字', () => {
    expect(enemies[0]!.name).toBeTruthy()
    expect(enemies[0]!.name).not.toMatch(/^_enemy_/)
  })

  it('id 从 0 顺序递增', () => {
    expect(enemies[0]!.id).toBe(0)
    expect(enemies[152]!.id).toBe(152)
  })

  it('至少有一条 hp > 0', () => {
    const anyHp = enemies.some((e) => e.hp > 0)
    expect(anyHp).toBe(true)
  })

  it('Enemy.mp 恒为 0 (ENEMY 结构体无 MP 字段)', () => {
    // NOTED: Enemy 接口的 mp 字段无对应源字段,始终为 0
    const allMpZero = enemies.every((e) => e.mp === 0)
    expect(allMpZero).toBe(true)
  })
})
