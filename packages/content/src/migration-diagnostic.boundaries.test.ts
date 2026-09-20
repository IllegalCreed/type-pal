/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 A5-A7：迁移诊断边界（migration-diagnostic.ts）。
 * migration-diagnostic.test.ts:24/29 已覆盖合法 sidecar 原样返回与重复 id/未知类别/空来源/非法能力；
 * 本文件补容器错型路径、target/source 各字段轴与 category×capability 支持域矩阵。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot, legalDiagnostic } from './__tests__/glm-state-boundary-fixtures.js'
import {
  MIGRATION_DIAGNOSTIC_CATEGORIES,
  validateMigrationDiagnostics,
} from './migration-diagnostic.js'

const diagnosticAt = (index: number): Record<string, unknown> =>
  (legalDiagnostic().diagnostics as Record<string, unknown>[])[index]!

describe('A5 容器错型（主 fixture 先过现行守卫）', () => {
  test('合法基线先证明可过守卫，再按轴改坏 root/version/diagnostics 容器', () => {
    expect(() => validateMigrationDiagnostics(legalDiagnostic())).not.toThrow()
    expect(() => validateMigrationDiagnostics(null)).toThrow('migrationDiagnostics: 期望对象')
    expect(() => validateMigrationDiagnostics([legalDiagnostic()])).toThrow(
      'migrationDiagnostics: 期望对象',
    )
    expect(() => validateMigrationDiagnostics({ ...legalDiagnostic(), version: 2 })).toThrow(
      'migrationDiagnostics.version: 期望 1',
    )
    expect(() => validateMigrationDiagnostics({ ...legalDiagnostic(), diagnostics: {} })).toThrow(
      'migrationDiagnostics.diagnostics: 期望数组',
    )
    expect(() => validateMigrationDiagnostics({ version: 1, diagnostics: [null] })).toThrow(
      'migrationDiagnostics.diagnostics[0]: 期望对象',
    )
    expect(() =>
      validateMigrationDiagnostics({
        version: 1,
        diagnostics: [{ ...diagnosticAt(0), id: '' }],
      }),
    ).toThrow('migrationDiagnostics.diagnostics[0].id: 期望非空 string')
    expect(() =>
      validateMigrationDiagnostics({
        version: 1,
        diagnostics: [{ ...diagnosticAt(0), severity: 'error' }],
      }),
    ).toThrow('migrationDiagnostics.diagnostics[0].severity: 期望 warn')
    expect(() =>
      validateMigrationDiagnostics({
        version: 1,
        diagnostics: [{ ...diagnosticAt(0), reason: '' }],
      }),
    ).toThrow('migrationDiagnostics.diagnostics[0].reason: 期望非空 string')
  })
  test('验证拒绝不修改原输入（深快照同一对象）', () => {
    const bad = { version: 1, diagnostics: [{ ...diagnosticAt(0), category: 'nope' }] }
    const snapshot = deepSnapshot(bad)
    expect(() => validateMigrationDiagnostics(bad)).toThrow()
    expect(bad).toEqual(snapshot)
  })
})

describe('A6 target 与 source 字段轴', () => {
  test('target domain/objectId/label 与 source kind/label/address 各自精确路径', () => {
    const badTarget = (patch: Record<string, unknown>): unknown => {
      const d = diagnosticAt(0)
      const target = d.target as Record<string, unknown>
      return { version: 1, diagnostics: [{ ...d, target: { ...target, ...patch } }] }
    }
    expect(() => validateMigrationDiagnostics(badTarget({ domain: 'actor' }))).toThrow(
      'diagnostics[0].target.domain: 期望 item',
    )
    expect(() => validateMigrationDiagnostics(badTarget({ objectId: '' }))).toThrow(
      'diagnostics[0].target.objectId: 期望非空 string',
    )
    expect(() => validateMigrationDiagnostics(badTarget({ label: '' }))).toThrow(
      'diagnostics[0].target.label: 期望非空 string',
    )
    const badSource = (patch: Record<string, unknown>): unknown => {
      const d = diagnosticAt(0)
      const source = d.source as Record<string, unknown>
      return { version: 1, diagnostics: [{ ...d, source: { ...source, ...patch } }] }
    }
    expect(() => validateMigrationDiagnostics(badSource({ kind: 'modern-script' }))).toThrow(
      'diagnostics[0].source.kind: 期望 legacy-script',
    )
    expect(() => validateMigrationDiagnostics(badSource({ label: '' }))).toThrow(
      'diagnostics[0].source.label: 期望非空 string',
    )
    expect(() => validateMigrationDiagnostics(badSource({ address: -1 }))).toThrow(
      'diagnostics[0].source.address: 期望非负整数',
    )
    expect(() => validateMigrationDiagnostics(badSource({ address: 1.5 }))).toThrow(
      'diagnostics[0].source.address: 期望非负整数',
    )
    // address 0 合法（正控：合法基线即 address 0）
    expect(() => validateMigrationDiagnostics(legalDiagnostic())).not.toThrow()
  })
})

describe('A7 category×capability 支持域与同对象返回', () => {
  test('五 category × 三 capability 全组合合法；返回同一输入对象；额外字段不拒（无 exactKeys）', () => {
    const diagnostics: Record<string, unknown>[] = []
    let serial = 0
    for (const category of MIGRATION_DIAGNOSTIC_CATEGORIES)
      for (const capability of ['equip', 'use', 'throw'] as const) {
        const d = diagnosticAt(0)
        const target = d.target as Record<string, unknown>
        diagnostics.push({
          ...d,
          id: `diag-${serial++}`,
          category,
          target: { ...target, capability },
        })
      }
    const input = { version: 1, diagnostics }
    const result = validateMigrationDiagnostics(input)
    expect(result).toBe(input) // 返回同一输入对象（现行合同）
    expect(result.diagnostics).toHaveLength(15)
    // 无 exactKeys 政策：诊断对象带额外字段仍被接受（现行宽容合同，不发明拒绝）
    const extra = diagnosticAt(0)
    const withExtra = {
      version: 1,
      diagnostics: [{ ...extra, id: 'diag-extra', futureField: { note: '前向兼容' } }],
    }
    expect(() => validateMigrationDiagnostics(withExtra)).not.toThrow()
  })
})
