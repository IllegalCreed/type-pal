#!/usr/bin/env node
// TEST-REFORGE-OPENING-IO-LIFECYCLE-1 — mkdtemp 隔离树准备（反控/repro 共用；r2 加固）。
//
// 卡面要求：反控与缺陷复现一律在各自 mkdtemp 树执行，不修改活动工作树产品。
// r2（Codex 一审 O-R1-04）：
//   - 复制现行 pnpm-lock.yaml 并 `--frozen-lockfile` 安装——依赖图与活动仓同一解析结果，
//     禁止在隔离树内重新解析依赖；安装后逐字节比对 lock 未被改写。
//   - 复制/安装任一步失败时在函数内部先清理本次树再抛错（外层拿到的要么是完整树、
//     要么是异常），错误信息携带失败路径清理证明。
//   - removeTree() 返回实际清理证明（删除后 existsSync=false）。
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')

const rootFiles = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'biome.json',
  'pnpm-lock.yaml',
]
const rootDirs = ['patches']
// 全部 packages/*（同根 lockfile/workspace）：reforge 的 vitest jsdom 环境经 pnpm 隐藏
// 提升解析自 game/editor 的 devDependencies，缺包即环境级 ENOENT，不能只拷三个包。
const packages = (await readdir(path.join(repoRoot, 'packages'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join('packages', entry.name))

export async function prepareTree(tag) {
  const tree = await mkdtemp(path.join(tmpdir(), `opening-io-${tag}-`))
  try {
    for (const file of rootFiles) await cp(path.join(repoRoot, file), path.join(tree, file))
    for (const dir of rootDirs)
      await cp(path.join(repoRoot, dir), path.join(tree, dir), { recursive: true })
    for (const pkg of packages) {
      await cp(path.join(repoRoot, pkg), path.join(tree, pkg), {
        recursive: true,
        filter: (source) => !source.includes(`${path.sep}node_modules`),
      })
    }
    const lockBefore = await readFile(path.join(repoRoot, 'pnpm-lock.yaml'), 'utf8')
    const env = { ...process.env }
    delete env.NODE_COMPILE_CACHE
    const install = spawnSync('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], {
      cwd: tree,
      encoding: 'utf8',
      env,
      timeout: 300_000,
    })
    if (install.status !== 0)
      throw new Error(`[${tag}] frozen install 失败: ${install.stdout}${install.stderr}`)
    const lockAfter = await readFile(path.join(tree, 'pnpm-lock.yaml'), 'utf8')
    if (lockAfter !== lockBefore)
      throw new Error(`[${tag}] 隔离树 lockfile 被改写（frozen 安装不得重写 lock）`)
  } catch (error) {
    // 准备失败：树在本函数内清理完毕后再抛，调用方 finally 不会再拿到半成品树。
    let removed = false
    try {
      await rm(tree, { recursive: true, force: true })
      removed = !existsSync(tree)
    } catch {
      removed = false
    }
    throw new Error(
      `${error.message}\n[prepareTree:${tag}] 失败路径清理: tree=${tree} removed=${removed}`,
    )
  }
  return {
    tree,
    repoRoot,
    pkgRoot: path.join(tree, 'packages/reforge'),
    lockPolicy:
      'pnpm-lock.yaml 随树复制 + install --frozen-lockfile（依赖图零重解析；安装后逐字节比对 lock 未改写）',
    removeTree: async () => {
      await rm(tree, { recursive: true, force: true })
      return { tree, removed: !existsSync(tree) }
    },
  }
}

// 直接执行时自检树可用性（不落任何证据）。
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const t = await prepareTree('selfcheck')
  const probe = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', '--reporter=json', 'src/opening-menu.test.ts'],
    {
      cwd: t.pkgRoot,
      encoding: 'utf8',
      env: { ...process.env, NODE_COMPILE_CACHE: undefined },
      timeout: 180_000,
    },
  )
  const parsed = JSON.parse(probe.stdout)
  console.log(
    JSON.stringify({
      tree: t.tree,
      exit: probe.status,
      tests: parsed.numTotalTests,
      passed: parsed.numPassedTests,
    }),
  )
  console.log(JSON.stringify(await t.removeTree()))
}
