import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: path.dirname(fileURLToPath(import.meta.url)),
  encoding: 'utf8',
}).trim()
const { chromium } = createRequire(path.join(root, 'package.json'))('playwright')
const { withDeadline, killOwnedBrowser } = await import(
  path.join(root, 'scripts/e2e/browser-watchdog.mjs')
)
assert(
  process.argv[2],
  'Supply a new output directory; this launches a fresh browser against the owned Vite server',
)
const out = path.resolve(process.argv[2])
fs.mkdirSync(out)
const url =
  process.env.TYPE_PAL_MAP_RELOAD_URL ?? 'http://127.0.0.1:6005/?skip-intro=1&dev-party=4,1'
const report = {
  url,
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  fixture:
    'Actual main/bootstrap and platform IO failure only; fresh contexts; legal raw opcodes; scene-reload leaves scene2 for scene1 then returns; both persisted onEnter=-1. No Save writes, no full story/ending claim.',
  cases: [],
}
let server, browser
try {
  server = await withDeadline(
    'launch owned Chrome',
    () =>
      chromium.launchServer({
        channel: 'chrome',
        headless: true,
        timeout: 30000,
        args: ['--mute-audio'],
      }),
    40000,
    { onLate: killOwnedBrowser },
  )
  browser = await withDeadline(
    'connect owned Chrome',
    () => chromium.connect(server.wsEndpoint(), { timeout: 10000 }),
    15000,
    { onTimeout: () => killOwnedBrowser(server) },
  )
  for (const name of [
    'json-failure',
    'tiles-failure',
    'complete-success',
    'latest-request',
    'scene-reload',
    'changed-map-revisit',
    'named-map-override',
  ]) {
    const row = { name, events: [], requests: [] }
    report.cases.push(row)
    const context = await browser.newContext({ viewport: { width: 1100, height: 850 } })
    let release
    try {
      const page = await context.newPage()
      page.on('console', (m) =>
        row.events.push({ type: 'console', level: m.type(), text: m.text() }),
      )
      page.on('pageerror', (e) => row.events.push({ type: 'pageerror', text: String(e) }))
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForFunction(
        () =>
          window.__game &&
          window.__tpgs?.mode === 'explore' &&
          !window.__tpgs.sceneLoading &&
          !window.__tpgs.paletteFadeState,
        undefined,
        { timeout: 30000 },
      )
      await page.locator('#boot-loading').waitFor({ state: 'detached', timeout: 10000 })
      row.initial = await page.evaluate(() => ({
        scene: window.__tpgs.wNumScene,
        party: window.__tpgs.partyMembers,
        tileset: window.__game.presentCtx.tilemap.tileset,
      }))
      assert.equal(row.initial.scene, 2)
      assert.deepEqual(row.initial.party, [4, 1])
      const original = await page.evaluateHandle(() => ({
        map: window.__game.presentCtx.tilemap,
        tile: window.__game.presentCtx.tileImages.get(0),
        npcs: window.__tpgs.npcs,
      }))
      const state = () =>
        original.evaluate((old) => ({
          sameMap: window.__game.presentCtx.tilemap === old.map,
          sameTile: window.__game.presentCtx.tileImages.get(0) === old.tile,
          hasTile: Boolean(window.__game.presentCtx.tileImages.get(0)),
          sameNpcs: window.__tpgs.npcs === old.npcs,
          tileset: window.__game.presentCtx.tilemap.tileset,
          mode: window.__tpgs.mode,
          sceneLoading: window.__tpgs.sceneLoading,
        }))
      const stepFrames = () =>
        page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        )
      const changeMap = (mapNum) =>
        page.evaluate((mapNum) => {
          const gs = window.__tpgs
          gs.eventCursor = {
            ip: 0,
            commands: [{ op: 'raw', opcode: 0x99, operands: [0xffff, mapNum, 0] }, { op: 'end' }],
            labelMap: {},
          }
          gs.mode = 'event'
        }, mapNum)
      const marker = row.events.length
      page.on('request', (r) => {
        if (/\/data\/(tilemap|tileset)\//.test(r.url()))
          row.requests.push(new URL(r.url()).pathname)
      })
      await page.locator('#screen').screenshot({ path: path.join(out, `${name}-before.png`) })
      if (name === 'changed-map-revisit' || name === 'named-map-override') {
        const expectedMap = 76
        const identity = () =>
          page.evaluate(async () => (await import('/src/core/scene-system.ts')).getCurrentMapNum())
        const loadScene = async (sceneId) => {
          await page.evaluate((sceneId) => {
            const gs = window.__tpgs
            gs.sceneOnEnterIp[sceneId] = -1
            gs.eventCursor = {
              ip: 0,
              commands: [{ op: 'loadScene', sceneId }, { op: 'end' }],
              labelMap: {},
            }
            gs.mode = 'event'
          }, sceneId)
          await page.waitForFunction(
            (sceneId) =>
              window.__tpgs.wNumScene === sceneId &&
              window.__tpgs.mode === 'explore' &&
              !window.__tpgs.sceneLoading,
            sceneId,
            { timeout: 10000 },
          )
        }
        if (name === 'changed-map-revisit') {
          await changeMap(76)
          await page.waitForFunction(
            () => window.__game.presentCtx.tilemap.tileset === 'tileset/76.rle',
            undefined,
            { timeout: 10000 },
          )
          row.afterChange = await state()
          row.currentMapAfterChange = await identity()
        }
        // First entry may fill the scene cache; second must use a coherent cache hit.
        for (let visit = 0; visit < 2; visit++) {
          await loadScene(1)
          if (name === 'named-map-override') {
            await page.evaluate(
              (mapNum) => {
                const gs = window.__tpgs
                gs.eventCursor = {
                  ip: 0,
                  commands: [{ op: 'raw', opcode: 0x99, operands: [2, mapNum, 0] }, { op: 'end' }],
                  labelMap: {},
                }
                gs.mode = 'event'
              },
              visit === 0 ? 76 : 20,
            )
            await page.waitForFunction(() => window.__tpgs.mode === 'explore', undefined, {
              timeout: 10000,
            })
          }
          await loadScene(2)
          row.visits ??= []
          row.visits.push({
            ...(await state()),
            mapNumber: await identity(),
            expectedMap: name === 'named-map-override' && visit === 1 ? 20 : 76,
          })
        }
        row.replacementEvents = row.events.slice(marker)
        await page.locator('#screen').screenshot({ path: path.join(out, `${name}-after.png`) })
        if (name === 'changed-map-revisit')
          assert.equal(
            row.currentMapAfterChange,
            expectedMap,
            'Successful map replacement must publish the map identity used by tools',
          )
        for (const visit of row.visits) {
          assert.equal(
            visit.tileset,
            `tileset/${visit.expectedMap}.rle`,
            'Fresh and cached revisits must use the script-selected tilemap',
          )
          assert.equal(visit.mapNumber, visit.expectedMap)
          assert(visit.hasTile && visit.mode === 'explore' && !visit.sceneLoading)
        }
        assert.deepEqual(
          row.replacementEvents.filter(
            (e) =>
              e.type === 'pageerror' ||
              (e.type === 'console' && ['warning', 'error'].includes(e.level)),
          ),
          [],
        )
      } else if (name.endsWith('failure')) {
        const target =
          name === 'json-failure' ? '**/data/tilemap/12.json' : '**/data/tileset/12.rle'
        await page.route(target, (route) =>
          route.fulfill({ status: 500, body: 'owned map replacement failure' }),
        )
        const response = page.waitForResponse((r) =>
          r.url().endsWith(name === 'json-failure' ? '/tilemap/12.json' : '/tileset/12.rle'),
        )
        await changeMap(12)
        await response
        await stepFrames()
        row.after = await state()
        row.replacementEvents = row.events.slice(marker)
        await page.locator('#screen').screenshot({ path: path.join(out, `${name}-after.png`) })
        assert(
          row.after.sameMap && row.after.sameTile && row.after.hasTile,
          'A failed replacement must preserve the complete live map and tile resources',
        )
        assert(row.after.sameNpcs && row.after.mode === 'explore' && !row.after.sceneLoading)
        assert.deepEqual(
          row.replacementEvents.filter((e) => e.type === 'pageerror'),
          [],
          'The actual opcode caller must consume rejection',
        )
        const errors = row.replacementEvents.filter(
          (e) => e.type === 'console' && e.level === 'error',
        )
        assert.equal(
          errors.filter((e) => e.text.startsWith('event-system: mapReloader(12) failed:')).length,
          1,
        )
        const cause =
          name === 'json-failure'
            ? 'tilemap-12.json fetch failed (500)'
            : 'tileset-blob: fetch /extracted/data/tileset/12.rle failed (500)'
        assert(
          errors.some((e) => e.text.includes(cause)),
          'Keep the original resource error with URL/status',
        )
        assert.equal(errors.filter((e) => e.text.startsWith('Failed to load resource:')).length, 1)
        assert.equal(
          errors.length,
          2,
          'Only the injected HTTP500 and one handled application log are expected',
        )
        assert.deepEqual(
          row.requests,
          name === 'json-failure'
            ? ['/extracted/data/tilemap/12.json']
            : ['/extracted/data/tilemap/12.json', '/extracted/data/tileset/12.rle'],
        )
      } else {
        let arrived
        const requested = new Promise((resolve) => {
          arrived = resolve
        })
        const gate = new Promise((resolve) => {
          release = resolve
        })
        await page.route('**/data/tileset/12.rle', async (route) => {
          arrived()
          await gate
          await route.continue()
        })
        const downloaded = page.waitForResponse((r) => r.url().endsWith('/tileset/12.rle'))
        await changeMap(12)
        await withDeadline('replacement reached held blob', () => requested, 10000)
        row.pending = await state()
        let sceneSnapshot
        if (name === 'latest-request') {
          await changeMap(76)
          await page.waitForFunction(
            () => window.__game.presentCtx.tilemap.tileset === 'tileset/76.rle',
            undefined,
            { timeout: 10000 },
          )
        } else if (name === 'scene-reload') {
          for (const sceneId of [1, 2]) {
            await page.evaluate((sceneId) => {
              const gs = window.__tpgs
              gs.sceneOnEnterIp[sceneId] = -1
              gs.eventCursor = {
                ip: 0,
                commands: [{ op: 'loadScene', sceneId }, { op: 'end' }],
                labelMap: {},
              }
              gs.mode = 'event'
            }, sceneId)
            await page.waitForFunction(
              (sceneId) =>
                window.__tpgs.wNumScene === sceneId &&
                window.__tpgs.mode === 'explore' &&
                !window.__tpgs.sceneLoading,
              sceneId,
              { timeout: 10000 },
            )
          }
          sceneSnapshot = await page.evaluateHandle(() => ({
            map: window.__game.presentCtx.tilemap,
            tile: window.__game.presentCtx.tileImages.get(0),
          }))
        }
        release()
        await downloaded
        if (name === 'complete-success') {
          await page.waitForFunction(
            (old) => window.__game.presentCtx.tilemap !== old.map,
            original,
            { timeout: 10000 },
          )
        }
        await stepFrames()
        row.after = await state()
        if (sceneSnapshot)
          row.sameSceneAfterLateResult = await sceneSnapshot.evaluate(
            (old) =>
              old.map === window.__game.presentCtx.tilemap &&
              old.tile === window.__game.presentCtx.tileImages.get(0),
          )
        row.replacementEvents = row.events.slice(marker)
        await page.locator('#screen').screenshot({ path: path.join(out, `${name}-after.png`) })
        assert(
          row.pending.sameMap && row.pending.sameTile && row.pending.hasTile,
          'An incomplete replacement must not evict the live map',
        )
        if (name === 'complete-success') {
          assert(!row.after.sameMap && !row.after.sameTile && row.after.hasTile)
          assert.equal(row.after.tileset, 'tileset/12.rle')
          assert(row.after.sameNpcs && row.after.mode === 'explore' && !row.after.sceneLoading)
        } else if (name === 'latest-request')
          assert.equal(
            row.after.tileset,
            'tileset/76.rle',
            'An older map request must not overwrite the newer result',
          )
        else
          assert.equal(
            row.sameSceneAfterLateResult,
            true,
            'Reloading even the same scene invalidates the old map request',
          )
        assert.deepEqual(
          row.replacementEvents.filter(
            (e) =>
              e.type === 'pageerror' ||
              (e.type === 'console' && ['warning', 'error'].includes(e.level)),
          ),
          [],
        )
      }
      row.passed = true
    } catch (error) {
      row.failure = { name: error.name, message: error.message, stack: error.stack }
      row.passed = false
    } finally {
      release?.()
      await withDeadline('close owned context', () => context.close(), 5000).catch(() => {})
      row.contextClosed = browser.contexts().every((c) => c !== context)
    }
  }
} finally {
  if (browser)
    await withDeadline('close owned browser', () => browser.close(), 5000, {
      onTimeout: () => killOwnedBrowser(server),
    }).catch(() => {})
  if (server)
    await withDeadline('close owned server', () => server.close(), 5000, {
      onTimeout: () => killOwnedBrowser(server),
    }).catch(() => {})
  report.browserClosed =
    !server || server.process().exitCode !== null || server.process().signalCode !== null
  fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, {
    flag: 'wx',
  })
}
console.log(
  JSON.stringify({
    cases: report.cases.map((c) => ({ name: c.name, passed: c.passed, failure: c.failure?.name })),
    browserClosed: report.browserClosed,
  }),
)
assert(
  report.browserClosed &&
    report.cases.length === 7 &&
    report.cases.every((c) => c.passed && c.contextClosed),
  'Map replacement regression failed; inspect immutable report and images',
)
