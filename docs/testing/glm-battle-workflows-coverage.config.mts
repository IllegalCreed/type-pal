/** TEST-BATTLE-WORKFLOWS-1：官方 fast 选择/生产范围；before/after 只差本批 6 个新测试。 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import {
  coverageExcludes,
  coveragePackages,
  repoRoot,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const phase = process.env.BW1_COVERAGE_PHASE ?? 'after'
if (!['before', 'after'].includes(phase)) throw new Error('BW1_COVERAGE_PHASE: before|after')
const pkg = coveragePackages.find((entry) => entry.id === 'reforge')!
const selection = testSelection(pkg, 'fast')
if (JSON.stringify(selection.args) !== JSON.stringify(['--passWithNoTests']))
  throw new Error('official reforge fast selection changed; adapt explicitly')
const newTests = [
  'src/battle/battle-session.selection-flows.test.ts',
  'src/battle/battle-session.round-flows.test.ts',
  'src/battle/battle-session.action-flows.test.ts',
  'src/battle/battle-session.script-flows.test.ts',
  'src/battle/battle-session.terminal-flows.test.ts',
  'src/battle/battle-session.writeback-flows.test.ts',
]
const output = resolve(
  process.env.BW1_COVERAGE_DIR ?? mkdtempSync(join(tmpdir(), 'type-pal-bw1-coverage-')),
)
if (output === repoRoot || output.startsWith(`${repoRoot}/`))
  throw new Error('bw1 reports must stay outside the repository')
const reports = resolve(output, phase)
console.log(`bw1 reforge ${phase}: ${reports}`)
export default defineConfig({
  root: resolve(repoRoot, pkg.directory),
  test: {
    passWithNoTests: true,
    pool: 'forks',
    isolate: true,
    maxWorkers: 2,
    exclude: [...selection.excludes, ...(phase === 'before' ? newTests : [])],
    env: { TYPE_PAL_COVERAGE: '1', TYPE_PAL_COVERAGE_PROFILE: 'fast' },
    reporters: ['default', 'json'],
    outputFile: { json: resolve(reports, 'tests.json') },
    coverage: {
      enabled: true,
      provider: 'v8',
      include: pkg.include,
      exclude: coverageExcludes,
      reporter: ['json', 'json-summary', 'lcov'],
      reportsDirectory: reports,
    },
  },
})
