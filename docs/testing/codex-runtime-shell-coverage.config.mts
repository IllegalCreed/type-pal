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

const phase = process.env.SHELL_COVERAGE_PHASE ?? 'after'
if (!['before', 'after'].includes(phase)) throw new Error('SHELL_COVERAGE_PHASE: before|after')
const pkg = coveragePackages.find((item) => item.id === 'reforge')!
const selected = testSelection(pkg, 'fast')
if (JSON.stringify(selected.args) !== JSON.stringify(['--passWithNoTests']))
  throw new Error('official fast selection changed')
const output = resolve(
  process.env.SHELL_COVERAGE_DIR ?? mkdtempSync(join(tmpdir(), 'type-pal-shell-coverage-')),
)
if (output === repoRoot || output.startsWith(`${repoRoot}/`))
  throw new Error('reports must stay outside repository')
const tests = [
  'main.boot-flows',
  'opening-menu.flows',
  'main.menu-flows',
  'main.dialog-flows',
  'main.save-flows',
  'main.scene-flows',
].map((stem) => `src/${stem}.test.ts`)
console.log(`Runtime shell ${phase}: ${resolve(output, phase)}`)
export default defineConfig({
  root: resolve(repoRoot, pkg.directory),
  test: {
    passWithNoTests: true,
    maxWorkers: 2,
    exclude: [...selected.excludes, ...(phase === 'before' ? tests : [])],
    env: { TYPE_PAL_COVERAGE: '1', TYPE_PAL_COVERAGE_PROFILE: 'fast' },
    reporters: ['default', 'json'],
    outputFile: { json: resolve(output, phase, 'tests.json') },
    coverage: {
      enabled: true,
      provider: 'v8',
      include: pkg.include,
      exclude: coverageExcludes,
      reporter: ['json', 'json-summary', 'lcov'],
      reportsDirectory: resolve(output, phase),
    },
  },
})
