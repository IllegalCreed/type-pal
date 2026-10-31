/**
 * 原盘表/公开barrel集成：完整语义输出与独立Python struct金标核对。
 * 输入为原始SSS/DATA/WORD；期望不来自当前TS、提取产物或另一个parser。
 * 原始布局/脚本字段/signed投影边界及重建脚本见QUALITY-EXTRACT-RAW-TABLE-TESTS-1。
 * 合成字段/位掩码/坏长度已按旧身份映射到各parser专测；此处保留原盘与跨表接线。
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mkfContainer } from '../__tests__/binary-fixtures.js'
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

const dataBytes = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/DATA.MKF')))
const sssBytes = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/SSS.MKF')))
const wordBytes = new Uint8Array(readFileSync(resolve(__dirname, '../../../../data/raw/WORD.DAT')))
const data = openMkf(dataBytes)
const objects = readChunk(openMkf(sssBytes), 2)
const words = parseWordDat(wordBytes)

// 只编码JSON领域值：对象键递归排序，数组顺序保持；不是通用typed-array序列化器。
function digest(value: unknown): string {
  const json = JSON.stringify(value, (_key, entry: unknown) =>
    typeof entry === 'object' && entry !== null && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : entry,
  )
  return createHash('sha256').update(json).digest('hex')
}

// _name是注释；验证其附加不改变已有语义。nameless另有独立全字段金标，非相互自证。
function withoutName<T extends { _name?: string }>(entries: T[]) {
  return entries.map(({ _name, ...record }) => record)
}

describe('原盘表公开出口集成', () => {
  it('物品：234条全字段、六角色装备位与原盘名称接线', () => {
    const plain = parseItems(objects)
    const named = parseItems(objects, words)
    expect(plain).toHaveLength(234)
    expect(digest(plain)).toBe('2e545f70ed3338fc506674b94b62d96f2a12d44dc1a6698bc2a918da09a59ce4')
    expect(plain.some((entry) => Object.hasOwn(entry, '_name'))).toBe(false)
    expect(withoutName(named)).toStrictEqual(plain)
    expect([named[0]!._name, named[233]!._name]).toEqual(['观音符', '芦苇漂'])
  })

  it('法术：103条全字段含末尾梦蛇、说明脚本与名称接线', () => {
    const plain = parseSpells(objects)
    const named = parseSpells(objects, words)
    expect(plain).toHaveLength(103)
    expect(digest(plain)).toBe('b8908c5514e49327db1080471d0a713656422a75b354b7662a08775c039fefa3')
    expect(plain.some((entry) => Object.hasOwn(entry, '_name'))).toBe(false)
    expect(withoutName(named)).toStrictEqual(plain)
    expect([named[0]!._name, named[102]!._name]).toEqual(['气疗术', '梦蛇'])
  })

  it('OBJECT magic视图：565条完整字段与绝对身份', () => {
    const magic = parseObjectMagics(objects)
    expect(magic).toHaveLength(565)
    expect(digest(magic)).toBe('0de98da15402aaa0c80242e2e0a2dd0856addc11fd20d7434e3992dc6ad47210')
  })

  it('OBJECT poison视图：565条完整颜色与双脚本字段', () => {
    const poisons = parseObjectPoisons(objects)
    expect(poisons).toHaveLength(565)
    expect(digest(poisons)).toBe('065bce91d521457f2170baf4953c83a4a93897f73ba7d2ce5fd8e95b5ae10ecd')
  })

  it('OBJECT player视图：六个人物身份与死亡/濒死脚本', () => {
    const players = parseObjectPlayers(objects)
    expect(players).toHaveLength(6)
    expect(digest(players)).toBe('fc5a337d5932a92f81427239453b10b9da0d95abcd626a32ced1f846f48b779a')
  })

  it('MAGIC：104条全部17字段与signed speed/sound、type映射', () => {
    const magic = parseMagicTable(readChunk(data, 4))
    expect(magic).toHaveLength(104)
    expect(digest(magic)).toBe('862bf25a5eafb4ba57091c0b5dc419a052ca0a2498d71373564d402d03d71f26')
  })

  it('敌人：154条全部字段与OBJECT反向名称附加', () => {
    const plain = parseEnemies(readChunk(data, 1))
    const named = parseEnemies(readChunk(data, 1), objects, words)
    expect(plain).toHaveLength(154)
    expect(digest(plain)).toBe('7f776c89e2d3e90eeae2cd46aecfb661f51efc68b041ba676202fa68b1f7f3eb')
    expect(plain.some((entry) => Object.hasOwn(entry, '_name'))).toBe(false)
    expect(withoutName(named)).toStrictEqual(plain)
    expect(named[1]!._name).toBe('史莱姆')
  })

  it('敌队：380条原五槽、153条OBJECT映射及翻译后的完整身份', () => {
    const index = buildObjectIndexToEnemyIdMap(objects)
    const names = buildEnemyObjectNameMap(objects, words)
    const raw = parseEnemyTeams(readChunk(data, 2))
    const translated = parseEnemyTeams(readChunk(data, 2), undefined, index)
    const named = parseEnemyTeams(readChunk(data, 2), names, index)
    expect([raw.length, translated.length, index.size]).toEqual([380, 380, 153])
    expect(digest(raw)).toBe('e07dd28df08bc68165fd6ba58cb3f6739c01fcb63ea76fba0e5770a105e7160c')
    expect(digest([...index])).toBe(
      '45d2723c9237cdf583d5352d36954ebf1617b005c32f260ca2ca3976173b70c4',
    )
    expect(digest(translated)).toBe(
      'c53a7aa0aeadfcdaee30c25db638ac2a87c41e8f95921ecea0541351ff31385e',
    )
    expect(named.map(({ _names, ...record }) => record)).toStrictEqual(translated)
    expect(names.get(398)).toBe('史莱姆')
    expect(named[0]!._names).toEqual(['史莱姆', '史莱姆'])
  })

  it('战场：58条screenWave与完整signed五行效果', () => {
    const fields = parseBattleFields(readChunk(data, 5))
    expect(fields).toHaveLength(58)
    expect(digest(fields)).toBe('b2a436ed41581171302be5fffd20c1fdedd87331ce2b7973a69b630e14c5207f')
  })

  it('商店：21个原盘商品列表在首0处结束', () => {
    const stores = parseStores(readChunk(data, 0))
    expect(stores).toHaveLength(21)
    expect(digest(stores)).toBe('044bfeb1dc17b16b01e0713dd534c253c65d3961b81987102773357345929e06')
  })

  it('角色：六条完整SoA/装备/32仙术/全部声音与rgwName名称指针', () => {
    const plain = parsePlayerRoles(dataBytes)
    const named = parsePlayerRoles(dataBytes, words)
    expect(plain.roles).toHaveLength(6)
    expect(digest(plain)).toBe('f17c1227c612fbc602bc0f141f0ebc7b802ff8804d193939e0c5991e513c1fb0')
    expect(plain.roles.some((entry) => Object.hasOwn(entry, '_name'))).toBe(false)
    expect(withoutName(named.roles)).toStrictEqual(plain.roles)
    expect(named.roles.map((entry) => entry._name)).toEqual([
      '李逍遥',
      '赵灵儿',
      '林月如',
      '巫后',
      '阿奴',
      '盖罗娇',
    ])
  })

  it('signed modifier 解码逻辑(fake 0xFFFF → -1)', () => {
    // 物理SoA cell：武术row17、灵力row18、阵亡音效row68；原盘无这些负值。
    const roles = new Uint8Array(900)
    const view = new DataView(roles.buffer)
    view.setUint16(204, 0xffff, true)
    view.setUint16(216, 0xfffe, true)
    view.setUint16(816, 0xffff, true)
    const parsed = parsePlayerRoles(
      mkfContainer([new Uint8Array(), new Uint8Array(), new Uint8Array(), roles]),
    )
    expect([
      parsed.roles[0]!.attackStrength,
      parsed.roles[0]!.magicStrength,
      parsed.roles[0]!.deathSound,
    ]).toEqual([-1, -2, -1])
  })

  it('type 6 / 7 / >9 → "other" 兜底(fake fixture)', () => {
    const bytes = new Uint8Array(96)
    const view = new DataView(bytes.buffer)
    for (const [i, type] of [6, 7, 99].entries()) view.setUint16(i * 32 + 2, type, true)
    expect(parseMagicTable(bytes).map((entry) => entry.type)).toEqual(['other', 'other', 'other'])
  })
})
