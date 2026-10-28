import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  currentLedgerEntryHash,
  prepareCurrentLedgerCandidate,
  writeCurrentLedgerCandidate,
} from './current-review-ledger-candidate.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export function runCurrentLedgerCandidate(argv) {
  assert(argv.length === 2 || argv.length === 3, '--plan <external-json> [--write] required')
  assert(argv[0] === '--plan' && (argv.length === 2 || argv[2] === '--write'), 'unknown option')
  const root = fileURLToPath(new URL('../../', import.meta.url)),
    input = realpathSync(resolve(argv[1])),
    path = relative(root, input)
  assert(
    isAbsolute(path) || path === '..' || path.startsWith('../'),
    'plan must be outside repository',
  )
  const plan = parseTerminalJson(readFileSync(input)),
    head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  assert.equal(plan.baseRevision, head, 'plan must name the actual clean candidate base')
  assert.equal(
    execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: root,
      encoding: 'utf8',
    }),
    '',
    'tracked working tree must be clean',
  )
  const handle = prepareCurrentLedgerCandidate({
    root,
    plan,
    planSha256: currentLedgerEntryHash(plan),
  })
  const result =
    argv[2] === '--write'
      ? writeCurrentLedgerCandidate(handle)
      : {
          mode: 'dry-run',
          targets: handle.targets,
          creditGranted: 0,
          plannedWrites: handle.transaction.writes,
          plannedRetirements: handle.transaction.retirements,
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
