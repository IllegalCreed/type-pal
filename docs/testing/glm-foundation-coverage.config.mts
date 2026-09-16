/**
 * TEST-FOUNDATION-COVERAGE-1 定向诊断配置（非正式统计配置）。
 * 复刻 migrate 包官方 fast 排除口径（vitest.config.ts + scripts/coverage/config.mjs
 * migrateCoverageFastTestExcludes），供回执覆盖对照命令直接复制；环境变量
 * GLM_FC_EXCLUDE_BOUNDARIES=1 时额外排除本批三个 boundaries 测试文件（before 侧）。
 * 完整可复制命令（含 coverage.include 三个纯核模块的 glob 形态）见
 * docs/testing/glm-foundation-coverage-receipt.md「覆盖对照可重建命令」节。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../packages/migrate/', import.meta.url))
const excludesRaw = readFileSync(
  fileURLToPath(new URL('../../scripts/coverage/config.mjs', import.meta.url)),
  'utf8',
)
const excludeList = [...excludesRaw.matchAll(/'(src\/[^']+)'/g)].map((m) => m[1]!)
const officialFastExcludes = [...excludeList.filter((p) => p.endsWith('.test.ts'))]
const boundariesExcludes =
  process.env.GLM_FC_EXCLUDE_BOUNDARIES === '1'
    ? [
        'src/migration-merge.boundaries.test.ts',
        'src/migration-plan.boundaries.test.ts',
        'src/migration-baseline-pure.boundaries.test.ts',
      ]
    : []

export default {
  root,
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.pal.test.ts', ...officialFastExcludes, ...boundariesExcludes],
          pool: 'forks',
          isolate: true,
          maxWorkers: 2,
        },
      },
    ],
  },
}
