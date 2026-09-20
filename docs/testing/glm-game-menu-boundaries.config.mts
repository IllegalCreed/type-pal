// TEST-GAME-MENU-BOUNDARIES-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；GM1_MODE=before 排本包 7 新测试文件，after 含。
// 运行：GM1_MODE=<before|after> GM1_OUT=<tmpdir> pnpm --filter @type-pal/editor exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkg = coveragePackages.find((entry) => entry.id === 'game')
if (!pkg) throw new Error('missing editor package')
const mode = process.env.GM1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('GM1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.GM1_OUT
if (!out) throw new Error('GM1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/core/menu/primitives.boundaries.test.ts',
  'src/core/menu/inventory-menu.boundaries.test.ts',
  'src/core/menu/magic-select.boundaries.test.ts',
  'src/core/menu/shop-menu.boundaries.test.ts',
  'src/core/menu/sell-menu.boundaries.test.ts',
  'src/core/menu/equip-menu.boundaries.test.ts',
  'src/core/menu/in-game-menu.boundaries.test.ts',
  'src/core/menu/in-game-magic-menu.boundaries.test.ts',
]

export default {
  root: join(repoRoot, 'packages/game'),
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
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
