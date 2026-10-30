import { type ChildProcess, spawn } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export interface CliRunResult {
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

interface CliExecution extends CliRunResult {
  command: string
  args: string[]
  cwd: string
  startedAt: string
  endedAt: string
  spawnError: string | null
}

/** Owns copied source trees and their real CLI processes; fixture contents stay with each suite. */
export function createCliTestHost(prefix: string) {
  const trees = new Set<string>()
  const running = new Map<ChildProcess, Promise<void>>()
  const executions: CliExecution[] = []
  let disposal: Promise<void> | undefined

  function createTree(): string {
    if (disposal) throw new Error('CLI test host is disposed')
    const tree = mkdtempSync(join(tmpdir(), prefix))
    // Register before setup: a failed copy must still be cleaned by this host's afterAll.
    trees.add(tree)
    const packageDirectory = join(tree, 'packages', 'pal-extract')
    mkdirSync(packageDirectory, { recursive: true })
    cpSync(join(packageRoot, 'src'), join(packageDirectory, 'src'), { recursive: true })
    cpSync(join(packageRoot, 'package.json'), join(packageDirectory, 'package.json'))
    symlinkSync(join(packageRoot, 'node_modules'), join(packageDirectory, 'node_modules'), 'dir')
    mkdirSync(join(tree, 'data', 'raw'), { recursive: true })
    return tree
  }

  function runCli(tree: string, extraArgs: readonly string[] = []): Promise<CliRunResult> {
    if (disposal) return Promise.reject(new Error('CLI test host is disposed'))
    const args = [
      join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      'src/cli.ts',
      ...extraArgs,
    ]
    const cwd = join(tree, 'packages', 'pal-extract')
    const startedAt = new Date().toISOString()
    return new Promise((resolveResult, reject) => {
      const child = spawn(process.execPath, args, {
        cwd,
        env: { ...process.env, NODE_COMPILE_CACHE: '' },
      })
      running.set(child, new Promise<void>((closed) => child.once('close', () => closed())))
      let stdout = ''
      let stderr = ''
      let spawnError: Error | undefined
      // Decode across chunk boundaries rather than converting each partial UTF-8 Buffer.
      child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
        stdout += chunk
      })
      child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
        stderr += chunk
      })
      child.once('error', (error) => {
        spawnError = error
      })
      child.once('close', (exitCode, signal) => {
        running.delete(child)
        const result = { exitCode, signal, stdout, stderr }
        executions.push({
          ...result,
          command: process.execPath,
          args,
          cwd,
          startedAt,
          endedAt: new Date().toISOString(),
          spawnError: spawnError?.stack ?? null,
        })
        if (spawnError) reject(spawnError)
        else resolveResult(result)
      })
    })
  }

  async function closeOwnedResources(): Promise<void> {
    const active = [...running.entries()]
    for (const [child] of active) child.kill('SIGTERM')
    await Promise.all(active.map(([, closed]) => closed))
    const errors: unknown[] = []
    for (const tree of trees) {
      try {
        rmSync(tree, { recursive: true, force: true })
        trees.delete(tree)
      } catch (error) {
        errors.push(error)
      }
    }
    if (errors.length) throw new AggregateError(errors, 'CLI test host cleanup failed')
  }

  function disposeAll(): Promise<void> {
    disposal ??= closeOwnedResources()
    return disposal
  }

  return {
    createTree,
    runCli,
    disposeAll,
    /** Detached complete receipts support diagnostics without exposing mutable ownership state. */
    get executions(): readonly CliExecution[] {
      return structuredClone(executions)
    },
  }
}
