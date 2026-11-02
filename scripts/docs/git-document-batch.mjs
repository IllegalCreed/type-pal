// Batch immutable, explicitly pinned Git documents. Ordinary worktree snapshots
// are still guarded/revalidated by the caller; this is not a mutable-file cache.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, constants, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function readPinnedGitDocuments(root, pins) {
  const revisions = new Map(),
    wanted = new Map()
  const run = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  for (const pin of pins) {
    assert(
      /^[a-f\d]{40}$/u.test(pin.revision) &&
        /^[a-f\d]{40}$/u.test(pin.gitObject) &&
        /^[a-f\d]{64}$/u.test(pin.sha256),
      'complete fixed Git pin required',
    )
    assert(
      /^docs\/[^:\\\0\r\n]+\.(?:md|json)$/u.test(pin.path) &&
        pin.path.split('/').every((p) => p && p !== '.' && p !== '..'),
      'ordinary document namespace required',
    )
    if (!revisions.has(pin.revision)) {
      assert.equal(run('cat-file', '-t', pin.revision).toString().trim(), 'commit')
      revisions.set(
        pin.revision,
        new Map(
          run('ls-tree', '--full-tree', '-r', '-z', pin.revision, '--', 'docs')
            .toString()
            .split('\0')
            .filter(Boolean)
            .map((line) => {
              const [meta, path] = line.split('\t')
              return [path, meta.split(' ')]
            }),
        ),
      )
    }
    const actual = revisions.get(pin.revision).get(pin.path)
    assert(
      actual?.[0] === '100644' && actual[1] === 'blob' && actual[2] === pin.gitObject,
      'real Git mode/object differs',
    )
    const key = `${pin.revision}:${pin.path}`
    if (wanted.has(key)) assert.deepEqual(wanted.get(key), pin, 'conflicting fixed source pin')
    else wanted.set(key, { ...pin })
  }
  assert(wanted.size > 0, 'nonempty closed source set required')
  const objects = [...new Set([...wanted.values()].map((pin) => pin.gitObject))],
    directory = mkdtempSync(join(tmpdir(), 'git-document-batch-'))
  const input = join(directory, 'objects.txt')
  writeFileSync(input, `${objects.join('\n')}\n`, { flag: 'wx' })
  const fd = openSync(input, constants.O_RDONLY | constants.O_NOFOLLOW)
  let result
  try {
    result = spawnSync('git', ['cat-file', '--batch'], {
      cwd: root,
      stdio: [fd, 'pipe', 'pipe'],
      maxBuffer: 128 * 1024 * 1024,
      timeout: 120000,
    })
  } finally {
    closeSync(fd)
    rmSync(directory, { recursive: true })
  }
  assert(
    !result.error && !result.signal && result.status === 0 && result.stderr.length === 0,
    'real Git batch failed or emitted diagnostics',
  )
  const buffers = new Map()
  let offset = 0
  for (const object of objects) {
    const end = result.stdout.indexOf(10, offset),
      header =
        end >= 0 &&
        /^([a-f\d]{40}) blob (0|[1-9]\d*)$/u.exec(result.stdout.subarray(offset, end).toString())
    assert(header && header[1] === object, 'Git batch framing/object identity differs')
    const length = Number(header[2])
    assert(
      Number.isSafeInteger(length) && length <= 16 * 1024 * 1024,
      'Git document exceeds snapshot cap',
    )
    const buffer = result.stdout.subarray(end + 1, end + 1 + length)
    assert.equal(buffer.length, length)
    assert.equal(result.stdout[end + 1 + length], 10)
    assert.equal(
      createHash('sha1').update(`blob ${length}\0`).update(buffer).digest('hex'),
      object,
      'Git blob content hash differs',
    )
    buffers.set(object, Buffer.from(buffer))
    offset = end + 2 + length
  }
  assert.equal(offset, result.stdout.length, 'trailing or missing Git batch payload')
  for (const pin of wanted.values())
    assert.equal(
      createHash('sha256').update(buffers.get(pin.gitObject)).digest('hex'),
      pin.sha256,
      'fixed source SHA256 differs',
    )
  return (pin) => {
    const saved = wanted.get(`${pin.revision}:${pin.path}`)
    if (
      !saved ||
      (pin.gitObject && pin.gitObject !== saved.gitObject) ||
      (pin.sha256 && pin.sha256 !== saved.sha256)
    )
      return undefined
    return {
      path: saved.path,
      revision: saved.revision,
      mode: '100644',
      gitObject: saved.gitObject,
      buffer: Buffer.from(buffers.get(saved.gitObject)),
    }
  }
}
