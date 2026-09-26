/** TEST-GLM-CONTENT-GUARDS-2 one tmp before/after measurement; identical official content/fast scope on both sides. */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  coverageExcludes,
  coveragePackages,
  repoRoot,
  testSelection,
} from '../../../scripts/coverage/config.mjs'

const phase = process.env.CONTENT_GUARDS_LEAF_PHASE ?? 'after'
if (!['before', 'after'].includes(phase)) throw new Error('CONTENT_GUARDS_LEAF_PHASE: before|after')
const pkg = coveragePackages.find((entry) => entry.id === 'content')
if (!pkg) throw new Error('content configuration missing')
const selection = testSelection(pkg, 'fast')
if (JSON.stringify(selection.args) !== JSON.stringify(['--passWithNoTests']))
  throw new Error('content fast selection changed; adapt explicitly')
const modules = [
  'enemy-validation-shapes.leaf',
  'enemy-ai-condition-guard.leaf',
  'battle-choreography.leaf',
]
const output =
  process.env.CONTENT_GUARDS_LEAF_DIR ?? mkdtempSync(join(tmpdir(), 'type-pal-guard-leaf-'))
const reports = resolve(output, phase)
console.log(`guard leaf coverage ${phase}: ${reports}`)
export default {
  root: resolve(repoRoot, pkg.directory),
  test: {
    passWithNoTests: true,
    maxWorkers: 2,
    exclude: [
      ...selection.excludes,
      ...(phase === 'before' ? modules.map((name) => `src/${name}.test.ts`) : []),
    ],
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
}
