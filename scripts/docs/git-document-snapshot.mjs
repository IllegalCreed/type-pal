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
    if (snapshots.has(key)) {
      const saved = snapshots.get(key)
      snapshots.delete(key)
      snapshots.set(key, saved)
      return copy(saved)
    }
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
    if (maxBytes > 0 && snapshot.buffer.length <= maxBytes) {
      while (snapshots.size >= 4096 || storedBytes + snapshot.buffer.length > maxBytes) {
        const oldest = snapshots.keys().next().value
        storedBytes -= snapshots.get(oldest).buffer.length
        snapshots.delete(oldest)
      }
      snapshots.set(key, Object.freeze(copy(snapshot)))
      storedBytes += snapshot.buffer.length
    }
    // A caller can edit its own result without poisoning another document's source.
    return copy(snapshot)
  }
}

/** Narrow JSON snapshot reader: original bytes from a regular file in a real commit. */
export function readGitDocumentSnapshot(root, pin) {
  return readSnapshot(root, pin)
}

/** Only immutable commit metadata is indexed; each uncached blob is still read from Git. */
export function createGitDocumentSnapshotReader(root) {
  const state = { trees: new Map(), bytes: 0, entries: 0 }
  return (pin) => readSnapshot(root, pin, state)
}

function indexCommit(run, revision, state) {
  if (state.trees.size >= 128) return undefined
  const bytes = run(['ls-tree', '-r', '-z', '--full-tree', revision, '--', 'docs'])
  if (state.bytes + bytes.length > 32 * 1024 * 1024) return undefined
  const tree = new Map()
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  for (const line of text.split('\0').filter(Boolean)) {
    const row = /^([0-7]{6}) (blob|commit) ([a-f\d]{40})\t(.+)$/su.exec(line)
    if (!row || tree.has(row[4])) return undefined
    tree.set(row[4], row.slice(1, 4))
  }
  if (state.entries + tree.size > 131072) return undefined
  state.trees.set(revision, tree)
  state.bytes += bytes.length
  state.entries += tree.size
  return tree
}

function readSnapshot(root, pin, state) {
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
    let tree = state?.trees.get(pin.revision)
    if (!tree) {
      if (run(['cat-file', '-t', pin.revision], 'utf8').trim() !== 'commit') return undefined
      if (state) {
        try {
          tree = indexCommit(run, pin.revision, state)
        } catch {
          // An unindexable tree does not relax the original per-path validation.
        }
      }
    }
    let object
    if (tree) {
      const row = tree.get(pin.path)
      if (row?.[0] !== '100644' || row[1] !== 'blob') return undefined
      object = row[2]
    } else {
      const rows = run(['ls-tree', '-z', '--full-tree', pin.revision, '--', pin.path], 'utf8')
        .split('\0')
        .filter(Boolean)
      if (rows.length !== 1) return undefined
      const match = /^100644 blob ([a-f\d]{40})\t(.+)$/.exec(rows[0])
      if (!match || match[2] !== pin.path) return undefined
      object = match[1]
    }
    return {
      revision: pin.revision,
      path: pin.path,
      mode: '100644',
      gitObject: object,
      buffer: run(['cat-file', 'blob', object]),
    }
  } catch {
    return undefined
  }
}
