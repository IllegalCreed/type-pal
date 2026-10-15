/**
 * P07 翻译模式：保持五槽、OBJECT身份及输入所有权；名字按原OBJECT查。
 * 完整映射正例与缺映射IO分开；未知OBJECT域使用独立坏输入例。
 * 纯模式、长度拒绝与subarray由相邻enemy-teams.glm-runtime-resource.test.ts负责。
 */
import { describe, expect, test } from 'vitest'
import { enemyTeamsBytes } from '../../../__tests__/glm-tb04-fixtures.js'
import { withParserWarnings } from '../../../__tests__/parser-diagnostics.js'
import { parseEnemyTeams } from '../enemy-teams.js'

describe('P07 parseEnemyTeams 翻译模式原身份保真', () => {
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
