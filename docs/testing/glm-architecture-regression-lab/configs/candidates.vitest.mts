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
      { find: '@lab/game/scene-system', replacement: w('packages/game/src/core/scene-system.ts') },
      { find: '@lab/game/event-system', replacement: w('packages/game/src/core/event-system.ts') },
      { find: '@lab/game/equip-effect', replacement: w('packages/game/src/core/equip-effect.ts') },
      { find: '@lab/game/game-state', replacement: w('packages/game/src/core/game-state.ts') },
      { find: '@type-pal/migrate', replacement: workspaceAliases['@type-pal/migrate'] },
      { find: '@lab/migrate/migrate-content', replacement: w('packages/migrate/src/migrate-content.ts') },
      { find: '@lab/migrate/source-facts', replacement: w('packages/migrate/src/source-facts.ts') },
      // editor 是应用包（无 exports），按需为候选测试暴露其内部模块（指向本树源码）
      { find: '@lab/editor/edit-session', replacement: path.resolve(editorRoot, 'src/core/edit-session.ts') },
      { find: '@lab/editor/commands', replacement: path.resolve(editorRoot, 'src/core/commands.ts') },
      { find: '@lab/editor/seed', replacement: path.resolve(editorRoot, 'src/core/seed.ts') },
      { find: '@lab/editor/project-io', replacement: path.resolve(editorRoot, 'src/core/project-io.ts') },
      { find: '@lab/editor/map-mode', replacement: path.resolve(editorRoot, 'src/ui/MapMode.tsx') },
      { find: '@lab/editor/script-editor-body', replacement: path.resolve(editorRoot, 'src/ui/ScriptEditor.tsx') },
      { find: '@lab/editor/playback', replacement: path.resolve(editorRoot, 'src/core/playback.ts') },
      { find: '@lab/editor/app', replacement: path.resolve(editorRoot, 'src/ui/App.tsx') },
      { find: '@lab/editor/scene-canvas', replacement: path.resolve(editorRoot, 'src/ui/SceneCanvas.tsx') },
      { find: '@lab/editor/author-save-store', replacement: path.resolve(editorRoot, 'src/core/author-save-store.ts') },
      { find: '@lab/editor/handle-store', replacement: path.resolve(editorRoot, 'src/core/handle-store.ts') },
      { find: '@lab/fixtures/author-save-fixture', replacement: path.resolve(editorRoot, 'src/core/__tests__/author-save-fixture.ts') },
      { find: '@lab/fixtures/author-save-store-fixture', replacement: path.resolve(editorRoot, 'src/core/__tests__/author-save-store-fixture.ts') },
      { find: '@lab/editor/history-coordinator', replacement: path.resolve(editorRoot, 'src/core/editor-history-coordinator.ts') },
      { find: '@lab/editor/script-editor', replacement: path.resolve(editorRoot, 'src/core/script-editor.ts') },
      { find: '@lab/editor/script-editor-projection', replacement: path.resolve(editorRoot, 'src/core/script-editor-projection.ts') },
      { find: '@lab/editor/workspace-context', replacement: path.resolve(editorRoot, 'src/core/workspace-context.ts') },
      { find: '@lab/editor/open-actions', replacement: path.resolve(editorRoot, 'src/core/open-actions.ts') },
      // react/react-dom/vitest 从 editor 作用域解析（docs/** 无 node_modules 链）
      { find: /^react$/, replacement: path.resolve(editorRoot, 'node_modules/react/index.js') },
      { find: /^react-dom$/, replacement: path.resolve(editorRoot, 'node_modules/react-dom/index.js') },
      { find: /^react-dom\/client$/, replacement: path.resolve(editorRoot, 'node_modules/react-dom/client.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: path.resolve(editorRoot, 'node_modules/react/jsx-dev-runtime.js') },
      { find: /^react\/jsx-runtime$/, replacement: path.resolve(editorRoot, 'node_modules/react/jsx-runtime.js') },
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
