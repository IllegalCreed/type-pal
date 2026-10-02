/**
 * Cursor mid-1 反控临时树生命周期：精确登记、上限、回收。
 * 只操作本会话 register 过的路径；禁止全局 prune / 通配强删。
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

export const TEMP_PREFIX = 'cursor-mid-counter-'
export const OWNED_PREFIXES = ['cursor-mid-counter-', 'cursor-mid-patch-']
export const MAX_LIVE_TREES = 1
export const MAX_CONCURRENCY = 1
/** Soft ceiling for this Owner's live counter temps (GiB). Refuse new create above this. */
export const MAX_OWNER_TEMP_GIB = 2

/**
 * Legal temp path shape: direct child of os.tmpdir() whose basename starts with an owned prefix.
 * Ancestor-includes-prefix (e.g. /tmp/foo/cursor-mid-counter-x) or bare prefix match is illegal.
 */
export function isLegalOwnedTempPath(absolutePath) {
  const resolved = resolve(absolutePath)
  const parent = resolve(dirname(resolved))
  if (parent !== resolve(tmpdir())) return false
  const base = basename(resolved)
  return OWNED_PREFIXES.some((prefix) => base.startsWith(prefix))
}

/** @deprecated use isLegalOwnedTempPath — kept name for register gate */
function isOwnedPrefixPath(absolutePath) {
  return isLegalOwnedTempPath(absolutePath)
}

/** @type {Set<string>} */
const ownedExactPaths = new Set()

export function ownedPaths() {
  return [...ownedExactPaths]
}

export function registryPath(candidateRoot) {
  return join(
    candidateRoot,
    'docs/testing/medium-triple-20261002/cursor/cleanup-evidence',
    'live-registry.json',
  )
}

function writeRegistry(candidateRoot) {
  const path = registryPath(candidateRoot)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        prefix: TEMP_PREFIX,
        maxLiveTrees: MAX_LIVE_TREES,
        maxConcurrency: MAX_CONCURRENCY,
        maxOwnerTempGiB: MAX_OWNER_TEMP_GIB,
        ownedExactPaths: [...ownedExactPaths],
      },
      null,
      2,
    )}\n`,
  )
}

export function registerOwned(candidateRoot, absolutePath) {
  const resolved = resolve(absolutePath)
  if (!isOwnedPrefixPath(resolved)) throw new Error(`refuse register non-prefix path: ${resolved}`)
  ownedExactPaths.add(resolved)
  writeRegistry(candidateRoot)
}

export function unregisterOwned(candidateRoot, absolutePath) {
  ownedExactPaths.delete(resolve(absolutePath))
  writeRegistry(candidateRoot)
}

export function estimateDirGiB(path) {
  if (!existsSync(path)) return 0
  try {
    const out = execFileSync('du', ['-sk', path], { encoding: 'utf8' })
    const kb = Number(out.trim().split(/\s+/)[0] || 0)
    return kb / (1024 * 1024)
  } catch {
    return 0
  }
}

export function ownerTempGiB() {
  let total = 0
  for (const path of ownedExactPaths) total += estimateDirGiB(path)
  return total
}

export function assertCanCreate(candidateRoot) {
  const liveWorktrees = [...ownedExactPaths].filter((path) =>
    (path.split(/[/\\]/).pop() || '').startsWith(TEMP_PREFIX),
  )
  if (liveWorktrees.length >= MAX_LIVE_TREES)
    throw new Error(`live temp trees at cap ${MAX_LIVE_TREES}; refuse create`)
  const used = ownerTempGiB()
  if (used >= MAX_OWNER_TEMP_GIB)
    throw new Error(`owner temp disk ${used.toFixed(3)} GiB >= cap ${MAX_OWNER_TEMP_GIB}`)
  writeRegistry(candidateRoot)
}

/** Symlink node_modules — never recursive-copy full dependency trees. */
export function linkNodeModules(from, to) {
  if (!existsSync(from)) return
  if (existsSync(to)) rmSync(to, { recursive: true, force: true })
  mkdirSync(dirname(to), { recursive: true })
  symlinkSync(from, to, 'dir')
  const st = lstatSync(to)
  if (!st.isSymbolicLink()) throw new Error(`expected symlink at ${to}`)
}

/**
 * Remove one exact session-registered path that also has legal temp shape.
 * Requires register AND legal path — prefix alone never authorizes delete.
 * Git worktree remove / lock / identity failure keeps error; never rm-fallback.
 */
export function cleanupExact(candidateRoot, counterTree) {
  const report = {
    path: counterTree,
    owned: false,
    legalPath: false,
    gitRemoveOk: false,
    dirRemoved: false,
    pathExistsAfter: null,
    listedInGitWorktreeAfter: null,
    error: null,
  }
  if (!counterTree) {
    report.pathExistsAfter = false
    report.listedInGitWorktreeAfter = false
    return report
  }
  const resolved = resolve(counterTree)
  report.owned = ownedExactPaths.has(resolved)
  report.legalPath = isLegalOwnedTempPath(resolved)
  report.pathExistsAfter = existsSync(resolved)
  if (!report.owned || !report.legalPath) {
    report.error = !report.owned ? 'refuse-cleanup-unregistered' : 'refuse-cleanup-illegal-path'
    if (report.owned && report.legalPath === false) {
      /* keep registered; caller must fix path identity */
    }
    try {
      if (basename(resolved).startsWith(TEMP_PREFIX)) {
        const list = execFileSync('git', ['worktree', 'list', '--porcelain'], {
          cwd: candidateRoot,
          encoding: 'utf8',
        })
        report.listedInGitWorktreeAfter = list.includes(resolved)
      } else {
        report.listedInGitWorktreeAfter = false
      }
    } catch {
      report.listedInGitWorktreeAfter = null
    }
    return report
  }
  try {
    const isGitWorktree = basename(resolved).startsWith(TEMP_PREFIX)
    if (isGitWorktree) {
      try {
        execFileSync('git', ['worktree', 'remove', '--force', resolved], {
          cwd: candidateRoot,
          encoding: 'utf8',
        })
        report.gitRemoveOk = true
      } catch (error) {
        report.gitRemoveOk = false
        report.error = error instanceof Error ? error.message : String(error)
        report.pathExistsAfter = existsSync(resolved)
        try {
          const list = execFileSync('git', ['worktree', 'list', '--porcelain'], {
            cwd: candidateRoot,
            encoding: 'utf8',
          })
          report.listedInGitWorktreeAfter = list.includes(resolved)
        } catch {
          report.listedInGitWorktreeAfter = null
        }
        report.dirRemoved = false
        return report
      }
      if (existsSync(resolved)) {
        report.error = 'git-remove-left-residue'
        report.pathExistsAfter = true
        report.dirRemoved = false
        try {
          const list = execFileSync('git', ['worktree', 'list', '--porcelain'], {
            cwd: candidateRoot,
            encoding: 'utf8',
          })
          report.listedInGitWorktreeAfter = list.includes(resolved)
        } catch {
          report.listedInGitWorktreeAfter = null
        }
        return report
      }
      report.dirRemoved = true
      report.pathExistsAfter = false
      const list = execFileSync('git', ['worktree', 'list', '--porcelain'], {
        cwd: candidateRoot,
        encoding: 'utf8',
      })
      report.listedInGitWorktreeAfter = list.includes(resolved)
      unregisterOwned(candidateRoot, resolved)
      return report
    }
    // Non-git patch temps: primary removal is rm after exact register+legal checks.
    if (existsSync(resolved)) rmSync(resolved, { recursive: true, force: true })
    report.gitRemoveOk = true
    report.dirRemoved = !existsSync(resolved)
    report.pathExistsAfter = existsSync(resolved)
    report.listedInGitWorktreeAfter = false
    if (report.dirRemoved) unregisterOwned(candidateRoot, resolved)
    else report.error = 'rm-left-residue'
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error)
    report.pathExistsAfter = existsSync(resolved)
    report.dirRemoved = false
  }
  return report
}

export function cleanupAllOwned(candidateRoot) {
  const reports = []
  for (const path of [...ownedExactPaths]) reports.push(cleanupExact(candidateRoot, path))
  return reports
}

export function createCounterWorktree(candidateRoot, id) {
  assertCanCreate(candidateRoot)
  const counterTree = mkdtempSync(join(tmpdir(), `${TEMP_PREFIX}${id}-`))
  registerOwned(candidateRoot, counterTree)
  try {
    execFileSync('git', ['worktree', 'add', '--detach', counterTree, 'HEAD'], {
      cwd: candidateRoot,
      encoding: 'utf8',
    })
  } catch (error) {
    cleanupExact(candidateRoot, counterTree)
    throw error
  }
  return counterTree
}

export function listPrefixTempsInTmpdir() {
  const base = tmpdir()
  const found = []
  try {
    for (const name of readdirSync(base)) {
      if (!name.startsWith(TEMP_PREFIX)) continue
      found.push(join(base, name))
    }
  } catch {
    /* ignore */
  }
  return found
}

/** Report-only: prefix dirs in tmpdir not in this process registry (never auto-delete). */
export function scanOrphanPrefixDirs() {
  const orphans = []
  for (const full of listPrefixTempsInTmpdir()) {
    if (!ownedExactPaths.has(resolve(full))) orphans.push(full)
  }
  return orphans
}

export function readLiveRegistry(candidateRoot) {
  const path = registryPath(candidateRoot)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Clear in-memory set (tests only). */
export function resetOwnedForTests() {
  ownedExactPaths.clear()
}
