/**
 * TEST-FOUNDATION-COVERAGE-1 C1：DATA.MKF chunk 1 ENEMY 表解析边界（enemies.ts:22-136）。
 * 合成字节 fixture（70B/条,35×WORD 布局按源码注释）；真实资产集成在 PAL 组
 * （gitignored），本文件补 fast 域纯字节合同。区分 enemyId（chunk1 数组下标）与
 * objectId（OBJECT 表绝对 index 398+）。
 */
import { describe, expect, test } from 'vitest'
import {
  buildObjectIndexToEnemyIdMap,
  buildEnemyObjectNameMap,
  parseEnemies,
  parseEnemyObjects,
} from '../enemies.js'
import { mkTable, mkWords } from './glm-foundation-fixtures.js'

const ENEMY_SIZE = 70
const OBJ_SIZE = 14
const ENEMY_OBJ_START = 398
const ENEMY_OBJ_COUNT = 153
const OBJ_BYTES = (ENEMY_OBJ_START + ENEMY_OBJ_COUNT) * OBJ_SIZE

const enemyWrites: Array<[number, number]> = [
  // 记录 0：关键 u16 字段族 + 五行抗具名
  [22, 310], // health
  [24, 120], // exp
  [38, 91], // stealItem
  [42, 0xffff], // attackStrength(SHORT → -1 modifier)
  [46, 7], // defense
  [54, 1], // elemResistance.wind
  [56, 2], // .thunder
  [58, 3], // .water
  [60, 4], // .fire
  [62, 5], // .earth
  [68, 9], // collectValue
  // 记录 1（基址 70）：普通值 + 声音 signed
  [70 + 22, 42],
  [70 + 12, 0xffff], // attackSound(-1 = 无声音)
  [70 + 50, 30], // fleeRate
]

describe('parseEnemies · 字段映射', () => {
  test('两条记录：u16 字段/signed modifier/五行抗具名/id=数组下标', () => {
    const out = parseEnemies(mkTable(ENEMY_SIZE * 2, enemyWrites))
    expect(out).toHaveLength(2)
    expect(out[0]!.id).toBe(0)
    expect(out[0]!.health).toBe(310)
    expect(out[0]!.exp).toBe(120)
    expect(out[0]!.stealItem).toBe(91)
    expect(out[0]!.attackStrength).toBe(-1)
    expect(out[0]!.defense).toBe(7)
    expect(out[0]!.elemResistance).toEqual({ wind: 1, thunder: 2, water: 3, fire: 4, earth: 5 })
    expect(out[0]!.collectValue).toBe(9)
    expect(out[1]!.id).toBe(1)
    expect(out[1]!.health).toBe(42)
    expect(out[1]!.attackSound).toBe(-1)
    expect(out[1]!.fleeRate).toBe(30)
  })
  test('长度不能被 70 整除：已定义截断拒绝', () => {
    expect(() => parseEnemies(mkTable(ENEMY_SIZE * 2 - 1, []))).toThrow(/不能被 ENEMY_SIZE=70 整除/)
  })
  test('零长度输入 → 空数组（合法边界）', () => {
    expect(parseEnemies(Uint8Array.of())).toEqual([])
  })
})

describe('parseEnemies · object→enemy 反查 _name', () => {
  test('OBJECT_ENEMY 段首个非零 wEnemyID 命中，重复 id 首见优先；enemyId 与 objectIndex 分开', () => {
    const objBuf = mkTable(OBJ_BYTES, [
      [398 * OBJ_SIZE + 0, 1], // object398 → enemyId 1
      [(398 + 1) * OBJ_SIZE + 0, 1], // object399 也指 enemyId 1（重复，首见优先）
      [(398 + 2) * OBJ_SIZE + 0, 0], // object400 = 空槽
    ])
    const words = mkWords({ enemies: Array.from({ length: ENEMY_OBJ_COUNT }, (_, i) => `敌${i}`) })
    const out = parseEnemies(mkTable(ENEMY_SIZE * 2, enemyWrites), objBuf, words)
    expect(out[1]!._name).toBe('敌0')
    expect(out[0]!._name).toBeUndefined()

    const objects = parseEnemyObjects(objBuf, words)
    expect(objects[0]!.objectIndex).toBe(398)
    expect(objects[0]!.enemyId).toBe(1)
    expect(objects[0]!._name).toBe('敌0')
    expect(objects[2]!.enemyId).toBe(0)

    expect(buildObjectIndexToEnemyIdMap(objBuf).get(399)).toBe(1)
    expect(buildObjectIndexToEnemyIdMap(objBuf).has(400)).toBe(false)
    expect(buildEnemyObjectNameMap(objBuf, words).get(398)).toBe('敌0')
  })
  test('OBJECT 段截断：已定义拒绝', () => {
    expect(() => parseEnemyObjects(mkTable(OBJ_BYTES - 1, []))).toThrow(/< required/)
  })
})
