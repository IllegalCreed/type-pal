// Node-only HTTP host test stays outside the editor's DOM-only TypeScript program.
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { expect, test } from 'vitest'

test('real editor HTTP server returns genuine optional-file 404 instead of SPA fallback', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const server = await createServer({
    root,
    configFile: `${root}vite.config.ts`,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
  })
  try {
    await server.listen()
    const port = server.httpServer.address().port
    const response = await fetch(
      `http://127.0.0.1:${port}/projects/simulator-missing-${crypto.randomUUID()}/editor/battle-simulator.json`,
    )
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('')
  } finally {
    await server.close()
  }
})
