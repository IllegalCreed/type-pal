/**
 * TEST-PAL-TABLES-COVERAGE-1 P07：parseEnemyTeams 翻译模式保真（parsers/enemy-teams.ts）。
 * 既有 tables.test 已覆盖翻译模式基本轴/缺映射 warn/名字反查跳过——不重复。
 * 本文件：两不同 OBJECT 映到同 enemyId 时槽位与原身份都保留（enemyObjectIndexes 用 raw）、
 * 0/0xFFFF 不压缩、缺映射只影响对应槽并给精确 warn。
 */
import { afterEach, describe, expect, test, vi } from 'vitest'
import { enemyTeamsBytes } from '../../../__tests__/glm-tb04-fixtures.js'
import { parseEnemyTeams } from '../enemy-teams.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('P07 parseEnemyTeams 翻译模式原身份保真', () => {
  test('两 OBJECT 映同 enemyId：enemies 各自翻译、enemyObjectIndexes 保 raw、0/0xFFFF 不压缩', () => {
    const map = new Map<number, number>([
      [400, 7],
      [401, 7],
      [402, 9],
    ])
    const teams = parseEnemyTeams(enemyTeamsBytes(), undefined, map)
    expect(teams).toHaveLength(2)
    expect(teams[0]!.enemies).toEqual([7, 7, 0, 0xffff, 9]) // 同 id 两槽各自翻译；0/FFFF 原样
    expect(teams[0]!.enemyObjectIndexes).toEqual([400, 401, 0, 0xffff, 402]) // 原身份不被译文覆盖
    expect(teams[1]!.enemies).toEqual([0xffff, 9, 0xffff, 0, 0]) // 403 缺映射→标空；0/FFFF 原样
    expect(teams[1]!.enemyObjectIndexes).toEqual([0xffff, 402, 403, 0, 0])
  })
  test('缺映射只影响对应槽并给精确 warn；补映射后同输入全量合法', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const partial = new Map<number, number>([
      [400, 7],
      [401, 7],
    ])
    const teams = parseEnemyTeams(enemyTeamsBytes(), undefined, partial)
    expect(teams[0]!.enemies).toEqual([7, 7, 0, 0xffff, 0xffff]) // 只有 402 缺映射标空
    expect(warn.mock.calls.map((call) => call[0])).toEqual([
      '[parseEnemyTeams] team 0 slot OBJECT index 402 不在 OBJECT_ENEMY 段映射中,标空',
      '[parseEnemyTeams] team 1 slot OBJECT index 402 不在 OBJECT_ENEMY 段映射中,标空',
      '[parseEnemyTeams] team 1 slot OBJECT index 403 不在 OBJECT_ENEMY 段映射中,标空',
    ])
    // 补映射后同输入不再 warn、全量合法
    const full = new Map<number, number>([
      [400, 7],
      [401, 7],
      [402, 9],
      [403, 11],
    ])
    const complete = parseEnemyTeams(enemyTeamsBytes(), undefined, full)
    expect(complete[1]!.enemies).toEqual([0xffff, 9, 11, 0, 0])
  })
})
