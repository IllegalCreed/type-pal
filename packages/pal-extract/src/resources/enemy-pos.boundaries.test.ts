/**
 * TEST-PAL-TABLES-COVERAGE-1 P09：parseEnemyPos 布局转置（resources/enemy-pos.ts）。
 * 无既有直接测试。100B 非对称 5×5 输入：五 layout 长度 1..5、全部 15 组坐标精确
 * （x=k*2+1 / y=k*2+2，k=enemyIdx*5+maxIdx——转置/串维即红）；99/101 拒绝与 100B 正控。
 */
import { describe, expect, test } from 'vitest'
import { enemyPosBytes, expectedEnemyPos } from '../__tests__/glm-tb04-fixtures.js'
import { parseEnemyPos } from './enemy-pos.js'

describe('P09 parseEnemyPos 五 layout 坐标保真', () => {
  test('layouts[count-1][enemyIdx] 逐坐标精确；长度 1..5；C 布局 (enemyIdx*5+maxIdx) 转置即红', () => {
    const { layouts } = parseEnemyPos(enemyPosBytes())
    expect(layouts).toHaveLength(5)
    for (let maxIdx = 0; maxIdx < 5; maxIdx++) {
      expect(layouts[maxIdx]).toHaveLength(maxIdx + 1)
      for (let enemyIdx = 0; enemyIdx <= maxIdx; enemyIdx++) {
        expect(layouts[maxIdx]![enemyIdx]).toEqual(expectedEnemyPos(enemyIdx, maxIdx))
      }
    }
    // 抽查非对称轴：layout4[0] ≠ layout0[0]（同 enemyIdx 不同 maxIdx 取不同列）
    expect(layouts[4]![0]).not.toEqual(layouts[0]![0])
  })
  test('99/101 字节拒绝；100B 正控（信息含期望与实际长度）', () => {
    expect(() => parseEnemyPos(enemyPosBytes().subarray(0, 99))).toThrow(
      'parseEnemyPos: expected 100 bytes, got 99',
    )
    expect(() => parseEnemyPos(new Uint8Array(101))).toThrow(
      'parseEnemyPos: expected 100 bytes, got 101',
    )
    expect(parseEnemyPos(enemyPosBytes()).layouts).toHaveLength(5)
  })
})
