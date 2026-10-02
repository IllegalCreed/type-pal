#!/usr/bin/env node
/**
 * 清理回归：成功 / 故意失败 / 可捕获中断 后目录与 git worktree 注册零残留。
 * 故意失败只注入生命周期层，不改产品源码、不提交变异。
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  cleanupExact,
  createCounterWorktree,
  linkNodeModules,
  listPrefixTempsInTmpdir,
  MAX_CONCURRENCY,
  MAX_LIVE_TREES,
  ownedPaths,
  readLiveRegistry,
  resetOwnedForTests,
  scanOrphanPrefixDirs,
} from './counter-lifecycle.mjs'

const root = process.cwd()
const evidenceDir = join(root, 'docs/testing/medium-triple-20261002/cursor/cleanup-evidence')
mkdirSync(evidenceDir, { recursive: true })

const results = []

function sleepMs(ms) {
  spawnSync(
    process.execPath,
    ['-e', `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${ms})`],
    {
      stdio: 'ignore',
    },
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
  const deadline = Date.now() + 15000
  while (Date.now() < deadline && child.exitCode === null && !child.killed) sleepMs(50)
  // wait for exit event
  spawnSync(process.execPath, ['-e', ''], { timeout: 100 })
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
