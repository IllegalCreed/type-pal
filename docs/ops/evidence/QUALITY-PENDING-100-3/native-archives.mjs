import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Each index keeps its archive's complete schema; volumes never shadow prior members. */
export function readNativeArchives(folder, read = readFileSync) {
  const catalog = JSON.parse(read(new URL('native-archives.json', folder)))
  assert.ok(Array.isArray(catalog.volumes) && catalog.volumes.length > 0, 'native volumes required')
  assert.equal(catalog.volumes[0].index, 'native-index.json', 'original native index required')
  const files = Object.create(null)
  const entries = []
  const volumes = []
  const indexes = new Set()
  const archives = new Set()
  for (const volume of catalog.volumes) {
    assert.match(volume.index, /^native-index(?:-\d{3})?\.json$/, 'native index filename')
    assert.ok(!indexes.has(volume.index), 'duplicate native index')
    indexes.add(volume.index)
    const indexBytes = read(new URL(volume.index, folder))
    assert.equal(sha(indexBytes), volume.sha256, 'native index identity')
    const index = JSON.parse(indexBytes)
    assert.match(index.archive, /^native(?:-\d{3})?\.json\.gz$/, 'native archive filename')
    assert.ok(!archives.has(index.archive), 'duplicate native archive')
    archives.add(index.archive)
    const archiveBytes = read(new URL(index.archive, folder))
    assert.equal(sha(archiveBytes), index.sha256, 'native archive identity')
    const members = JSON.parse(gunzipSync(archiveBytes)).files
    assert.ok(members && typeof members === 'object' && !Array.isArray(members), 'native members')
    assert.ok(Array.isArray(index.files), 'native index files')
    assert.deepEqual(Object.keys(members).sort(), index.files.map((entry) => entry.name).sort())
    for (const entry of index.files) {
      assert.equal(typeof entry.name, 'string', 'native member name')
      assert.ok(!Object.hasOwn(files, entry.name), 'duplicate native member')
      assert.equal(typeof members[entry.name], 'string', 'native member body')
      const body = Buffer.from(members[entry.name], 'utf8')
      assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes >= 0, 'native member size')
      assert.equal(body.length, entry.bytes, entry.name)
      assert.equal(sha(body), entry.sha256, entry.name)
      files[entry.name] = members[entry.name]
      entries.push(entry)
    }
    volumes.push({ index: volume.index, archive: index.archive, members: index.files.length })
  }
  return { files, entries, volumes }
}
