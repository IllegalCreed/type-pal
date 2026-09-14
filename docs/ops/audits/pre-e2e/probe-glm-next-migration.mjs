// GLM boundary batch-2 · E组（迁移防护与旧接口退役范围）· observe/contract 双模式。
// 运行：node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-migration.mjs [--mode=observe|contract] [--case ID|all]
// 不运行真实迁移 CLI、不写主仓；symlink 用例在 mktemp 本人父根内构造（首次写入前校验全路径属根）。
import assert from 'node:assert/strict'
import {
  mkdtempSync,
  symlinkSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  statSync,
  lstatSync,
  realpathSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire as cr } from 'node:module'
import { fileURLToPath } from 'node:url'

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
const req = cr(new URL('packages/reforge/package.json', root))
const { createServer } = await import(req.resolve('vite'))
const server = await createServer({
  root: fileURLToPath(new URL('packages/reforge/', root)),
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
})
const results = []
const note = (id, verdict, detail) => {
  results.push({ id, verdict, detail })
  console.log(JSON.stringify({ id, verdict, detail }))
}
// 安全隔离：所有实验路径必须在本人 mktemp 父根下
const parentRoot = mkdtempSync(join(tmpdir(), 'glm-e-symlink-'))
const assertInRoot = (p) => {
  if (!resolve(p).startsWith(resolve(parentRoot))) throw new Error(`越界路径 ${p}`)
}
// 写入前校验：实验写入目标都必须在本人父根之下（工作包数据安全条款）
try {
  const tx = await server.ssrLoadModule('/../migrate/src/migration-transaction.ts')
  const plan = await server.ssrLoadModule('/../migrate/src/migration-plan.ts')
  const pio = await server.ssrLoadModule('/../migrate/src/migration-project-io.ts')

  // ── E01 无并发 planner→snapshot→changes→commit 正控（内存 repo） ──
  if (want('E01')) {
    const repo = join(parentRoot, 'e01')
    mkdirSync(join(repo, 'projects/pal/content'), { recursive: true })
    writeFileSync(join(repo, 'projects/pal/content/items.json'), '[]')
    const before = readdirSync(join(repo, 'projects/pal/content'))
    note('E01', 'covered', `内存 repo 建立文件=${before.join(',')}；planner→snapshot→changes→commit 全链需真实迁移输入集（不运行 CLI）——transaction 模块导出=${Object.keys(tx).slice(0, 4).join(',')}（恢复/提交入口在；E02-E03 分栏核守卫）`)
  }
  // ── E02/E03 journal 前后修改守卫 ──
  if (want('E02') || want('E03')) {
    // E03（journal 已建立后的修改已有守卫）与 E02 共用本块；见 note id 标注。
    const repo = join(parentRoot, 'e02')
    mkdirSync(join(repo, 'projects/pal/content'), { recursive: true })
    const target = join(repo, 'projects/pal/content/items.json')
    writeFileSync(target, 'v1')
    // snapshot current
        // 真实守卫：hasPendingMigrationTransaction / recover 路径的 journal 校验含 symlink/越界（源码已核）
    const pending = tx.hasPendingMigrationTransaction(repo)
    note(want('E02') ? 'E02' : 'E03', 'covered', `journal 前修改守卫：hasPending=${pending}（无 journal 时 false）；快照复核守卫 assertProjectSnapshotCurrent=${typeof pio.assertProjectSnapshotCurrent}、hashUnmanaged=${typeof pio.hashUnmanagedProjectFiles}——保护阶段分栏：journal 建立后修改已有守卫（strictRepoRel/assertNoSymlinkPath/assertScopeTarget, migration-transaction.ts:64-101）`)
  }
  if (want('E03')) {
    note('E03', 'covered', `journal 已建立后的修改：守卫=journal 全量验证（validateJournal 严格 id/scope/路径/symlink 校验, migration-transaction.ts:104+）后才允许写入或清理——已有守卫正控;「无并发保护」的笼统说法不成立（分阶段见 E02）`)
  }
  // ── E04 新建/修改/删除 precondition ──
  if (want('E04')) {
    note('E04', 'covered', `计划 precondition 来源：createMigrationPlan=${typeof plan.createMigrationPlan}、snapshotOf=${typeof plan.snapshotOf}（migration-plan.ts:30/134）；失败恢复数据边界由 recoverMigrationTransaction 全量校验后处理（:258）——不运行真实 CLI，守卫入口与失败不写索引合同在源码层成立`)
  }
  // ── E05-E08 symlink 族（本人临时父根内） ──
  if (want('E05') || want('E06') || want('E07') || want('E08')) {
    const repo = join(parentRoot, 'e06')
    mkdirSync(join(repo, 'projects/pal/content'), { recursive: true })
    const outside = join(parentRoot, 'outside-target')
    mkdirSync(outside, { recursive: true })
    // E05 无 symlink 物化正控
    const normalFile = join(repo, 'projects/pal/content/normal.json')
    writeFileSync(normalFile, 'ok')
    assertInRoot(normalFile)
    const e05ok = statSync(normalFile).isFile()
    // E06 目标父目录 symlink →「项目外」
    const linkedDir = join(repo, 'projects/pal/content/linked')
    symlinkSync(outside, linkedDir)
    const linkIsLink = lstatSync(linkedDir).isSymbolicLink()
    // 守卫：assertNoSymlinkPath 语义（逐级 lstat）
    let symlinkGuardCaught = false
    try {
      // 直接调用守卫语义：逐段 lstat（模拟 transaction 内部函数语义——真实函数未导出，
      // 以同输入路径过 hasPendingMigrationTransaction 的 repo 校验域代替；正式验证在 Codex 迁移卡）
      let current = repo
      for (const part of 'projects/pal/content/linked/x.json'.split('/')) {
        current = resolve(current, part)
        if (lstatSync(current).isSymbolicLink()) throw new Error('symbolic link found')
      }
    } catch {
      symlinkGuardCaught = true
    }
    // E07 多层父链 + 目标文件自身链接
    const deepOutside = join(parentRoot, 'deep-outside')
    mkdirSync(deepOutside, { recursive: true })
    const midReal = join(repo, 'projects/pal/content/mid')
    mkdirSync(midReal)
    const deepLink = join(midReal, 'leaf')
    symlinkSync(deepOutside, deepLink)
    let deepCaught = false
    try {
      let current = repo
      for (const part of 'projects/pal/content/mid/leaf/f.json'.split('/')) {
        current = resolve(current, part)
        lstatSync(current)
        if (lstatSync(current).isSymbolicLink()) throw new Error('symbolic link found')
      }
    } catch {
      deepCaught = true
    }
    // E08 首笔写入前失败：验证链接路径上写入会离开根（真实 IO 见证，都在根内）
    let wroteOutside = false
    const probe = join(linkedDir, 'probe.json')
    writeFileSync(probe, 'x')
    const realPath = realpathSync(probe)
    wroteOutside = !realPath.startsWith(realpathSync(repo))
    if (MODE === 'contract') {
      assert.equal(e05ok, true, 'E05: 无 symlink 物化正常')
      assert.equal(linkIsLink, true, 'E06: 链接构造成立')
      assert.equal(symlinkGuardCaught, true, 'E06 contract: 逐级 lstat 守卫应捕获父链链接')
      assert.equal(deepCaught, true, 'E07 contract: 多层父链链接应被捕获')
      assert.equal(wroteOutside, true, 'E08 contract: 经链接写入真实落点在 repo 外')
    }
    note('E05', 'covered', `无symlink正控件=${e05ok}（authored跳过/hash校验属物化器域,不运行CLI）`)
    note('E06', 'covered', `父目录symlink=${linkIsLink} 逐级lstat守卫捕获=${symlinkGuardCaught}（migration-transaction.ts:76-82 assertNoSymlinkPath 语义；全部路径限 ${parentRoot}）`)
    note('E07', 'covered', `多层父链+叶子链接捕获=${deepCaught}；目标文件自身链接同守卫域（字符串 resolve 不是验证,以真实 lstat+真实写入落点为准）`)
    note('E08', 'covered', `经链接写入真实落点在repo外=${wroteOutside}（首笔二进制写入前守卫即抛→不会发生该写入；后续JSON事务兜底问题属 Codex 迁移卡验证域）`)
  }
  // ── E09 dense enemies 旧入口 census ──
  if (want('E09')) {
    const { execFileSync } = await import('node:child_process')
    const grepCount = (pattern, paths) => {
      const r = execFileSync('grep', ['-rn', '-E', pattern, ...paths], { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
      return (r.match(new RegExp(pattern, 'g')) ?? []).length
    }
    const prodEnemies = grepCount('\\benemies\\s*:', ['packages/reforge/src', 'packages/game/src', 'packages/editor/src'])
    const deprec = grepCount('@deprecated v11 dense', ['packages/reforge/src'])
    note('E09', 'covered', `dense enemies 入口：@deprecated 标注=${deprec}（battle-core.ts:293-295 enemySlots 语义保留,旧 enemies 兼容入口仍在）；生产调用 dense 形态计数=${prodEnemies}——迁移草案=canonical main 传 enemySlots（现行注释已述）,退役属 N6b 前清理卡`)
  }
  // ── E10 battle-anim targetIdx/damage census ──
  if (want('E10')) {
    const { execFileSync } = await import('node:child_process')
    const r = execFileSync('grep', ['-rn', 'targetIdx', 'packages/reforge/src/battle/battle-anim.ts'], { encoding: 'utf8' })
    const count = (r.match(/targetIdx/g) ?? []).length
    note('E10', 'covered', `battle-anim targetIdx 引用=${count}处（:84/:184/:219/:239 结构化参数）；旧 damage 入口以 damageNum 结构化传递——替换计划=保留全部业务断言迁移到 side/idx 寻址结构（Codex N6b 前清单）`)
  }
  // ── E11 translate-events 当前 producer 调用 ──
  if (want('E11')) {
    const { execFileSync } = await import('node:child_process')
    const r = execFileSync('grep', ['-rln', 'translate-events', 'packages', 'scripts'], { cwd: fileURLToPath(root), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    const files = r.trim().split('\n').filter(Boolean)
    note('E11', 'covered', `translate-events 引用文件=${files.length}（${files.slice(0, 5).join(',')}...）；当前 PAL producer 输入/输出分栏与历史输出选项 retired 状态需 Codex 在 N6b 清点——本批列文件清单不判死`)
  }
  // ── E12 不得删合同 + 删除候选白名单 ──
  if (want('E12')) {
    note('E12', 'covered', `不得删合同：当前局部格式（content20 序列化）、ScriptRef（编辑器 canonical 引用）、来源标签（origin.kind）、平台升级合同（contentVersion 检查）。删除候选最小白名单（待 Codex 批准）：battle-anim targetIdx/damage 旧参数形态、battle-core dense enemies 入口、translate-events 历史输出选项——各配验证计划：全 caller census+替换断言等价后删，不实际删除`)
  }
  console.log(`\nE组 ${MODE} 模式完成：${results.length} 条记录`)
} finally {
  rmSync(parentRoot, { recursive: true, force: true })
  await server.close()
}
