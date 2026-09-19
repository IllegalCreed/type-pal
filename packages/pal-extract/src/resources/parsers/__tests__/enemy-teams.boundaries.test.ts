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
  test('两 OBJECT 映同 enemyId：enemies 各自翻译、enemyObjectIndexes 保 raw、0/0xFFFF 不压缩、_names 按 OBJECT 反查', () => {
    const map = new Map<number, number>([
      [400, 7],
      [401, 7],
      [402, 9],
    ])
    // 真实 caller 同时传 names 与映射（BattleSpriteLibrary 域）；两个不同 OBJECT 各自反查名字
    const names = new Map<number, string>([
      [400, '蛇甲'],
      [401, '蛇乙'],
      [402, '喽啰'],
    ])
    const teams = parseEnemyTeams(enemyTeamsBytes(), names, map)
    expect(teams).toHaveLength(2)
    expect(teams[0]!.enemies).toEqual([7, 7, 0, 0xffff, 9]) // 同 id 两槽各自翻译；0/FFFF 原样
    expect(teams[0]!.enemyObjectIndexes).toEqual([400, 401, 0, 0xffff, 402]) // 原身份不被译文覆盖
    expect(teams[0]!._names).toEqual(['蛇甲', '蛇乙', '喽啰']) // 名字按原始 OBJECT 索引反查（非译文 id）
    expect(teams[1]!.enemies).toEqual([0xffff, 9, 0xffff, 0, 0]) // 403 缺映射→标空；0/FFFF 原样
    expect(teams[1]!.enemyObjectIndexes).toEqual([0xffff, 402, 403, 0, 0])
    expect(teams[1]!._names).toEqual(['喽啰']) // 403 无名、0/FFFF 跳过 → 只剩 402 的名字
  })
  test('缺映射只影响对应槽并给精确 warn；补全映射+名字后同输入零新增 warn 且全量合法', () => {
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
    // 补映射后同输入不再 warn、全量合法（分栏：映射补全即消除，不依赖名字表）
    warn.mockClear()
    const full = new Map<number, number>([
      [400, 7],
      [401, 7],
      [402, 9],
      [403, 11],
    ])
    const complete = parseEnemyTeams(enemyTeamsBytes(), undefined, full)
    expect(complete[1]!.enemies).toEqual([0xffff, 9, 11, 0, 0])
    expect(warn.mock.calls).toEqual([]) // 零新增 warn
  })
})
