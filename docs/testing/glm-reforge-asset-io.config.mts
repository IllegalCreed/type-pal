// TEST-REFORGE-ASSET-IO-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；AIO1_MODE=before 排本包 6 新文件，after 含。
// 运行：AIO1_MODE=<before|after> AIO1_OUT=<tmpdir> pnpm --filter @type-pal/reforge exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkg = coveragePackages.find((entry) => entry.id === 'reforge')
if (!pkg) throw new Error('missing reforge package')
const mode = process.env.AIO1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('AIO1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.AIO1_OUT
if (!out) throw new Error('AIO1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/audio/sfx.staged-failures.test.ts',
  'src/audio/sfx-readiness.collections.test.ts',
  'src/project-image-cache.lifecycle.test.ts',
  'src/file-source.cancel-windows.test.ts',
  'src/fsa-source.cancel-windows.test.ts',
  'src/engine-chrome/registry.lifecycle.test.ts',
]

export default {
  root: join(repoRoot, 'packages/reforge'),
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
