/** Same production scope and fast test selection on both sides; reports never touch coverage/fast. */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  coverageExcludes,
  coveragePackages,
  repoRoot,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const phase = process.env.REFERENCE_COVERAGE_PHASE ?? 'after'
if (!['before', 'after'].includes(phase)) throw new Error('REFERENCE_COVERAGE_PHASE: before|after')
const pkg = coveragePackages.find((entry) => entry.id === 'content')
if (!pkg) throw new Error('content coverage configuration missing')
const selection = testSelection(pkg, 'fast')
if (JSON.stringify(selection.args) !== JSON.stringify(['--passWithNoTests']))
  throw new Error('content test selection changed; adapt explicitly')
const output =
  process.env.REFERENCE_COVERAGE_DIR ?? mkdtempSync(join(tmpdir(), 'type-pal-reference-'))
const reports = resolve(output, phase)
console.log(`reference coverage ${phase}: ${reports}`)
export default {
  root: resolve(repoRoot, pkg.directory),
  test: {
    passWithNoTests: true,
    maxWorkers: 2,
    exclude: [
      ...selection.excludes,
      ...(phase === 'before'
        ? [
            'src/actor-reference.boundaries.test.ts',
            'src/command-target-reference.boundaries.test.ts',
          ]
        : []),
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
