// TEST-EDITOR-MAP-DATA-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；MD1_MODE=before 排本包 7 新测试文件，after 含。
// 运行：MD1_MODE=<before|after> MD1_OUT=<tmpdir> pnpm --filter @type-pal/editor exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkg = coveragePackages.find((entry) => entry.id === 'editor')
if (!pkg) throw new Error('missing editor package')
const mode = process.env.MD1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('MD1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.MD1_OUT
if (!out) throw new Error('MD1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/core/map-selection.boundaries.test.ts',
  'src/core/map-transform.boundaries.test.ts',
  'src/core/map-patch.boundaries.test.ts',
  'src/core/stamp-draft.boundaries.test.ts',
  'src/core/stamp-template.boundaries.test.ts',
  'src/core/stamp-placement.boundaries.test.ts',
  'src/core/stamp-group-transform.boundaries.test.ts',
]

export default {
  root: join(repoRoot, 'packages/editor'),
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
