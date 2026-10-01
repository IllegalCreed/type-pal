// TEST-CURSOR-ASSET-UI-LARGE-1 隔离功能视觉宿主（docs 侧 vite，端口 CURSOR_FLOWS_PORT 默认 6013）。
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..', '..', '..', '..')
const editorRequire = createRequire(resolve(here, '../../../../../../packages/editor/package.json'))
const reactDir = dirname(editorRequire.resolve('react/package.json'))
const reactDomDir = dirname(editorRequire.resolve('react-dom/package.json'))
const { default: react } = (await import(editorRequire.resolve('@vitejs/plugin-react'))) as {
  default: typeof import('@vitejs/plugin-react')['default']
}

export default {
  plugins: [react()],
  root: here,
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: reactDir,
      'react-dom': reactDomDir,
      '@type-pal/reforge': resolve(repoRoot, 'packages/reforge/src'),
      '@type-pal/content': resolve(repoRoot, 'packages/content/src'),
    },
  },
  server: {
    port: Number(process.env.CURSOR_FLOWS_PORT ?? 6013),
    strictPort: true,
    fs: { allow: [repoRoot] },
  },
}
