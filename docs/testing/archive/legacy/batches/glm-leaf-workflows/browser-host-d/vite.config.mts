import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../..')
const editorRequire = createRequire(
  fileURLToPath(new URL('../../../../../../../packages/editor/package.json', import.meta.url)),
)

export default {
  plugins: [editorRequire('@vitejs/plugin-react')()],
  resolve: {
    alias: {
      'react-dom/client': resolve(
        dirname(editorRequire.resolve('react-dom/package.json')),
        'client.js',
      ),
      react: dirname(editorRequire.resolve('react/package.json')),
      '@type-pal/reforge': resolve(root, 'packages/reforge/src/index.ts'),
      '@type-pal/content': resolve(root, 'packages/content/src/index.ts'),
    },
  },
  server: { port: 6068, strictPort: true, host: '127.0.0.1' },
}
