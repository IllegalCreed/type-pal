import { existsSync, readFileSync, watch, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { createCliTestHost } from './cli-host.js'

test('real CLI exit retains complete streams and detached receipt; disposal removes its tree', async ({
  onTestFinished,
}) => {
  const host = createCliTestHost('type-pal-cli-host-')
  onTestFinished(() => host.disposeAll())
  const tree = host.createTree()
  try {
    const result = await host.runCli(tree)
    expect(result.exitCode).toBe(1)
    expect(result.signal).toBeNull()
    expect(result.stdout).toContain('[pal-extract] start')
    expect(result.stderr).toContain('ENOENT')
    expect(result.stderr).toContain('SSS.MKF')
    const [receipt] = host.executions
    expect(receipt).toMatchObject({ ...result, spawnError: null })
    expect(receipt?.args.at(-1)).toBe('src/cli.ts')
    if (!receipt) throw new Error('missing completed execution')
    receipt.stdout = 'outside mutation'
    expect(host.executions[0]?.stdout).toBe(result.stdout)
  } finally {
    await host.disposeAll()
  }
  expect(existsSync(tree)).toBe(false)
  expect(() => host.createTree()).toThrow('disposed')
  await expect(host.runCli(tree)).rejects.toThrow('disposed')
})

test('spawn failure rejects after close instead of leaving the CLI promise pending', async ({
  onTestFinished,
}) => {
  const host = createCliTestHost('type-pal-cli-spawn-')
  onTestFinished(() => host.disposeAll())
  const tree = host.createTree()
  try {
    await expect(host.runCli(join(tree, 'missing'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(host.executions).toHaveLength(1)
    expect(host.executions[0]?.spawnError).toContain('ENOENT')
  } finally {
    await host.disposeAll()
  }
  expect(existsSync(tree)).toBe(false)
})

test('disposal waits for an active real process before removing its copied tree', async ({
  signal,
  onTestFinished,
}) => {
  const host = createCliTestHost('type-pal-cli-active-')
  onTestFinished(() => host.disposeAll())
  const tree = host.createTree()
  const marker = join(tree, 'ready')
  // This is a controlled child-process fixture, not a product CLI behavior oracle.
  writeFileSync(
    join(tree, 'packages/pal-extract/src/cli.ts'),
    `import { renameSync, writeFileSync } from 'node:fs';
     process.once('SIGTERM',()=>{
       writeFileSync(${JSON.stringify(join(tree, 'closing'))},'done');
       process.stdout.write('TREE_ALIVE_DURING_EXIT');process.exit(0)
     });
     writeFileSync(${JSON.stringify(`${marker}.tmp`)},String(process.pid));
     renameSync(${JSON.stringify(`${marker}.tmp`)},${JSON.stringify(marker)});setInterval(()=>{},1000)`,
  )
  // Observe the atomic marker before spawning; startup speed is not this contract.
  const watcher = watch(tree)
  const ready = new Promise<number>((resolveReady, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    watcher.once('close', () => signal.removeEventListener('abort', abort))
    if (signal.aborted) abort()
    watcher.once('error', reject)
    watcher.on('change', (_event, filename) => {
      if (filename !== 'ready') return
      try {
        const value = readFileSync(marker, 'utf8')
        if (!/^[1-9]\d*$/.test(value)) throw new Error('invalid child readiness PID')
        resolveReady(Number(value))
      } catch (error) {
        reject(error)
      }
    })
  })
  const pending = host.runCli(tree)
  try {
    const pid = await Promise.race([
      ready,
      pending.then((result) => {
        throw new Error(`child exited before readiness: ${JSON.stringify(result)}`)
      }),
    ])
    expect(readFileSync(marker, 'utf8')).toMatch(/^[1-9]\d*$/)
    expect(() => process.kill(pid, 0)).not.toThrow()
    watcher.close()
    await host.disposeAll()
    const result = await pending
    expect(result.exitCode).toBe(0)
    expect(result.signal).toBeNull()
    expect(result.stdout).toBe('TREE_ALIVE_DURING_EXIT')
    expect(result.stderr).toBe('')
    expect(existsSync(tree)).toBe(false)
    expect(() => process.kill(pid, 0)).toThrow(/ESRCH/)
  } finally {
    watcher.close()
    await host.disposeAll()
    await pending
  }
})
