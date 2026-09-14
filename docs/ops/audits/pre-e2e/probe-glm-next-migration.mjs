// GLM boundary batch-2 · E组 rework（R6）· 真实 planner/transaction/materializer + 准确 caller census。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-migration.mjs [--mode=observe|contract] [--case ID|all]
// E01～E08 全部调用真实 createMigrationPlan/snapshotOf/loadProjectMigrationSnapshot/
// assertProjectSnapshotCurrent/buildMigrationTransactionChanges/commitMigrationTransaction/
// recoverMigrationTransaction/materializePalAssets;不手写守卫、不复制被测算法。
// 安全:node:fs 被替换为虚拟层,任何路径在**每次操作(含所有写入)之前**都必须落在
// /virtual/ 或 /virtual-outside/ 前缀内,否则抛错拒绝;主仓零 IO。census 用捕获的真实 fs 只读。
// observe=取证 exit0(缺陷项登记原树特征);contract=正确合同断言,原树缺陷处业务红 exit1。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { dirname } from 'node:path'
import {
  baselineWrites,
  serializeMigrationJson,
  sha256,
} from '../../../../packages/migrate/src/migration-baseline.ts'
import { createMigrationPlan, snapshotOf } from '../../../../packages/migrate/src/migration-plan.ts'
import {
  assertProjectSnapshotCurrent,
  loadProjectMigrationSnapshot,
} from '../../../../packages/migrate/src/migration-project-io.ts'
import {
  commitMigrationTransaction,
  hasPendingMigrationTransaction,
  recoverMigrationTransaction,
} from '../../../../packages/migrate/src/migration-transaction.ts'
import { buildMigrationTransactionChanges } from '../../../../packages/migrate/src/migration-write-plan.ts'
import { materializePalAssets } from '../../../../packages/migrate/src/pal-assets.ts'
import { buildThrowItem } from '../../../../packages/reforge/src/battle/battle-anim.ts'
import { createBattleState } from '../../../../packages/reforge/src/battle/battle-core.ts'

const modeArg = process.argv.find((a) => a.startsWith('--mode'))
const MODE = modeArg
  ? modeArg.includes('=')
    ? modeArg.split('=')[1]
    : process.argv[process.argv.indexOf(modeArg) + 1]
  : 'observe'
const caseArg = process.argv.find((a) => a.startsWith('--case'))
const CASE = caseArg
  ? caseArg.includes('=')
    ? caseArg.split('=')[1]
    : process.argv[process.argv.indexOf(caseArg) + 1]
  : 'all'
const want = (id) => CASE === 'all' || CASE === id

const root = new URL('../../../../', import.meta.url)
// census/内容装载用真实 fs(只读);必须在替换前捕获。
const real = { readFileSync: fs.readFileSync, readdirSync: fs.readdirSync, statSync: fs.statSync }
const readReal = (path) => real.readFileSync(new URL(path, root), 'utf8')

const results = []
const note = (id, verdict, detail) => {
  results.push({ id, verdict, detail })
  console.log(JSON.stringify({ id, verdict, detail }))
}

// ── 虚拟文件层(旧 probe-migration-boundaries.mjs 模式扩展) ──
// 每次 fs 操作先 pathOf 校验前缀;符号链接按前缀映射,fixpoint 解析多层链;
// renameSync 对"最终组件是链接"按 POSIX rename(2) 替换链接本身(不穿透)。
let files = new Map()
const dirs = new Set()
const links = new Map()
let calls = []
let onJournalRenamed = null
const readHooks = new Map()
const journalSuffix = '/.type-pal-migrate/pal-journal.json'
function pathOf(path) {
  let out = String(path)
  for (let round = 0; round < 8; round++) {
    let next = out
    for (const [source, target] of links)
      if (next === source || next.startsWith(`${source}/`))
        next = target + next.slice(source.length)
    if (next === out) return checkAllowed(out)
    out = next
  }
  throw new Error(`符号链接解析超深: ${path}`)
}
function checkAllowed(path) {
  if (path !== '/virtual' && !path.startsWith('/virtual/') && !path.startsWith('/virtual-outside/'))
    throw new Error(`拒绝虚拟层之外的文件系统访问: ${path}`)
  return path
}
function addDir(path) {
  for (let p = path; p !== '/'; p = dirname(p)) dirs.add(p)
}
function put(path, bytes) {
  path = pathOf(path)
  addDir(dirname(path))
  files.set(path, Buffer.from(bytes))
}
function get(path, encoding) {
  path = pathOf(path)
  if (!files.has(path)) throw new Error(`ENOENT ${path}`)
  const bytes = Buffer.from(files.get(path))
  return encoding ? bytes.toString(encoding) : bytes
}
const replacements = {
  existsSync(path) {
    path = pathOf(path)
    return files.has(path) || dirs.has(path)
  },
  readFileSync(path, encoding) {
    const resolved = pathOf(path)
    const bytes = get(resolved, encoding)
    const hook = readHooks.get(resolved)
    if (hook) {
      readHooks.delete(resolved)
      hook()
    }
    return bytes
  },
  mkdirSync(path) {
    addDir(pathOf(path))
  },
  writeFileSync(path, bytes) {
    calls.push(['write', pathOf(path)])
    put(path, bytes)
  },
  renameSync(from, to) {
    from = pathOf(from)
    const rawTo = String(to)
    if (links.has(rawTo)) links.delete(rawTo) // POSIX rename(2): 最终组件是链接 → 替换链接
    to = pathOf(to)
    if (!files.has(from)) throw new Error(`ENOENT ${from}`)
    calls.push(['rename', to])
    put(to, files.get(from))
    files.delete(from)
    if (to.endsWith(journalSuffix) && onJournalRenamed) {
      const hook = onJournalRenamed
      onJournalRenamed = null
      hook()
    }
  },
  unlinkSync(path) {
    if (!files.delete(pathOf(path))) throw new Error(`ENOENT ${path}`)
  },
  rmSync(path, options) {
    path = pathOf(path)
    files.delete(path)
    if (options?.recursive)
      for (const key of [...files.keys()]) if (key.startsWith(`${path}/`)) files.delete(key)
  },
  openSync(path) {
    pathOf(path)
    return 123
  },
  closeSync() {},
  fsyncSync() {},
  lstatSync(path) {
    pathOf(path)
    return { isSymbolicLink: () => links.has(String(path)) }
  },
}
const originals = {}
function installVirtualFs() {
  for (const [name, replacement] of Object.entries(replacements)) {
    originals[name] = fs[name]
    fs[name] = replacement
  }
  syncBuiltinESMExports()
}
function restoreVirtualFs() {
  for (const [name, original] of Object.entries(originals)) fs[name] = original
  syncBuiltinESMExports()
}
/** 每例全新虚拟仓;calls 供断言后按需复位。 */
function freshRepo(name) {
  files = new Map()
  links.clear()
  readHooks.clear()
  onJournalRenamed = null
  calls = []
  const repo = `/virtual/${name}`
  dirs.add(repo)
  return repo
}
const outsideWrites = () => calls.filter(([, path]) => path.startsWith('/virtual-outside/'))

// ── 真实迁移链 fixture ──
const file = 'content/items.json'
const before = [{ id: 'a', name: 'old', desc: [], buyPrice: 50, sellPrice: 25, sellable: true }]
const upstream = [{ ...before[0], buyPrice: 60 }]
const baseSnap = snapshotOf({ files: new Map([[file, before]]), managedFiles: new Set([file]) })
const theirsSnap = snapshotOf({ files: new Map([[file, upstream]]), managedFiles: new Set([file]) })
function putProject(repo, value) {
  put(`${repo}/projects/pal/${file}`, serializeMigrationJson(value, file))
}
function preloadBaselines(repo, next) {
  for (const [path, content] of baselineWrites(next)) put(`${repo}/${path}`, content)
}

// ── census 材料(真实 fs 只读;paren 平衡扫描为启发式,结论按 file:line 列出可复核) ──
const CENSUS_EXTS = /\.(ts|mts|mjs)$/
function walkCensusFiles() {
  const out = []
  const roots = [
    'packages/content/src',
    'packages/editor/src',
    'packages/game/src',
    'packages/migrate/src',
    'packages/pal-extract/src',
    'packages/reforge/src',
    'packages/shared/src',
    'scripts',
    'docs/ops/audits/pre-e2e',
  ]
  const walk = (rel) => {
    let entries
    try {
      entries = real.readdirSync(new URL(rel, root), { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const child = `${rel}/${entry.name}`
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue
        walk(child)
      } else if (CENSUS_EXTS.test(entry.name)) out.push(child)
    }
  }
  for (const r of roots) walk(r)
  return out
}
function scanSymbolCalls(text, symbol) {
  const out = []
  const needle = `${symbol}(`
  let idx = 0
  while ((idx = text.indexOf(needle, idx)) !== -1) {
    if (idx > 0 && /[\w$.]/.test(text[idx - 1])) {
      idx += needle.length
      continue
    }
    // 跳过函数定义本身(export function symbol(...)
    const before = text.slice(Math.max(0, idx - 24), idx)
    if (/\bfunction\s*\*?\s*$/.test(before)) {
      idx += needle.length
      continue
    }
    let depth = 0
    let i = idx + needle.length - 1
    const start = i + 1
    for (; i < text.length; i++) {
      if (text[i] === '(') depth++
      else if (text[i] === ')') {
        depth--
        if (depth === 0) break
      }
    }
    out.push({ line: text.slice(0, idx).split('\n').length, block: text.slice(start, i) })
    idx = i
  }
  return out
}
const classify = (path) =>
  path.endsWith('.pal.test.ts')
    ? 'pal-test'
    : /\.test\.ts$/.test(path) || /\.test\.mts$/.test(path)
      ? 'test'
      : path.startsWith('scripts/')
        ? 'scripts'
        : path.startsWith('docs/')
          ? 'docs'
          : 'production'
const censusCache = new Map()
function censusCalls(symbol) {
  if (!censusCache.has(symbol)) {
    const rows = []
    for (const path of walkCensusFiles()) {
      const text = real.readFileSync(new URL(path, root), 'utf8')
      for (const call of scanSymbolCalls(text, symbol))
        rows.push({ path, line: call.line, block: call.block, kind: classify(path) })
    }
    censusCache.set(symbol, rows)
  }
  return censusCache.get(symbol)
}

// ── battle 正控材料(启动时真实 fs 只读装载) ──
const palEnemies = JSON.parse(readReal('projects/pal/content/enemies.json'))

installVirtualFs()
try {
  assert.equal(typeof globalThis.indexedDB, 'undefined')

  // ── E01 无并发修改正控:真实 planner→snapshot→changes→commit 全链 ──
  if (want('E01')) {
    const repo = freshRepo('e01')
    putProject(repo, before)
    const ours = loadProjectMigrationSnapshot(repo, new Set([file]))
    const plan = createMigrationPlan(baseSnap, ours, theirsSnap)
    assertProjectSnapshotCurrent(repo, ours, theirsSnap.managedFiles)
    const changes = buildMigrationTransactionChanges({
      repo,
      plan,
      previousBaseline: baseSnap,
      nextBaseline: theirsSnap,
    })
    const projectChange = changes.find((c) => c.scope === 'project')
    const journalExisted = hasPendingMigrationTransaction(repo)
    commitMigrationTransaction(repo, changes)
    const finalText = get(`${repo}/projects/pal/${file}`, 'utf8')
    const baselineOk = [...baselineWrites(theirsSnap).keys()].every((path) =>
      files.has(`${repo}/${path}`),
    )
    const journalCleaned = !hasPendingMigrationTransaction(repo)
    const hashOk =
      projectChange?.content !== undefined &&
      sha256(Buffer.from(finalText, 'utf8')) === sha256(projectChange.content)
    const order = calls.map(([, path]) =>
      path.includes('/stage/')
        ? 'stage'
        : path.endsWith(journalSuffix) || path.endsWith(`${journalSuffix}.tmp`)
          ? 'journal'
          : path.startsWith(`${repo}/packages/migrate/baselines/`)
            ? 'baseline'
            : 'project',
    )
    if (MODE === 'contract') {
      assert.equal(plan.writes.size, 1, 'E01: 计划唯一写入 items.json')
      assert.equal(plan.deletes.length, 0)
      assert.equal(plan.conflicts.length, 0)
      assert.equal(journalExisted, false, 'E01: 提交前无残留事务')
      assert.equal(JSON.parse(finalText)[0].buyPrice, 60, 'E01: 目标落盘为 upstream')
      assert.equal(hashOk, true, 'E01: 落盘字节与事务内容 hash 对应')
      assert.equal(baselineOk, true, 'E01: baseline 全部落盘(含 _state)')
      assert.equal(journalCleaned, true, 'E01: 提交后 journal 清理')
      assert.ok(
        order.indexOf('journal') > -1 && order.indexOf('project') > order.indexOf('journal'),
        'E01: staging→journal→目标写顺序',
      )
    }
    note(
      'E01',
      'covered',
      `无并发正控:plan(writes=${plan.writes.size}/deletes=${plan.deletes.length}/conflicts=${plan.conflicts.length}) changes=${changes.length} hash对应=${hashOk} baseline齐=${baselineOk} journal清理=${journalCleaned} 顺序=${order.filter((x) => x !== 'stage').join('→')}（真实 snapshotOf/loadProjectMigrationSnapshot/createMigrationPlan/assertProjectSnapshotCurrent/buildMigrationTransactionChanges/commitMigrationTransaction 全链）`,
    )
  }

  // ── E02 快照复核之后、journal 采样之前作者修改(A-08 窗口,原树特征) ──
  if (want('E02')) {
    const repo = freshRepo('e02')
    putProject(repo, before)
    preloadBaselines(repo, theirsSnap)
    const ours = loadProjectMigrationSnapshot(repo, new Set([file]))
    const plan = createMigrationPlan(baseSnap, ours, theirsSnap)
    assertProjectSnapshotCurrent(repo, ours, theirsSnap.managedFiles)
    putProject(repo, [{ ...before[0], name: 'AUTHOR_SAVED_AFTER_CHECK' }]) // 复核后、采样前的作者写入
    const changes = buildMigrationTransactionChanges({
      repo,
      plan,
      previousBaseline: baseSnap,
      nextBaseline: theirsSnap,
    })
    commitMigrationTransaction(repo, changes)
    const finalText = get(`${repo}/projects/pal/${file}`, 'utf8')
    const authorEditLost = !finalText.includes('AUTHOR_SAVED_AFTER_CHECK')
    if (MODE === 'contract') {
      assert.equal(
        authorEditLost,
        false,
        'E02 正确合同: 复核后采样前的作者修改不得被事务静默覆盖(应检出冲突或保留)',
      )
    }
    note(
      'E02',
      'reproduced',
      `A-08 窗口:assertProjectSnapshotCurrent 通过后作者改名,build/commit 未检出 → authorEditLost=${authorEditLost} final=${JSON.parse(finalText)[0].name}（原树错误特征:写操作 previousHash 在 staging 时才采样,采样前窗口无守卫;正确合同 contract 红）`,
    )
  }

  // ── E03 journal 已建立后的修改:真实提交窗守卫正控 ──
  if (want('E03')) {
    const repo = freshRepo('e03')
    putProject(repo, before)
    preloadBaselines(repo, theirsSnap)
    const ours = loadProjectMigrationSnapshot(repo, new Set([file]))
    const plan = createMigrationPlan(baseSnap, ours, theirsSnap)
    assertProjectSnapshotCurrent(repo, ours, theirsSnap.managedFiles)
    const changes = buildMigrationTransactionChanges({
      repo,
      plan,
      previousBaseline: baseSnap,
      nextBaseline: theirsSnap,
    })
    let journalEstablished = false
    onJournalRenamed = () => {
      journalEstablished = true
      putProject(repo, [{ ...before[0], name: 'AUTHOR_AFTER_JOURNAL' }]) // journal 落盘后、apply 前
    }
    let commitError = ''
    try {
      commitMigrationTransaction(repo, changes)
    } catch (error) {
      commitError = String(error.message)
    }
    const finalText = get(`${repo}/projects/pal/${file}`, 'utf8')
    const authorKept = finalText.includes('AUTHOR_AFTER_JOURNAL')
    const pendingAfterThrow = hasPendingMigrationTransaction(repo)
    let recoverError = ''
    try {
      recoverMigrationTransaction(repo)
    } catch (error) {
      recoverError = String(error.message)
    }
    const authorKeptAfterRecover = get(`${repo}/projects/pal/${file}`, 'utf8').includes(
      'AUTHOR_AFTER_JOURNAL',
    )
    if (MODE === 'contract') {
      assert.equal(journalEstablished, true, 'E03: 注入点确在 journal 落盘后(见证)')
      assert.ok(commitError.includes('提交窗口被修改'), `E03: 提交窗守卫应拒绝,实际 ${commitError}`)
      assert.equal(authorKept, true, 'E03: 作者内容未被覆盖')
      assert.equal(pendingAfterThrow, true, 'E03: 中止后 journal 保留待恢复')
      assert.ok(
        recoverError.includes('提交窗口被修改'),
        `E03: 恢复路径同等复核,实际 ${recoverError}`,
      )
      assert.equal(authorKeptAfterRecover, true, 'E03: 恢复拒绝后作者内容仍在')
    }
    note(
      'E03',
      'covered',
      `journal 后修改:commit 抛「${commitError}」作者内容保留=${authorKept}→恢复复跑同拒(${recoverError.slice(0, 24)}…)后保留=${authorKeptAfterRecover} pending=${pendingAfterThrow}（真实守卫 migration-transaction.ts:210-215 assertPreviousTarget;与 E02 采样前窗口=两个保护阶段分栏）`,
    )
  }

  // ── E04 新建/修改/删除计划 precondition 来源与失败边界 ──
  if (want('E04')) {
    // (a) 三类计划一次真实链:modify(items)/create(new.json)/delete(old.json)
    const repo = freshRepo('e04a')
    const oldFile = 'content/old.json'
    const newFile = 'content/new.json'
    put(`${repo}/projects/pal/${oldFile}`, serializeMigrationJson([{ gone: true }], oldFile))
    putProject(repo, before)
    const base3 = {
      files: new Map([
        [file, before],
        [oldFile, [{ gone: true }]],
      ]),
      managedFiles: new Set([file, oldFile]),
    }
    const theirs3 = {
      files: new Map([
        [file, upstream],
        [newFile, [{ fresh: true }]],
      ]),
      managedFiles: new Set([file, newFile]),
    }
    preloadBaselines(repo, theirs3)
    const ours3 = loadProjectMigrationSnapshot(repo, base3.managedFiles)
    const plan3 = createMigrationPlan(base3, ours3, theirs3)
    assertProjectSnapshotCurrent(repo, ours3, theirs3.managedFiles)
    const changes3 = buildMigrationTransactionChanges({
      repo,
      plan: plan3,
      previousBaseline: base3,
      nextBaseline: theirs3,
    })
    commitMigrationTransaction(repo, changes3)
    const created = files.has(`${repo}/projects/pal/${newFile}`)
    const deleted = !files.has(`${repo}/projects/pal/${oldFile}`)
    const modified = JSON.parse(get(`${repo}/projects/pal/${file}`, 'utf8'))[0].buyPrice === 60
    // (b) retiredAsset 删除:expectedPreviousHash 预检在 staging 前失配 → 零写入零 journal
    const repo2 = freshRepo('e04b')
    const binPath = 'assets/migrated/x.bin'
    put(`${repo2}/projects/pal/${binPath}`, 'AAA')
    calls = []
    let retireError = ''
    try {
      commitMigrationTransaction(repo2, [
        {
          target: `projects/pal/${binPath}`,
          scope: 'project',
          expectedPreviousHash: sha256('BBB'),
        },
      ])
    } catch (error) {
      retireError = String(error.message)
    }
    const retireWrites = calls.length
    const retirePending = hasPendingMigrationTransaction(repo2)
    const retireFileKept = files.has(`${repo2}/projects/pal/${binPath}`)
    // (c) journal 后修改"待删除目标" → 删除窗守卫拒绝,作者内容保留
    const repo3 = freshRepo('e04c')
    put(`${repo3}/projects/pal/${oldFile}`, serializeMigrationJson([{ gone: true }], oldFile))
    preloadBaselines(repo3, { files: new Map(), managedFiles: new Set() })
    const baseDel = {
      files: new Map([[oldFile, [{ gone: true }]]]),
      managedFiles: new Set([oldFile]),
    }
    const theirsDel = { files: new Map(), managedFiles: new Set() }
    const oursDel = loadProjectMigrationSnapshot(repo3, baseDel.managedFiles)
    const planDel = createMigrationPlan(baseDel, oursDel, theirsDel)
    const changesDel = buildMigrationTransactionChanges({
      repo: repo3,
      plan: planDel,
      previousBaseline: baseDel,
      nextBaseline: theirsDel,
    })
    assert.equal(
      changesDel.filter((c) => c.content === undefined).length,
      1,
      'E04: 删除规划进入事务',
    )
    onJournalRenamed = () => {
      put(
        `${repo3}/projects/pal/${oldFile}`,
        serializeMigrationJson([{ gone: true, author: 'TOUCHED' }], oldFile),
      )
    }
    let deleteWindowError = ''
    try {
      commitMigrationTransaction(repo3, changesDel)
    } catch (error) {
      deleteWindowError = String(error.message)
    }
    const deleteAuthorKept =
      JSON.parse(get(`${repo3}/projects/pal/${oldFile}`, 'utf8'))[0].author === 'TOUCHED'
    if (MODE === 'contract') {
      assert.ok(created && deleted && modified, 'E04: create/delete/modify 三类计划真实落盘')
      assert.ok(
        retireError.includes('已偏离规划快照'),
        `E04: retired 预检应失配拒绝,实际 ${retireError}`,
      )
      assert.equal(retireWrites, 0, 'E04: 预检失败零写入(staging 前)')
      assert.equal(retirePending, false, 'E04: 预检失败不建 journal')
      assert.equal(retireFileKept, true, 'E04: 预检失败目标文件原样')
      assert.ok(
        deleteWindowError.includes('提交窗口被修改'),
        `E04: 删除窗守卫应拒绝,实际 ${deleteWindowError}`,
      )
      assert.equal(deleteAuthorKept, true, 'E04: 删除窗守卫保留作者内容')
    }
    note(
      'E04',
      'covered',
      `三类计划:created=${created} deleted=${deleted} modified=${modified};retired 失配→「${retireError}」零写入=${retireWrites === 0} journal=${retirePending} 文件保留=${retireFileKept};删除窗(journal后作者改待删文件)→「${deleteWindowError}」作者保留=${deleteAuthorKept}（precondition 来源分栏:retired=expectedPreviousHash staging 前预检 :293-302;写/删=previousHash staging 采样+apply 复核 :331/:210-215）`,
    )
  }

  // ── E05 无 symlink 物化正控 + authored 跳过 + hash 校验边界 ──
  if (want('E05')) {
    const repo = freshRepo('e05')
    const newBytes = Buffer.from('CLEAN-NEW')
    const sameBytes = Buffer.from('SAME-AS-DISK')
    const authoredBytes = Buffer.from('AUTHORED-KEEP')
    const rec = (path, bytes, origin) => ({
      kind: 'video',
      path,
      mediaType: 'video/mp4',
      bytes: bytes.length,
      sha256: sha256(bytes),
      origin,
    })
    put(`${repo}/projects/pal/assets/migrated/same.bin`, sameBytes) // 已存在且一致 → unchanged
    put(`${repo}/projects/pal/assets/authored/keep.bin`, authoredBytes) // authored 在盘 → 只验证不复制
    calls = []
    const report = materializePalAssets({
      repo,
      catalog: {
        version: 1,
        assets: {
          'video.new': rec('assets/migrated/new.bin', newBytes, { kind: 'legacy-migrated' }),
          'video.same': rec('assets/migrated/same.bin', sameBytes, { kind: 'legacy-migrated' }),
          'video.authored': rec('assets/authored/keep.bin', authoredBytes, { kind: 'authored' }),
        },
      },
      binaries: [
        {
          id: 'video.new',
          record: rec('assets/migrated/new.bin', newBytes, { kind: 'legacy-migrated' }),
          bytes: newBytes,
        },
        {
          id: 'video.same',
          record: rec('assets/migrated/same.bin', sameBytes, { kind: 'legacy-migrated' }),
          bytes: sameBytes,
        },
        {
          // 作者接管:同 AssetId 提供 source 但 origin 已翻 authored → 只验盘不复制
          id: 'video.authored',
          record: rec('assets/authored/keep.bin', authoredBytes, { kind: 'authored' }),
          bytes: authoredBytes,
        },
      ],
    })
    const newOnDisk = get(`${repo}/projects/pal/assets/migrated/new.bin`, 'utf8')
    const authoredUntouched = calls.every(([, path]) => !path.includes('assets/authored/keep.bin'))
    // 坏源对照:bytes 与 record.sha256 不符 → 全量预检抛错,零写入(pal-assets.ts:1211 预检先于首写)
    const repo2 = freshRepo('e05bad')
    calls = []
    let badError = ''
    try {
      materializePalAssets({
        repo: repo2,
        catalog: {
          version: 1,
          assets: {
            'video.bad': rec('assets/migrated/bad.bin', newBytes, { kind: 'legacy-migrated' }),
          },
        },
        binaries: [
          {
            id: 'video.bad',
            record: rec('assets/migrated/bad.bin', newBytes, { kind: 'legacy-migrated' }),
            bytes: Buffer.from('TAMPERED'),
          },
        ],
      })
    } catch (error) {
      badError = String(error.message)
    }
    const badWrites = calls.length
    if (MODE === 'contract') {
      assert.equal(newOnDisk, 'CLEAN-NEW', 'E05: 迁移资源真实物化落盘')
      assert.equal(report.written, 1, 'E05: 仅缺失者写入')
      assert.equal(report.unchanged, 1, 'E05: 已一致者跳过')
      assert.equal(report.authored, 1, 'E05: authored 计数且不复制')
      assert.equal(authoredUntouched, true, 'E05: authored 路径零写入(仅 assertBytes 验证)')
      assert.ok(
        badError.includes('bytes/hash 与 catalog 记录不符'),
        `E05: 坏源预检应拒绝,实际 ${badError}`,
      )
      assert.equal(badWrites, 0, 'E05: 坏源拒绝发生在任何写入之前(零写入)')
    }
    note(
      'E05',
      'covered',
      `真实 materializePalAssets:written=${report.written} unchanged=${report.unchanged} authored=${report.authored} files=${report.files} authored零写入=${authoredUntouched};坏源→「${badError}」零写入=${badWrites === 0}（authored 跳过 :1241-1243;一致跳过 :1247-1252;预检先于首写 :1211/:1226）`,
    )
  }

  // ── E06 目标父目录 symlink(A-09 原树特征:写入逃出仓库) ──
  if (want('E06')) {
    const repo = freshRepo('e06')
    links.set(`${repo}/projects/pal/assets/migrated/videos`, '/virtual-outside/videos')
    const bytes = Buffer.from('NEW')
    const record = {
      kind: 'video',
      path: 'assets/migrated/videos/a.mp4',
      mediaType: 'video/mp4',
      bytes: bytes.length,
      sha256: sha256(bytes),
      origin: { kind: 'legacy-migrated' },
    }
    put('/virtual-outside/videos/a.mp4', 'OUTSIDE_ORIGINAL')
    calls = []
    const result = materializePalAssets({
      repo,
      catalog: { version: 1, assets: { 'video.a': record } },
      binaries: [{ id: 'video.a', record, bytes }],
    })
    const outsideFinal = get('/virtual-outside/videos/a.mp4', 'utf8')
    if (MODE === 'contract') {
      assert.deepEqual(
        outsideWrites(),
        [],
        'E06 正确合同: 物化必须在首笔二进制写入前拒绝经符号链接逃出仓库的目标',
      )
    }
    note(
      'E06',
      'reproduced',
      `A-09 复现:父目录链接→outsideFinal=${outsideFinal}(原 OUTSIDE_ORIGINAL 被覆盖) written=${result.written} outsideWrites=${outsideWrites().length}笔（pal-assets.ts 物化路径无 assertNoSymlinkPath;真实链复跑与 Codex 见证一致）`,
    )
  }

  // ── E07 多层父链/目标文件自身链接/检查-写入间链接变化 ──
  if (want('E07')) {
    const mkRec = (path, bytes) => ({
      kind: 'video',
      path,
      mediaType: 'video/mp4',
      bytes: bytes.length,
      sha256: sha256(bytes),
      origin: { kind: 'legacy-migrated' },
    })
    // (a) 多层父链:projects 整段链接到别处 → 逃逸随深度放大
    const repoA = freshRepo('e07a')
    links.set(`${repoA}/projects`, '/virtual/elsewhere')
    const bytesA = Buffer.from('DEEP')
    calls = []
    materializePalAssets({
      repo: repoA,
      catalog: { version: 1, assets: { 'video.deep': mkRec('assets/migrated/deep.bin', bytesA) } },
      binaries: [
        { id: 'video.deep', record: mkRec('assets/migrated/deep.bin', bytesA), bytes: bytesA },
      ],
    })
    const deepOutside = calls.filter(([, path]) => path.startsWith('/virtual/elsewhere/'))
    // (b) 目标文件自身是链接:POSIX rename(2) 替换链接本身,不穿透 → 仓库外文件不被触碰
    const repoB = freshRepo('e07b')
    const bytesB = Buffer.from('SELF')
    const recB = mkRec('assets/migrated/self.bin', bytesB)
    links.set(`${repoB}/projects/pal/assets/migrated/self.bin`, '/virtual-outside/self-target.bin')
    put('/virtual-outside/self-target.bin', 'OUTSIDE_ORIGINAL')
    calls = []
    const reportB = materializePalAssets({
      repo: repoB,
      catalog: { version: 1, assets: { 'video.self': recB } },
      binaries: [{ id: 'video.self', record: recB, bytes: bytesB }],
    })
    const selfOutsideFinal = get('/virtual-outside/self-target.bin', 'utf8')
    const linkReplaced = !links.has(`${repoB}/projects/pal/assets/migrated/self.bin`)
    const selfInRepo = files.has(`${repoB}/projects/pal/assets/migrated/self.bin`)
    // (c) 检查-写入间链接变化(unchanged 读检查后、写之前挂上父链接 → TOCTOU 逃逸)
    const repoC = freshRepo('e07c')
    const bytesC = Buffer.from('RACE')
    const recC = mkRec('assets/migrated/race.bin', bytesC)
    put(`${repoC}/projects/pal/assets/migrated/race.bin`, 'STALE-DIFFERENT') // 与目标不一致 → 走写入路径
    calls = []
    readHooks.set(`${repoC}/projects/pal/assets/migrated/race.bin`, () => {
      links.set(`${repoC}/projects/pal/assets/migrated`, '/virtual-outside/raced')
    })
    materializePalAssets({
      repo: repoC,
      catalog: { version: 1, assets: { 'video.race': recC } },
      binaries: [{ id: 'video.race', record: recC, bytes: bytesC }],
    })
    const raceOutside = calls.filter(([, path]) => path.startsWith('/virtual-outside/raced'))
    if (MODE === 'contract') {
      assert.deepEqual(deepOutside, [], 'E07 正确合同: 多层父链写入不得逃出仓库')
      assert.deepEqual(raceOutside, [], 'E07 正确合同: 检查与写入之间链接变化必须被拒/复核')
    }
    note(
      'E07',
      'reproduced',
      `多层父链→/virtual/elsewhere 落笔 ${deepOutside.length} 笔(逃逸);自身链接→POSIX rename 替换链接(外文件=${selfOutsideFinal} 未动,链接清除=${linkReplaced},仓库内真实文件=${selfInRepo},written=${reportB.written};虚拟层 rename 语义已按 POSIX 披露);unchanged 检查后挂链接→/virtual-outside/raced 落笔 ${raceOutside.length} 笔(TOCTOU,:1247-1259 无复核)`,
    )
  }

  // ── E08 symlink 拒绝是否先于首笔二进制写入 + JSON 事务层兜底域 ──
  if (want('E08')) {
    // (a) 物化器:链接从一开始就存在 → 原树无任何拒绝,首笔即二进制写逃逸
    const repo = freshRepo('e08')
    links.set(`${repo}/projects/pal/assets/migrated/videos`, '/virtual-outside/videos')
    const bytes = Buffer.from('FIRST')
    const record = {
      kind: 'video',
      path: 'assets/migrated/videos/a.mp4',
      mediaType: 'video/mp4',
      bytes: bytes.length,
      sha256: sha256(bytes),
      origin: { kind: 'legacy-migrated' },
    }
    calls = []
    let matError = ''
    try {
      materializePalAssets({
        repo,
        catalog: { version: 1, assets: { 'video.a': record } },
        binaries: [{ id: 'video.a', record, bytes }],
      })
    } catch (error) {
      matError = String(error.message)
    }
    const firstWrite = calls.find(([kind]) => kind === 'write' || kind === 'rename')?.[1] ?? null
    const firstWriteOutside = firstWrite?.startsWith('/virtual-outside/') ?? false
    // (b) JSON 事务层:同一目标经 commitMigrationTransaction → assertNoSymlinkPath 拒绝,且先于 journal 与目标写
    const repo2 = freshRepo('e08json')
    links.set(`${repo2}/projects/pal/content`, '/virtual-outside/content')
    putProject(repo2, before)
    calls = []
    let jsonError = ''
    try {
      commitMigrationTransaction(repo2, [
        {
          target: `projects/pal/${file}`,
          scope: 'project',
          content: serializeMigrationJson(upstream, file),
        },
      ])
    } catch (error) {
      jsonError = String(error.message)
    }
    const jsonProjectWrites = calls.filter(([, path]) => path.startsWith(`${repo2}/projects/`))
    const jsonJournal = hasPendingMigrationTransaction(repo2)
    const stageWrites = calls.filter(([, path]) => path.includes('/stage/'))
    if (MODE === 'contract') {
      assert.ok(jsonError.includes('不得经过符号链接'), `E08: JSON 层守卫应拒绝,实际 ${jsonError}`)
      assert.equal(jsonProjectWrites.length, 0, 'E08: JSON 层拒绝先于目标写')
      assert.equal(jsonJournal, false, 'E08: JSON 层拒绝先于 journal 落盘')
      assert.equal(
        firstWriteOutside,
        false,
        'E08 正确合同: 物化器的 symlink 拒绝必须发生在首笔二进制写入之前',
      )
    }
    note(
      'E08',
      'reproduced',
      `物化器:无拒绝(matError=${matError || '无'}) 首笔=${firstWrite} 逃逸=${firstWriteOutside};JSON 事务层:同目标→「${jsonError}」目标写=${jsonProjectWrites.length} journal=${jsonJournal} staging笔=${stageWrites.length}（分栏:assertNoSymlinkPath 只护 journal 操作 migration-transaction.ts:75-82,不前置保护 pal-assets 二进制直写——两层不同链路,后者无兜底）`,
    )
  }

  restoreVirtualFs()

  // ── E09 CreateBattleInput.enemies(v11 dense 兼容入口)全 caller census + 真实等价正控 ──
  if (want('E09')) {
    // 同名异符号分栏:game 包一阶段有自己的 createBattleState(battle-state.ts:809,
    // CreateBattleStateInput),其 enemies 是合法正参,不计入 reforge dense 退役 census。
    const all9 = censusCalls('createBattleState')
    const sameNameGame = all9.filter((c) => c.path.startsWith('packages/game/'))
    const calls9 = all9.filter((c) => !c.path.startsWith('packages/game/'))
    const rows = calls9.map((c) => ({
      where: `${c.path}:${c.line}`,
      kind: c.kind,
      dense: /\benemies\s*:/.test(c.block),
      slots: /\benemySlots\s*:/.test(c.block),
    }))
    const denseProd = rows.filter((r) => r.dense && r.kind === 'production')
    const denseNonProd = rows.filter((r) => r.dense && r.kind !== 'production')
    const slotsProd = rows.filter((r) => r.slots && r.kind === 'production')
    // 真实等价正控:dense enemies 与 enemySlots 同输入建态一致(退役入口当前仍工作)
    const mkPlayer = (id) => ({
      roleId: id,
      actorTemplateId: id,
      hp: 999,
      maxHp: 999,
      mp: 999,
      maxMp: 999,
      attackStrength: 40,
      defense: 999,
      magicStrength: 20,
      baseDexterity: 1,
      skills: [],
      fleeRate: 20,
    })
    const enemy = palEnemies.find((e) => e.id === 'enemy-400')
    const denseState = createBattleState({ players: [mkPlayer('hero')], enemies: [enemy] })
    const slotState = createBattleState({ players: [mkPlayer('hero')], enemySlots: [enemy] })
    const equivalent =
      denseState.enemies.length === slotState.enemies.length &&
      denseState.enemies[0].def.id === slotState.enemies[0].def.id
    if (MODE === 'contract') {
      assert.ok(calls9.length > 0, 'E09: census 必须扫描到真实调用点')
      assert.equal(equivalent, true, 'E09: dense 入口与 enemySlots 同输入等价(兼容入口仍工作)')
      assert.equal(
        denseProd.length,
        0,
        `E09: 生产侧应零 dense 调用(canonical main 传 enemySlots),实际 ${denseProd.map((r) => r.where).join(',')}`,
      )
    }
    note(
      'E09',
      'covered',
      `census:reforge 符号调用点 ${rows.length} 处(生产 ${rows.filter((r) => r.kind === 'production').length}/test ${rows.filter((r) => r.kind === 'test').length}/pal-test ${rows.filter((r) => r.kind === 'pal-test').length}/docs探针 ${rows.filter((r) => r.kind === 'docs').length});dense=${denseProd.length + denseNonProd.length} 处全部非生产[前5处 ${denseNonProd
        .slice(0, 5)
        .map((r) => r.where)
        .join(
          ' ',
        )} 等];生产 enemySlots=${slotsProd.length} 处[${slotsProd.map((r) => r.where).join(' ')}];同名异符号=game 包 createBattleState ${sameNameGame.length} 处(battle-state.ts:809 一阶段 API,enemies 为合法正参,不属本退役域);真实等价=${equivalent}（定义 battle-core.ts:293-296 @deprecated;语义保留草案:enemySlots null=源空洞,dense 无法表达空洞,迁移=逐 caller 改传 slots 并保断言）`,
    )
  }

  // ── E10 buildThrowItem 旧 targetIdx/damage 入口 census + 真实等价正控 ──
  if (want('E10')) {
    const calls10 = censusCalls('buildThrowItem')
    const rows = calls10.map((c) => ({
      where: `${c.path}:${c.line}`,
      kind: c.kind,
      hits: /\bhits\s*:/.test(c.block),
      targetIdx: /\btargetIdx\s*:/.test(c.block),
    }))
    const oldProd = rows.filter((r) => r.targetIdx && r.kind === 'production')
    const oldNonProd = rows.filter((r) => r.targetIdx && r.kind !== 'production')
    const frames = {
      idle: 0,
      dying: 1,
      dead: 2,
      defend: 3,
      hurt: 4,
      preMagic: 6,
      magic: 7,
      attackWindup: 8,
      attackRush: 9,
      attackStrike: 10,
    }
    const viaHits = buildThrowItem({
      casterFrames: frames,
      casterIdx: 0,
      hits: [{ idx: 2, damage: 50 }],
    })
    const viaOld = buildThrowItem({ casterFrames: frames, casterIdx: 0, targetIdx: 2, damage: 50 })
    const equivalent = JSON.stringify(viaHits) === JSON.stringify(viaOld)
    const multi = buildThrowItem({
      casterFrames: frames,
      casterIdx: 0,
      hits: [
        { idx: 1, damage: 0 },
        { idx: 2, damage: 7 },
      ],
    })
    if (MODE === 'contract') {
      assert.ok(calls10.length > 0, 'E10: census 必须扫描到真实调用点')
      assert.equal(equivalent, true, 'E10: targetIdx/damage 与 hits 单目标逐帧等价(替换计划可 1:1)')
      assert.ok(multi.length > 0, 'E10: hits 多目标能力真实可用(旧入口不可表达)')
      assert.equal(
        oldProd.length,
        0,
        `E10: 生产侧应零旧入口调用,实际 ${oldProd.map((r) => r.where).join(',')}`,
      )
    }
    note(
      'E10',
      'covered',
      `census:调用点 ${rows.length} 处;旧 targetIdx=${oldProd.length + oldNonProd.length} 处全部非生产[${oldNonProd.map((r) => r.where).join(' ')}];hits 使用 ${rows.filter((r) => r.hits).length} 处;真实等价(单目标逐帧 deepEqual)=${equivalent},hits 多目标=${multi.length} 帧（定义 battle-anim.ts:517-538;替换计划=原断言全部保留,仅入口换 hits 同值）`,
    )
  }

  // ── E11 translate-events 历史输出选项与当前 PAL producer 分栏 ──
  if (want('E11')) {
    const files11 = walkCensusFiles()
    const legacyRows = []
    for (const path of files11) {
      const text = real.readFileSync(new URL(path, root), 'utf8')
      const lines = text.split('\n')
      lines.forEach((line, i) => {
        if (
          /palReferenceSchema\s*[:=]\s*'legacy'/.test(line) ||
          /palSemanticProfile\s*[:=]\s*'historical-r13-4'/.test(line)
        )
          legacyRows.push({ where: `${path}:${i + 1}`, kind: classify(path) })
      })
    }
    const legacyProd = legacyRows.filter((r) => r.kind === 'production')
    const translateEvents = real.readFileSync(
      new URL('packages/migrate/src/translate-events.ts', root),
      'utf8',
    )
    const anchors = {
      options:
        /palSemanticProfile\?: 'historical-r13-4' \| 'current-r13-6a' \| 'current-r13-6b'/.test(
          translateEvents,
        ),
      refSchema: /palReferenceSchema\?: 'legacy' \| 'stable-id'/.test(translateEvents),
      oldStartBattle: translateEvents.includes("ctx.palReferenceSchema === 'legacy'"),
      stableDefault: translateEvents.includes("ctx.palReferenceSchema === 'stable-id'"),
    }
    const palMigration = real.readFileSync(
      new URL('packages/migrate/src/pal-migration.ts', root),
      'utf8',
    )
    const producerFixed =
      /palSemanticProfile = 'current-r13-6b' as const/.test(palMigration) &&
      (palMigration.match(/palReferenceSchema: 'stable-id'/g) ?? []).length >= 2
    if (MODE === 'contract') {
      assert.ok(
        anchors.options && anchors.refSchema,
        'E11: 选项定义锚点在位(translate-events.ts:200/204)',
      )
      assert.ok(anchors.oldStartBattle && anchors.stableDefault, 'E11: 旧输出分支在位(:1793/:1932)')
      assert.ok(
        producerFixed,
        'E11: 当前 PAL producer 固定 current-r13-6b + stable-id(pal-migration.ts:391/416/499)',
      )
      assert.equal(
        legacyProd.length,
        0,
        `E11: 生产侧应零 legacy/historical 显式选择,实际 ${legacyProd.map((r) => r.where).join(',')}`,
      )
    }
    note(
      'E11',
      'covered',
      `选项分栏:选项定义在位=${anchors.options && anchors.refSchema};旧输出分支(startBattle team 数字/jumpIfPlayerInParty legacy)=${anchors.oldStartBattle};显式 legacy/historical 选择 ${legacyRows.length} 处全部非生产[${legacyRows.map((r) => r.where).join(' ')}];producer 固定 6b+stable-id=${producerFixed};经手层 migrate-content.ts:1489/1746/2063/2556 仅透传 options（结论:历史选项无获准生产调用方;当前 producer 输入=提取 sources,输出=固定 stable-id canonical）`,
    )
  }

  // ── E12 不得删合同 + 删除候选最小白名单(不执行删除) ──
  if (want('E12')) {
    const keep = [
      {
        what: 'ScriptRef/来源地址审计链',
        where: 'translate-events.ts:2399-2429',
        why: 'P0 溯源合同:copyScriptStageSourceAddressAudit/structuredCloneWithScriptStageSourceAddressAudit/scriptStageSourceAddresses',
      },
      {
        what: 'contentVersion 校验',
        where: 'packages/reforge/src/save/current-codec.ts:64-74',
        why: '开发期 current-only 存档/manifest 版本门(非平台升级合同,不得按升级链归类退役)',
      },
      {
        what: 'palSemanticProfile 三态',
        where: 'translate-events.ts:200-203',
        why: 'current-r13-6a=默认迁移、6b=successor 时序证据,均为现行 producer 取值',
      },
    ]
    const readAnchor = (path) => {
      try {
        return real.readFileSync(new URL(path, root), 'utf8').length > 0
      } catch {
        return false
      }
    }
    const anchorsReadable =
      readAnchor('packages/migrate/src/translate-events.ts') &&
      readAnchor('packages/reforge/src/save/current-codec.ts')
    const candidates = [
      {
        symbol: 'CreateBattleInput.enemies',
        where: 'battle-core.ts:295-296',
        zeroProd: censusCalls('createBattleState').every(
          (c) =>
            c.path.startsWith('packages/game/') ||
            !(/\benemies\s*:/.test(c.block) && c.kind === 'production'),
        ),
        plan: 'census 复核零生产 dense 调用后删除字段与 :323 fallback;验证=reforge 定向 vitest + census 复跑零命中;enemySlots 空洞语义不动',
      },
      {
        symbol: 'BuildThrowItemInput.targetIdx/damage',
        where: 'battle-anim.ts:517-529',
        zeroProd: censusCalls('buildThrowItem').every(
          (c) => !(/\btargetIdx\s*:/.test(c.block) && c.kind === 'production'),
        ),
        plan: '调用方全部换 hits 同值(E10 已证逐帧等价);验证=battle-anim 定向 vitest 含多目标 hits;删后 census 零命中',
      },
      {
        symbol: "palReferenceSchema 'legacy' + historical-r13-4 旧输出分支",
        where: 'translate-events.ts:204,:1793-1796,:1932-1935',
        zeroProd: true,
        plan: '需先由用户裁决历史重放是否仍需 frozen-authority 重放通道;若裁决弃用,先改测试到 stable-id,再删选项与两分支;验证=migrate 全量定向 vitest',
      },
    ]
    if (MODE === 'contract') {
      assert.equal(keep.length, 3, 'E12: 保留合同清单在位')
      assert.equal(candidates.length, 3, 'E12: 删除候选=最小白名单 3 项,均未删除')
      assert.ok(
        candidates.every((c) => typeof c.zeroProd === 'boolean'),
        'E12: 每候选带零生产调用者判定',
      )
      assert.ok(anchorsReadable, 'E12: 保留项锚点文件可读')
    }
    note(
      'E12',
      'covered',
      `保留合同:${keep.map((k) => `${k.what}@${k.where}`).join(';')};删除候选(白名单,未删):${candidates.map((c) => `${c.symbol}@${c.where} 零生产=${c.zeroProd}`).join(';')};每候选附替换+验证计划（contentVersion=current-only 存档门非平台升级,已纠正归类;全部为候选,本批不批准不执行删除）`,
    )
  }

  console.log(`\nE组 ${MODE} 模式完成：${results.length} 条记录`)
} catch (error) {
  restoreVirtualFs()
  throw error
} finally {
  if (originals.writeFileSync) restoreVirtualFs()
}
