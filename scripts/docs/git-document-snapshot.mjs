import { execFileSync } from 'node:child_process'

/** One validation run may reuse successful immutable sources, never live files or misses. */
export function cacheGitSnapshots(readSnapshot, maxBytes = 32 * 1024 * 1024) {
  if (
    typeof readSnapshot !== 'function' ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 0 ||
    maxBytes > 32 * 1024 * 1024
  )
    throw new TypeError('bounded snapshot reader required')
  const snapshots = new Map()
  let storedBytes = 0
  const copy = (snapshot) => ({ ...snapshot, buffer: Buffer.from(snapshot.buffer) })
  return (pin) => {
    const revision = pin?.revision
    const path = pin?.path
    if (typeof revision !== 'string' || !/^[a-f\d]{40}$/.test(revision) || typeof path !== 'string')
      return readSnapshot(pin)
    const key = JSON.stringify([revision, path])
    if (snapshots.has(key)) return copy(snapshots.get(key))
    const snapshot = readSnapshot(pin)
    if (
      !snapshot ||
      Object.keys(snapshot).length !== 5 ||
      snapshot.revision !== revision ||
      snapshot.path !== path ||
      snapshot.mode !== '100644' ||
      typeof snapshot.gitObject !== 'string' ||
      !/^[a-f\d]{40}$/.test(snapshot.gitObject) ||
      !Buffer.isBuffer(snapshot.buffer)
    )
      return snapshot
    if (snapshots.size < 4096 && storedBytes + snapshot.buffer.length <= maxBytes) {
      snapshots.set(key, Object.freeze(copy(snapshot)))
      storedBytes += snapshot.buffer.length
    }
    // A caller can edit its own result without poisoning another document's source.
    return copy(snapshot)
  }
}

/** Narrow JSON snapshot reader: original bytes from a regular file in a real commit. */
export function readGitDocumentSnapshot(root, pin) {
  if (
    typeof pin?.revision !== 'string' ||
    !/^[a-f\d]{40}$/.test(pin.revision) ||
    typeof pin.path !== 'string' ||
    !/^docs\/[^:\\\0\r\n]+\.json$/.test(pin.path) ||
    pin.path.split('/').some((part) => !part || part === '.' || part === '..')
  )
    return undefined
  const run = (args, encoding) =>
    execFileSync('git', args, {
      cwd: root,
      encoding,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  try {
    if (run(['cat-file', '-t', pin.revision], 'utf8').trim() !== 'commit') return undefined
    const rows = run(['ls-tree', '-z', '--full-tree', pin.revision, '--', pin.path], 'utf8')
      .split('\0')
      .filter(Boolean)
    if (rows.length !== 1) return undefined
    const match = /^100644 blob ([a-f\d]{40})\t(.+)$/.exec(rows[0])
    if (!match || match[2] !== pin.path) return undefined
    return {
      revision: pin.revision,
      path: pin.path,
      mode: '100644',
      gitObject: match[1],
      buffer: run(['cat-file', 'blob', match[1]]),
    }
  } catch {
    return undefined
  }
}
