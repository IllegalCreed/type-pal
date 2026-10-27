import { execFileSync } from 'node:child_process'

/** HTML-only companion. The existing JSON reader deliberately keeps its narrower contract. */
export function readGitHtmlSnapshot(root, pin) {
  if (
    !/^[a-f\d]{40}$/u.test(pin?.revision ?? '') ||
    typeof pin?.path !== 'string' ||
    !/^docs\/[^:\\\0\r\n]+\.html$/u.test(pin.path) ||
    pin.path.split('/').some((part) => !part || part === '.' || part === '..')
  )
    return undefined
  const run = (args, encoding) =>
    execFileSync('git', args, {
      cwd: root,
      encoding,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  try {
    if (run(['cat-file', '-t', pin.revision], 'utf8').trim() !== 'commit') return undefined
    const rows = run(['ls-tree', '-z', '--full-tree', pin.revision, '--', pin.path], 'utf8')
      .split('\0')
      .filter(Boolean)
    if (rows.length !== 1) return undefined
    const row = /^100644 blob ([a-f\d]{40})\t(.+)$/u.exec(rows[0])
    if (!row || row[2] !== pin.path) return undefined
    return {
      revision: pin.revision,
      path: pin.path,
      mode: '100644',
      gitObject: row[1],
      buffer: run(['cat-file', 'blob', row[1]]),
    }
  } catch {
    return undefined
  }
}
