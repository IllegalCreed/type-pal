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
import {
  fairyIslandPoolObserverScript,
  verifyFairyIslandPoolTrace,
} from './fairy-island-pool-reforge-trace.mjs'
import { executeFixedRoute, fixedRoutePlan } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { kitchenReady } from './kitchen-contract.mjs'
import { readLongEvidenceArchive, writeLongEvidenceArtifact } from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

const { values: options } = parseArgs({
  options: {
    from: { type: 'string' },
    verify: { type: 'boolean' },
    headed: { type: 'boolean' },
    headless: { type: 'boolean' },
    'visual-review': { type: 'boolean' },
  },
})
assert(options.from, '009 requires --from a formal Reforge 008 verify report')
assert(!(options.headed && options.headless), 'choose one browser mode')

const engine = 'reforge'
const scene = 's016'
const sceneSource = 'projects/pal/content/scenes/s016.json'
const map = 'projects/pal/content/maps/map-119.json'
const herb = '99'
const start = [61, 42]
const herbStop = [44, -11]
const pool = [123, 54]
const turnBack = [97, 55]
const lightning = [122, 55]
const end = [114, 48]
const departure = [123, 1, 0]
const hiddenAtEnd = ['e212', 'e213', 'e216', 'e217', 'e218', 'e219', 'e220', 'e221', 'e233']

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
  '008',
)
assert.equal(inputReport.sha256, sha256(reportBytes), '008 report changed during preflight')
assert.deepEqual(payload.position, {
  sceneId: scene,
  pos: { col: 61, row: 42, height: 0 },
  facing: 'up',
})
for (const path of [sceneSource, map]) {
  assert.equal(
    sha256(await readFile(resolve(repoRoot, path))),
    predecessor.hashes?.[path],
    `008 predecessor does not bind current ${path}`,
  )
}
const inputBytes = await readFile(input.path)
assert.equal(sha256(inputBytes), input.sha256)

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const at = (state, grid) => state.scene === scene && same(state.position, [...grid, 0])
const ready = (state) => kitchenReady(state, engine) && state.runtime.dialogueSlots?.length === 0
const readyAt = (state, grid) => at(state, grid) && ready(state)
const herbCount = (inventory) => inventory.find(({ itemId }) => itemId === herb)?.count ?? 0
assert.equal(herbCount(payload.world.inventory), 0)

await runBrowserJourney({
  name: 'reforge-009',
  packageName: '@type-pal/reforge',
  environment: { VITE_PROJECT_ID: 'pal' },
  traceConfig: 'scripts/e2e/fairy-island-pool-reforge.config.mjs',
  arguments: [options.headed ? '--headed' : '--headless'],
  viewport: { width: 1280, height: 800 },
  initScripts: [fairyIslandPoolObserverScript(), installCommittedRoutePlayback],
  sources: [
    ...ERRAND_TRACE_TARGETS.filter((path) => path.startsWith('packages/reforge/')),
    sceneSource,
    map,
    'projects/pal/content/items.json',
    'projects/pal/content/locale.json',
    'projects/pal/content/sprites.json',
  ],
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      fragment: '009',
      engine,
      case: 'story',
      kind: 'verify',
      predecessor: { report: reportPath, reportSha256: inputReport.sha256, sha256: input.sha256 },
      route: { status: 'running', legs: [], inputs: [] },
      checks: {},
      traceScope:
        'Party and pool participants, actual draws and visible slots, native input and script causality. Per-frame clocks remain attached to actual paint and commands.',
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
    const order = () => page.evaluate(() => window.__readErrandDrive(Number.MAX_SAFE_INTEGER).order)
    const press = (reason) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, scene, key: 'Enter', reason }),
        record: (action) => report.actions.push(action),
      })

    const restore = async (bytes, expected, label, visualReviewVideo = false) => {
      if (visualReviewVideo) videoClock = performance.now()
      page = await newPage(label, { visualReviewVideo })
      await page.route('**/__009-checkpoint.json', (route) =>
        route.fulfill({ contentType: 'application/json', body: bytes }),
      )
      await page.goto(`${baseURL}/?e2e-load=%2F__009-checkpoint.json`)
      const { pos, facing } = expected.position
      const current = await until(
        snapshot,
        (state) => state.boot?.checkpointLoad === 'loaded' && readyAt(state, [pos.col, pos.row]),
        'formal checkpoint restored in the peach grove',
        60_000,
      )
      assert.equal(current.facing, facing)
      await waitForOpeningFrame(page, until)
      const trace = await readLongEvidenceArchive(page)
      assertErrandCollector(trace, '009 restore')
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

    const walk = async (from, to, holds, mode = 'ready') => {
      const plan = fixedRoutePlan(engine, {
        id: phase,
        scene,
        start: from,
        holds,
        completion: { scene, position: to, mode },
      })
      return executeFixedRoute({
        page,
        engine,
        plan,
        scene,
        id: phase,
        phase,
        report,
        snapshot,
        ready,
        health,
        evidence: () => page.evaluate(() => window.__readErrandRouteEvidence()),
        finished: (state) =>
          at(state, to) && (mode === 'dialogue' ? !!state.runtime.dialogue : ready(state)),
      })
    }

    // Only fully shown manual pages receive a key. Timed lightning cues advance
    // through the production dialogue/timer path without a runner key.
    const drive = async (finished) => {
      for (let i = 0; i < 30; i++) {
        const current = await until(
          snapshot,
          (state) => finished(state) || state.runtime?.dialogue?.phase === 'waiting-input',
          `${phase} next page or restored control`,
        )
        if (finished(current)) return current
        const dialogue = current.runtime.dialogue
        if (visual) {
          await delay(700)
          assert.deepEqual(
            (await snapshot()).runtime.dialogue,
            dialogue,
            'manual page changed during its review hold',
          )
        }
        await press(`confirm ${dialogue.pageTextIds.join(',')}`)
        await until(
          snapshot,
          (state) => finished(state) || !same(state.runtime?.dialogue, dialogue),
          `${phase} consumed its normal confirmation`,
          6000,
        )
      }
      throw new Error(`${phase} exceeded its manual page budget`)
    }

    try {
      const first = await restore(inputBytes, payload, '009-formal-008-restore', visual)
      report.checks.predecessorRestore = first.proof
      assert.equal(first.current.actors.e233.visible, true)
      assert.equal(first.current.actors.e212.visible, true)
      assert.equal(first.current.actors.e213.visible, false)
      report.start = { scene, position: first.current.position, facing: first.current.facing }
      mark('start-ready')

      phase = 'herb-approach'
      await walk(start, herbStop, [
        ['ArrowUp', 52],
        ['ArrowLeft', 7],
        ['ArrowUp', 1],
        ['ArrowLeft', 10],
      ])
      assert.equal((await snapshot()).actors.e233.sprite, 'sprite-69')
      phase = 'pick-herb'
      await press('pick visible herb')
      await drive((state) => readyAt(state, herbStop) && !state.actors.e233.visible)
      assert.equal(herbCount(await inventory()), 1)
      mark('herb-picked')
      phase = 'repeat-herb'
      await press('try the same empty spot once more')
      await waitForOpeningFrame(page, until)
      const repeat = await snapshot()
      assert(readyAt(repeat, herbStop) && !repeat.actors.e233.visible)
      assert.equal(herbCount(await inventory()), 1)
      report.checks.herb = { entity: 'e233', item: herb, count: 1, repeat: 'passed' }

      phase = 'pool-approach'
      await walk(herbStop, pool, [
        ['ArrowDown', 2],
        ['ArrowRight', 5],
        ['ArrowDown', 29],
        ['ArrowRight', 37],
        ['ArrowDown', 10],
        ['ArrowRight', 10],
        ['ArrowDown', 23],
        ['ArrowRight', 5],
        ['ArrowDown', 1],
        ['ArrowRight', 22],
      ])
      const beforeClothes = await snapshot()
      assert.equal(beforeClothes.actors.e212.visible, true)
      assert.equal(beforeClothes.actors.e213.visible, false)
      phase = 'pool-clothes'
      mark('pool-clothes-start')
      await press('examine the clothes at the bathing pool')
      const clothesReady = await drive(
        (state) => readyAt(state, turnBack) && state.actors.e213.visible,
      )
      assert.equal(clothesReady.facing, 'right')
      assert.equal(clothesReady.actors.e212.visible, false)
      assert.equal(clothesReady.actors.e217.visible, false)
      mark('pool-clothes-ready')

      phase = 'pool-return'
      await walk(turnBack, lightning, [['ArrowRight', 25]], 'dialogue')
      phase = 'pool-lightning'
      mark('pool-lightning-start')
      const firstReady = await drive((state) => readyAt(state, end) && !state.actors.e213.visible)
      assert.equal(firstReady.facing, 'up')
      mark('pool-lightning-ready')

      phase = 'linger-departure'
      const terminal = await until(
        snapshot,
        (state) =>
          readyAt(state, end) &&
          !state.actors.e221.visible &&
          same(state.actors.e221.position, departure),
        'Ling’er finished leaving while the player stayed in the grove',
      )
      for (const id of hiddenAtEnd)
        assert.equal(terminal.actors[id].visible, false, `${id} visibility at end`)
      assert.equal(herbCount(await inventory()), 1)
      assert.equal(terminal.facing, 'up')
      await waitForOpeningFrame(page, until)
      mark('pool-ready')
      report.route.status = 'passed'
      report.endWorld = {
        scene,
        position: terminal.position,
        facing: terminal.facing,
        controlReturned: true,
      }
      report.storyEndOrder = await order()
      await page.screenshot({ path: resolve(out, '009-pool-end.png') })

      phase = 'terminal-save'
      const save = await page.evaluate(() => window.__tpE2e.dumpSave())
      assert.deepEqual(save.position, {
        sceneId: scene,
        pos: { col: 114, row: 48, height: 0 },
        facing: 'up',
      })
      assert.equal(herbCount(save.world.inventory), 1)
      for (const id of hiddenAtEnd)
        assert.equal(save.world.script.entityState[scene][id], 0, `${id} saved state`)
      assert.deepEqual(save.world.script.entityPos[scene].e221, { col: 123, row: 1, height: 0 })
      const trace = await readLongEvidenceArchive(page)
      assertErrandCollector(trace, '009 story and save')
      report.contextTraces = [await writeLongEvidenceArtifact(out, '009-trace.json', trace)]
      report.checks.causality = verifyFairyIslandPoolTrace(trace)
      const bytes = Buffer.from(JSON.stringify(save))
      await writeFile(resolve(out, '009.end.save.json'), bytes, { flag: 'wx' })
      report.checkpoint = {
        path: '009.end.save.json',
        sha256: sha256(bytes),
        byteLength: bytes.length,
      }
      await page.close()

      phase = 'terminal-restore'
      const fresh = await restore(bytes, JSON.parse(bytes), '009-fresh-pool-restore')
      assert.equal(herbCount(await inventory()), 1)
      for (const id of hiddenAtEnd)
        assert.equal(fresh.current.actors[id].visible, false, `${id} restored visibility`)
      assert.deepEqual(fresh.current.actors.e221.position, departure)
      await page.screenshot({ path: resolve(out, '009-pool-restored.png') })
      report.contextTraces.push(
        await writeLongEvidenceArtifact(out, '009-fresh-trace.json', fresh.trace),
      )
      report.checks.terminalSave = 'passed'
      report.checks.terminalRestore = 'passed'
      report.persistence = { ...fresh.proof, freshContext: true }
      for (const [path, expected] of Object.entries(report.hashes)) {
        assert.equal(
          sha256(await readFile(resolve(repoRoot, path))),
          expected,
          `009 source changed: ${path}`,
        )
      }
      report.sourceHashesStable = true
    } catch (error) {
      report.failurePhase = phase
      if (page && !page.isClosed() && !report.contextTraces?.length) {
        const trace = await readLongEvidenceArchive(page).catch(() => null)
        if (trace)
          report.contextTraces = [
            await writeLongEvidenceArtifact(out, '009-partial-trace.json', trace),
          ]
      }
      throw error
    }
  },
})
