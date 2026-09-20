// TEST-EDITOR-IMPORT-CODEC-1 覆盖对照诊断配置（不进默认 Vitest）。
// 直接消费官方 scripts/coverage/config.mjs；IC1_MODE=before 排本包 7 新测试文件，after 含。
// 运行：IC1_MODE=<before|after> IC1_OUT=<tmpdir> pnpm --filter @type-pal/editor exec
//   vitest run --coverage --maxWorkers 1 --passWithNoTests --config <本文件绝对路径>
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../scripts/coverage/config.mjs'

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const pkg = coveragePackages.find((entry) => entry.id === 'editor')
if (!pkg) throw new Error('missing editor package')
const mode = process.env.IC1_MODE
if (mode !== 'before' && mode !== 'after')
  throw new Error('IC1_MODE must be before (排除本包新文件) or after (含本包新文件)')
const out = process.env.IC1_OUT
if (!out) throw new Error('IC1_OUT must point to a dedicated /tmp reports directory')

const selection = testSelection(pkg, 'fast')
const newFiles = [
  'src/core/image-import.stages.test.ts',
  'src/core/battle-sprite-import.boundaries.test.ts',
  'src/core/frame-animation-images.boundaries.test.ts',
  'src/core/frame-animation-codec.tpfs.test.ts',
  'src/core/frame-animation-worker-client.boundaries.test.ts',
  'src/core/frame-animation-codec.worker.test.ts',
  'src/core/video-metadata.boxes.test.ts',
]

export default {
  root: join(repoRoot, 'packages/editor'),
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
