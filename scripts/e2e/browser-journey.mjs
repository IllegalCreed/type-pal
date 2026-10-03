import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createJourneyWatchdog, killOwnedBrowser, withDeadline } from './browser-watchdog.mjs'
import { CAPTURE_BUDGET_MS, CAPTURE_SOURCES, createLocalCapture } from './capture-local.mjs'
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
    assert(['--headless', '--headed', '--capture'].includes(arg), `unknown argument ${arg}`)
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
    profile: args.has('--capture') ? 'capture' : 'verify',
  }
  for (const file of new Set([...sources, ...CAPTURE_SOURCES, 'scripts/e2e/browser-watchdog.mjs']))
    report.hashes[file] = sha256(await readFile(resolve(repoRoot, file)))
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
    browserServer,
    browser,
    page
  const contexts = []
  const deadline = Date.now() + (args.has('--capture') ? CAPTURE_BUDGET_MS : 240_000)
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
  const terminateBrowser = () => {
    try {
      if (killOwnedBrowser(browserServer)) report.browserHardTerminated = true
    } catch (cause) {
      error(`owned browser termination: ${cause}`)
    }
  }
  const watchdog = createJourneyWatchdog({ deadline, terminate: terminateBrowser })
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
      const value = await watchdog.run(`observation: ${label}`, read, timeout)
      if (accept(value)) return value
      assert(Date.now() - started < timeout, `timeout: ${label}; last=${JSON.stringify(value)}`)
      await delay(50) // State observation, not story timing or an input schedule.
    }
  }
  const capture = createLocalCapture({ enabled: args.has('--capture'), report, out, health })
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
    browserServer = await watchdog.run(
      'owned browser launch',
      () =>
        chromium.launchServer({
          channel: 'chrome',
          headless: args.has('--headless'),
          timeout: 30_000,
          ...(args.has('--capture') ? { args: ['--mute-audio'] } : {}),
        }),
      40_000,
      { onLate: killOwnedBrowser },
    )
    report.browserPid = browserServer.process().pid
    browser = await watchdog.run('owned browser connect', () =>
      chromium.connect(browserServer.wsEndpoint(), { timeout: 30_000 }),
    )
    report.browser = browser.version()
    const newPage = async (label) => {
      const context = await watchdog.run('owned browser newContext', () =>
        browser.newContext({ viewport: { width: 1360, height: 900 } }),
      )
      contexts.push(context)
      await capture.install(context)
      await context.addInitScript(installVideoObserver)
      if (traceConfig) {
        await context.addInitScript(installOpeningTrace)
        await context.addInitScript(installOpeningMatrix)
      }
      for (const script of initScripts) await context.addInitScript(script)
      page = await context.newPage()
      capture.observe(page)
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
    await watchdog.run(
      `journey ${name}`,
      () => journey({ newPage, baseURL, out, report, until, health, capture }),
      deadline - Date.now(),
    )
    capture.assertComplete()
    health()
    report.status = 'passed'
    console.log(`[${name}] PASS\n${out}`)
  } catch (e) {
    report.status = 'failed'
    report.failure = e.stack ?? String(e)
    if (page && !page.isClosed() && !report.browserHardTerminated) {
      report.lastObservation = await withDeadline(
        'failure observation',
        () =>
          page.evaluate(() => ({
            boot: window.__tpObserve?.readBoot?.(),
            runtime: window.__tpObserve?.readRuntime?.(),
          })),
        2000,
        { onTimeout: terminateBrowser },
      ).catch(() => null)
      await withDeadline(
        'failure screenshot',
        () => page.screenshot({ path: resolve(out, 'failure.png') }),
        2000,
        { onTimeout: terminateBrowser },
      ).catch(() => {})
    }
    console.error(report.failure)
    process.exitCode = 1
  } finally {
    const failures = []
    const cleanup = (label, operation) =>
      withDeadline(label, operation, 2000, { onTimeout: terminateBrowser }).catch((e) =>
        failures.push(String(e)),
      )
    await cleanup('capture cleanup', () => capture.cleanup(report.status !== 'passed'))
    for (const context of contexts) await cleanup('context close', () => context.close())
    if (browser) await cleanup('browser connection close', () => browser.close())
    if (browserServer) {
      await cleanup('owned browser server close', () => browserServer.close())
      terminateBrowser()
      const child = browserServer.process()
      if (child.exitCode === null && child.signalCode === null)
        await cleanup('owned browser process exit', () => once(child, 'exit'))
    }
    if (server.pid && server.exitCode === null) {
      try {
        process.kill(-server.pid, 'SIGTERM')
        await withDeadline('owned dev server exit', () => once(server, 'exit'), 2000, {
          onTimeout: () => process.kill(-server.pid, 'SIGKILL'),
        })
      } catch (e) {
        if (e.code !== 'ESRCH') failures.push(String(e))
      }
    }
    await cleanup('server log flush', () => new Promise((done) => log.end(done)))
    process.removeListener('SIGINT', interrupt)
    process.removeListener('SIGTERM', interrupt)
    if (failures.length) {
      report.cleanupErrors = failures
      report.status = 'failed'
      process.exitCode = 1
      await cleanup('failed capture cleanup', () => capture.cleanup(true))
    }
    await writeFile(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
    process.send?.({ report: resolve(out, 'report.json') })
  }
}
