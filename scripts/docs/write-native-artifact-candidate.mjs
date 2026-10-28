import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { nativeArtifactHash } from './historical-native-artifact.mjs'
import { nativeArtifactBindings } from './historical-native-artifact-admission.mjs'
import {
  nativeArtifactEntryHash,
  prepareNativeArtifactCandidate,
  validateNativeArtifactChanges,
  writeNativeArtifactCandidate,
} from './native-artifact-candidate.mjs'
import { loadReviewRecordFromGit, loadReviewRecords } from './review-record-storage.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

export function runNativeArtifactCandidate(argv, cwd = process.cwd()) {
  if (
    argv.length < 4 ||
    argv.length > 5 ||
    argv[0] !== '--plan' ||
    argv[2] !== '--sha256' ||
    (argv.length === 5 && !['--write', '--verify'].includes(argv[4]))
  )
    throw new Error(
      'usage: write-native-artifact-candidate.mjs --plan <absolute external file> --sha256 <canonical plan SHA> [--write|--verify]',
    )
  const root = realpathSync(cwd),
    path = realpathSync(argv[1])
  if (!isAbsolute(argv[1]) || path === root || path.startsWith(`${root}/`))
    throw new Error('explicit external plan required')
  const plan = parseTerminalJson(readFileSync(path))
  if (nativeArtifactEntryHash(plan) !== argv[3]) throw new Error('plan SHA mismatch')
  if (argv[4] === '--verify') {
    if (plan.kind !== 'native-artifact-candidate/1.0.0' || plan.creditGranted !== 0)
      throw new Error('zero-credit candidate plan required')
    const group = loadReviewRecords({ root })
    const before = new Map()
    for (const c of plan.changes) {
      const b = nativeArtifactBindings.find((e) => e.path === c.path)
      if (!b) throw new Error('out-of-scope verify target')
      if (!before.has(b.reviewRecord))
        before.set(
          b.reviewRecord,
          loadReviewRecordFromGit({
            root,
            revision: plan.baseRevision,
            logicalPath: b.reviewRecord,
          }).record,
        )
    }
    validateNativeArtifactChanges(plan.changes, before, (p) => readFileSync(resolve(root, p)))
    for (const c of plan.changes) {
      const b = nativeArtifactBindings.find((e) => e.path === c.path)
      if (
        !b ||
        nativeArtifactEntryHash(group.records.get(b.reviewRecord).entries[b.reviewIndex]) !==
          nativeArtifactEntryHash(c.after)
      )
        throw new Error('candidate target differs from the fixed plan')
    }
    for (const r of group.records.values())
      for (const row of r.entries)
        if (nativeArtifactHash(readFileSync(resolve(root, row.path))) !== row.afterSha256)
          throw new Error('candidate after pin differs')
    return { mode: 'verified', targets: plan.changes.length, repositoryWrites: 0, creditGranted: 0 }
  }
  if (argv[4] === '--write') {
    const git = (...args) =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
    const status = git('status', '--porcelain', '--untracked-files=all').split('\n').filter(Boolean)
    if (
      git('rev-parse', 'HEAD') !== plan.baseRevision ||
      !git('branch', '--show-current').startsWith('codex/') ||
      resolve(root, git('rev-parse', '--git-dir')) ===
        resolve(root, git('rev-parse', '--git-common-dir')) ||
      status.some((s) => !/^\?\? (?:node_modules|packages\/[a-z-]+\/node_modules)$/u.test(s))
    )
      throw new Error('write requires a clean isolated codex worktree at the plan base')
  }
  const handle = prepareNativeArtifactCandidate({ root, plan, planSha256: argv[3] })
  return argv[4] === '--write'
    ? { mode: 'candidate-written', ...writeNativeArtifactCandidate(handle) }
    : { mode: 'dry-run', ...handle, repositoryWrites: 0 }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(runNativeArtifactCandidate(process.argv.slice(2))))
  } catch (error) {
    console.error(error.stack)
    process.exitCode = 1
  }
}
