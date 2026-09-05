// node --import tsx docs/ops/audits/pre-e2e/probe-precache-progress.mjs
// Original worker in VM; memory CacheStorage/fetch/UI nodes, no real browser caches/network.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createUnifiedProgressUi } from '../../../../packages/game/src/shell/precache-ui.ts'

const workerSource = readFileSync(
  new URL('../../../../packages/game/public/sw.js', import.meta.url),
  'utf8',
)
const MiB = 1024 * 1024
for (const failed of [false, true]) {
  const handlers = {},
    messages = [],
    stores = new Map()
  let offline = false
  const key = (x) => (typeof x === 'string' ? new URL(x, 'https://audit.invalid').href : x.url)
  const caches = {
    async keys() {
      return [...stores.keys()]
    },
    async delete(k) {
      return stores.delete(k)
    },
    async open(k) {
      if (!stores.has(k)) stores.set(k, new Map())
      const s = stores.get(k)
      return {
        async match(x) {
          return s.get(key(x))
        },
        async put(x, r) {
          s.set(key(x), r)
        },
      }
    },
    async match(x) {
      for (const s of stores.values()) if (s.has(key(x))) return s.get(key(x))
    },
  }
  const manifest = {
    version: 'memory-v1',
    files: [
      { path: 'a.bin', size: MiB },
      { path: 'b.bin', size: MiB },
    ],
    totalBytes: 2 * MiB,
  }
  const memoryFetch = async (x) => {
    if (offline) throw new Error('network unavailable')
    const path = new URL(typeof x === 'string' ? x : x.url, 'https://audit.invalid').pathname
    if (path === '/extracted/asset-manifest.json') return { ok: true, json: async () => manifest }
    if (path === '/extracted/b.bin' && failed) return new Response('missing', { status: 404 })
    return new Response(new Uint8Array(MiB), { status: 200 })
  }
  const sandbox = vm.createContext({
    self: {
      location: { origin: 'https://audit.invalid' },
      addEventListener(type, handler) {
        handlers[type] = handler
      },
      clients: {
        matchAll: async () => [{ postMessage: (msg) => messages.push(msg) }],
        claim: async () => {},
      },
      skipWaiting() {},
    },
    caches,
    fetch: memoryFetch,
    URL,
    Date,
    Promise,
    console,
  })
  vm.runInContext(workerSource, sandbox, { filename: 'packages/game/public/sw.js' })
  let pending
  handlers.message({
    data: { type: 'precache' },
    waitUntil(p) {
      pending = p
    },
  })
  await pending
  await new Promise((resolve) => setImmediate(resolve))
  const progress = messages.filter((m) => m.type === 'precache-progress').at(-1)
  const done = messages.find((m) => m.type === 'precache-done')
  assert(done)
  assert.equal(progress.bytes, 2 * MiB)
  const nodes = { 'boot-loading-fill': { style: {} }, 'boot-loading-status': { textContent: '' } }
  const oldDocument = globalThis.document
  globalThis.document = { getElementById: (id) => nodes[id] ?? null }
  try {
    const ui = createUnifiedProgressUi()
    ui.markPlayable(() => {})
    ui.setFullProgress(progress.bytes, progress.totalBytes)
  } finally {
    if (oldDocument === undefined) delete globalThis.document
    else globalThis.document = oldDocument
  }
  offline = true
  let response
  handlers.fetch({
    request: { method: 'GET', url: 'https://audit.invalid/extracted/b.bin' },
    respondWith(p) {
      response = p
    },
  })
  let offlineStatus
  try {
    offlineStatus = (await response).status
  } catch (error) {
    offlineStatus = error.message
  }
  const cachedFiles = [...stores.values()].reduce((n, s) => n + s.size, 0)
  assert.equal(cachedFiles, failed ? 1 : 2)
  assert.equal(offlineStatus, failed ? 'network unavailable' : 200)
  assert.equal(nodes['boot-loading-status'].textContent, '已缓存 2/2MB')
  assert.equal(nodes['boot-loading-fill'].style.width, '100%')
  console.log(
    'E-precache',
    JSON.stringify({
      failedAsset404: failed,
      cachedFiles,
      progress,
      done,
      display: nodes['boot-loading-status'].textContent,
      barWidth: nodes['boot-loading-fill'].style.width,
      offlineFetch: offlineStatus,
    }),
  )
}
