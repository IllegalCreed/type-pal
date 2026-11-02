import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

/** Read the complete Git census; each caller retains its own filtering policy. */
export function gitInventory(root, pathspec = []) {
  const spool = mkdtempSync(resolve(tmpdir(), 'type-pal-docs-files-'))
  const output = resolve(spool, 'stdout')
  let descriptor
  let text
  try {
    descriptor = openSync(output, 'wx', 0o600)
    // Git writes directly to disk, bypassing execFileSync's stdout buffer.
    // A failed child must throw before any partial census is parsed.
    execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z', ...pathspec],
      {
        cwd: root,
        stdio: ['pipe', descriptor, 'pipe'],
      },
    )
    text = readFileSync(output, 'utf8')
  } finally {
    try {
      if (descriptor !== undefined) closeSync(descriptor)
    } finally {
      rmSync(spool, { recursive: true, force: true })
    }
  }
  return text.split('\0').filter(Boolean)
}
