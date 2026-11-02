// No default plan and no import-time mutation. Publication is a separate Owner action.
import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  inspectPublishedHistoricalDeliveryUpdate,
  prepareHistoricalDeliveryUpdate,
  publishHistoricalDeliveryUpdate,
} from './historical-delivery-semantic-writer.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export function updateHistoricalDeliveryReviews(args, cwd = process.cwd()) {
  if (
    (args.length !== 4 && args.length !== 5) ||
    args[0] !== '--plan' ||
    args[2] !== '--sha256' ||
    (args.length === 5 && args[4] !== '--publish')
  )
    throw new Error(
      'usage: update-historical-delivery-reviews.mjs --plan <absolute-external-file> --sha256 <canonical-plan-SHA> [--publish]',
    )
  const root = realpathSync(resolve(cwd)),
    path = realpathSync(args[1]),
    publish = args[4] === '--publish'
  if (!isAbsolute(args[1]) || path === root || path.startsWith(`${root}/`))
    throw new Error('plan must be an explicit external file')
  const plan = parseTerminalJson(readFileSync(path)),
    options = { root, plan, planSha256: args[3] }
  let handle
  try {
    handle = prepareHistoricalDeliveryUpdate(options)
  } catch (error) {
    try {
      return { mode: 'already-published', ...inspectPublishedHistoricalDeliveryUpdate(options) }
    } catch {
      throw error
    }
  }
  if (!publish) return { mode: 'dry-run', ...handle, repositoryWrites: 0 }
  const git = (...argv) =>
    execFileSync('git', argv, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    }).trim()
  if (
    realpathSync(git('rev-parse', '--show-toplevel')) !== root ||
    git('rev-parse', 'HEAD') !== plan.baseRevision ||
    !git('branch', '--show-current').startsWith('codex/')
  )
    throw new Error('publication requires the committed isolated codex candidate named by the plan')
  const status = git('status', '--porcelain', '--untracked-files=all')
  if (status && status !== '?? node_modules')
    throw new Error('publication requires a clean candidate')
  return { mode: 'publish', ...publishHistoricalDeliveryUpdate(handle, { allowWrite: true }) }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(updateHistoricalDeliveryReviews(process.argv.slice(2))))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
