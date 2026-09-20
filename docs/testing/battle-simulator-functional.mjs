// Read-only synthetic-project dev host on the documented editor demo port (6011).
// node docs/testing/battle-simulator-functional.mjs
// Does not create/update PAL content, author directories, or ordinary save data.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = new URL('../../', import.meta.url)
const require = createRequire(new URL('packages/editor/package.json', root))
const { createServer } = await import(require.resolve('vite'))
const { default: react } = await import(require.resolve('@vitejs/plugin-react'))
const editor = fileURLToPath(new URL('packages/editor/', root))
const ssr = await createServer({
  root: editor,
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
let files
try {
  const fixture = await ssr.ssrLoadModule('/src/core/__tests__/battle-trial-project.ts')
  files = await fixture.battleTrialProjectFiles()
} finally {
  await ssr.close()
}
const prefix = '/projects/simulator-smoke/'
const server = await createServer({
  root: editor,
  configFile: fileURLToPath(new URL('packages/editor/vite.config.ts', root)),
  define: { 'import.meta.env.VITE_PROJECT_ID': JSON.stringify('simulator-smoke') },
  server: { port: 6011, strictPort: true },
  plugins: [
    {
      name: 'simulator-functional-fixture',
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
              ? 'application/vnd.type-pal.rle'
              : 'application/json; charset=utf-8',
          )
          const bytes =
            value instanceof ArrayBuffer
              ? Buffer.from(value)
              : Buffer.from(
                  typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
                )
          response.end(request.method === 'HEAD' ? undefined : bytes)
        })
      },
    },
  ],
})
await server.listen()
server.printUrls()
console.log(
  'Synthetic simulator-smoke project only; author source is read-only memory. Ctrl-C stops this host.',
)
process.once('SIGINT', async () => {
  await server.close()
  process.exit(0)
})
