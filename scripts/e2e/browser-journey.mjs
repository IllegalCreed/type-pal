import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { installVideoObserver } from './game-observer.mjs'
import { installOpeningMatrix } from './opening-matrix-observer.mjs'
import { installOpeningTrace } from './opening-trace.mjs'

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Own only a temporary browser/server; no connection to a user profile or existing dev server. */
export async function runBrowserJourney({
  name,
  packageName,
  environment,
  sources,
  journey,
  traceConfig,
  arguments: journeyArguments = process.argv.slice(2),
  initScripts = [],
}) {
  const args = new Set(journeyArguments)
  for (const arg of args)
    assert(['--headless', '--headed'].includes(arg), `unknown argument ${arg}`)
  assert(!(args.has('--headed') && args.has('--headless')), 'choose one browser mode')
  const out = resolve(
    repoRoot,
    'build/e2e',
    `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  )
  await mkdir(out, { recursive: true })
  const report = {
    name,
    status: 'running',
    output: out,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim(),
    events: [],
    actions: [],
    errors: [],
    warnings: [],
    contexts: [],
    hashes: {},
  }
  for (const file of sources) report.hashes[file] = sha256(await readFile(resolve(repoRoot, file)))
  const probe = createServer()
  await new Promise((done, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', done)
  })
  const port = probe.address().port
  await new Promise((done) => probe.close(done))
  const baseURL = `http://127.0.0.1:${port}`
  report.baseURL = baseURL
  const env = { ...process.env, ...environment }
  delete env.NODE_COMPILE_CACHE
  const log = createWriteStream(resolve(out, 'server.log'))
  const server = spawn(
    'pnpm',
    [
      '--filter',
      packageName,
      'exec',
      'vite',
      ...(traceConfig ? ['--config', resolve(repoRoot, traceConfig)] : []),
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { cwd: repoRoot, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  server.stdout.pipe(log)
  server.stderr.pipe(log)
  let serverError,
    interrupted = false,
    browser,
    page
  const contexts = []
  const deadline = Date.now() + 240_000
  server.on('error', (error) => {
    serverError = error
  })
  const interrupt = () => {
    interrupted = true
  }
  process.once('SIGINT', interrupt)
  process.once('SIGTERM', interrupt)
  const error = (message) => {
    if (report.errors.length < 50) report.errors.push(message)
    else report.errorOverflow = true
  }
  const health = () => {
    assert(!interrupted, 'journey interrupted')
    assert(Date.now() < deadline, 'journey total deadline exceeded')
    if (serverError) throw serverError
    assert.equal(server.exitCode, null, 'owned server exited')
    assert.equal(report.errors.length, 0, report.errors.join('\n'))
  }
  const until = async (read, accept, label, timeout = 30_000) => {
    const started = Date.now()
    for (;;) {
      health()
      const value = await read()
      if (accept(value)) return value
      assert(Date.now() - started < timeout, `timeout: ${label}; last=${JSON.stringify(value)}`)
      await delay(50) // State observation, not story timing or an input schedule.
    }
  }
  try {
    await until(
      async () => {
        try {
          return (await fetch(baseURL, { signal: AbortSignal.timeout(1000) })).ok
        } catch {
          return false
        }
      },
      Boolean,
      'owned dev server',
    )
    browser = await chromium.launch({ channel: 'chrome', headless: args.has('--headless') })
    report.browser = browser.version()
    const newPage = async (label) => {
      const context = await browser.newContext({ viewport: { width: 1360, height: 900 } })
      contexts.push(context)
      await context.addInitScript(installVideoObserver)
      if (traceConfig) {
        await context.addInitScript(installOpeningTrace)
        await context.addInitScript(installOpeningMatrix)
      }
      for (const script of initScripts) await context.addInitScript(script)
      page = await context.newPage()
      page.on('pageerror', (e) => error(e.message))
      page.on('console', (m) => {
        // HTTP project state absence explicitly means a clean project; do not exempt any asset failure.
        const expectedAbsentState =
          m.type() === 'error' &&
          m.text().includes('404') &&
          m.location().url.endsWith('/projects/pal/.type-pal/save-state.json')
        if (
          (m.type() === 'error' && !expectedAbsentState) ||
          /\[(e2e-load|video-player|script)\].*(失败|failed|Error)/i.test(m.text())
        )
          error(m.text())
        else if (
          (m.type() === 'warning' || expectedAbsentState) &&
          !report.warnings.includes(m.text())
        ) {
          if (report.warnings.length >= 50) error('warning log overflow')
          else report.warnings.push(m.text())
        }
      })
      await page.route('**/__e2e-empty.html', (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><title>isolated storage check</title>',
        }),
      )
      await page.goto(`${baseURL}/__e2e-empty.html`)
      const databases = await page.evaluate(() => indexedDB.databases())
      assert.deepEqual(databases, [], 'new context inherited IndexedDB')
      report.contexts.push({ label, initialDatabases: databases })
      return page
    }
    await journey({ newPage, baseURL, out, report, until, health })
    health()
    report.status = 'passed'
    console.log(`[${name}] PASS\n${out}`)
  } catch (e) {
    report.status = 'failed'
    report.failure = e.stack ?? String(e)
    if (page && !page.isClosed()) {
      report.lastObservation = await page
        .evaluate(() => ({
          boot: window.__tpObserve?.readBoot?.(),
          runtime: window.__tpObserve?.readRuntime?.(),
        }))
        .catch(() => null)
      await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {})
    }
    console.error(report.failure)
    process.exitCode = 1
  } finally {
    const failures = []
    for (const context of contexts) await context.close().catch((e) => failures.push(String(e)))
    await browser?.close().catch((e) => failures.push(String(e)))
    if (server.pid && server.exitCode === null) {
      try {
        process.kill(-server.pid, 'SIGTERM')
      } catch (e) {
        if (e.code !== 'ESRCH') failures.push(String(e))
      }
    }
    log.end()
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', interrupt)
    if (failures.length) {
      report.cleanupErrors = failures
      report.status = 'failed'
      process.exitCode = 1
    }
    await writeFile(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
    process.send?.({ report: resolve(out, 'report.json') })
  }
}
