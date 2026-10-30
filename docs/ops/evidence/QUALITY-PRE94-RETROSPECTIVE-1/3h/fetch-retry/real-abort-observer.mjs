import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { setImmediate as nextTurn } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const root = process.argv[2]
assert(root)
const sourcePath = join(root, 'packages/game/src/shell/fetch-retry.ts')
const source = await readFile(sourcePath)
const { installFetchRetry, uninstallFetchRetryForTest } = await import(
  pathToFileURL(sourcePath).href
)
const nativeFetch = globalThis.fetch
const nativeTimeout = globalThis.setTimeout
const backoffMs = 314159
const timers = new Set()
let serverRequests = 0
const server = createServer((_request, response) => {
  serverRequests += 1
  response.writeHead(503, { 'Content-Length': '0' })
  response.end()
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
assert(address && typeof address === 'object')
const url = `http://127.0.0.1:${address.port}/asset`
const proof = {
  node: process.version,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  cases: [],
}
try {
  const controller = new AbortController()
  const reason = new Error('native-cancel')
  controller.abort(reason)
  const result = await nativeFetch(new Request(url, { signal: controller.signal })).catch(
    (error) => error,
  )
  assert.equal(result, reason)
  assert.equal(serverRequests, 0)
  proof.cases.push({
    name: 'native-preaborted-request',
    rejectedSameReason: true,
    serverRequests: 0,
  })

  for (const name of ['init-abort-during-backoff', 'request-preaborted-custom-reason']) {
    uninstallFetchRetryForTest(nativeFetch)
    const controller = new AbortController()
    const reason = new Error(name)
    const requestsBefore = serverRequests
    let nativeCalls = 0
    let settled = false
    const waits = []
    let notify
    globalThis.fetch = (...args) => {
      nativeCalls += 1
      return nativeFetch(...args)
    }
    globalThis.setTimeout = new Proxy(nativeTimeout, {
      apply(target, receiver, args) {
        if (args[1] !== backoffMs || typeof args[0] !== 'function')
          return Reflect.apply(target, receiver, args)
        const callback = args[0]
        const handle = Reflect.apply(target, receiver, [() => {}, backoffMs])
        handle.unref()
        timers.add(handle)
        const release = () => {
          clearTimeout(handle)
          timers.delete(handle)
          Reflect.apply(callback, undefined, args.slice(2))
        }
        waits.push(release)
        notify?.()
        notify = undefined
        return handle
      },
    })
    installFetchRetry({ retries: 2, backoffMs: [backoffMs] })
    if (name === 'request-preaborted-custom-reason') controller.abort(reason)
    const attempt =
      name === 'init-abort-during-backoff'
        ? fetch(url, { signal: controller.signal })
        : fetch(new Request(url, { signal: controller.signal }))
    const outcome = attempt.then(
      (response) => {
        settled = true
        return { status: response.status }
      },
      (error) => {
        settled = true
        return { rejectedSameReason: error === reason }
      },
    )
    if (!waits.length)
      await new Promise((resolve) => {
        notify = resolve
      })
    controller.abort(reason)
    await nextTurn()
    const atAbort = {
      settled,
      nativeCalls,
      heldBackoffs: timers.size,
      serverRequests: serverRequests - requestsBefore,
    }
    waits[0]()
    if (name === 'request-preaborted-custom-reason') {
      if (waits.length < 2)
        await new Promise((resolve) => {
          notify = resolve
        })
      waits[1]()
    }
    const result = await outcome
    proof.cases.push({
      name,
      atAbort,
      afterRelease: {
        settled,
        nativeCalls,
        backoffs: waits.length,
        heldBackoffs: timers.size,
        serverRequests: serverRequests - requestsBefore,
        ...result,
      },
    })
    assert.equal(result.rejectedSameReason, true)
    assert.equal(timers.size, 0)
    globalThis.setTimeout = nativeTimeout
  }
} finally {
  for (const handle of timers) clearTimeout(handle)
  timers.clear()
  globalThis.setTimeout = nativeTimeout
  uninstallFetchRetryForTest(nativeFetch)
  globalThis.fetch = nativeFetch
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  proof.sourceUnchanged = Buffer.compare(source, await readFile(sourcePath)) === 0
  proof.globalsRestored =
    globalThis.fetch === nativeFetch && globalThis.setTimeout === nativeTimeout
  proof.serverClosed = !server.listening
  proof.liveBackoffTimers = timers.size
  console.log(JSON.stringify(proof))
}
