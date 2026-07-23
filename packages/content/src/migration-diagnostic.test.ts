import { describe, expect, test } from 'vitest'
import { validateMigrationDiagnostics } from './migration-diagnostic.js'

const valid = () => ({
  version: 1 as const,
  diagnostics: [
    {
      id: 'item-use:267',
      severity: 'warn' as const,
      target: {
        domain: 'item' as const,
        objectId: '267',
        capability: 'use' as const,
        label: '土灵珠',
      },
      category: 'story-script' as const,
      reason: '剧情用途仍需人工确认',
      source: { kind: 'legacy-script' as const, label: 'L_39805', address: 39805 },
    },
  ],
})

describe('migration diagnostics sidecar', () => {
  test('合法 sidecar 原样返回', () => {
    const value = valid()
    expect(validateMigrationDiagnostics(value)).toBe(value)
  })

  test('拒绝重复 id、未知类别、空来源与非法目标能力', () => {
    const duplicate = valid()
    duplicate.diagnostics.push({ ...duplicate.diagnostics[0]! })
    expect(() => validateMigrationDiagnostics(duplicate)).toThrow(/重复/)

    expect(() =>
      validateMigrationDiagnostics({
        ...valid(),
        diagnostics: [{ ...valid().diagnostics[0], category: 'guess' }],
      }),
    ).toThrow(/未知类别/)
    expect(() =>
      validateMigrationDiagnostics({
        ...valid(),
        diagnostics: [
          { ...valid().diagnostics[0], source: { kind: 'legacy-script', label: '', address: 1 } },
        ],
      }),
    ).toThrow(/source\.label/)
    expect(() =>
      validateMigrationDiagnostics({
        ...valid(),
        diagnostics: [
          {
            ...valid().diagnostics[0],
            target: { ...valid().diagnostics[0]!.target, capability: 'story' },
          },
        ],
      }),
    ).toThrow(/target\.capability/)
  })
})
