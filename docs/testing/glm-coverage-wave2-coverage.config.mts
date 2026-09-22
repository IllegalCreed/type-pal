/** Official fast selection and production scope; only this batch differs between before/after. */
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import {
  coverageExcludes,
  coveragePackages,
  repoRoot,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const id = process.env.WAVE2_COVERAGE_PACKAGE
const phase = process.env.WAVE2_COVERAGE_PHASE ?? 'after'
if (!id || !['reforge', 'editor', 'content', 'migrate'].includes(id))
  throw new Error('WAVE2_COVERAGE_PACKAGE: reforge|editor|content|migrate')
if (!['before', 'after'].includes(phase)) throw new Error('WAVE2_COVERAGE_PHASE: before|after')
const pkg = coveragePackages.find((entry) => entry.id === id)!
const selection = testSelection(pkg, 'fast')
const expected =
  id === 'migrate'
    ? ['--config', 'vitest.config.ts', '--project', 'unit']
    : id === 'editor'
      ? ['--passWithNoTests', '--maxWorkers', '2']
      : ['--passWithNoTests']
if (JSON.stringify(selection.args) !== JSON.stringify(expected))
  throw new Error('official selection changed; adapt explicitly')
const preparation = JSON.parse(
  readFileSync(resolve(repoRoot, 'docs/testing/glm-coverage-wave2-results.json'), 'utf8'),
)
const newTests: string[] = preparation.whitelist.testFiles
  .filter((path: string) => path.startsWith(`${pkg.directory}/`))
  .map((path: string) => path.slice(pkg.directory.length + 1))
const output = resolve(
  process.env.WAVE2_COVERAGE_DIR ?? mkdtempSync(join(tmpdir(), 'type-pal-wave2-coverage-')),
)
if (output === repoRoot || output.startsWith(`${repoRoot}/`))
  throw new Error('wave2 reports must stay outside the repository')
const reports = resolve(output, id, phase)
console.log(`wave2 ${id} ${phase}: ${reports}`)
export default defineConfig({
  root: resolve(repoRoot, pkg.directory),
  test: {
    // Mirrors the selected migrate unit project rather than adding its separate PAL project.
    ...(id === 'migrate'
      ? { include: ['src/**/*.test.ts'], passWithNoTests: false }
      : { passWithNoTests: true }),
    pool: 'forks',
    isolate: true,
    maxWorkers: 2,
    exclude: [
      ...selection.excludes,
      ...(id === 'migrate' ? ['src/**/*.pal.test.ts'] : []),
      ...(phase === 'before' ? newTests : []),
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
})
