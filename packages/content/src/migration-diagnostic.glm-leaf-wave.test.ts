import { describe, expect, test } from 'vitest'
import {
  MIGRATION_DIAGNOSTIC_CATEGORIES,
  validateMigrationDiagnostics,
} from './migration-diagnostic.js'

describe('migration-diagnostic 剩余合同', () => {
  test('category table lists the canonical set and validator accepts a full record', () => {
    expect(MIGRATION_DIAGNOSTIC_CATEGORIES).toContain('unsupported-command')
    expect(MIGRATION_DIAGNOSTIC_CATEGORIES).toHaveLength(5)
    const valid = {
      version: 1,
      generatedAt: '2026-09-28T00:00:00Z',
      diagnostics: [],
    }
    expect(validateMigrationDiagnostics(valid)).toEqual(valid)
  })

  test('rejects wrong versions, non-array diagnostics and unknown categories', () => {
    expect(() => validateMigrationDiagnostics({ version: 2, diagnostics: [] })).toThrow()
    expect(() => validateMigrationDiagnostics({ version: 1, diagnostics: 'nope' })).toThrow()
    expect(() =>
      validateMigrationDiagnostics({
        version: 1,
        diagnostics: [{ category: 'not-a-category', where: 'x', detail: 'y' }],
      }),
    ).toThrow()
  })
})
