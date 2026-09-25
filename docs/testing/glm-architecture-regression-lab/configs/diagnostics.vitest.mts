/**
 * ARCH-REGRESSION-LAB-GLM-1 诊断红例配置：只收集 diagnostics/**；
 * 与 candidates 分开运行——红例默认不进绿套件。判据同 candidates。
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const labRoot = path.resolve(import.meta.dirname, '..')
const editorRoot = path.resolve(labRoot, '../../../packages/editor')
const editorRequire = createRequire(path.resolve(editorRoot, 'package.json'))
const react = editorRequire('@vitejs/plugin-react')
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
      { find: '@type-pal/game', replacement: w('packages/game/src/index.ts') },
      { find: '@type-pal/migrate', replacement: w('packages/migrate/src/index.ts') },
      {
        find: '@lab/editor/edit-session',
        replacement: path.resolve(editorRoot, 'src/core/edit-session.ts'),
      },
      {
        find: '@lab/editor/commands',
        replacement: path.resolve(editorRoot, 'src/core/commands.ts'),
      },
      { find: '@lab/editor/seed', replacement: path.resolve(editorRoot, 'src/core/seed.ts') },
      {
        find: '@lab/editor/project-io',
        replacement: path.resolve(editorRoot, 'src/core/project-io.ts'),
      },
    ],
  },
  plugins: [react()],
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: {
    environment: 'jsdom',
    include: [path.resolve(labRoot, 'diagnostics/**/*.test.{ts,tsx}')],
    maxWorkers: 2,
  },
})
