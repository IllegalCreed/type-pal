/** Test-runner input contract only: real snapshot tests/codecs, synthetic files, no PAL disk IO. */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { afterEach, expect, vi } from 'vitest'

vi.mock('node:fs', async (original) => {
  const actual = await original<typeof import('node:fs')>()
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..').replaceAll(
    '\\',
    '/',
  )
  const raw = `${root}/data/raw`
  const ext = `${root}/data/extracted/data`
  const mode = process.env.TYPE_PAL_SNAPSHOT_INPUT_CASE
  if (!mode) throw new Error('snapshot-input setup requires an explicit case')
  console.log('SNAPSHOT_INPUT_CASE', mode)

  function mkf(chunks: Uint8Array[]): Buffer {
    const header = (chunks.length + 1) * 4
    const bytes = Buffer.alloc(header + chunks.reduce((size, chunk) => size + chunk.length, 0))
    let offset = header
    chunks.forEach((chunk, index) => {
      bytes.writeUInt32LE(offset, index * 4)
      bytes.set(chunk, offset)
      offset += chunk.length
    })
    bytes.writeUInt32LE(offset, chunks.length * 4)
    return bytes
  }
  // Same nonempty two-frame format as tileset-blob.test.ts: two 1x1 pixels, AA and BB.
  const sprite = Uint8Array.from([2, 0, 5, 0, 1, 0, 1, 0, 1, 0xaa, 1, 0, 1, 0, 1, 0xbb])
  // A valid zero-length YJ2 payload yields one unchanged RNG surface frame, not zero frames.
  const animation = mkf([Uint8Array.from([0, 0, 0, 0])])
  const dataChunks = Array.from({ length: 11 }, () => new Uint8Array())
  dataChunks[10] = sprite
  const gopChunks = Array.from({ length: 201 }, () => new Uint8Array())
  for (const index of [1, 6, 12, 50, 100, 200]) gopChunks[index] = sprite
  const files = new Map<string, Buffer>([
    [`${raw}/DATA.MKF`, mkf(dataChunks)],
    [`${raw}/ABC.MKF`, mkf([sprite])],
    [`${raw}/F.MKF`, mkf([sprite])],
    [`${raw}/FIRE.MKF`, mkf([sprite])],
    [`${raw}/MGO.MKF`, mkf([sprite])],
    [`${raw}/GOP.MKF`, mkf(gopChunks)],
    [`${raw}/RNG.MKF`, mkf([animation])],
    [`${ext}/magic/effect.rle`, gzipSync(sprite)],
    [`${ext}/animation/rng-00.rle`, gzipSync(animation)],
    [`${ext}/tileset/1.rle`, gzipSync(sprite)],
  ])
  const dirs = new Set([
    raw,
    ext,
    `${ext}/magic`,
    `${ext}/animation`,
    `${ext}/tileset`,
    `${ext}/sprite`,
    `${ext}/battle-sprite/enemy`,
    `${ext}/battle-sprite/player`,
  ])
  if (mode === 'missing-effect') files.delete(`${ext}/magic/effect.rle`)
  if (mode === 'missing-rng-blob') files.delete(`${ext}/animation/rng-00.rle`)
  if (mode === 'empty-rng-chunk') {
    files.set(`${raw}/RNG.MKF`, mkf([new Uint8Array()]))
    files.delete(`${ext}/animation/rng-00.rle`)
  }
  if (mode === 'zero-rng-chunks') files.set(`${raw}/RNG.MKF`, mkf([]))
  if (mode === 'missing-tileset') files.delete(`${ext}/tileset/1.rle`)
  if (mode === 'absent-rng') files.delete(`${raw}/RNG.MKF`)
  if (mode === 'absent-tileset') files.delete(`${raw}/GOP.MKF`)
  if (mode === 'absent-rng-directory') dirs.delete(`${ext}/animation`)
  if (mode === 'absent-tileset-directory') dirs.delete(`${ext}/tileset`)
  if (mode === 'absent-sprite-extracted') dirs.delete(ext)
  if (mode === 'absent-sprite') {
    files.clear()
    dirs.clear()
  }
  const denied =
    mode === 'denied-rng' ? `${raw}/RNG.MKF` : mode === 'denied-tileset' ? `${raw}/GOP.MKF` : ''
  const pathOf = (value: unknown) => String(value).replaceAll('\\', '/')
  const isData = (path: string) => path.startsWith(`${root}/data/`)
  const existsSync = (path: Parameters<typeof actual.existsSync>[0]) => {
    const p = pathOf(path)
    if (!isData(p)) return actual.existsSync(path)
    console.log('SNAPSHOT_EXISTS', p)
    return files.has(p) || dirs.has(p)
  }
  const readFileSync = (...args: Parameters<typeof actual.readFileSync>) => {
    const p = pathOf(args[0])
    if (!isData(p)) return actual.readFileSync(...args)
    console.log('SNAPSHOT_READ', p)
    if (p === denied) throw new Error(`SNAPSHOT_PERMISSION_DENIED ${p}`)
    const bytes = files.get(p)
    if (!bytes) throw new Error(`SNAPSHOT_UNEXPECTED_MISSING_READ ${p}`)
    return bytes
  }
  const readdirSync = (...args: Parameters<typeof actual.readdirSync>) => {
    const p = pathOf(args[0])
    if (!isData(p)) return actual.readdirSync(...args)
    console.log('SNAPSHOT_LIST', p)
    if (!dirs.has(p)) throw new Error(`SNAPSHOT_UNEXPECTED_MISSING_DIRECTORY ${p}`)
    return [...files.keys()]
      .filter((file) => dirname(file) === p)
      .map((file) => file.slice(p.length + 1))
  }
  return {
    ...actual,
    existsSync,
    readFileSync,
    readdirSync,
    default: { ...actual, existsSync, readFileSync, readdirSync },
  }
})

afterEach((context) => {
  // Observation only: this hook must not add an assertion to an otherwise empty test.
  console.log('SNAPSHOT_ASSERTIONS', context.task.name, expect.getState().assertionCalls)
})
