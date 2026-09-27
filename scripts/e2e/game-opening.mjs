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
import { installVideoObserver, readGame, readWorld } from './game-observer.mjs'
import {
  appendBounded,
  assertOpeningEvidence,
  isControllableRoom,
  LIMITS,
  stateKey,
  storyAction,
} from './opening-policy.mjs'
import { openingTiming } from './opening-timing.mjs'
import { installOpeningTrace } from './opening-trace.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const args = new Set(process.argv.slice(2))
for (const arg of args) assert(['--headless', '--headed'].includes(arg), `unknown argument ${arg}`)
assert(!(args.has('--headless') && args.has('--headed')), 'choose one browser mode')
const out = resolve(root, 'build/e2e', `game-001-${new Date().toISOString().replace(/[:.]/g, '-')}`)
await mkdir(out, { recursive: true })
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const worldSummary = (world) => ({
  sha256: sha256(JSON.stringify(world)),
  scene: world.scene,
  party: world.party,
  members: world.members,
  cash: world.cash,
  inventory: world.inventory,
  levels: world.roles.rgwLevel,
  hp: world.roles.rgwHP,
  persistentActors: world.actors.length,
})
const report = {
  fragment: '001',
  engine: 'phase1-game',
  status: 'running',
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'story-flow pilot and genuine checkpoint restore; not full two-engine timing acceptance',
  pending: [
    'full dialogue-page and other-actor matrix beyond the two accepted Aunt intervals',
    '002 and capture/audio verification',
  ],
  events: [],
  actions: [],
  errors: [],
  contexts: [],
  assets: {},
  output: out,
}
for (const name of [
  'data/extracted/data/scene/0.json',
  'data/extracted/data/scene/1.json',
  'data/extracted/videos/3.mp4',
]) {
  report.assets[name] = sha256(await readFile(resolve(root, name)))
}
report.runnerHashes = {}
for (const name of [
  'scripts/e2e/game-opening.mjs',
  'scripts/e2e/game-observer.mjs',
  'scripts/e2e/opening-policy.mjs',
  'scripts/e2e/opening-trace.mjs',
  'scripts/e2e/opening-trace-plugin.mjs',
  'scripts/e2e/opening-timing.mjs',
  'scripts/e2e/game-trace.config.mts',
  'packages/game/src/core/event-system.ts',
  'packages/game/src/present/present.ts',
  'pnpm-lock.yaml',
]) {
  report.runnerHashes[name] = sha256(await readFile(resolve(root, name)))
}

// Reserve an available localhost port, then Vite strictPort prevents stealing someone else's server.
const portProbe = createServer()
await new Promise((done, reject) => {
  portProbe.once('error', reject)
  portProbe.listen(0, '127.0.0.1', done)
})
const port = portProbe.address().port
await new Promise((done) => portProbe.close(done))
const baseURL = `http://127.0.0.1:${port}`
report.baseURL = baseURL
const env = { ...process.env, E2E: '1' }
delete env.NODE_COMPILE_CACHE
const serverLog = createWriteStream(resolve(out, 'server.log'))
const server = spawn(
  'pnpm',
  [
    '--filter',
    '@type-pal/game',
    'exec',
    'vite',
    '--config',
    resolve(root, 'scripts/e2e/game-trace.config.mts'),
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
)
server.stdout.pipe(serverLog)
server.stderr.pipe(serverLog)
let serverFailure
server.on('error', (error) => {
  serverFailure = error
})
let browser
let page
const contexts = []
const deadline = Date.now() + LIMITS.timeoutMs
let interrupted = false
const onInterrupt = () => {
  interrupted = true
}
process.once('SIGINT', onInterrupt)
process.once('SIGTERM', onInterrupt)

function checkHealth() {
  assert(!interrupted, '001 interrupted; closing owned browser and server')
  assert(Date.now() < deadline, '001 total time budget exhausted')
  if (serverFailure) throw serverFailure
  assert.equal(server.exitCode, null, `owned Vite exited ${server.exitCode}`)
  assert.equal(report.errors.length, 0, `browser errors: ${report.errors.join('; ')}`)
}
async function until(read, accept, label, timeoutMs = 30_000) {
  const start = Date.now()
  for (;;) {
    checkHealth()
    const value = await read()
    if (accept(value)) return value
    assert(Date.now() - start < timeoutMs, `timed out: ${label}; last=${JSON.stringify(value)}`)
    await delay(50) // Observation polling only, never a story timing assumption.
  }
}
async function snapshot() {
  const s = await page.evaluate(readGame)
  const key = stateKey(s)
  if (report.events.at(-1)?.key !== key)
    appendBounded(report.events, { atMs: Date.now(), key, state: s })
  return s
}
async function press(key, reason, frameDriven = true) {
  const before = await page.evaluate(readGame)
  appendBounded(
    report.actions,
    { key, reason, scene: before.scene, frame: before.frame },
    LIMITS.actions,
  )
  console.log(`[001] ${key}: ${reason}`)
  await page.keyboard.down(key)
  await page.keyboard.up(key)
  if (frameDriven) {
    await until(
      () => page.evaluate(readGame),
      (s) => s.frame > before.frame,
      `input frame consumed: ${key}`,
      10_000,
    )
  }
}
async function newContext(label) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 760 } })
  contexts.push(context)
  await context.addInitScript(installVideoObserver)
  await context.addInitScript(installOpeningTrace)
  page = await context.newPage()
  page.on('pageerror', (error) => appendBounded(report.errors, `${label}: ${error.message}`, 50))
  page.on('console', (message) => {
    if (
      message.type() === 'error' ||
      message.text().includes('[avi-player] video load/decode failed')
    ) {
      appendBounded(report.errors, `${label}: ${message.text()}`, 50)
    }
  })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  report.contexts.push({ label, initialURL: page.url() })
  await until(
    async () => {
      const optOut = page.getByRole('button', { name: '拒绝', exact: true })
      if (await optOut.isVisible()) await optOut.click()
      const enter = page.locator('#boot-loading-enter-btn')
      if (await enter.isVisible()) await enter.click()
      const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
      if (await start.isVisible()) await start.click()
      const s = await snapshot()
      if (s.video) {
        assert(
          ['/extracted/videos/1.mp4', '/extracted/videos/2.mp4'].includes(s.video.path),
          'unexpected prelude',
        )
        await press('Enter', `skip title prelude ${s.video.path} (outside fragment 001)`, false)
        await until(
          () => page.evaluate(readGame),
          (next) => next.video?.path !== s.video.path,
          'prelude removed',
        )
        return null
      }
      return s.ready && s.menu?.kind === 'opening' ? s : null
    },
    Boolean,
    `${label}: normal opening menu`,
    60_000,
  )
  const count = await page.evaluate(async () => {
    const { Save } = await import('/src/core/save/api.ts')
    return (await Save.listSlots()).length
  })
  assert.equal(count, 0, 'new browser context must not inherit any save slots')
  report.contexts.at(-1).initialSlots = count
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
    'owned HTTP dev server',
  )
  browser = await chromium.launch({ channel: 'chrome', headless: args.has('--headless') })
  await newContext('new-story')
  assert.equal((await snapshot()).menu.cursor, 0, 'new story must be selected')
  await press('Enter', '新的故事')
  await until(
    () => snapshot(),
    (s) => s.video?.path === '/extracted/videos/3.mp4',
    'native story video 3 begins',
  )
  await until(
    async () => {
      const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
      if (await start.isVisible()) await start.click()
      return page.evaluate(() => window.__openingVideoEvidence())
    },
    (v) => v.events.some((e) => e.kind === 'ended' && e.path.endsWith('/3.mp4')),
    'video 3 natural end',
    50_000,
  )
  console.log('[001] video 3 ended naturally; following actual dialogue wait states')
  let final
  for (;;) {
    checkHealth()
    const s = await snapshot()
    const action = storyAction(s)
    if (action === 'finish') {
      final = s
      break
    }
    if (action === 'confirm')
      await press('Enter', `dialogue ${s.dialog.phase}: ${s.dialog.text ?? ''}`)
    const key = stateKey(s)
    await until(
      () => snapshot(),
      (next) => stateKey(next) !== key,
      'story state transition',
    )
  }
  const videoEvidence = await page.evaluate(() => window.__openingVideoEvidence())
  assert(!videoEvidence.overflow, 'video observation overflow')
  assert(!videoEvidence.events.some((e) => e.kind === 'error'), 'video decoding error')
  const lines = await page.evaluate(() => window.__tpgs.dialogHistory)
  report.videos = videoEvidence.events
  report.dialogueHistory = lines
  assertOpeningEvidence({ videos: videoEvidence.events, lines, final })
  report.npcTrace = await page.evaluate(() => window.__readOpeningTrace())
  await writeFile(resolve(out, 'npc-trace.json'), `${JSON.stringify(report.npcTrace, null, 2)}\n`)
  report.timing = openingTiming(report.npcTrace, 'game')
  await press('Escape', 'prove normal control: open actual in-game menu')
  await until(
    () => snapshot(),
    (s) => !!s.menu && s.menu.kind !== 'opening',
    'in-game menu opens',
  )
  await press('Escape', 'close actual in-game menu')
  await until(() => snapshot(), isControllableRoom, 'control restored')
  report.endWorld = worldSummary(await page.evaluate(readWorld))
  await page.screenshot({ path: resolve(out, '001-end.png') })
  await press('F5', 'formal quick-save slot 1')
  const checkpoint = await until(
    () =>
      page.evaluate(async () => {
        const { Save } = await import('/src/core/save/api.ts')
        const { serializeSave } = await import('/src/tools/save-io.ts')
        const gs = await Save.loadSlot(1)
        return gs ? serializeSave(gs) : null
      }),
    Boolean,
    'formal quick-save committed',
  )
  await writeFile(resolve(out, '001.end.save.json'), checkpoint)
  report.checkpoint = {
    path: '001.end.save.json',
    sha256: sha256(checkpoint),
    source: 'this run / F5 / Save.loadSlot(1) / serializeSave',
  }

  // A second isolated origin storage, not the first page's in-memory world or old slot.
  await newContext('checkpoint-restore')
  const staged = await page.evaluate(async (text) => {
    const { Save } = await import('/src/core/save/api.ts')
    const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
    await Save.saveSlot(1, parseImportedSave(text)) // same import operations as the production tools panel
    return serializeSave(await Save.loadSlot(1))
  }, checkpoint)
  assert.equal(sha256(staged), report.checkpoint.sha256, 'staged checkpoint bytes changed')
  await press('ArrowDown', 'select 旧的回忆')
  await until(
    () => snapshot(),
    (s) => s.menu?.kind === 'opening' && s.menu.cursor === 1,
    'load selected',
  )
  await press('Enter', 'open formal load-slot menu')
  await until(
    () => snapshot(),
    (s) => s.menu?.kind === 'save-slot',
    'load slot menu',
  )
  assert.equal((await snapshot()).menu.cursor, 0, 'slot 1 must be selected')
  await press('Enter', 'load real slot 1 through production restore')
  await until(() => snapshot(), isControllableRoom, 'checkpoint restored to controllable room')
  report.restoredWorld = worldSummary(await page.evaluate(readWorld))
  assert.deepEqual(report.restoredWorld, report.endWorld, 'formal restore world differs')
  await press('Escape', 'verify restored input control')
  await until(
    () => snapshot(),
    (s) => !!s.menu && s.menu.kind !== 'opening',
    'restored menu opens',
  )
  await press('Escape', 'return to restored room')
  await until(() => snapshot(), isControllableRoom, 'restored menu closes')
  await page.screenshot({ path: resolve(out, '001-restored.png') })
  assert.equal(
    report.timing.status,
    'passed',
    '001 dialogue/movement ordering differs; inspect npc-trace.json',
  )
  report.status = 'passed'
  console.log(`[001] PASS: real checkpoint ${report.checkpoint.sha256}\n${out}`)
} catch (error) {
  report.status = 'failed'
  report.failure = error.stack ?? String(error)
  if (page && !page.isClosed()) {
    report.lastState = await page.evaluate(readGame).catch(() => null)
    await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {})
  }
  console.error(report.failure)
  process.exitCode = 1
} finally {
  const cleanupErrors = []
  for (const context of contexts) {
    await context.close().catch((error) => cleanupErrors.push(String(error)))
  }
  await browser?.close().catch((error) => cleanupErrors.push(String(error)))
  // Only this runner's detached process group; never a user dev server/browser profile.
  if (server.pid && server.exitCode === null) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch (error) {
      if (error.code !== 'ESRCH') cleanupErrors.push(String(error))
    }
  }
  serverLog.end()
  process.removeListener('SIGINT', onInterrupt)
  process.removeListener('SIGTERM', onInterrupt)
  if (cleanupErrors.length) {
    report.cleanupErrors = cleanupErrors
    report.status = 'failed'
    process.exitCode = 1
  }
  await writeFile(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  process.send?.({ report: resolve(out, 'report.json') })
}
