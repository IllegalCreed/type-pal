import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { assertErrandCollector, errandSaveView } from './errand-contract.mjs'
import { readErrandReforge } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS } from './errand-trace-plugin.mjs'
import { readCheckpointInput } from './evidence-artifact.mjs'
import { executeFixedRoute } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { kitchenReady } from './kitchen-contract.mjs'
import { readLongEvidenceArchive, writeLongEvidenceArtifact } from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'
import {
  verifyWaterMoonPalaceReforgeTrace,
  waterMoonPalaceObserverScript,
} from './water-moon-palace-reforge-trace.mjs'
import { waterMoonPalaceRoutes } from './water-moon-palace-route.mjs'

const { values: options } = parseArgs({
  options: {
    from: { type: 'string' },
    verify: { type: 'boolean' },
    headed: { type: 'boolean' },
    headless: { type: 'boolean' },
    'visual-review': { type: 'boolean' },
  },
})
assert(options.from, '010 requires --from a formal Reforge 009 verify report')
assert(!(options.headed && options.headless), 'choose one browser mode')

const engine = 'reforge'
const routes = waterMoonPalaceRoutes(engine)
const grove = 's016'
const exterior = 's019'
const interior = 's020'
const groveSource = 'projects/pal/content/scenes/s016.json'
const groveMap = 'projects/pal/content/maps/map-119.json'
const startPosition = { sceneId: grove, pos: { col: 114, row: 48, height: 0 }, facing: 'up' }
const endPosition = { sceneId: interior, pos: { col: 96, row: 24, height: 0 }, facing: 'left' }
const rewards = { 61: 3, 179: 1, 273: 1 }
const ready = (state) => kitchenReady(state, engine) && state.runtime.dialogueSlots?.length === 0
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const inventoryCounts = (inventory) =>
  Object.fromEntries(
    Object.keys(rewards).map((itemId) => [
      itemId,
      inventory.find((item) => item.itemId === itemId)?.count ?? 0,
    ]),
  )

const reportPath = resolve(options.from)
const reportBytes = await readFile(reportPath)
const predecessor = JSON.parse(reportBytes)
assert.equal(predecessor.kind, 'verify')
assert.equal(predecessor.profile, 'verify')
assert.equal(predecessor.case, 'story')
assert.equal(predecessor.checks?.terminalSave, 'passed')
assert.equal(predecessor.checks?.terminalRestore, 'passed')
assert.equal(predecessor.sourceHashesStable, true)
const {
  payload,
  artifacts: [inputReport, input],
} = await readCheckpointInput(
  { report: reportPath, sha256: predecessor.checkpoint?.sha256 },
  engine,
  '009',
)
assert.equal(inputReport.sha256, sha256(reportBytes), '009 report changed during preflight')
assert.deepEqual(payload.position, startPosition)
assert.deepEqual(inventoryCounts(payload.world.inventory), { 61: 0, 179: 0, 273: 0 })
for (const source of [groveSource, groveMap]) {
  assert.equal(
    sha256(await readFile(resolve(repoRoot, source))),
    predecessor.hashes?.[source],
    `009 predecessor does not bind current ${source}`,
  )
}
const inputBytes = await readFile(input.path)
assert.equal(sha256(inputBytes), input.sha256)

await runBrowserJourney({
  name: 'reforge-010',
  packageName: '@type-pal/reforge',
  environment: { VITE_PROJECT_ID: 'pal' },
  traceConfig: 'scripts/e2e/water-moon-palace-reforge.config.mjs',
  arguments: [options.headed ? '--headed' : '--headless'],
  viewport: { width: 1280, height: 800 },
  initScripts: [waterMoonPalaceObserverScript(), installCommittedRoutePlayback],
  sources: [
    ...ERRAND_TRACE_TARGETS.filter((source) => source.startsWith('packages/reforge/')),
    groveSource,
    groveMap,
    'projects/pal/content/scenes/s019.json',
    'projects/pal/content/scenes/s020.json',
    'projects/pal/content/maps/map-008.json',
    'projects/pal/content/maps/map-009.json',
    'projects/pal/content/items.json',
    'projects/pal/content/locale.json',
    'projects/pal/content/sprites.json',
  ],
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      fragment: '010',
      engine,
      case: 'story',
      kind: 'verify',
      predecessor: { report: reportPath, reportSha256: inputReport.sha256, sha256: input.sha256 },
      route: { status: 'running', legs: [], inputs: [] },
      checks: {},
      traceScope:
        'Actual scene paints, visible slots, committed input and the palace story actors. Decorative entity action tracks are outside this comparison.',
    })
    const visual = options['visual-review'] ?? false
    let videoClock
    if (visual) report.visualReviewMarks = []
    const mark = (name) => {
      report.visualReviewMarks?.push({
        name,
        elapsedMs: Math.round(performance.now() - videoClock),
      })
    }
    let page
    let phase = 'predecessor-restore'
    const snapshot = () => page.evaluate(readErrandReforge)
    const inventory = () => page.evaluate(() => window.__rfWorld.inventory)
    const press = (scene, reason) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, scene, key: 'Enter', reason }),
        record: (action) => report.actions.push(action),
      })

    const restore = async (bytes, expected, label, visualReviewVideo = false) => {
      if (visualReviewVideo) videoClock = performance.now()
      page = await newPage(label, { visualReviewVideo })
      await page.route('**/__010-checkpoint.json', (route) =>
        route.fulfill({ contentType: 'application/json', body: bytes }),
      )
      await page.goto(`${baseURL}/?e2e-load=%2F__010-checkpoint.json`)
      const { sceneId, pos, facing } = expected.position
      const current = await until(
        snapshot,
        (state) =>
          state.boot?.checkpointLoad === 'loaded' &&
          state.scene === sceneId &&
          same(state.position, [pos.col, pos.row, pos.height]) &&
          ready(state),
        `${label} returned control at its native checkpoint`,
        60_000,
      )
      assert.equal(current.facing, facing)
      await waitForOpeningFrame(page, until)
      const trace = await readLongEvidenceArchive(page)
      assertErrandCollector(trace, label)
      const proof = assertReforgeRestoreInput(trace, expected)
      const [commit] = trace.restoreCommits
      const projected = errandSaveView(commit.payload, engine)
      assert.deepEqual(projected, errandSaveView(expected, engine))
      assert.equal(trace.pages.filter(({ page }) => page).length, 0, 'restore replayed dialogue')
      return {
        current,
        trace,
        proof: { ...proof, source: commit.source, stateSha256: sha256(JSON.stringify(projected)) },
      }
    }

    const walk = (plan) =>
      executeFixedRoute({
        page,
        engine,
        plan,
        scene: plan.steps[0].scene,
        id: plan.id,
        phase,
        report,
        snapshot,
        ready,
        health,
        evidence: () => page.evaluate(() => window.__readErrandRouteEvidence()),
        finished: (state) =>
          state.scene === plan.completion.scene &&
          same(state.position, plan.completion.position) &&
          (plan.completion.mode === 'dialogue' ? !!state.runtime.dialogue : ready(state)),
      })

    // Keep manual input bound to fully drawn pages and let timed beats finish in-game.
    const drive = async (scene, finished) => {
      for (let i = 0; i < 30; i++) {
        const current = await until(
          snapshot,
          (state) => finished(state) || state.runtime?.dialogue?.phase === 'waiting-input',
          `${phase} next manual page or restored control`,
          12_000,
        )
        if (finished(current)) return current
        assert.equal(current.scene, scene)
        const dialogue = current.runtime.dialogue
        if (visual) {
          await delay(700)
          assert.deepEqual(
            (await snapshot()).runtime.dialogue,
            dialogue,
            'manual page changed during its review hold',
          )
        }
        await press(scene, `confirm ${dialogue.pageTextIds.join(',')}`)
        await until(
          snapshot,
          (state) => finished(state) || !same(state.runtime?.dialogue, dialogue),
          `${phase} consumed its normal confirmation`,
          6000,
        )
      }
      throw new Error(`${phase} exceeded its manual page budget`)
    }
    const waitForPage = (row) =>
      until(
        snapshot,
        (state) => state.runtime?.dialogue?.pageTextIds?.includes(row),
        `${phase} opened ${row}`,
        6000,
      )

    try {
      const first = await restore(inputBytes, payload, '010-formal-009-restore', visual)
      report.checks.predecessorRestore = first.proof
      assert.equal(first.current.actors.e216.visible, false)
      assert.equal(first.current.actors.e221.visible, false)
      report.start = {
        scene: grove,
        position: first.current.position,
        facing: first.current.facing,
      }
      mark('start-ready')

      phase = 'exterior'
      await walk(routes.exterior)
      mark('palace-exterior-ready')
      phase = 'guide'
      await walk(routes.guide)
      mark('guide-start')
      await waitForPage('dlg.1615')
      const guided = await drive(exterior, (state) => ready(state) && !state.actors.e270.visible)
      assert.deepEqual(guided.position, routes.guide.completion.position)
      assert.equal(guided.facing, 'up')
      mark('guide-ready')

      phase = 'interior'
      await walk(routes.interior)
      mark('palace-interior-ready')
      phase = 'chest'
      const closed = await walk(routes.chest)
      assert.equal(closed.facing, 'left')
      assert.equal(closed.actors.e363.frame, 0)
      const rounds = [
        { row: 'dlg.1891', counts: { 61: 3, 179: 0, 273: 0 } },
        { row: 'dlg.1892', counts: { 61: 3, 179: 0, 273: 0 } },
        { row: 'dlg.1893', counts: { 61: 3, 179: 1, 273: 0 } },
        { row: 'dlg.1894', counts: { 61: 3, 179: 1, 273: 0 } },
      ]
      for (const [index, { row, counts }] of rounds.entries()) {
        await press(interior, `inspect the same chest (${index + 1})`)
        await waitForPage(row)
        mark(`chest-${index + 1}`)
        const opened = await drive(interior, ready)
        assert.equal(opened.actors.e363.frame, 1)
        assert.deepEqual(inventoryCounts(await inventory()), counts)
      }

      phase = 'water'
      const water = await walk(routes.water)
      assert.equal(water.facing, 'down')
      await press(interior, 'drink the bath water')
      await waitForPage('dlg.1576')
      mark('water-start')
      const healed = await drive(interior, ready)
      assert.deepEqual(healed.position, routes.water.completion.position)
      mark('water-ready')

      phase = 'linger'
      await walk(routes.linger)
      await waitForPage('dlg.1624')
      mark('pellet-start')
      const terminal = await drive(interior, ready)
      assert.deepEqual(terminal.position, routes.linger.completion.position)
      assert.equal(terminal.facing, endPosition.facing)
      assert(terminal.actors.e348.visible)
      assert.deepEqual(inventoryCounts(await inventory()), rewards)
      await waitForOpeningFrame(page, until)
      mark('palace-ready')
      report.route.status = 'passed'
      report.endWorld = {
        scene: interior,
        position: terminal.position,
        facing: terminal.facing,
        controlReturned: true,
      }
      report.storyEndOrder = await page.evaluate(
        () => window.__readErrandDrive(Number.MAX_SAFE_INTEGER).order,
      )
      await page.screenshot({ path: resolve(out, '010-palace-end.png') })

      phase = 'terminal-save'
      const save = await page.evaluate(() => window.__tpE2e.dumpSave())
      assert.deepEqual(save.position, endPosition)
      assert.deepEqual(inventoryCounts(save.world.inventory), rewards)
      assert.equal(save.world.script.entityState[exterior].e270, 0)
      assert.equal(save.world.script.entityState[interior].e348, 2)
      const trace = await readLongEvidenceArchive(page)
      report.contextTraces = [await writeLongEvidenceArtifact(out, '010-trace.json', trace)]
      assertErrandCollector(trace, '010 story and save')
      report.checks.causality = verifyWaterMoonPalaceReforgeTrace(trace)
      const bytes = Buffer.from(JSON.stringify(save))
      await writeFile(resolve(out, '010.end.save.json'), bytes, { flag: 'wx' })
      report.checkpoint = {
        path: '010.end.save.json',
        sha256: sha256(bytes),
        byteLength: bytes.length,
      }
      report.checks.terminalSave = 'passed'
      await page.close()

      phase = 'terminal-restore'
      const fresh = await restore(bytes, JSON.parse(bytes), '010-fresh-palace-restore')
      report.contextTraces.push(
        await writeLongEvidenceArtifact(out, '010-fresh-trace.json', fresh.trace),
      )
      assert.deepEqual(inventoryCounts(await inventory()), rewards)
      const restored = await snapshot()
      assert.equal(restored.actors.e363.frame, 1)
      assert.deepEqual(restored.actors.e342.activation, { on: 'interact', range: 2 })
      assert(restored.actors.e348.visible)
      await page.screenshot({ path: resolve(out, '010-palace-restored.png') })
      report.checks.terminalRestore = 'passed'
      report.persistence = { ...fresh.proof, freshContext: true }
      for (const [source, expected] of Object.entries(report.hashes)) {
        assert.equal(
          sha256(await readFile(resolve(repoRoot, source))),
          expected,
          `010 source changed: ${source}`,
        )
      }
      report.sourceHashesStable = true
    } catch (error) {
      report.failurePhase = phase
      if (page && !page.isClosed() && !report.contextTraces?.length) {
        const trace = await readLongEvidenceArchive(page).catch(() => null)
        if (trace)
          report.contextTraces = [
            await writeLongEvidenceArtifact(out, '010-partial-trace.json', trace),
          ]
      }
      throw error
    }
  },
})
