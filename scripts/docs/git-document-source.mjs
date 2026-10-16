import { execFileSync } from 'node:child_process'

/** Read only a frozen commit/path pair; never interpret envelope text as a command. */
export function readGitDocumentSource(root, pin) {
  if (
    !/^[a-f\d]{40}$/.test(pin?.revision ?? '') ||
    typeof pin.path !== 'string' ||
    !/^docs\/[^:\0\r\n]+\.json$/.test(pin.path) ||
    pin.path.split('/').some((part) => part === '.' || part === '..')
  )
    return undefined
  try {
    const kind = execFileSync('git', ['cat-file', '-t', pin.revision], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    if (kind !== 'commit') return undefined
    const gitObject = execFileSync('git', ['rev-parse', `${pin.revision}:${pin.path}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    if (!/^[a-f\d]{40}$/.test(gitObject)) return undefined
    const text = execFileSync('git', ['cat-file', 'blob', gitObject], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { text, gitObject }
  } catch {
    return undefined
  }
}
