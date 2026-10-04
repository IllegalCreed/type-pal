/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · migrate-content.mts 命令面合同（scripts/migrate-content.mts:37-52）。
 *
 * 公开入口实跑：spawn tsx 子进程跑真实脚本文件（与 pal-extract CLI 套件的公开 CLI
 * 合同同级）。参数解析（:45-52）先于 recoverMigrationTransaction 与任何数据加载，
 * 因此 --help / 未知参数路径不读写真实工程，可在 fast suite 安全实跑；每条断言精确
 * 到诊断文本与 exit code。
 *
 * 排重 basis（旧 fullName 不重复）：本卡新增；无既有 migrate-content 脚本测试。
 * dry-run/--write 路径（:54-162）不在 fast 覆盖：见任务卡 unreachable ledger
 * （子进程执行零覆盖归因的一手证明 + 真实工程读写边界）。
 */

import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(HERE, '..')

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
}

function runScript(args: string[]): Promise<RunResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(PACKAGE_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
        'scripts/migrate-content.mts',
        ...args,
      ],
      { cwd: PACKAGE_ROOT, env: { ...process.env, NODE_COMPILE_CACHE: '' } },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.once('error', reject)
    child.on('close', (exitCode) => resolvePromise({ exitCode, stdout, stderr }))
  })
}

test('KIMI-R1 migrate-content --help：usage + exit 0', async () => {
  const result = await runScript(['--help'])
  expect(result.exitCode).toBe(0)
  expect(result.stdout).toContain(
    'Usage: pnpm --filter @type-pal/migrate migrate:content [--write]',
  )
  expect(result.stdout).toContain('--write       Materialize assets and publish')
  expect(result.stderr).toBe('')
})

test('KIMI-R1 migrate-content 未知参数：精确诊断 + 非零退出', async () => {
  const result = await runScript(['--bogus'])
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('未知参数: --bogus')
  // 参数拒绝先于事务恢复与数据加载：不得出现 publication 日志
  expect(result.stdout).not.toContain('读取 PAL 原始源')
})

test('KIMI-R1 migrate-content 未知参数混入 --write：仍按未知参数拒绝', async () => {
  const result = await runScript(['--write', '--bogus'])
  expect(result.exitCode).toBe(1)
  expect(result.stderr).toContain('未知参数: --bogus')
  expect(result.stdout).not.toContain('读取 PAL 原始源')
})
