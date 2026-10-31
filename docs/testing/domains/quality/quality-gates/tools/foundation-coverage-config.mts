/**
 * TEST-FOUNDATION-COVERAGE-1 定向诊断配置（非正式统计配置）。
 * 复刻 migrate 包官方 fast 排除口径（vitest.config.ts + scripts/coverage/config.mjs
 * migrateCoverageFastTestExcludes），供回执覆盖对照命令直接复制；环境变量
 * GLM_FC_EXCLUDE_BOUNDARIES=1 时排除原批次边界用例（before 侧）；merge 已按职责
 * 重组，按精确身份排除原 merge/plan/baseline 的28例，重组后其余用例保持入选。
 * 完整可复制命令（含 coverage.include 三个纯核模块的 glob 形态）见
 * docs/testing/glm-foundation-coverage-receipt.md「覆盖对照可重建命令」节。
 */
import { fileURLToPath } from 'node:url'
import { migrateCoverageFastTestExcludes } from '../../../../../../scripts/coverage/config.mjs'

import { withoutFoundationBoundaryCases } from './foundation-migration-selection.mjs'

const root = fileURLToPath(new URL('../../../../../../packages/migrate', import.meta.url))

export default {
  root,
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: 'unit',
          ...(process.env.GLM_FC_EXCLUDE_BOUNDARIES === '1'
            ? { testNamePattern: withoutFoundationBoundaryCases }
            : {}),
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.pal.test.ts', ...migrateCoverageFastTestExcludes],
          pool: 'forks',
          isolate: true,
          maxWorkers: 2,
        },
      },
    ],
  },
}
