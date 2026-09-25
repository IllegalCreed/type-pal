/**
 * ARCH-REGRESSION-LAB-GLM-1 显式候选配置（本目录专属，不改仓库任何配置）。
 * - 只收集 candidates/**；diagnostics/**（业务红诊断）由 diagnostics 配置单独运行。
 * - root 设在 packages/editor：@type-pal/* 解析到本工作树自己的 workspace 链接
 *   （packages/editor/node_modules/@type-pal/{content,reforge} → 本树源码），
 *   docs/** 下的测试文件借 root 别名解析，不复用 main 工作树。
 * - 环境/JSX 合同复用 editor 既有测试口径（jsdom + @vitejs/plugin-react）。
 * - maxWorkers=2（工作包纪律）；不设全局 testTimeout 覆盖。
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const labRoot = path.resolve(import.meta.dirname, '..') // docs/testing/glm-architecture-regression-lab
const editorRoot = path.resolve(labRoot, '../../../packages/editor')
const w = (p) => path.resolve(labRoot, '../../../', p)
// 从 editor 作用域解析插件（plugin 声明在 editor devDependencies；根 node_modules 无）
const editorRequire = createRequire(path.resolve(editorRoot, 'package.json'))
const react = editorRequire('@vitejs/plugin-react')

const workspaceAliases = {
  '@type-pal/content': path.resolve(w('packages/content/src/index.ts')),
  '@type-pal/shared': path.resolve(w('packages/shared/src/index.ts')),
  '@type-pal/reforge': path.resolve(w('packages/reforge/src/index.ts')),
  '@type-pal/reforge/entity-action-player': path.resolve(
    w('packages/reforge/src/entity-action-player.ts'),
  ),
  '@type-pal/reforge/script-compiler-core': path.resolve(
    w('packages/reforge/src/script-compiler-core.ts'),
  ),
  '@type-pal/game': path.resolve(w('packages/game/src/index.ts')),
  '@type-pal/migrate': path.resolve(w('packages/migrate/src/index.ts')),
}

export default defineConfig({
  root: editorRoot,
  resolve: {
    alias: [
      // 先精确映射 reforge 子导出，再映射包根
      { find: '@type-pal/reforge/entity-action-player', replacement: workspaceAliases['@type-pal/reforge/entity-action-player'] },
      { find: '@type-pal/reforge/script-compiler-core', replacement: workspaceAliases['@type-pal/reforge/script-compiler-core'] },
      { find: '@type-pal/reforge', replacement: workspaceAliases['@type-pal/reforge'] },
      { find: '@type-pal/content', replacement: workspaceAliases['@type-pal/content'] },
      { find: '@type-pal/shared', replacement: workspaceAliases['@type-pal/shared'] },
      { find: '@type-pal/game', replacement: workspaceAliases['@type-pal/game'] },
      { find: '@type-pal/migrate', replacement: workspaceAliases['@type-pal/migrate'] },
      // editor 是应用包（无 exports），按需为候选测试暴露其内部模块（指向本树源码）
      { find: '@lab/editor/edit-session', replacement: path.resolve(editorRoot, 'src/core/edit-session.ts') },
      { find: '@lab/editor/commands', replacement: path.resolve(editorRoot, 'src/core/commands.ts') },
      { find: '@lab/editor/seed', replacement: path.resolve(editorRoot, 'src/core/seed.ts') },
      { find: '@lab/editor/project-io', replacement: path.resolve(editorRoot, 'src/core/project-io.ts') },
    ],
  },
  plugins: [react()],
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: {
    environment: 'jsdom',
    include: [path.resolve(labRoot, 'candidates/editor/**/*.test.{ts,tsx}'),
      path.resolve(labRoot, 'candidates/content/**/*.test.{ts,tsx}'),
      path.resolve(labRoot, 'candidates/game/**/*.test.{ts,tsx}'),
      path.resolve(labRoot, 'candidates/migrate/**/*.test.{ts,tsx}')],
    maxWorkers: 2,
    fileParallelism: true,
  },
})
