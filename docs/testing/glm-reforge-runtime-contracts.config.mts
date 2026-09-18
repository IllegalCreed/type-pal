// TEST-REFORGE-RUNTIME-CONTRACTS-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs 的 coveragePackages/testSelection/
// coverageExcludes；同目标源码、同既有测试集（fast profile 官方口径）。
// RR1_MODE=before 只排本包 10 个新增测试文件；after 不排（含新文件）。
// 输出目录由 RR1_OUT 指定（专属 /tmp），不写 coverage/fast 或官方 baseline。
// 运行（--config 用物理绝对路径，避免 pnpm filter cwd 歧义）：
//   RR1_MODE=before RR1_OUT=/tmp/... pnpm --filter @type-pal/reforge exec \
//     vitest run --coverage --maxWorkers 1 --passWithNoTests \
//     --config /Users/zhangxu/illegal/type-pal-glm-reforge-runtime/docs/testing/glm-reforge-runtime-contracts.config.mts
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const reforge = coveragePackages.find((pkg) => pkg.id === 'reforge')
if (!reforge) throw new Error('official coverage config missing reforge package')

// 本包 10 个新增测试文件（任务卡白名单精确路径，packages/reforge/src/ 下）。
const newTestFiles = [
  'src/input.keyboard-boundaries.test.ts',
  'src/menu-state.navigation-boundaries.test.ts',
  'src/equip-menu-state.navigation-boundaries.test.ts',
  'src/use-menu-state.navigation-boundaries.test.ts',
  'src/audio/bgm.runtime-boundaries.test.ts',
  'src/audio/midi-preview.lifecycle-boundaries.test.ts',
  'src/project-loader.current-boundaries.test.ts',
  'src/asset-resolver.io-boundaries.test.ts',
  'src/cutscene-controller.dispatch-boundaries.test.ts',
  'src/script-host-adapter.current-dispatch.test.ts',
]

const mode = process.env.RR1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('RR1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.RR1_OUT
if (!out) throw new Error('RR1_OUT must point to a dedicated /tmp reports directory')

// 官方 fast profile 的同一测试选择；before 只额外排除本包 10 个新文件。
const selection = testSelection(reforge, 'fast')

export default {
  root: join(repoRoot, 'packages/reforge'),
  test: {
    exclude: mode === 'before' ? [...selection.excludes, ...newTestFiles] : selection.excludes,
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'json'],
      reportsDirectory: out,
      // 与官方 scopeDigest 同口径：包 include + coverageExcludes，不动 coverage.all。
      include: reforge.include,
      exclude: coverageExcludes,
    },
  },
}
