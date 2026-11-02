import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  currentLedgerEntryHash,
  prepareCurrentLedgerCandidate,
  prepareCurrentLedgerPublication,
  prepareCurrentNativeControlCandidate,
  prepareCurrentNativeControlPublication,
  publishCurrentLedgerReviews,
  publishCurrentNativeControlReviews,
  writeCurrentLedgerCandidate,
  writeCurrentNativeControlCandidate,
} from './current-review-ledger-candidate.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export function runCurrentLedgerCandidate(argv) {
  assert(
    argv.length === 2 || argv.length === 3,
    '--plan <external-json> [--write|--publish] required',
  )
  assert(
    argv[0] === '--plan' && (argv.length === 2 || ['--write', '--publish'].includes(argv[2])),
    'unknown option',
  )
  const root = fileURLToPath(new URL('../../', import.meta.url)),
    input = realpathSync(resolve(argv[1])),
    path = relative(root, input)
  assert(
    isAbsolute(path) || path === '..' || path.startsWith('../'),
    'plan must be outside repository',
  )
  const plan = parseTerminalJson(readFileSync(input))
  const native = [
    'current-native-control-candidate/1.0.0',
    'current-native-control-publication/1.0.0',
  ].includes(plan.kind)
  const publication = [
    'current-ledger-publication/1.0.0',
    'current-native-control-publication/1.0.0',
  ].includes(plan.kind)
  assert(
    argv.length === 2 || (publication ? argv[2] === '--publish' : argv[2] === '--write'),
    'author writes and Owner publication require their distinct explicit flag',
  )
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  assert.equal(plan.baseRevision, head, 'plan must name the actual clean candidate base')
  assert.equal(
    execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }),
    '',
    'tracked working tree must be clean',
  )
  const prepare = native
    ? publication
      ? prepareCurrentNativeControlPublication
      : prepareCurrentNativeControlCandidate
    : publication
      ? prepareCurrentLedgerPublication
      : prepareCurrentLedgerCandidate
  const handle = prepare({
    root,
    plan,
    planSha256: currentLedgerEntryHash(plan),
  })
  const result =
    argv.length === 3
      ? publication
        ? (native ? publishCurrentNativeControlReviews : publishCurrentLedgerReviews)(handle)
        : (native ? writeCurrentNativeControlCandidate : writeCurrentLedgerCandidate)(handle)
      : {
          mode: 'dry-run',
          targets: handle.targets,
          creditGranted: 0,
          plannedWrites: handle.transaction.outputs.length,
          plannedRetirements: handle.transaction.retired.length,
        }
  console.log(JSON.stringify(result))
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCurrentLedgerCandidate(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
