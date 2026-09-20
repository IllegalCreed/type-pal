// Read-only HTTP seed for the real editor; no PAL, author directory or save-game writes.
// node docs/testing/item-authoring-functional.mjs → http://localhost:6013
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = new URL('../../', import.meta.url)
const require = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(require.resolve('vite'))
const editor = fileURLToPath(new URL('packages/editor/', root))
const ssr = await createServer({
  root: editor,
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
let files
try {
  const { buildBlankProject } = await ssr.ssrLoadModule('/src/core/seed.ts')
  files = await buildBlankProject('item-authoring-smoke')
  files['content/shared-scripts.json'] = {
    'item:item-001:use': {
      name: '合法同前缀共享脚本',
      self: 'none',
      body: [{ kind: 'wait', ms: 19 }],
    },
  }
} finally {
  await ssr.close()
}
const prefix = '/projects/item-authoring-smoke/'
const server = await createServer({
  root: editor,
  configFile: fileURLToPath(new URL('packages/editor/vite.config.ts', root)),
  define: { 'import.meta.env.VITE_PROJECT_ID': JSON.stringify('item-authoring-smoke') },
  server: { port: 6013, strictPort: true },
  plugins: [
    {
      name: 'item-authoring-functional-seed',
      enforce: 'pre',
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          const path = decodeURIComponent((request.url ?? '').split('?')[0])
          if (!path.startsWith(prefix)) return next()
          if (!['GET', 'HEAD'].includes(request.method ?? '')) {
            response.statusCode = 405
            response.end()
            return
          }
          const key = path.slice(prefix.length)
          response.setHeader('Cache-Control', 'no-store')
          if (!Object.hasOwn(files, key)) {
            response.statusCode = 404
            response.end()
            return
          }
          const value = files[key]
          response.setHeader(
            'Content-Type',
            value instanceof ArrayBuffer
              ? 'application/octet-stream'
              : 'application/json; charset=utf-8',
          )
          const bytes =
            value instanceof ArrayBuffer
              ? Buffer.from(value)
              : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
          response.end(request.method === 'HEAD' ? undefined : bytes)
        })
      },
    },
  ],
})
await server.listen()
server.printUrls()
console.log(
  'Memory-only synthetic seed; native directory save/reopen is not supplied by this host.',
)
process.once('SIGINT', async () => {
  await server.close()
  process.exit(0)
})
