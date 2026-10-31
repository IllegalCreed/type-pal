import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { gunzipSync, gzipSync } from 'node:zlib'
import { readNativeArchives } from './native-archives.mjs'

const folder = new URL('./', import.meta.url)
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const encoded = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`)

function fixture(parts) {
  const files = new Map()
  const volumes = parts.map((members, ordinal) => {
    const suffix = ordinal === 0 ? '' : `-${String(ordinal + 1).padStart(3, '0')}`
    const archive = `native${suffix}.json.gz`
    const index = `native-index${suffix}.json`
    const bytes = gzipSync(encoded({ files: members }))
    files.set(archive, bytes)
    const entries = Object.entries(members).map(([name, body]) => ({
      name,
      sha256: sha(body),
      bytes: Buffer.byteLength(body),
    }))
    const indexBytes = encoded({ archive, sha256: sha(bytes), files: entries })
    files.set(index, indexBytes)
    return { index, sha256: sha(indexBytes) }
  })
  files.set('native-archives.json', encoded({ volumes }))
  return files
}

const inspect = (files) =>
  readNativeArchives(folder, (url) => {
    const name = url.href.slice(folder.href.length)
    assert.ok(files.has(name), `unexpected read: ${name}`)
    return files.get(name)
  })

function editIndex(files, ordinal, edit) {
  const catalog = JSON.parse(files.get('native-archives.json'))
  const volume = catalog.volumes[ordinal]
  const index = JSON.parse(files.get(volume.index))
  edit(index)
  const bytes = encoded(index)
  files.set(volume.index, bytes)
  volume.sha256 = sha(bytes)
  files.set('native-archives.json', encoded(catalog))
}

test('two independent volumes retain UTF-8 bodies and all index entries', () => {
  const result = inspect(fixture([{ 'first.raw': '甲\n' }, { 'last.raw': '乙\n' }]))
  assert.deepEqual(Object.entries(result.files), [
    ['first.raw', '甲\n'],
    ['last.raw', '乙\n'],
  ])
  assert.deepEqual(
    result.entries.map((entry) => [entry.name, entry.bytes]),
    [
      ['first.raw', 4],
      ['last.raw', 4],
    ],
  )
  assert.deepEqual(
    result.volumes.map((volume) => volume.members),
    [1, 1],
  )
})

test('a complete index exceeding 1MiB is retained in individually smaller volumes', () => {
  const parts = [0, 1].map((part) =>
    Object.fromEntries(
      Array.from({ length: 5000 }, (_, n) => {
        const id = part * 5000 + n
        return [`capacity/receipt-${String(id).padStart(5, '0')}.raw`, `body-${id}`]
      }),
    ),
  )
  const files = fixture(parts)
  const sizes = ['native-index.json', 'native-index-002.json'].map((name) => files.get(name).length)
  assert.ok(sizes.every((size) => size < 1024 * 1024))
  assert.ok(sizes.reduce((sum, size) => sum + size, 0) > 1024 * 1024)
  const result = inspect(files)
  assert.equal(result.entries.length, 10000)
  assert.deepEqual(Object.entries(result.files), parts.flatMap(Object.entries))
  assert.equal(result.files['capacity/receipt-09999.raw'], 'body-9999')
})

test('catalog paths, first volume, duplicate indexes and index identity are enforced', () => {
  const variants = [
    [
      (catalog) => {
        catalog.volumes = []
      },
      /native volumes required/,
    ],
    [
      (catalog) => {
        catalog.volumes.shift()
      },
      /original native index required/,
    ],
    [
      (catalog) => {
        catalog.volumes[1].index = '../outside.json'
      },
      /native index filename/,
    ],
    [
      (catalog) => {
        catalog.volumes.push(catalog.volumes[0])
      },
      /duplicate native index/,
    ],
    [
      (catalog) => {
        catalog.volumes[1].sha256 = 'wrong'
      },
      /native index identity/,
    ],
  ]
  for (const [edit, error] of variants) {
    const files = fixture([{ 'first.raw': 'a' }, { 'last.raw': 'b' }])
    const catalog = JSON.parse(files.get('native-archives.json'))
    edit(catalog)
    files.set('native-archives.json', encoded(catalog))
    assert.throws(() => inspect(files), error)
  }
})

test('archive identity and exact member sets, byte sizes and tail hashes are enforced', () => {
  const variants = [
    [
      (index) => {
        index.archive = '../outside.gz'
      },
      /native archive filename/,
    ],
    [
      (index) => {
        index.sha256 = 'wrong'
      },
      /native archive identity/,
    ],
    [
      (index) => {
        index.files.pop()
      },
      /AssertionError/,
    ],
    [
      (index) => {
        index.files.push({ name: 'missing', bytes: 0, sha256: sha('') })
      },
      /AssertionError/,
    ],
    [
      (index) => {
        index.files[0].bytes = 1
      },
      /tail.raw/,
    ],
    [
      (index) => {
        index.files[0].sha256 = sha('other')
      },
      /tail.raw/,
    ],
  ]
  for (const [edit, error] of variants) {
    const files = fixture([{ 'first.raw': 'a' }, { 'tail.raw': 'last' }])
    editIndex(files, 1, edit)
    assert.throws(() => inspect(files), error)
  }
})

test('volumes cannot reuse an archive or shadow even identical members', () => {
  assert.throws(() => inspect(fixture([{ same: 'a' }, { same: 'a' }])), /duplicate native member/)
  const files = fixture([{ 'first.raw': 'a' }, { 'last.raw': 'b' }])
  editIndex(files, 1, (index) => {
    index.archive = 'native.json.gz'
  })
  assert.throws(() => inspect(files), /duplicate native archive/)
})

test('the frozen original volume retains every original body and entry', () => {
  const original = JSON.parse(gunzipSync(readFileSync(new URL('native.json.gz', folder)))).files
  const index = JSON.parse(readFileSync(new URL('native-index.json', folder)))
  const current = readNativeArchives(folder)
  for (const [name, body] of Object.entries(original)) assert.equal(current.files[name], body, name)
  assert.deepEqual(current.entries.slice(0, index.files.length), index.files)
  assert.equal(index.files.length, 5742)
})
