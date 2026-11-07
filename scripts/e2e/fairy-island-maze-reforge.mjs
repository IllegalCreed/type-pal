import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { assertErrandCollector, errandSaveView } from './errand-contract.mjs'
import { readErrandReforge } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS } from './errand-trace-plugin.mjs'
import { readCheckpointInput } from './evidence-artifact.mjs'
import {
  fairyIslandMazeObserverScript,
  mazeScenes,
  verifyMazeCausality,
} from './fairy-island-maze-reforge-trace.mjs'
import { FAIRY_MAZE_LOOT, FAIRY_MAZE_STATUES, fairyMazePlan } from './fairy-island-maze-route.mjs'
import { executeFixedRoute } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { captureItemGuardSeed } from './item-acquisition-guard-contract.mjs'
import { kitchenReady } from './kitchen-contract.mjs'
import { readLongEvidenceArchive, writeLongEvidenceArtifact } from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

const { values: options } = parseArgs({
  options: {
    from: { type: 'string' },
    headed: { type: 'boolean' },
    headless: { type: 'boolean' },
    'visual-review': { type: 'boolean' },
  },
})
assert(options.from, '008 requires --from a formal Reforge 007 verify report')
assert(!(options.headed && options.headless), 'choose one browser mode')

const engine = 'reforge'
const maze = 's017'
const peach = 's016'
const start = [90, 54]
const forest = [61, 42]
const hammer = '279'
const statues = FAIRY_MAZE_STATUES.map((id) => `e${id}`)
const loot = Object.values(FAIRY_MAZE_LOOT).flat().map(String)
const mazePlan = fairyMazePlan(engine)
const reportPath = resolve(options.from)
const reportBytes = await readFile(reportPath)
const predecessor = JSON.parse(reportBytes)
assert.equal(predecessor.kind, 'verify')
assert.equal(predecessor.profile, 'verify')
assert.equal(predecessor.case, 'story')
assert.equal(predecessor.checks?.terminalSave, 'passed')
assert.equal(predecessor.checks?.terminalRestore, 'passed')
assert.equal(predecessor.sourceHashesStable, true)
const { payload, artifacts } = await readCheckpointInput(
  { report: reportPath, sha256: predecessor.checkpoint?.sha256 },
  engine,
  '007',
)
const [, input] = artifacts
const inputBytes = await readFile(input.path)
assert.equal(sha256(inputBytes), input.sha256)
assert.deepEqual(payload.position, {
  sceneId: maze,
  pos: { col: start[0], row: start[1], height: 0 },
  facing: 'up',
})
const mazeSource = `projects/pal/content/scenes/${maze}.json`
const mazeMap = 'projects/pal/content/maps/map-006.json'
for (const path of [mazeSource, mazeMap]) {
  assert.equal(
    sha256(await readFile(resolve(repoRoot, path))),
    predecessor.hashes?.[path],
    `007 predecessor does not bind current ${path}`,
  )
}

const at = (grid) => [...grid, 0]
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const inventory = (items) => Object.fromEntries(items.map(({ itemId, count }) => [itemId, count]))
const isReady = (state) => kitchenReady(state, engine)
const isAt = (state, scene, grid) => state.scene === scene && same(state.position, at(grid))

await runBrowserJourney({
  name: 'reforge-008',
  packageName: '@type-pal/reforge',
  environment: { VITE_PROJECT_ID: 'pal' },
  traceConfig: 'scripts/e2e/fairy-island-maze-reforge.config.mts',
  arguments: [options.headed ? '--headed' : '--headless'],
  viewport: { width: 1280, height: 800 },
  // This route has 31 moving rafts as well as live dialogue and scene transitions.
  journeyTimeoutMs: 540_000,
  initScripts: [fairyIslandMazeObserverScript(), installCommittedRoutePlayback],
  sources: [
    ...ERRAND_TRACE_TARGETS.filter((path) => path.startsWith('packages/reforge/')),
    ...mazeScenes.map((scene) => `projects/pal/content/scenes/${scene}.json`),
    ...['006', '025', '119'].map((map) => `projects/pal/content/maps/map-${map}.json`),
    'projects/pal/content/items.json',
    'projects/pal/content/locale.json',
    'projects/pal/content/sprites.json',
  ],
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      fragment: '008',
      engine,
      case: 'story',
      kind: 'verify',
      predecessor: { report: reportPath, reportSha256: sha256(reportBytes), sha256: input.sha256 },
      route: { status: 'running', legs: [], inputs: [] },
      observations: [],
      traceScope:
        'Native input, gameplay poses, foreground script snapshots, world draws per observed tick, and first automatic raft command per path and run. Idle frame bookkeeping and other rafts’ cosmetic draws are sampled out.',
      checks: {},
    })
    let page
    let phase = 'predecessor-restore'
    let scene = maze
    let position = start
    let videoClock
    if (options['visual-review']) report.visualReviewMarks = []
    const mark = (name) => {
      report.visualReviewMarks?.push({
        name,
        elapsedMs: Math.round(performance.now() - videoClock),
      })
    }
    const snapshot = () => page.evaluate(readErrandReforge)
    const readUi = () => page.evaluate(() => window.__mazeReadUi())
    const readOrder = () =>
      page.evaluate(() => window.__readErrandDrive(Number.MAX_SAFE_INTEGER).order)
    const evidence = async () =>
      JSON.parse(await page.evaluate(() => JSON.stringify(window.__readErrandRouteEvidence())))
    const press = (key, reason) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, scene, key, reason }),
        record: (action) => report.actions.push(action),
      })
    const waitReady = (targetScene, targetPosition) =>
      until(
        snapshot,
        (state) => isAt(state, targetScene, targetPosition) && isReady(state),
        `${targetScene} control at ${targetPosition.join(',')}`,
      )
    const restore = async (bytes, expected, label, visualReviewVideo = false) => {
      if (visualReviewVideo) videoClock = performance.now()
      page = await newPage(label, { visualReviewVideo })
      await page.route('**/__008-checkpoint.json', (route) =>
        route.fulfill({ contentType: 'application/json', body: bytes }),
      )
      await page.goto(`${baseURL}/?e2e-load=%2F__008-checkpoint.json`)
      const { sceneId, pos, facing } = expected.position
      const restored = await until(
        snapshot,
        (state) =>
          state.boot?.checkpointLoad === 'loaded' &&
          isAt(state, sceneId, [pos.col, pos.row]) &&
          isReady(state),
        `formal checkpoint restored in ${sceneId}`,
        60_000,
      )
      assert.equal(restored.facing, facing)
      const trace = await readLongEvidenceArchive(page)
      assertErrandCollector(trace, '008 restore')
      const proof = assertReforgeRestoreInput(trace, expected)
      const [commit] = trace.restoreCommits
      const projected = errandSaveView(commit.payload, engine)
      assert.deepEqual(projected, errandSaveView(expected, engine))
      assert.equal(trace.pages.filter(({ page }) => page).length, 0, 'restore replayed dialogue')
      return {
        trace,
        proof: { ...proof, source: commit.source, stateSha256: sha256(JSON.stringify(projected)) },
      }
    }

    const walk = ({ route }) => {
      const plan = { ...route, id: phase }
      const { completion } = plan
      return executeFixedRoute({
        page,
        engine,
        plan,
        scene,
        id: phase,
        phase,
        report,
        snapshot,
        evidence,
        ready: isReady,
        finished: (state) =>
          state.scene === completion.scene &&
          same(state.position, completion.position) &&
          (completion.mode === 'dialogue' ? !!state.runtime.dialogue : isReady(state)),
        health,
      })
    }

    const chooseHammer = async () => {
      const menu = async () => (await readUi()).menu
      for (let i = 0; i < 40; i++) {
        const current = await menu()
        let key = 'Escape'
        if (current.panel === 'use') {
          assert.equal(current.phase, 'pick-item')
          const index = current.items.indexOf(hammer)
          assert(index >= 0, 'hammer is missing from the actual use menu')
          if (current.cursor === index) return current
          key = current.cursor < index ? 'ArrowRight' : 'ArrowLeft'
        } else if (current.active) {
          const level = current.levels.at(-1)
          assert(level, 'open menu has no visible choices')
          const target = level.ids.includes('item') ? 'item' : 'use'
          assert(level.ids.includes(target), `missing ${target} menu choice`)
          key = level.ids[level.cursor] === target ? 'Enter' : 'ArrowDown'
        }
        await press(key, 'navigate to the actual hammer item')
        await until(menu, (next) => !same(next, current), 'inventory key accepted', 4000)
      }
      throw new Error('hammer use menu was not reached')
    }

    const actionView = async () => {
      const [state, ui] = await Promise.all([snapshot(), readUi()])
      return { state, reward: ui.reward, menu: ui.menu.active }
    }
    const driveAction = async (label, endScene, endPosition) => {
      const visible = (view) => ({ dialogue: view.state.runtime?.dialogue, reward: view.reward })
      const finished = ({ state, reward }) =>
        !reward && isAt(state, endScene, endPosition) && isReady(state)
      for (let i = 0; i < 16; i++) {
        const view = await until(
          actionView,
          (v) => finished(v) || v.reward || v.state.runtime?.dialogue?.phase === 'waiting-input',
          label,
        )
        if (finished(view)) return view.state
        await press('Enter', `confirm ${label}`)
        await until(
          actionView,
          (next) => finished(next) || !same(visible(next), visible(view)),
          `${label} confirmation applied`,
          6000,
        )
      }
      throw new Error(`too many confirmations for ${label}`)
    }

    const seenBroken = new Set()
    const useHammer = async ({ entity, facing }, before, observation) => {
      assert.equal(before.facing, facing, `wrong hammer direction at ${entity}`)
      assert.equal(before.actors[entity].visible, true)
      assert(!seenBroken.has(entity), `repeated hammer target ${entity}`)
      const old = await readUi()
      assert.equal(inventory(old.inventory)[hammer], 1)
      assert.equal(before.actors.e262.visible, false, 'plate was revealed early')
      observation.menu = await chooseHammer()
      await press('Enter', `use the hammer facing ${entity}`)
      await until(
        actionView,
        (view) => !view.menu || view.state.runtime?.scriptRunning,
        'hammer use accepted',
      )
      const after = await driveAction(`hammer at ${entity}`, maze, position)
      const ui = await readUi()
      seenBroken.add(entity)
      assert.equal(
        after.actors[entity].visible,
        false,
        `${entity} remained visible after legal hammer use`,
      )
      for (const id of statues)
        assert.equal(after.actors[id].visible, !seenBroken.has(id), `${id} visibility`)
      const last = seenBroken.size === statues.length
      const expected = inventory(old.inventory)
      if (last) delete expected[hammer]
      assert.deepEqual(inventory(ui.inventory), expected)
      assert.equal(after.actors.e262.visible, last)
      assert.equal(ui.entityState[entity], 0)
      if (last) assert.equal(ui.entityState.e262, 1)
      return {
        item: hammer,
        entity,
        facing,
        broken: [...seenBroken],
        state: ui.entityState,
        inventory: ui.inventory,
      }
    }

    const takeLoot = async ({ entity, items }) => {
      const old = inventory((await readUi()).inventory)
      const expected = { ...old }
      for (const id of items) expected[id] = (expected[id] ?? 0) + 1
      await press('Enter', `interact with ${entity}`)
      await until(
        actionView,
        (view) => view.state.runtime?.scriptRunning || view.state.runtime?.dialogue || view.reward,
        `actual pickup ${entity} started`,
      )
      await driveAction(`pickup ${entity}`, maze, position)
      const ui = await readUi()
      assert.deepEqual(inventory(ui.inventory), expected)
      return { entity, items, inventory: ui.inventory }
    }

    const first = await restore(
      inputBytes,
      payload,
      '008-formal-007-restore',
      !!options['visual-review'],
    )
    report.checks.predecessorRestore = first.proof
    await waitForOpeningFrame(page, until)
    const initial = await snapshot()
    const initialUi = await readUi()
    assert.equal(inventory(initialUi.inventory)[hammer], 1)
    for (const item of loot)
      assert(
        !Object.hasOwn(inventory(initialUi.inventory), item),
        `predecessor already has ${item}`,
      )
    for (const id of statues) assert.equal(initial.actors[id].visible, true)
    assert.equal(initial.actors.e262.visible, false)
    report.start = {
      scene,
      position: initial.position,
      facing: initial.facing,
      inventory: initialUi.inventory,
    }
    mark('start-ready')
    try {
      for (const [index, leg] of mazePlan.slice(0, -1).entries()) {
        phase = `maze-${index + 1}`
        const target = `e${leg.id}`
        const observation = { phase, target, startOrder: await readOrder() }
        report.observations.push(observation)
        if (target === 'e262')
          observation.plateDraws = await until(
            () =>
              page.evaluate((after) => window.__readMazePlateDraws(after), observation.startOrder),
            (draws) => new Set(draws.map(({ frame }) => frame)).size > 1,
            'revealed blinking plate painted at least two animation frames',
            5000,
          )
        const beforeAction = await walk(leg)
        position = leg.landing
        observation.actionStartOrder = await readOrder()
        if (leg.ride) {
          assert.deepEqual(beforeAction.actors[target].position, at(leg.ride.waypoints.at(-1)))
          observation.ride = leg.ride
          if (target === 'e259') {
            const { entityState } = await readUi()
            assert.equal(entityState.e260, 0)
            assert.equal(entityState.e261, 2)
            observation.markers = { e260: entityState.e260, e261: entityState.e261 }
          }
        } else if (leg.kind === 'hammer') {
          const [facing] = leg.holds.at(-1)
          observation.hammer = await useHammer(
            { entity: target, facing },
            beforeAction,
            observation,
          )
        } else if (leg.kind === 'search') {
          const items = FAIRY_MAZE_LOOT[leg.id].map(String)
          observation.pickup = await takeLoot({ entity: target, items })
        } else observation.exit = target
        observation.endOrder = await readOrder()
        if (observation.pickup) await captureItemGuardSeed(page, out, report, target)
        console.log(`[reforge-008] ${phase} ${target} ${position.join(',')}`)
      }

      phase = 'opened-maze-to-peach-grove'
      const exit = mazePlan.at(-1)
      scene = exit.scene
      const observation = { phase, target: `e${exit.id}`, startOrder: await readOrder() }
      report.observations.push(observation)
      await walk(exit)
      const arrived = await driveAction('first peach grove arrival', peach, forest)
      observation.exit = observation.target
      observation.endOrder = await readOrder()
      scene = peach
      position = forest
      assert.equal(seenBroken.size, statues.length)
      report.route.status = 'passed'
      report.endWorld = {
        scene,
        position: arrived.position,
        facing: arrived.facing,
        controlReturned: true,
      }
      await waitForOpeningFrame(page, until)
      mark('peach-ready')
      await page.screenshot({ path: resolve(out, '008-peach-arrival.png') })

      phase = 'terminal-save'
      const terminal = await page.evaluate(() => window.__tpE2e.dumpSave())
      assert.equal(terminal.position.sceneId, peach)
      assert.deepEqual(terminal.position.pos, { col: forest[0], row: forest[1], height: 0 })
      assert.equal(terminal.position.facing, arrived.facing)
      const items = inventory(terminal.world.inventory)
      assert(!Object.hasOwn(items, hammer))
      for (const item of loot) assert.equal(items[item], 1, `wrong terminal amount of ${item}`)
      for (const id of statues) assert.equal(terminal.world.script.entityState[maze][id], 0)
      assert.equal(terminal.world.script.entityState[maze].e262, 1)
      const trace = await readLongEvidenceArchive(page)
      assertErrandCollector(trace, '008 story and save')
      report.contextTraces = [await writeLongEvidenceArtifact(out, '008-trace.json', trace)]
      report.checks.causality = verifyMazeCausality(trace, report.observations)
      const bytes = Buffer.from(JSON.stringify(terminal))
      await writeFile(resolve(out, '008.end.save.json'), bytes, { flag: 'wx' })
      report.checkpoint = {
        path: '008.end.save.json',
        sha256: sha256(bytes),
        byteLength: bytes.length,
      }
      await page.close()

      phase = 'terminal-restore'
      const restored = await restore(bytes, JSON.parse(bytes), '008-fresh-peach-restore')
      await waitReady(peach, forest)
      await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '008-peach-restored.png') })
      report.contextTraces.push(
        await writeLongEvidenceArtifact(out, '008-fresh-trace.json', restored.trace),
      )
      report.checks.terminalSave = 'passed'
      report.checks.terminalRestore = 'passed'
      report.persistence = { ...restored.proof, freshContext: true }
      for (const [path, expected] of Object.entries(report.hashes)) {
        assert.equal(
          sha256(await readFile(resolve(repoRoot, path))),
          expected,
          `008 source changed: ${path}`,
        )
      }
      report.sourceHashesStable = true
    } catch (error) {
      report.failurePhase = phase
      if (!page.isClosed() && !report.contextTraces?.length) {
        const trace = await readLongEvidenceArchive(page).catch(() => null)
        if (trace)
          report.contextTraces = [
            await writeLongEvidenceArtifact(out, '008-partial-trace.json', trace),
          ]
      }
      throw error
    }
  },
})
