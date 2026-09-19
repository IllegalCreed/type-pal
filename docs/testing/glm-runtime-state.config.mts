// TEST-RUNTIME-STATE-BOUNDARIES-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs 的 coveragePackages/testSelection/
// coverageExcludes；同目标源码、同既有测试集（fast profile 官方口径）。
// SB1_PKG 选择包；SB1_MODE=before 只排本包该包的新增测试文件，after 含它们。
// 输出目录由 SB1_OUT 指定（专属 /tmp）；--config 用物理绝对路径。
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))

const NEW_TESTS: Record<string, string[]> = {
  content: ['src/world-variable.boundaries.test.ts', 'src/migration-diagnostic.boundaries.test.ts'],
  reforge: [
    'src/runtime-script-compiler.boundaries.test.ts',
    'src/runtime-project-view.boundaries.test.ts',
    'src/entity-action-player.boundaries.test.ts',
    'src/frame-animation-player.boundaries.test.ts',
    'src/magic-menu-state.boundaries.test.ts',
    'src/system-menu-state.boundaries.test.ts',
    'src/scene-entry-session.boundaries.test.ts',
    'src/screen-hold-transaction.boundaries.test.ts',
    'src/menu/reward-gain-queue.boundaries.test.ts',
  ],
}

const pkgId = process.env.SB1_PKG
if (!pkgId || !(pkgId in NEW_TESTS)) throw new Error('SB1_PKG must be content or reforge')
const pkg = coveragePackages.find((entry) => entry.id === pkgId)
if (!pkg) throw new Error(`official coverage config missing ${pkgId}`)

const mode = process.env.SB1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('SB1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.SB1_OUT
if (!out) throw new Error('SB1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')

export default {
  root: join(repoRoot, 'packages', pkgId),
  test: {
    exclude: mode === 'before' ? [...selection.excludes, ...NEW_TESTS[pkgId]] : selection.excludes,
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'json'],
      reportsDirectory: out,
      include: pkg.include,
      exclude: coverageExcludes,
    },
  },
}
