import { execFileSync } from 'node:child_process'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { incrementalReviewAdmission } from './incremental-review-admission.mjs'

/** Fixed-main Markdown companion; existing JSON readers keep their narrower contract. */
export function readIncrementalGitSource(root, pin) {
  if (pin?.revision !== incrementalReviewAdmission.sourceRevision) return undefined
  if (pin.path?.endsWith('.json')) return readGitDocumentSnapshot(root, pin)
  if (
    typeof pin.path !== 'string' ||
    !/^docs\/[^:\\\0\r\n]+\.md$/u.test(pin.path) ||
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
    const row = rows.length === 1 && /^100644 blob ([a-f\d]{40})\t(.+)$/u.exec(rows[0])
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
