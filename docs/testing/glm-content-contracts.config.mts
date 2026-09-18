// TEST-CONTENT-CONTRACTS-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs 的 coveragePackages/testSelection/
// coverageExcludes；同目标源码、同既有测试集（fast profile 官方口径）。
// CC1_MODE=before 只排本包 13 个新增测试文件；after 不排（含新文件）。
// 输出目录由 CC1_OUT 指定（专属 /tmp），不写 coverage/fast 或官方 baseline。
// 运行：
//   CC1_MODE=before CC1_OUT=/tmp/... pnpm --filter @type-pal/content exec \
//     vitest run --coverage --config /Users/zhangxu/illegal/type-pal/docs/testing/glm-content-contracts.config.mts
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const content = coveragePackages.find((pkg) => pkg.id === 'content')
if (!content) throw new Error('official coverage config missing content package')

// 本包 13 个新增测试文件（任务卡白名单精确路径，packages/content/src/ 下）。
const newTestFiles = [
  'src/asset-catalog.contracts.test.ts',
  'src/asset-closure.contracts.test.ts',
  'src/project-map.contracts.test.ts',
  'src/map-index.contracts.test.ts',
  'src/tileset-stamp.contracts.test.ts',
  'src/frame-sequence.contracts.test.ts',
  'src/sprite-frame-demand.contracts.test.ts',
  'src/battle-sprite-profile.contracts.test.ts',
  'src/enemy-team.contracts.test.ts',
  'src/author-dialogue.contracts.test.ts',
  'src/actor-reference.contracts.test.ts',
  'src/command-target-reference.contracts.test.ts',
  'src/validate-refs.contracts.test.ts',
]

const mode = process.env.CC1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('CC1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.CC1_OUT
if (!out) throw new Error('CC1_OUT must point to a dedicated /tmp reports directory')

// 官方 fast profile 的同一测试选择；before 只额外排除本包 13 个新文件。
const selection = testSelection(content, 'fast')

export default {
  root: join(repoRoot, 'packages/content'),
  test: {
    // 官方 fast profile 的同一测试选择；before 只额外排除本包 13 个新文件。
    exclude: mode === 'before' ? [...selection.excludes, ...newTestFiles] : selection.excludes,
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'json'],
      reportsDirectory: out,
      // 与官方 scopeDigest 同口径：包 include + coverageExcludes，不动 coverage.all。
      include: content.include,
      exclude: coverageExcludes,
    },
  },
}
