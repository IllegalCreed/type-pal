/**
 * TEST-RUNTIME-STATE-BOUNDARIES-1 A5-A7：迁移诊断边界（migration-diagnostic.ts）。
 * migration-diagnostic.test.ts 承担合法 sidecar、空表、类别集与重复 id/未知类别/非法能力；
 * 本文件补容器错型路径、target/source 各字段轴与 category×capability 支持域矩阵。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  MIGRATION_DIAGNOSTIC_CATEGORIES,
  validateMigrationDiagnostics,
} from './migration-diagnostic.js'

const diagnostic = () => ({
  id: 'diag-1',
  severity: 'warn',
  target: { domain: 'item', objectId: '151', capability: 'use', label: '引路蜂' },
  category: 'unsupported-command',
  reason: '原版脚本包含尚未迁移的命令',
  source: { kind: 'legacy-script', label: 'L_39805', address: 0 },
})

const legalDiagnostic = () => ({ version: 1, diagnostics: [diagnostic()] })

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
        diagnostics: [{ ...diagnostic(), id: '' }],
      }),
    ).toThrow('migrationDiagnostics.diagnostics[0].id: 期望非空 string')
    expect(() =>
      validateMigrationDiagnostics({
        version: 1,
        diagnostics: [{ ...diagnostic(), severity: 'error' }],
      }),
    ).toThrow('migrationDiagnostics.diagnostics[0].severity: 期望 warn')
    expect(() =>
      validateMigrationDiagnostics({
        version: 1,
        diagnostics: [{ ...diagnostic(), reason: '' }],
      }),
    ).toThrow('migrationDiagnostics.diagnostics[0].reason: 期望非空 string')
  })
  test('验证拒绝不修改原输入（深快照同一对象）', () => {
    const bad = { version: 1, diagnostics: [{ ...diagnostic(), category: 'nope' }] }
    const snapshot = deepSnapshot(bad)
    expect(() => validateMigrationDiagnostics(bad)).toThrow(
      'migrationDiagnostics.diagnostics[0].category: 未知类别 nope',
    )
    expect(bad).toEqual(snapshot)
  })
})

describe('A6 target 与 source 字段轴', () => {
  test('target domain/objectId/label 与 source kind/label/address 各自精确路径', () => {
    const badTarget = (patch: Record<string, unknown>): unknown => {
      const d = diagnostic()
      return { version: 1, diagnostics: [{ ...d, target: { ...d.target, ...patch } }] }
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
      const d = diagnostic()
      return { version: 1, diagnostics: [{ ...d, source: { ...d.source, ...patch } }] }
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
        const d = diagnostic()
        diagnostics.push({
          ...d,
          id: `diag-${serial++}`,
          category,
          target: { ...d.target, capability },
        })
      }
    const input = { version: 1, diagnostics }
    const result = validateMigrationDiagnostics(input)
    expect(result).toBe(input) // 返回同一输入对象（现行合同）
    expect(result.diagnostics).toHaveLength(15)
    // 当前 sidecar 保留未知元信息；这不代表旧格式升级或新版本兼容能力
    const extra = diagnostic()
    const withExtra = {
      version: 1,
      diagnostics: [{ ...extra, id: 'diag-extra', extraMetadata: { note: '当前版本未知元信息' } }],
    }
    expect(() => validateMigrationDiagnostics(withExtra)).not.toThrow()
  })
})
