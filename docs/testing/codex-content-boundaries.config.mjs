/** One completed six-module batch; identical official content/fast scope on both sides. */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  coverageExcludes,
  coveragePackages,
  repoRoot,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const phase = process.env.CONTENT_BOUNDARIES_PHASE ?? 'after'
if (!['before', 'after'].includes(phase)) throw new Error('CONTENT_BOUNDARIES_PHASE: before|after')
const pkg = coveragePackages.find((entry) => entry.id === 'content')
if (!pkg) throw new Error('content configuration missing')
const selection = testSelection(pkg, 'fast')
if (JSON.stringify(selection.args) !== JSON.stringify(['--passWithNoTests']))
  throw new Error('content fast selection changed; adapt explicitly')
const output =
  process.env.CONTENT_BOUNDARIES_DIR ?? mkdtempSync(join(tmpdir(), 'type-pal-content-boundaries-'))
const reports = resolve(output, phase)
const modules = [
  'actor-condition',
  'project-map',
  'battle-sprite',
  'rewards',
  'runtime-script',
  'scene-index',
]
console.log(`content boundaries ${phase}: ${reports}`)
export default {
  root: resolve(repoRoot, pkg.directory),
  test: {
    passWithNoTests: true,
    maxWorkers: 2,
    exclude: [
      ...selection.excludes,
      ...(phase === 'before' ? modules.map((name) => `src/${name}.boundaries.test.ts`) : []),
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
