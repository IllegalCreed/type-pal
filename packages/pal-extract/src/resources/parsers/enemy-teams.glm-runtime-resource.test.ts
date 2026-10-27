/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R07（parsers/enemy-teams.ts）。
 * 去重账：tables.test 覆盖翻译模式基本轴；enemy-teams.boundaries（PAL-TABLES P07）覆盖
 * 双 OBJECT 映同 id、0/0xFFFF 保留、缺映射精确 warn、_names 按 raw 反查。
 * 本文件核纯模式完整对象、非整除拒绝、subarray偏移、缺名字和空槽不查伪名。
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

test('parseEnemyTeams：槽位查无名字不进 _names；全无名不设 _names 键', () => {
  // 2 支队伍 × 5 槽 u16；team0 槽 [398,401,0,0xffff,0]，team1 槽 [401,0,0,0,0]
  const buf = new Uint8Array(20)
  const view = new DataView(buf.buffer)
  view.setUint16(0, 398, true)
  view.setUint16(2, 401, true)
  view.setUint16(4, 0, true)
  view.setUint16(6, 0xffff, true)
  view.setUint16(10, 401, true)
  const names = new Map([[398, '蛇妖']]) // 401 查无名字
  const teams = parseEnemyTeams(buf, names)
  expect(teams).toStrictEqual([
    { id: 0, enemies: [398, 401, 0, 0xffff, 0], _names: ['蛇妖'] },
    { id: 1, enemies: [401, 0, 0, 0, 0] },
  ])
})

test('空槽不会读取名字表中的0或0xffff条目', () => {
  const bytes = Uint8Array.of(0, 0, 0xff, 0xff, 0, 0, 0xff, 0xff, 0, 0)
  const names = new Map([
    [0, '不应出现的零槽名'],
    [0xffff, '不应出现的空槽名'],
  ])
  expect(parseEnemyTeams(bytes, names)).toStrictEqual([
    { id: 0, enemies: [0, 0xffff, 0, 0xffff, 0] },
  ])
})
