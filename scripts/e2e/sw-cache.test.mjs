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
