// TEST-CONTENT-RESIDUAL-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；CR1_MODE=before 排本包 5 新文件，after 含。
// 运行：CR1_MODE=<before|after> CR1_OUT=<tmpdir> pnpm --filter @type-pal/content exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkg = coveragePackages.find((entry) => entry.id === 'content')
if (!pkg) throw new Error('missing content package')
const mode = process.env.CR1_MODE
if (mode !== 'before' && mode !== 'after') throw new Error('CR1_MODE must be before|after')
const out = process.env.CR1_OUT
if (!out) throw new Error('CR1_OUT must point to a dedicated /tmp dir')
const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/asset.residual.test.ts',
  'src/author-dialogue.field-guards.test.ts',
  'src/frame-sequence.residual.test.ts',
  'src/map-index.residual.test.ts',
  'src/validate-refs.data-refs.test.ts',
]
export default {
  root: join(repoRoot, 'packages/content'),
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
