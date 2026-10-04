// TEST-KIMI-EDITOR-WORKFLOWS-1 隔离浏览器宿主 vite 配置。
// react 与插件经 editor 包解析（docs 不在 workspace 包内，无自身 node_modules）。
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..', '..')
const editorRequire = createRequire(resolve(here, '../../../../../../packages/editor/package.json'))
const reactDir = dirname(editorRequire.resolve('react/package.json'))
const reactDomDir = dirname(editorRequire.resolve('react-dom/package.json'))
const { default: react } = (await import(editorRequire.resolve('@vitejs/plugin-react'))) as {
  default: typeof import('@vitejs/plugin-react')['default']
}

export default {
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: reactDir,
      'react-dom': reactDomDir,
      '@type-pal/reforge': resolve(repoRoot, 'packages/reforge/src/index.ts'),
      '@type-pal/content': resolve(repoRoot, 'packages/content/src/index.ts'),
    },
  },
  server: {
    port: Number(process.env.KIMI_HOST_PORT ?? 6062),
    strictPort: true,
  },
}
