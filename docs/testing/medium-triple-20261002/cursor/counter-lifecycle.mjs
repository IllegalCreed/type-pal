/**
 * Cursor mid-1 反控临时树生命周期：精确登记、上限、回收。
 * 登记真实目录身份（dev/ino + 非 symlink 目录 + 必要 Git worktree）；
 * 只操作本会话 register 且身份仍匹配的路径；禁止全局 prune / 通配强删。
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

/**
 * @typedef {{
 *   path: string,
 *   dev: number,
 *   ino: number,
 *   mode: number,
 *   isDirectory: boolean,
 *   isSymbolicLink: boolean,
 *   gitWorktree: boolean,
 * }} OwnedIdentity
 */

/** @type {Map<string, OwnedIdentity>} */
const ownedExactPaths = new Map()

export function ownedPaths() {
  return [...ownedExactPaths.keys()]
}

export function ownedIdentities() {
  return [...ownedExactPaths.entries()].map(([path, identity]) => ({ path, ...identity }))
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
        ownedExactPaths: [...ownedExactPaths.keys()],
        ownedIdentities: ownedIdentities(),
      },
      null,
      2,
    )}\n`,
  )
}

function isGitWorktreeBasename(absolutePath) {
  return basename(absolutePath).startsWith(TEMP_PREFIX)
}

function gitWorktreeListIncludes(candidateRoot, absolutePath) {
  const list = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: candidateRoot,
    encoding: 'utf8',
  })
  return list.includes(absolutePath)
}

/** Capture durable identity for a real directory object (never a symlink). */
export function captureOwnedIdentity(absolutePath, candidateRoot) {
  const resolved = resolve(absolutePath)
  if (!existsSync(resolved)) throw new Error(`refuse register missing path: ${resolved}`)
  const st = lstatSync(resolved)
  if (st.isSymbolicLink()) throw new Error(`refuse register symlink path: ${resolved}`)
  if (!st.isDirectory()) throw new Error(`refuse register non-directory: ${resolved}`)
  let gitWorktree = false
  if (isGitWorktreeBasename(resolved) && candidateRoot) {
    try {
      gitWorktree = gitWorktreeListIncludes(candidateRoot, resolved)
    } catch {
      gitWorktree = false
    }
  }
  return {
    path: resolved,
    dev: st.dev,
    ino: st.ino,
    mode: st.mode,
    isDirectory: true,
    isSymbolicLink: false,
    gitWorktree,
  }
}

/**
 * Verify path still points at the registered directory object.
 * Path string reuse / inode replacement / symlink swap / lost git listing → refuse.
 */
export function verifyOwnedIdentity(candidateRoot, absolutePath, registered) {
  const resolved = resolve(absolutePath)
  if (!registered) return { ok: false, error: 'refuse-cleanup-unregistered' }
  if (!existsSync(resolved)) return { ok: false, error: 'refuse-cleanup-missing-path' }
  let st
  try {
    st = lstatSync(resolved)
  } catch (error) {
    return {
      ok: false,
      error: `refuse-cleanup-lstat:${error instanceof Error ? error.message : String(error)}`,
    }
  }
  if (st.isSymbolicLink()) return { ok: false, error: 'refuse-cleanup-symlink-replacement' }
  if (!st.isDirectory()) return { ok: false, error: 'refuse-cleanup-not-directory' }
  if (st.dev !== registered.dev || st.ino !== registered.ino) {
    return {
      ok: false,
      error: 'refuse-cleanup-identity-mismatch',
      registered: { dev: registered.dev, ino: registered.ino },
      current: { dev: st.dev, ino: st.ino },
    }
  }
  if (registered.gitWorktree) {
    try {
      if (!gitWorktreeListIncludes(candidateRoot, resolved))
        return { ok: false, error: 'refuse-cleanup-git-identity-lost' }
    } catch (error) {
      return {
        ok: false,
        error: `refuse-cleanup-git-identity-check:${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
  return { ok: true, current: { dev: st.dev, ino: st.ino } }
}

export function registerOwned(candidateRoot, absolutePath) {
  const resolved = resolve(absolutePath)
  if (!isLegalOwnedTempPath(resolved))
    throw new Error(`refuse register non-prefix path: ${resolved}`)
  const identity = captureOwnedIdentity(resolved, candidateRoot)
  ownedExactPaths.set(resolved, identity)
  writeRegistry(candidateRoot)
  return identity
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
  for (const path of ownedExactPaths.keys()) total += estimateDirGiB(path)
  return total
}

export function assertCanCreate(candidateRoot) {
  const liveWorktrees = [...ownedExactPaths.keys()].filter((path) =>
    basename(path).startsWith(TEMP_PREFIX),
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
 * Remove one exact session-registered path that also has legal temp shape
 * AND still matches the registered directory/Git identity.
 * Git worktree remove / lock / identity failure keeps error; never rm-fallback.
 */
export function cleanupExact(candidateRoot, counterTree) {
  const report = {
    path: counterTree,
    owned: false,
    legalPath: false,
    identityOk: false,
    gitRemoveOk: false,
    dirRemoved: false,
    pathExistsAfter: null,
    listedInGitWorktreeAfter: null,
    registeredIdentity: null,
    currentIdentity: null,
    error: null,
  }
  if (!counterTree) {
    report.pathExistsAfter = false
    report.listedInGitWorktreeAfter = false
    return report
  }
  const resolved = resolve(counterTree)
  const registered = ownedExactPaths.get(resolved) ?? null
  report.owned = registered !== null
  report.legalPath = isLegalOwnedTempPath(resolved)
  report.registeredIdentity = registered
    ? { dev: registered.dev, ino: registered.ino, gitWorktree: registered.gitWorktree }
    : null
  report.pathExistsAfter = existsSync(resolved)
  if (!report.owned || !report.legalPath) {
    report.error = !report.owned ? 'refuse-cleanup-unregistered' : 'refuse-cleanup-illegal-path'
    try {
      if (basename(resolved).startsWith(TEMP_PREFIX)) {
        report.listedInGitWorktreeAfter = gitWorktreeListIncludes(candidateRoot, resolved)
      } else {
        report.listedInGitWorktreeAfter = false
      }
    } catch {
      report.listedInGitWorktreeAfter = null
    }
    return report
  }
  const identity = verifyOwnedIdentity(candidateRoot, resolved, registered)
  report.identityOk = identity.ok
  if (identity.current) report.currentIdentity = identity.current
  if (!identity.ok) {
    report.error = identity.error
    report.dirRemoved = false
    report.pathExistsAfter = existsSync(resolved)
    try {
      if (registered.gitWorktree)
        report.listedInGitWorktreeAfter = gitWorktreeListIncludes(candidateRoot, resolved)
      else report.listedInGitWorktreeAfter = false
    } catch {
      report.listedInGitWorktreeAfter = null
    }
    return report
  }
  try {
    const isGitWorktree = registered.gitWorktree
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
          report.listedInGitWorktreeAfter = gitWorktreeListIncludes(candidateRoot, resolved)
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
          report.listedInGitWorktreeAfter = gitWorktreeListIncludes(candidateRoot, resolved)
        } catch {
          report.listedInGitWorktreeAfter = null
        }
        return report
      }
      report.dirRemoved = true
      report.pathExistsAfter = false
      report.listedInGitWorktreeAfter = gitWorktreeListIncludes(candidateRoot, resolved)
      unregisterOwned(candidateRoot, resolved)
      return report
    }
    // Non-git patch temps: primary removal is rm after exact register+legal+identity checks.
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
  for (const path of [...ownedExactPaths.keys()]) reports.push(cleanupExact(candidateRoot, path))
  return reports
}

function defaultGitExec(args, options) {
  return execFileSync('git', args, options)
}

/**
 * Create-failure rollback: same object/Git identity policy as cleanupExact.
 * - Git unknown / remove failed / path replaced → keep path, report exact error (no rm fallback).
 * - Only the original empty create object that never entered Git may be rm'd after identity check.
 *
 * @param {(args: string[], options: object) => string} [gitExec]
 */
export function rollbackFailedCreate(
  candidateRoot,
  counterTree,
  createIdentity,
  gitExec = defaultGitExec,
) {
  const resolved = resolve(counterTree)
  const report = {
    path: resolved,
    action: null,
    dirRemoved: false,
    identityOk: false,
    inGit: null,
    error: null,
    registeredIdentity: createIdentity
      ? { dev: createIdentity.dev, ino: createIdentity.ino }
      : null,
    currentIdentity: null,
  }
  if (!createIdentity) {
    report.error = 'refuse-rollback-no-create-identity'
    report.action = 'refuse-rollback'
    return report
  }
  if (!existsSync(resolved)) {
    report.error = 'create-path-already-gone'
    report.action = 'noop'
    report.dirRemoved = true
    report.identityOk = true
    return report
  }
  let st
  try {
    st = lstatSync(resolved)
  } catch (error) {
    report.error = `refuse-rollback-lstat:${error instanceof Error ? error.message : String(error)}`
    report.action = 'refuse-rollback'
    return report
  }
  report.currentIdentity = { dev: st.dev, ino: st.ino }
  if (st.isSymbolicLink()) {
    report.error = 'refuse-rollback-symlink-replacement'
    report.action = 'refuse-rollback'
    return report
  }
  if (!st.isDirectory()) {
    report.error = 'refuse-rollback-not-directory'
    report.action = 'refuse-rollback'
    return report
  }
  if (st.dev !== createIdentity.dev || st.ino !== createIdentity.ino) {
    report.error = 'refuse-rollback-identity-mismatch'
    report.action = 'refuse-rollback'
    return report
  }
  report.identityOk = true
  let inGit = false
  try {
    const list = gitExec(['worktree', 'list', '--porcelain'], {
      cwd: candidateRoot,
      encoding: 'utf8',
    })
    inGit = String(list).includes(resolved)
  } catch (error) {
    report.error = `refuse-rollback-git-unknown:${error instanceof Error ? error.message : String(error)}`
    report.action = 'refuse-rollback'
    report.inGit = null
    return report
  }
  report.inGit = inGit
  if (inGit) {
    try {
      gitExec(['worktree', 'remove', '--force', resolved], {
        cwd: candidateRoot,
        encoding: 'utf8',
      })
      report.action = 'git-remove'
      report.dirRemoved = !existsSync(resolved)
      if (existsSync(resolved)) report.error = 'git-remove-left-residue'
    } catch (error) {
      report.action = 'git-remove-failed'
      report.error = error instanceof Error ? error.message : String(error)
      report.dirRemoved = false
    }
    return report
  }
  // Never entered Git: reclaim only this verified empty create object.
  try {
    rmSync(resolved, { recursive: true, force: true })
    report.action = 'rm-unentered-create'
    report.dirRemoved = !existsSync(resolved)
    if (!report.dirRemoved) report.error = 'rm-left-residue'
  } catch (error) {
    report.action = 'rm-unentered-create-failed'
    report.error = error instanceof Error ? error.message : String(error)
    report.dirRemoved = false
  }
  return report
}

/**
 * @param {string} candidateRoot
 * @param {string} id
 * @param {{ gitExec?: (args: string[], options: object) => string }} [options]
 */
export function createCounterWorktree(candidateRoot, id, options = {}) {
  const gitExec = options.gitExec ?? defaultGitExec
  assertCanCreate(candidateRoot)
  const counterTree = mkdtempSync(join(tmpdir(), `${TEMP_PREFIX}${id}-`))
  const createIdentity = captureOwnedIdentity(counterTree, candidateRoot)
  try {
    gitExec(['worktree', 'add', '--detach', counterTree, 'HEAD'], {
      cwd: candidateRoot,
      encoding: 'utf8',
    })
  } catch (error) {
    const rollback = rollbackFailedCreate(candidateRoot, counterTree, createIdentity, gitExec)
    const wrapped = new Error(
      `createCounterWorktree failed for ${counterTree}: ${
        error instanceof Error ? error.message : String(error)
      }; rollback=${rollback.action}:${rollback.error ?? 'ok'}`,
    )
    wrapped.cause = error
    wrapped.rollback = rollback
    wrapped.counterTree = counterTree
    throw wrapped
  }
  // Register AFTER git materializes the worktree so inode/Git identity match cleanup.
  registerOwned(candidateRoot, counterTree)
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

/** Clear in-memory registry (tests only). */
export function resetOwnedForTests() {
  ownedExactPaths.clear()
}
