// TEST-RESOURCE-TOOLS-COVERAGE-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；RT1_PKG=<shared|pal-extract>，
// RT1_MODE=before 排本包新测试文件，after 含。
// 运行：RT1_PKG=shared RT1_MODE=<before|after> RT1_OUT=<tmpdir> pnpm --filter @type-pal/shared exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkgId = process.env.RT1_PKG
if (pkgId !== 'shared' && pkgId !== 'pal-extract')
  throw new Error('RT1_PKG must be shared or pal-extract')
const pkg = coveragePackages.find((entry) => entry.id === pkgId)
if (!pkg) throw new Error(`missing ${pkgId} package`)
const mode = process.env.RT1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('RT1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.RT1_OUT
if (!out) throw new Error('RT1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles =
  pkgId === 'shared'
    ? ['src/rle.boundaries.test.ts', 'src/rle-encode.boundaries.test.ts']
    : [
        'src/events/disasm.boundaries.test.ts',
        'src/events/recompile.boundaries.test.ts',
        'src/events/slice.boundaries.test.ts',
        'src/resources/palette.boundaries.test.ts',
        'src/font/__tests__/bdf-to-json.boundaries.test.ts',
        'src/__tests__/asset-manifest.boundaries.test.ts',
      ]

export default {
  root: join(repoRoot, 'packages', pkgId === 'shared' ? 'shared' : 'pal-extract'),
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
