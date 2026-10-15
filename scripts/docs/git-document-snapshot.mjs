import { execFileSync } from 'node:child_process'

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
