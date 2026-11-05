import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../../packages/game/public/sw.js', import.meta.url), 'utf8')

function worker(response) {
  const listeners = new Map()
  const stored = new Map()
  let openCache
  const opening = new Promise((resolve) => {
    openCache = resolve
  })
  runInNewContext(source, {
    URL,
    self: {
      location: { origin: 'https://game.test' },
      addEventListener: (name, listener) => listeners.set(name, listener),
    },
    caches: {
      match: async (request) => stored.get(request.url)?.clone(),
      open: () =>
        opening.then(() => ({
          put: async (request, copy) => {
            stored.set(request.url, new Response(await copy.arrayBuffer()))
          },
        })),
    },
    fetch: async () => response,
  })
  function request(url, init) {
    let output
    const lifetime = []
    listeners.get('fetch')({
      request: new Request(url, init),
      respondWith: (promise) => {
        output = promise
      },
      waitUntil: (promise) => lifetime.push(promise),
    })
    return { output, lifetime }
  }
  return { request, openCache, stored }
}

test('SW caches a complete asset even when the client consumes it before cache opening completes', async () => {
  const bytes = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0)
  const url = 'https://game.test/assets/rix-test.wasm'
  const sw = worker(new Response(bytes))
  const first = sw.request(url)
  assert.deepEqual(new Uint8Array(await (await first.output).arrayBuffer()), bytes)
  assert.equal(first.lifetime.length, 1, 'cache writing must extend the worker lifetime')
  sw.openCache()
  await Promise.all(first.lifetime)
  await new Promise((resolve) => setImmediate(resolve))
  assert.ok(sw.stored.has(url), 'complete WASM response must enter the cache')
  const cached = sw.request(url)
  assert.deepEqual(new Uint8Array(await (await cached.output).arrayBuffer()), bytes)
})

test('SW serves a partial response without placing it into the full-asset cache', async () => {
  const sw = worker(
    new Response('partial', {
      status: 206,
      headers: { 'Content-Range': 'bytes 0-6/16', 'Content-Type': 'video/mp4' },
    }),
  )
  const result = sw.request('https://game.test/extracted/avi/intro.mp4', {
    headers: { Range: 'bytes=0-6' },
  })
  const response = await result.output
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('Content-Range'), 'bytes 0-6/16')
  assert.equal(await response.text(), 'partial')
  assert.equal(result.lifetime.length, 0)
  sw.openCache()
  await Promise.all(result.lifetime)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(sw.stored.size, 0)
})

/** Runtime ports only; listeners and all scheduling/version logic come from the actual worker. */
function lifecycleWorker(fetchResponse, initialCaches = []) {
  const listeners = new Map()
  const contents = new Map(initialCaches.map((name) => [name, new Map()]))
  const messages = []
  let claims = 0
  runInNewContext(source, {
    URL,
    self: {
      location: { origin: 'https://game.test' },
      addEventListener: (name, listener) => listeners.set(name, listener),
      clients: {
        claim: async () => {
          claims++
        },
        matchAll: async () => [{ postMessage: (msg) => messages.push(structuredClone(msg)) }],
      },
    },
    caches: {
      keys: async () => [...contents.keys()],
      delete: async (name) => contents.delete(name),
      open: async (name) => {
        if (!contents.has(name)) contents.set(name, new Map())
        const cache = contents.get(name)
        return {
          match: async (url) => cache.get(url)?.clone(),
          put: async (url, response) => cache.set(url, response.clone()),
        }
      },
    },
    fetch: fetchResponse,
  })
  function dispatch(name, data) {
    const lifetime = []
    listeners.get(name)({ data, waitUntil: (promise) => lifetime.push(promise) })
    return { lifetime, done: Promise.all(lifetime) }
  }
  return { dispatch, contents, messages, claims: () => claims }
}

const version = '0123456789abcdef'
const manifestUrl = '/extracted/asset-manifest.json'

test('activation preserves the current resource cache and foreign caches, deleting only older type-pal versions', async () => {
  const current = `type-pal-${version}`
  const sw = lifecycleWorker(
    async (url) => {
      assert.equal(url, manifestUrl)
      return Response.json({ version, files: [], fileCount: 0, totalBytes: 0 })
    },
    [current, 'type-pal-fedcba9876543210', 'type-pal-bootstrap', 'other-app'],
  )
  const sentinel = new Response('keep these bytes')
  sw.contents.get(current).set('/sentinel', sentinel)
  await sw.dispatch('activate').done
  assert.deepEqual([...sw.contents.keys()], [current, 'other-app'])
  assert.equal(await sw.contents.get(current).get('/sentinel').text(), 'keep these bytes')
  assert.equal(sw.claims(), 1)
})

test('offline activation retains existing caches and still claims clients', async () => {
  const sw = lifecycleWorker(async () => {
    throw new TypeError('Failed to fetch')
  }, ['type-pal-fedcba9876543210'])
  await sw.dispatch('activate').done
  assert.deepEqual([...sw.contents.keys()], ['type-pal-fedcba9876543210'])
  assert.equal(sw.claims(), 1)
})

test('a paused precache accepts only one round and resumes every resource exactly once', async () => {
  const requests = []
  const files = Array.from({ length: 9 }, (_, i) => ({
    path: `data/part-${i}.bin`,
    size: 1,
    sha256: '2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881', // bytes "x"
  }))
  const sw = lifecycleWorker(async (url) => {
    requests.push(url)
    return url === manifestUrl
      ? Response.json({ version, files, fileCount: 9, totalBytes: 9 })
      : new Response('x')
  })
  await sw.dispatch('message', { type: 'precache-pause' }).done
  const round = sw.dispatch('message', { type: 'precache' })
  assert.equal(round.lifetime.length, 1, 'the actual round must extend the message lifetime')
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(requests, [manifestUrl], 'paused workers must not start asset requests')
  await sw.dispatch('message', { type: 'precache' }).done
  assert.deepEqual(requests, [manifestUrl], 'a duplicate start must not create a second round')
  await sw.dispatch('message', { type: 'precache-resume' }).done
  await round.done
  assert.deepEqual(requests.slice(1).sort(), files.map((f) => `/extracted/${f.path}`).sort())
  assert.equal(sw.contents.get(`type-pal-${version}`).size, 9)
  assert.deepEqual(
    sw.messages.filter((message) => message.type === 'precache-done'),
    [{ type: 'precache-done', total: 9, totalBytes: 9 }],
  )
  assert.deepEqual(sw.messages.at(-2), {
    type: 'precache-progress',
    done: 9,
    total: 9,
    bytes: 9,
    totalBytes: 9,
  })
})
