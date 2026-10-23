// Default read-only. A real release is an explicit action on a committed isolated candidate.
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  inspectReceiptReviewStorage,
  prepareReceiptReviewStorage,
  publishReceiptReviewStorage,
} from './receipt-review-storage-writer.mjs'

export function migrateReceiptReviewStorage(args, cwd = process.cwd()) {
  if (
    args.length < 2 ||
    args[0] !== '--source-revision' ||
    (args.length !== 2 && !(args.length === 3 && args[2] === '--publish'))
  )
    throw new Error(
      'usage: migrate-receipt-review-storage.mjs --source-revision <full-commit> [--publish]',
    )
  const root = resolve(cwd),
    sourceRevision = args[1],
    publish = args[2] === '--publish'
  const inspection = inspectReceiptReviewStorage({ root, sourceRevision })
  if (!publish || inspection.state === 'published')
    return { mode: 'dry-run', ...inspection, repositoryWrites: 0 }
  const git = (...argv) =>
    execFileSync('git', argv, {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  if (
    realpathSync(git('rev-parse', '--show-toplevel')) !== realpathSync(root) ||
    git('rev-parse', 'HEAD') !== sourceRevision ||
    !git('branch', '--show-current').startsWith('codex/')
  )
    throw new Error('publication requires the current committed isolated codex source, never main')
  const status = git('status', '--porcelain', '--untracked-files=all')
  if (status && status !== '?? node_modules')
    throw new Error(
      'publication requires a clean committed candidate; keep evidence outside the repository',
    )
  const handle = prepareReceiptReviewStorage({ root, sourceRevision })
  return {
    mode: 'publish',
    ...publishReceiptReviewStorage(handle, { allowWrite: true }),
    creditGranted: 0,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(migrateReceiptReviewStorage(process.argv.slice(2))))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
