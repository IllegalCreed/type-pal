import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
    },
  },
  server: { port: 6067, strictPort: true, host: '127.0.0.1' },
}
