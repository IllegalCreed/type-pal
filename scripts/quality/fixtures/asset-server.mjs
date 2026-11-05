import assert from 'node:assert/strict'
import { once } from 'node:events'
import fs from 'node:fs'
import { createServer, get } from 'node:http'
import { createRequire, syncBuiltinESMExports } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const [mode, directory] = process.argv.slice(2)
assert.ok(['normal', 'missing', 'abort', 'late-error'].includes(mode))
assert.ok(directory && fs.statSync(directory).isDirectory())
process.env.E2E = '1' // Load the real config without generating SSL certificates.
const require = createRequire(join(root, 'packages/game/package.json'))
const { loadConfigFromFile } = await import(pathToFileURL(require.resolve('vite')).href)
const loaded = await loadConfigFromFile(
  { command: 'serve', mode: 'test' },
  join(root, 'packages/game/vite.config.ts'),
  join(root, 'packages/game'),
  'silent',
  undefined,
  'runner',
)
const plugin = loaded.config.plugins
  .flat(Infinity)
  .find((entry) => entry?.name === 'serve-extracted')
assert.ok(plugin)
const hooks = new Map()
for (const [name, hook] of [
  ['dev', 'configureServer'],
  ['preview', 'configurePreviewServer'],
]) {
  const handlers = []
  plugin[hook]({ middlewares: { use: (middleware) => handlers.push(middleware) } })
  assert.equal(handlers.length, 1)
  hooks.set(name, handlers[0])
}

const stat = fs.statSync
const createReadStream = fs.createReadStream
const read = fs.read
const statsPaths = new Map()
const readPaths = new Map()
const streams = []
let releaseRead
let readyToRelease
let pendingRead

function fixture(suffix, bytes) {
  const logical = join(root, 'data/extracted', `__quality_asset_${process.pid}.${suffix}`)
  assert.equal(fs.existsSync(logical), false)
  const actual = join(directory, `asset.${suffix}`)
  fs.writeFileSync(actual, bytes)
  statsPaths.set(logical, actual)
  readPaths.set(logical, actual)
  return { logical, actual, url: `/extracted/${logical.split('/').at(-1)}`, bytes }
}

const opaque = fixture('rle', Buffer.from([0, 1, 127, 255])) // The server does not parse image bytes.
const zipped = fixture('gz', gzipSync(Buffer.from('owned gzip input')))
const slow = fixture('bin', Buffer.alloc(128, 0x5a))
const missing = fixture('missing', Buffer.of(1))
readPaths.delete(missing.logical) // stat succeeds; the real stream opens a genuinely absent file.

fs.statSync = (path, ...args) => stat(statsPaths.get(path) ?? path, ...args)
fs.createReadStream = (path, ...args) => {
  let input
  if (path === slow.logical) {
    // Keep the second native read in flight until the client has observed the first
    // bytes. No sleeps, large files, fake destroy(), or copied middleware algorithm.
    let reads = 0
    pendingRead = new Promise((resolve) => {
      readyToRelease = resolve
    })
    input = createReadStream(slow.actual, {
      highWaterMark: 8,
      fs: {
        open: fs.open,
        close: fs.close,
        read(fd, buffer, offset, length, position, callback) {
          if (reads++ === 0) return read(fd, buffer, offset, length, position, callback)
          assert.equal(reads, 2)
          releaseRead = (error) => {
            releaseRead = undefined
            if (error) callback(error)
            else read(fd, buffer, offset, length, position, callback)
          }
          readyToRelease()
        },
      },
    })
  } else {
    input = createReadStream(readPaths.get(path) ?? path, ...args)
  }
  const closed = new Promise((resolve) => input.once('close', resolve))
  streams.push({ input, closed })
  return input
}
syncBuiltinESMExports()

function request(url) {
  return new Promise((resolve, reject) => {
    const req = get(url, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.once('end', () =>
        resolve({
          status: response.statusCode,
          headers: response.headers,
          bytes: Buffer.concat(chunks),
        }),
      )
      response.once('error', reject)
    })
    req.once('error', reject)
  })
}

// Transport owns bytes and stream lifetime, not PAL parsing. Keep the CI
// regression independent of gitignored extracted resources and shared output trees.
const known = fixture('json', Buffer.from('{"serverFixture":true}\n'))

try {
  for (const middleware of hooks.values()) {
    const errors = []
    const responses = []
    const server = createServer((req, res) => {
      const closed = new Promise((resolve) => res.once('close', resolve))
      responses.push({ response: res, closed })
      res.setHeader('Content-Encoding', 'gzip') // The asset middleware must remove stale encoding.
      middleware(req, res, (error) => {
        if (error) errors.push(error)
        res.statusCode = error ? 500 : 404
        res.setHeader('Content-Type', 'text/plain')
        res.end(error ? 'asset-read-failed' : 'not-found')
      })
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const base = `http://127.0.0.1:${address.port}`
    const firstStream = streams.length
    try {
      if (mode === 'normal') {
        for (const [file, contentType] of [
          [opaque, 'application/vnd.type-pal.rle'],
          [zipped, 'application/gzip'],
        ]) {
          const result = await request(base + file.url)
          assert.equal(result.status, 200)
          assert.deepEqual(result.bytes, file.bytes)
          assert.equal(result.headers['cache-control'], 'no-cache, no-transform')
          assert.equal(result.headers['content-encoding'], undefined)
          assert.equal(result.headers['content-type'], contentType)
          assert.equal(result.headers['x-content-type-options'], 'nosniff')
        }
      } else if (mode === 'missing') {
        const result = await request(base + missing.url)
        assert.equal(result.status, 500)
        assert.equal(result.bytes.toString(), 'asset-read-failed')
        assert.equal(errors.length, 1)
        assert.equal(errors[0].code, 'ENOENT')
      } else {
        let firstBytes
        const received = new Promise((resolve) => {
          firstBytes = resolve
        })
        const outcome = new Promise((resolve, reject) => {
          const req = get(base + slow.url, (response) => {
            const chunks = []
            response.on('data', (chunk) => {
              chunks.push(chunk)
              firstBytes()
              if (mode === 'abort') response.destroy()
            })
            response.once('end', () => resolve({ ended: true }))
            response.once('error', (error) => resolve({ ended: false, code: error.code, chunks }))
            response.once('close', () => {
              if (mode === 'abort') resolve({ ended: false, chunks })
            })
          })
          req.once('error', reject)
        })
        await received
        await pendingRead
        if (mode === 'late-error') {
          // A controlled disk read error enters the real ReadStream after real bytes were sent.
          releaseRead(Object.assign(new Error('Injected disk read failure'), { code: 'EIO' }))
        }
        const result = await outcome
        assert.equal(result.ended, false, 'a broken request must not report a complete body')
        if (mode === 'late-error') assert.equal(result.code, 'ECONNRESET')
        assert.deepEqual(Buffer.concat(result.chunks), Buffer.alloc(8, 0x5a))
        await responses[0].closed
        assert.equal(
          streams[firstStream].input.destroyed,
          true,
          'client close must destroy the reading file stream',
        )
        assert.equal(
          errors.length,
          0,
          'a closed response cannot be handed to a new HTTP error page',
        )
        releaseRead?.()
      }
      for (const record of streams.slice(firstStream)) {
        await record.closed
        assert.equal(record.input.closed, true)
      }
      const next = await request(base + known.url)
      assert.equal(next.status, 200, 'the same server must accept the next request')
      assert.deepEqual(next.bytes, known.bytes)
    } finally {
      for (const { input } of streams.slice(firstStream)) input.destroy()
      releaseRead?.()
      await Promise.all(streams.slice(firstStream).map((record) => record.closed))
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  }
} finally {
  fs.statSync = stat
  fs.createReadStream = createReadStream
  syncBuiltinESMExports()
}
console.log(JSON.stringify({ mode, hooks: [...hooks.keys()] }))
