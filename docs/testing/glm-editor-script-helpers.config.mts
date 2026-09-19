// TEST-EDITOR-SCRIPT-HELPERS-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；SH1_MODE=before 排本包 7 新测试文件，after 含。
// 运行：SH1_MODE=<before|after> SH1_OUT=<tmpdir> pnpm --filter @type-pal/editor exec
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
const mode = process.env.SH1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('SH1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.SH1_OUT
if (!out) throw new Error('SH1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/core/author-command-edit.boundaries.test.ts',
  'src/core/script-editor-projection.boundaries.test.ts',
  'src/core/script-reference-catalog.boundaries.test.ts',
  'src/core/item-authoring.boundaries.test.ts',
  'src/core/item-alchemy.boundaries.test.ts',
  'src/ui/enemy-defeated-events.boundaries.test.ts',
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
