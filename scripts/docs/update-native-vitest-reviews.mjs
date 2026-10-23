// Owner entry point. Dry-run is the default; a real release requires a fixed clean codex branch.
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  inspectPublishedReviewSemanticDelta,
  prepareReviewSemanticDelta,
  publishReviewSemanticDelta,
} from './review-record-semantic-writer.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export function updateNativeVitestReviews(args, cwd = process.cwd()) {
  if (
    args.length < 2 ||
    args[0] !== '--plan' ||
    !args[1] ||
    (args.length !== 2 && !(args.length === 3 && args[2] === '--publish'))
  )
    throw new Error('usage: update-native-vitest-reviews.mjs --plan <file> [--publish]')
  const root = resolve(cwd),
    path = resolve(cwd, args[1]),
    stat = lstatSync(path)
  if (!stat.isFile() || stat.size > 16 * 1024 * 1024)
    throw new Error('plan must be an ordinary JSON file at most16MiB')
  const input = parseTerminalJson(readFileSync(path))
  if (
    !input ||
    input.schemaVersion !== 'native-vitest-semantic-plan/1.0.0' ||
    Object.keys(input).sort().join(',') !== 'baseRevision,changes,changesSha256,schemaVersion'
  )
    throw new Error('unexpected semantic plan schema/fields')
  const git = (...argv) =>
    execFileSync('git', argv, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  if (
    resolve(git('rev-parse', '--show-toplevel')) !== root ||
    git('rev-parse', 'HEAD') !== input.baseRevision
  )
    throw new Error('plan base must equal actual current repository HEAD')
  const publish = args[2] === '--publish'
  if (publish) {
    if (!git('branch', '--show-current').startsWith('codex/'))
      throw new Error('publication requires the isolated codex candidate, never main')
  }
  const published = inspectPublishedReviewSemanticDelta({
    root,
    baseRevision: input.baseRevision,
    changes: input.changes,
    changesSha256: input.changesSha256,
  })
  if (published)
    return {
      ...published,
      sourceRevision: input.baseRevision,
      changesSha256: input.changesSha256,
      semanticDecision:
        'Existing exact logical publication verified read-only; no new credit granted.',
      grantsRuntimeCredit: false,
    }
  if (publish) {
    const status = git('status', '--porcelain', '--untracked-files=all')
    if (status && status !== '?? node_modules')
      throw new Error(
        'publication requires a clean committed candidate; keep plans/evidence outside the repository',
      )
  }
  const plan = prepareReviewSemanticDelta({
    root,
    baseRevision: input.baseRevision,
    changes: input.changes,
    changesSha256: input.changesSha256,
  })
  const result = {
    mode: publish ? 'published' : 'dry-run',
    sourceRevision: input.baseRevision,
    changesSha256: input.changesSha256,
    changedRows: plan.changedPaths.length,
    logicalEntries: plan.totalEntries,
    manifests: plan.outputs.filter((o) => o.kind === 'manifest').length,
    shards: plan.outputs.filter((o) => o.kind === 'shard').length,
    retiredFragments: plan.retiredFiles.length,
    dependencyPins: plan.edges.length,
    semanticDecision: 'External per-document acceptance is required; this CLI does not grant it.',
    grantsRuntimeCredit: false,
  }
  if (publish) result.publication = publishReviewSemanticDelta(plan, { allowWrite: true })
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(updateNativeVitestReviews(process.argv.slice(2))))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
