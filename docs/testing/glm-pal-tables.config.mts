// TEST-PAL-TABLES-COVERAGE-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；PT1_MODE=before 排本包 9 新测试文件，after 含。
// 运行：PT1_MODE=<before|after> PT1_OUT=<tmpdir> pnpm --filter @type-pal/pal-extract exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkg = coveragePackages.find((entry) => entry.id === 'pal-extract')
if (!pkg) throw new Error('missing pal-extract package')
const mode = process.env.PT1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('PT1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.PT1_OUT
if (!out) throw new Error('PT1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/io/sss.boundaries.test.ts',
  'src/io/word.boundaries.test.ts',
  'src/io/msg.boundaries.test.ts',
  'src/resources/parsers/__tests__/items.boundaries.test.ts',
  'src/resources/parsers/__tests__/stores.boundaries.test.ts',
  'src/resources/parsers/__tests__/battle-fields.boundaries.test.ts',
  'src/resources/parsers/__tests__/enemy-teams.boundaries.test.ts',
  'src/resources/parsers/__tests__/data-misc.boundaries.test.ts',
  'src/resources/enemy-pos.boundaries.test.ts',
]

export default {
  root: join(repoRoot, 'packages/pal-extract'),
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
