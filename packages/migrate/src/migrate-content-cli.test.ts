/** Help and invalid arguments exit before transaction recovery or source loading. */
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(HERE, '..')

interface ScriptExecution {
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

function runScript(args: string[]): Promise<ScriptExecution> {
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
    child.once('close', (exitCode, signal) => resolvePromise({ exitCode, signal, stdout, stderr }))
  })
}

test('help describes recovery and the difference between materializing assets and publishing JSON', async () => {
  const result = await runScript(['--help'])
  expect(result.exitCode).toBe(0)
  expect(result.signal).toBeNull()
  expect(result.stdout).toContain(
    'Usage: pnpm --filter @type-pal/migrate migrate:content [--write]',
  )
  expect(result.stdout).toContain(
    'Recover a pending transaction, then validate the current publication plan.',
  )
  expect(result.stdout).toContain(
    'Materialize assets, then publish content and baseline in one transaction.',
  )
  expect(result.stderr).toBe('')
})

test.each([
  { label: 'without --write', args: ['--bogus'] },
  { label: 'with --write', args: ['--write', '--bogus'] },
])('rejects unknown arguments before loading source data $label', async ({ args }) => {
  const result = await runScript(args)
  expect(result.exitCode).toBe(1)
  expect(result.signal).toBeNull()
  expect(result.stderr).toContain('未知参数: --bogus')
  expect(result.stdout).toBe('')
})
