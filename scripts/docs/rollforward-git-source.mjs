// Fixed Markdown/JSON roots only; the older generic JSON reader is not widened.
import { execFileSync } from 'node:child_process'
import { rollforwardReviewContract } from './rollforward-review-plan.mjs'

const revisions = new Set([
  rollforwardReviewContract.mainRevision,
  rollforwardReviewContract.integrationRevision,
  rollforwardReviewContract.authorCandidate,
  rollforwardReviewContract.acceptedBase,
])
export function readRollforwardGitSource(root, pin) {
  if (
    !revisions.has(pin?.revision) ||
    typeof pin?.path !== 'string' ||
    !/^docs\/[^:\\\0\r\n]+\.(?:md|json)$/u.test(pin.path) ||
    pin.path.split('/').some((p) => !p || p === '.' || p === '..')
  )
    return undefined
  const run = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  try {
    if (run('cat-file', '-t', pin.revision).toString().trim() !== 'commit') return undefined
    const entries = run('ls-tree', '--full-tree', '-z', pin.revision, '--', pin.path)
      .toString()
      .split('\0')
      .filter(Boolean)
    const match = entries.length === 1 && /^100644 blob ([a-f\d]{40})\t(.+)$/u.exec(entries[0])
    if (!match || match[2] !== pin.path) return undefined
    return {
      path: pin.path,
      revision: pin.revision,
      mode: '100644',
      gitObject: match[1],
      buffer: run('cat-file', 'blob', match[1]),
    }
  } catch {
    return undefined
  }
}
