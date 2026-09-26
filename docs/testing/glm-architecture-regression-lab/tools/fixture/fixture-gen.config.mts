/**
 * ARCH-REGRESSION-LAB-GLM-1 · V04 fixture 生成配置（本目录专属，不改仓库任何配置）。
 * 只收集 tools/fixture/**；别名仅覆盖生成器所需面（seed / content / reforge）。
 * 输出写系统 /tmp（不进仓），生成器测试本身断言 catalog bytes/sha256 与真实字节一致。
 */
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const labRoot = path.resolve(import.meta.dirname, '../..') // docs/testing/glm-architecture-regression-lab（本配置在 tools/fixture/ 下）
const editorRoot = path.resolve(labRoot, '../../../packages/editor')
const w = (p) => path.resolve(labRoot, '../../../', p)

export default defineConfig({
  root: editorRoot,
  resolve: {
    alias: [
      {
        find: '@type-pal/reforge/entity-action-player',
        replacement: w('packages/reforge/src/entity-action-player.ts'),
      },
      {
        find: '@type-pal/reforge/script-compiler-core',
        replacement: w('packages/reforge/src/script-compiler-core.ts'),
      },
      { find: '@type-pal/reforge', replacement: w('packages/reforge/src/index.ts') },
      { find: '@type-pal/content', replacement: w('packages/content/src/index.ts') },
      { find: '@type-pal/shared', replacement: w('packages/shared/src/index.ts') },
      {
        find: '@lab/editor/seed',
        replacement: path.resolve(editorRoot, 'src/core/seed.ts'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: [path.resolve(labRoot, 'tools/fixture/**/*.test.ts')],
    maxWorkers: 1,
  },
})
