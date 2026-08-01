import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { PAL_TEST_REPO } from './experimental/script-v5/pal-test-fixture.js'
import {
  loadPalTestOracle,
  PAL_TEST_ORACLE_MANIFEST,
} from './experimental/script-v5/pal-test-oracle.js'
import { loadPalBaseline } from './migration-baseline.js'

const RELEASE_PREREQUISITES = [
  PAL_TEST_ORACLE_MANIFEST,
  'packages/migrate/baselines/pal/_state.json',
  'packages/migrate/.shadow/N3-1/v5/p6/ir/script-migration-ir.json',
  'projects/pal/manifest.json',
  'projects/pal/content/ambiences.json',
] as const

/**
 * Release tests historically used describe.skipIf for developer machines without PAL data.
 * This test is deliberately release-only: direct Vitest use must fail before a skipped suite can
 * turn a missing fixture into a green release result.
 */
describe('PAL release fixture preflight', () => {
  test('requires every source, baseline, oracle and project prerequisite', () => {
    const missing = RELEASE_PREREQUISITES.filter(
      (path) => !existsSync(resolve(PAL_TEST_REPO, path)),
    )
    expect(missing, `PAL release fixture 缺失:\n${missing.join('\n')}`).toEqual([])
    expect(loadPalBaseline(PAL_TEST_REPO), 'PAL release baseline 缺失').not.toBeNull()
    expect(() => loadPalTestOracle()).not.toThrow()
  })
})
