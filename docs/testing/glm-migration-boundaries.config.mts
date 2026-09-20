// TEST-MIGRATION-BOUNDARIES-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；MG1_MODE=before 排本包 7 新测试文件，after 含。
// 运行：MG1_MODE=<before|after> MG1_OUT=<tmpdir> pnpm --filter @type-pal/editor exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkg = coveragePackages.find((entry) => entry.id === 'migrate')
if (!pkg) throw new Error('missing editor package')
const mode = process.env.MG1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('MG1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.MG1_OUT
if (!out) throw new Error('MG1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/migration-project-io.boundaries.test.ts',
  'src/migration-transaction.boundaries.test.ts',
  'src/migration-write-plan.boundaries.test.ts',
  'src/project-map-converter.boundaries.test.ts',
  'src/source-facts.boundaries.test.ts',
  'src/pal-authored-overlays.boundaries.test.ts',
  'src/pal-item-scheme-labels.boundaries.test.ts',
  'src/pal-store-boundary.boundaries.test.ts',
]

export default {
  root: join(repoRoot, 'packages/migrate'),
  test: {
    exclude: mode === 'before' ? [...selection.excludes, ...newFiles] : selection.excludes,
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'json'],
      reportsDirectory: out,
      include: pkg.include,
      exclude: coverageExcludes,
    },
  },
}
