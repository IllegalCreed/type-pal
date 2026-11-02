import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, lstatSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  inspectRollforwardPublication,
  prepareRollforwardPublication,
  publishRollforwardPublication,
} from './rollforward-publication.mjs'
import { rollforwardPublication } from './rollforward-review.mjs'
import { reviewPlanHash } from './rollforward-review-plan.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url)),
  hash = (b) => createHash('sha256').update(b).digest('hex')
function external(path, exists) {
  assert(typeof path === 'string' && path.length > 0, 'external file required')
  const absolute = resolve(path),
    resolved = exists
      ? realpathSync(absolute)
      : join(realpathSync(dirname(absolute)), absolute.split('/').at(-1))
  const rel = relative(realpathSync(root), resolved)
  assert(
    isAbsolute(rel) || rel === '..' || rel.startsWith('../'),
    'publication plan/results must be outside repository',
  )
  if (exists)
    assert(
      lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(),
      'ordinary plan input required',
    )
  return resolved
}
export function readRollforwardPublicationPlan(path) {
  const file = external(path, true),
    index = parseTerminalJson(readFileSync(file))
  assert(
    index.kind === 'rollforward-review-plan/1.0.0' &&
      index.formalGrants === 0 &&
      index.changesSha256 === rollforwardPublication.normalizedChangesSha256,
    'closed pending plan required',
  )
  const changes = index.shards.flatMap((d) => {
    assert(/^review-plan-\d\d\.json$/u.test(d.path), 'unsafe plan shard')
    const bytes = readFileSync(external(join(dirname(file), d.path), true))
    assert(
      bytes.length < 524288 && bytes.length === d.bytes && hash(bytes) === d.sha256,
      'plan shard identity/capacity differs',
    )
    const value = parseTerminalJson(bytes)
    assert.equal(value.changes.length, d.entries)
    return value.changes
  })
  assert.equal(
    reviewPlanHash(changes),
    rollforwardPublication.normalizedChangesSha256,
    'plan content/source/order changed',
  )
  return changes
}
export function runRollforwardPublication(argv) {
  const values = new Map(),
    flags = new Set()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (['--publish', '--inspect'].includes(arg)) {
      assert(!flags.has(arg), 'duplicate flag')
      flags.add(arg)
    } else {
      assert(
        ['--plan', '--out'].includes(arg) &&
          !values.has(arg) &&
          argv[i + 1] &&
          !argv[i + 1].startsWith('--'),
        'unknown, duplicate or incomplete option',
      )
      values.set(arg, argv[++i])
    }
  }
  assert(
    !(flags.has('--publish') && flags.has('--inspect')),
    'publish/inspect are mutually exclusive',
  )
  assert(
    values.has('--out') && (flags.has('--inspect') ? !values.has('--plan') : values.has('--plan')),
    'explicit plan/output or inspect/output required',
  )
  const out = external(values.get('--out'), false)
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim()
  let handle, result
  if (flags.has('--inspect')) result = inspectRollforwardPublication({ root })
  else {
    assert.equal(
      execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root }).length,
      0,
      'clean committed candidate required',
    )
    const changes = readRollforwardPublicationPlan(values.get('--plan'))
    handle = prepareRollforwardPublication({ root, baseRevision: head, changes })
  }
  // Reserve the output before any real mutation; a prior receipt can never be
  // overwritten, and an output collision cannot discard the publication result.
  const fd = openSync(out, 'wx')
  try {
    if (handle) {
      writeFileSync(fd, `${JSON.stringify({ mode: 'prepared', head, handle })}\n`)
      result = flags.has('--publish')
        ? { mode: 'published', ...publishRollforwardPublication(handle, { allowWrite: true }) }
        : { mode: 'dry-run', handle }
    }
    const report = { head, ...result }
    // Append the actual outcome; retain the prepare record if publication fails.
    writeFileSync(fd, `${JSON.stringify(report)}\n`)
    console.log(JSON.stringify(report))
    return report
  } finally {
    closeSync(fd)
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runRollforwardPublication(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
