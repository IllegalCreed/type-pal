import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const editorRequire = createRequire(
  fileURLToPath(new URL('../../../../../../../packages/editor/package.json', import.meta.url)),
)
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')

export default {
  plugins: [editorRequire('@vitejs/plugin-react')()],
  resolve: {
    alias: {
      'react-dom/client': resolve(
        dirname(editorRequire.resolve('react-dom/package.json')),
        'client.js',
      ),
      react: dirname(editorRequire.resolve('react/package.json')),
      '@type-pal/content': resolve(repoRoot, 'packages/content/src/index.ts'),
      '@type-pal/reforge': resolve(repoRoot, 'packages/reforge/src/index.ts'),
    },
  },
  server: { port: 6087, strictPort: true, host: '127.0.0.1' },
}
