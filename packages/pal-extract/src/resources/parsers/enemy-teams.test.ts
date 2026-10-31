/** Raw and translated team slots retain object identities, names and exact diagnostics. */
import { describe, expect, test } from 'vitest'
import { withParserWarnings } from '../../__tests__/parser-diagnostics.js'
import { enemyTeamsBytes } from '../../__tests__/table-records.js'
import { parseEnemyTeams } from './enemy-teams.js'

describe('raw slots and optional names', () => {
  function teamBytes(...slots: number[][]): Uint8Array {
    const out = new Uint8Array(slots.length * 10)
    const view = new DataView(out.buffer)
    slots.forEach((team, i) => {
      team.forEach((slot, j) => view.setUint16(i * 10 + j * 2, slot, true))
    })
    return out
  }

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

  test('大缓冲奇数偏移 subarray：原始五槽与名称精确保留', () => {
    const bytes = teamBytes([400, 0, 0xffff, 1, 2])
    const parent = new Uint8Array(9 + bytes.length)
    parent.fill(0x77)
    parent.set(bytes, 9)
    const expected = [{ id: 0, enemies: [400, 0, 0xffff, 1, 2], _names: ['蛇'] }]
    expect(parseEnemyTeams(parent.subarray(9), new Map([[400, '蛇']]))).toEqual(expected)
    expect(parseEnemyTeams(bytes, new Map([[400, '蛇']]))).toEqual(expected)
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
})

describe('translation and original object ownership', () => {
  test('两 OBJECT 映同 enemyId：enemies 各自翻译、enemyObjectIndexes 保 raw、0/0xFFFF 不压缩、_names 按 OBJECT 反查', () => {
    const map = new Map<number, number>([
      [400, 7],
      [401, 7],
      [402, 9],
      [403, 11],
    ])
    // CLI同时传名字表和映射；这里的名字是合成标记，不声称是原版敌人名字。
    const names = new Map<number, string>([
      [400, '蛇甲'],
      [401, '蛇乙'],
      [402, '喽啰'],
    ])
    const bytes = enemyTeamsBytes()
    const beforeBytes = bytes.slice()
    const beforeMap = [...map]
    const beforeNames = [...names]
    const teams = withParserWarnings([], () => parseEnemyTeams(bytes, names, map))
    expect(teams).toStrictEqual([
      {
        id: 0,
        enemies: [7, 7, 0, 0xffff, 9],
        enemyObjectIndexes: [400, 401, 0, 0xffff, 402],
        _names: ['蛇甲', '蛇乙', '喽啰'],
      },
      {
        id: 1,
        enemies: [0xffff, 9, 11, 0, 0],
        enemyObjectIndexes: [0xffff, 402, 403, 0, 0],
        _names: ['喽啰'], // 403无名字仍正常翻译；0/FFFF不收入名字。
      },
    ])
    expect(bytes).toEqual(beforeBytes)
    expect([...map]).toEqual(beforeMap)
    expect([...names]).toEqual(beforeNames)
  })

  test('缺映射只影响对应槽并给精确 warn；补全映射后同输入恢复，不依赖名字表', () => {
    const partial = new Map<number, number>([
      [400, 7],
      [401, 7],
    ])
    const teams = withParserWarnings(
      [
        {
          message: '[parseEnemyTeams] team 0 slot OBJECT index 402 不在 OBJECT_ENEMY 段映射中,标空',
        },
        {
          message: '[parseEnemyTeams] team 1 slot OBJECT index 402 不在 OBJECT_ENEMY 段映射中,标空',
        },
        {
          message: '[parseEnemyTeams] team 1 slot OBJECT index 403 不在 OBJECT_ENEMY 段映射中,标空',
        },
      ],
      () => parseEnemyTeams(enemyTeamsBytes(), undefined, partial),
    )
    expect(teams).toStrictEqual([
      { id: 0, enemies: [7, 7, 0, 0xffff, 0xffff], enemyObjectIndexes: [400, 401, 0, 0xffff, 402] },
      {
        id: 1,
        enemies: [0xffff, 0xffff, 0xffff, 0, 0],
        enemyObjectIndexes: [0xffff, 402, 403, 0, 0],
      },
    ])
    const full = new Map<number, number>([
      [400, 7],
      [401, 7],
      [402, 9],
      [403, 11],
    ])
    const complete = withParserWarnings([], () =>
      parseEnemyTeams(enemyTeamsBytes(), undefined, full),
    )
    expect(complete).toStrictEqual([
      { id: 0, enemies: [7, 7, 0, 0xffff, 9], enemyObjectIndexes: [400, 401, 0, 0xffff, 402] },
      { id: 1, enemies: [0xffff, 9, 11, 0, 0], enemyObjectIndexes: [0xffff, 402, 403, 0, 0] },
    ])
  })

  test('未知 OBJECT 999：空映射将该槽标空、保留原索引并仅输出对应诊断', () => {
    // 与tables旧例相同的10B坏输入；999不冒充合法OBJECT_ENEMY或真实敌人。
    const bytes = Uint8Array.of(0xe7, 0x03, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff)
    const teams = withParserWarnings(
      [
        {
          message: '[parseEnemyTeams] team 0 slot OBJECT index 999 不在 OBJECT_ENEMY 段映射中,标空',
        },
      ],
      () => parseEnemyTeams(bytes, undefined, new Map()),
    )
    expect(teams).toStrictEqual([
      {
        id: 0,
        enemies: [0xffff, 0xffff, 0xffff, 0xffff, 0xffff],
        enemyObjectIndexes: [999, 0xffff, 0xffff, 0xffff, 0xffff],
      },
    ])
  })
})
