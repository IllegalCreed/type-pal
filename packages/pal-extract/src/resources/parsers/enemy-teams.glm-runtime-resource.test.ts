/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R07（parsers/enemy-teams.ts）。
 * 去重账：tables.test 覆盖翻译模式基本轴；enemy-teams.boundaries（PAL-TABLES P07）覆盖
 * 双 OBJECT 映同 id、0/0xFFFF 保留、缺映射精确 warn、_names 按 raw 反查。
 * 本文件只做未占用合同：纯模式（无映射无名字）的精确对象形状（无可选键）、
 * 非整除 throw、subarray byteOffset 隔离。
 */
import { describe, expect, test } from 'vitest'
import { parseEnemyTeams } from './enemy-teams.js'

function teamBytes(...slots: number[][]): Uint8Array {
  const out = new Uint8Array(slots.length * 10)
  const view = new DataView(out.buffer)
  slots.forEach((team, i) => {
    team.forEach((slot, j) => view.setUint16(i * 10 + j * 2, slot, true))
  })
  return out
}

describe('R07 parseEnemyTeams 纯模式', () => {
  test('无映射无名字：enemies = 原始槽位，无 enemyObjectIndexes / _names 键', () => {
    const teams = parseEnemyTeams(teamBytes([400, 0, 0xffff, 1, 2], [0, 0, 0, 0, 0]))
    expect(teams).toEqual([
      { id: 0, enemies: [400, 0, 0xffff, 1, 2] },
      { id: 1, enemies: [0, 0, 0, 0, 0] },
    ])
    expect('enemyObjectIndexes' in teams[0]!).toBe(false)
    expect('_names' in teams[0]!).toBe(false)
  })

  test('非 10 倍数字节：抛错并带实际长度', () => {
    expect(() => parseEnemyTeams(new Uint8Array(11))).toThrow(/TEAM_RECORD_SIZE=10/)
  })

  test('大缓冲奇数偏移 subarray：与独立缓冲全等', () => {
    const bc = teamBytes([400, 0, 0xffff, 1, 2])
    const parent = new Uint8Array(9 + bc.length)
    parent.fill(0x77)
    parent.set(bc, 9)
    expect(parseEnemyTeams(parent.subarray(9), new Map([[400, '蛇']]))).toEqual(
      parseEnemyTeams(bc, new Map([[400, '蛇']])),
    )
  })
})
