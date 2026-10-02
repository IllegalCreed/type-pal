#!/usr/bin/env node
/**
 * 清理回归：成功 / 故意失败 / 可捕获中断 后零残留；
 * 另自建哨兵证明：未登记同前缀 / 祖先含前缀 / 同路径 inode 替换 一律拒删且不 rm。
 */
import { spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import {
  cleanupExact,
  createCounterWorktree,
  isLegalOwnedTempPath,
  linkNodeModules,
  listPrefixTempsInTmpdir,
  MAX_CONCURRENCY,
  MAX_LIVE_TREES,
  ownedPaths,
  readLiveRegistry,
  registerOwned,
  resetOwnedForTests,
  scanOrphanPrefixDirs,
  TEMP_PREFIX,
} from './counter-lifecycle.mjs'

const root = process.cwd()
const evidenceDir = join(root, 'docs/testing/medium-triple-20261002/cursor/cleanup-evidence')
mkdirSync(evidenceDir, { recursive: true })

const results = []
/** Only paths this selftest created; always removed in finally-safe helpers. */
const sentinels = []

function sleepMs(ms) {
  spawnSync(
    process.execPath,
    ['-e', `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${ms})`],
    { stdio: 'ignore' },
  )
}

function checkZero(label, path, report) {
  const gitList = spawnSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  })
  const stillListed = path ? (gitList.stdout || '').includes(path) : false
  const exists = path ? existsSync(path) : false
  const ok =
    !exists && !stillListed && report && !report.pathExistsAfter && !report.listedInGitWorktreeAfter
  results.push({ label, ok, path, exists, stillListed, report })
  if (!ok) throw new Error(`${label} residue: exists=${exists} listed=${stillListed}`)
}

function makeSentinelDir(tag) {
  const dir = mkdtempSync(join(tmpdir(), `${TEMP_PREFIX}${tag}-`))
  sentinels.push(dir)
  writeFileSync(join(dir, 'sentinel.txt'), 'cursor-r2-selftest-only\n')
  return dir
}

function destroySentinel(dir) {
  if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true })
}

try {
  resetOwnedForTests()
  {
    const tree = createCounterWorktree(root, 'selftest-ok')
    linkNodeModules(join(root, 'node_modules'), join(tree, 'node_modules'))
    const report = cleanupExact(root, tree)
    checkZero('success-cleanup', tree, report)
  }

  resetOwnedForTests()
  {
    const tree = createCounterWorktree(root, 'selftest-fail')
    try {
      throw new Error('injected-failure-no-product-mutation')
    } catch {
      const report = cleanupExact(root, tree)
      checkZero('failure-cleanup', tree, report)
    }
  }

  resetOwnedForTests()
  {
    const first = createCounterWorktree(root, 'selftest-cap-a')
    let refused = false
    try {
      createCounterWorktree(root, 'selftest-cap-b')
    } catch (error) {
      refused = String(error.message).includes('live temp trees at cap')
    }
    const report = cleanupExact(root, first)
    checkZero('cap-refuse-then-cleanup', first, report)
    results.push({
      label: 'max-live-trees',
      ok: refused && MAX_LIVE_TREES === 1,
      refused,
      MAX_LIVE_TREES,
    })
    if (!refused) throw new Error('expected second create to refuse')
  }

  // --- R2-02: unregistered same-prefix sentinel must NOT be deleted ---
  resetOwnedForTests()
  {
    const sentinel = makeSentinelDir('unreg')
    const before = existsSync(sentinel)
    const report = cleanupExact(root, sentinel)
    const after = existsSync(sentinel)
    const ok =
      before &&
      after &&
      report.owned === false &&
      report.gitRemoveOk === false &&
      report.dirRemoved === false &&
      report.error === 'refuse-cleanup-unregistered'
    results.push({
      label: 'refuse-unregistered-same-prefix',
      ok,
      sentinel,
      before,
      after,
      report,
    })
    if (!ok)
      throw new Error(
        `unregistered sentinel was deleted or mis-authorized: ${JSON.stringify(report)}`,
      )
    destroySentinel(sentinel)
  }

  // --- R2-02: ancestor-contains-prefix path refused ---
  resetOwnedForTests()
  {
    const nestRoot = mkdtempSync(join(tmpdir(), 'cursor-r2-nest-'))
    sentinels.push(nestRoot)
    const nested = join(nestRoot, `${TEMP_PREFIX}nested-leaf`)
    mkdirSync(nested, { recursive: true })
    writeFileSync(join(nested, 'x.txt'), 'nest\n')
    const legal = isLegalOwnedTempPath(nested)
    const report = cleanupExact(root, nested)
    const after = existsSync(nested)
    const ok =
      legal === false &&
      after &&
      report.dirRemoved === false &&
      (report.error === 'refuse-cleanup-unregistered' ||
        report.error === 'refuse-cleanup-illegal-path')
    results.push({ label: 'refuse-ancestor-prefix-path', ok, nested, legal, after, report })
    if (!ok) throw new Error(`ancestor prefix path mishandled: ${JSON.stringify(report)}`)
    destroySentinel(nestRoot)
  }

  // --- R3-02: same legal path, new inode replacement must NOT be deleted ---
  // Keep registration; move original aside; recreate at identical path; do not re-register.
  resetOwnedForTests()
  {
    const original = mkdtempSync(join(tmpdir(), 'cursor-mid-patch-r3-replace-'))
    writeFileSync(join(original, 'sentinel-original.txt'), 'original-owned\n')
    const registered = registerOwned(root, original)
    const holdRoot = mkdtempSync(join(tmpdir(), 'cursor-r3-hold-'))
    sentinels.push(holdRoot)
    const moved = join(holdRoot, basename(original))
    renameSync(original, moved)
    mkdirSync(original)
    writeFileSync(join(original, 'sentinel-replacement.txt'), 'replacement\n')
    sentinels.push(original)
    sentinels.push(moved)
    const replacementStat = lstatSync(original)
    const report = cleanupExact(root, original)
    const replacementExists =
      existsSync(original) && existsSync(join(original, 'sentinel-replacement.txt'))
    const originalPreserved = existsSync(moved) && existsSync(join(moved, 'sentinel-original.txt'))
    const ok =
      registered.ino !== replacementStat.ino &&
      report.owned === true &&
      report.legalPath === true &&
      report.identityOk === false &&
      report.dirRemoved === false &&
      report.error === 'refuse-cleanup-identity-mismatch' &&
      replacementExists &&
      originalPreserved
    results.push({
      label: 'refuse-same-path-inode-replacement',
      ok,
      registeredIno: registered.ino,
      replacementIno: replacementStat.ino,
      replacementExists,
      originalPreserved,
      report,
    })
    if (!ok) throw new Error(`same-path inode replacement mishandled: ${JSON.stringify(report)}`)
    resetOwnedForTests()
    destroySentinel(original)
    destroySentinel(moved)
    destroySentinel(holdRoot)
  }

  {
    const childScript = join(evidenceDir, '_interrupt-child.mjs')
    writeFileSync(
      childScript,
      `import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanupExact, createCounterWorktree } from '../counter-lifecycle.mjs'
const root = process.cwd()
const evidence = join(root, 'docs/testing/medium-triple-20261002/cursor/cleanup-evidence')
mkdirSync(evidence, { recursive: true })
const out = join(evidence, 'interrupt-child.json')
let tree = null
function finish(reason) {
  const path = tree
  const report = path
    ? cleanupExact(root, path)
    : { pathExistsAfter: false, listedInGitWorktreeAfter: false }
  tree = null
  writeFileSync(
    out,
    JSON.stringify(
      { reason, path, report, existsAfter: path ? existsSync(path) : false },
      null,
      2,
    ) + '\\n',
  )
  process.exitCode = reason === 'signal' ? 143 : 0
  process.exit(process.exitCode)
}
process.on('SIGTERM', () => finish('signal'))
tree = createCounterWorktree(root, 'selftest-int')
writeFileSync(out, JSON.stringify({ phase: 'ready', tree }, null, 2) + '\\n')
setInterval(() => {}, 1000)
`,
    )
    const readyPath = join(evidenceDir, 'interrupt-child.json')
    rmSync(readyPath, { force: true })
    const child = spawn(process.execPath, [childScript], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let ready = null
    for (let i = 0; i < 200; i++) {
      sleepMs(50)
      if (!existsSync(readyPath)) continue
      try {
        ready = JSON.parse(readFileSync(readyPath, 'utf8'))
        if (ready.phase === 'ready' && ready.tree) break
      } catch {
        /* retry */
      }
    }
    if (!ready?.tree) {
      child.kill('SIGKILL')
      throw new Error('interrupt child never became ready')
    }
    child.kill('SIGTERM')
    for (let i = 0; i < 100 && child.exitCode === null; i++) sleepMs(50)
    const after = JSON.parse(readFileSync(readyPath, 'utf8'))
    const ok =
      after.reason === 'signal' &&
      after.existsAfter === false &&
      after.report?.pathExistsAfter === false &&
      after.report?.listedInGitWorktreeAfter === false
    results.push({ label: 'interrupt-sigterm', ok, tree: ready.tree, after })
    rmSync(childScript, { force: true })
    if (!ok) throw new Error(`interrupt cleanup failed: ${JSON.stringify(after)}`)
  }

  resetOwnedForTests()
  const summary = {
    at: new Date().toISOString(),
    maxConcurrency: MAX_CONCURRENCY,
    maxLiveTrees: MAX_LIVE_TREES,
    ownedAfter: ownedPaths(),
    prefixTemps: listPrefixTempsInTmpdir(),
    orphansReportOnly: scanOrphanPrefixDirs(),
    registry: readLiveRegistry(root),
    results,
    allOk: results.every((r) => r.ok),
  }
  writeFileSync(join(evidenceDir, 'cleanup-selftest.json'), `${JSON.stringify(summary, null, 2)}\n`)
  if (!summary.allOk) {
    console.error(JSON.stringify(summary, null, 2))
    process.exitCode = 1
  } else {
    console.log(JSON.stringify({ ok: true, cases: results.map((r) => r.label) }, null, 2))
    process.exitCode = 0
  }
} finally {
  for (const s of sentinels) destroySentinel(s)
  // Never touch other counter dirs; only our sentinel tags under TEMP_PREFIX*selftest*
}
