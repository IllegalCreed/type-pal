import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { checkBoatCheckpoint } from './boat-checkpoint-contract.mjs'
import { assertBoatReport } from './boat-contract.mjs'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { committedRouteReceipt, installCommittedRoutePlayback } from './committed-route.mjs'
import { continuousScene } from './continuous-route.mjs'
import { assertErrandCollector, errandSaveView } from './errand-contract.mjs'
import { readErrandGame, readErrandReforge } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS } from './errand-trace-plugin.mjs'
import { executeFixedRoute, fixedRoutePlan } from './fixed-route-plan.mjs'
import {
  assertInputLedger,
  canonicalInput,
  pressRecordedKey,
  withRecordedKey,
} from './input-ledger.mjs'
import { ISLAND_SCENES, islandEntranceObserverScript } from './island-entrance-trace.mjs'
import { kitchenReady } from './kitchen-contract.mjs'
import { readLongEvidenceArchive, writeLongEvidenceArtifact } from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

const { values: options } = parseArgs({
  options: {
    engine: { type: 'string' },
    from: { type: 'string' },
    headed: { type: 'boolean' },
    headless: { type: 'boolean' },
    'visual-review': { type: 'boolean' },
  },
})
const engine = options.engine
assert(engine === 'game' || engine === 'reforge', '007 requires --engine game or reforge')
assert(options.from, '007 requires --from a formal 006 verify report')
assert(!(options.headed && options.headless), 'choose one browser mode')
const game = engine === 'game'
const predecessorPath = resolve(options.from)
const predecessorBytes = await readFile(predecessorPath)
const predecessor = JSON.parse(predecessorBytes)
assertBoatReport(predecessor)
assert.equal(predecessor.engine, engine, '007 predecessor must use the same engine')
await checkBoatCheckpoint(predecessorPath, predecessor)
const inputBytes = await readFile(resolve(dirname(predecessorPath), predecessor.checkpoint.path))
assert.equal(sha256(inputBytes), predecessor.checkpoint.sha256)

const teams = new Map([
  ['e206', { teamId: 'team-16', exp: 2 }],
  ['e207', { teamId: 'team-15', exp: 1 }],
  ['e208', { teamId: 'team-40', exp: 4 }],
  ['e209', { teamId: 'team-17', exp: 5 }],
])
const dockPlan = fixedRoutePlan(engine, {
  id: 'dock-to-island-entrance',
  scene: 's014',
  start: [74, 27],
  holds: [['ArrowUp', 44]],
  completion: { scene: 's015', position: [117, 91], mode: 'ready' },
})
const islandPlan = fixedRoutePlan(engine, {
  id: 'island-entrance-to-maze',
  scene: 's015',
  start: [117, 91],
  holds: [['ArrowUp', 88]],
  completion: { scene: 's017', position: [90, 54], mode: 'ready' },
})
const ready = (state, scene) =>
  kitchenReady(state, engine) && (scene === undefined || continuousScene(state, engine) === scene)
const reportSources = [
  ...ERRAND_TRACE_TARGETS,
  ...ISLAND_SCENES.map((scene) => `projects/pal/content/scenes/${scene}.json`),
  ...['003', '007', '006'].map((map) => `projects/pal/content/maps/map-${map}.json`),
  'projects/pal/manifest.json',
  'projects/pal/assets/index.json',
  'projects/pal/content/enemies.json',
  'projects/pal/content/enemy-teams.json',
  'projects/pal/content/battle-fields.json',
  ...(game
    ? [
        'data/extracted/events/all.json',
        'data/extracted/data/event-objects.json',
        ...['014', '015', '017'].map((scene) => `data/extracted/events/scene-${scene}.json`),
        ...[
          'player-roles',
          'enemies',
          'enemy-objects',
          'enemy-teams',
          'battle-fields',
          'level-up-exp',
        ].map((table) => `data/extracted/data/${table}.json`),
        ...[14, 15, 17].map((scene) => `data/extracted/data/scene/${scene}.json`),
        ...[3, 7, 6].map((map) => `data/extracted/data/tilemap/${map}.json`),
      ]
    : []),
]

// The route waiter validates every actual movement commit. A real battle can
// interrupt it before the next commit, at which point the held key is released.
async function waitForRouteOrEncounter() {
  let timer
  const encounter = new Promise((resolve) => {
    const observe = () => {
      const battle = window.__islandBattle?.read()
      if (battle) resolve({ battle })
      else timer = setTimeout(observe, 12)
    }
    observe()
  })
  try {
    return await Promise.race([window.__routeWait(), encounter])
  } finally {
    clearTimeout(timer)
  }
}

function observeBattleWorld({ game, entityId }) {
  if (game) {
    const gs = window.__tpgs
    const entity = gs.allEventObjects.find(({ id }) => `e${id}` === entityId)
    return {
      party: gs.partyMembers,
      level: gs.Exp.rgPrimaryExp[0].wLevel,
      exp: gs.Exp.rgPrimaryExp[0].wExp,
      cash: gs.dwCash,
      hidden: entity ? entity.sState < 0 && entity.sVanishTime > 0 : null,
    }
  }
  const world = window.__rfWorld
  const entity = window.__rfScene.entities.find(({ id }) => id === entityId)
  return {
    party: world.party.map(({ id }) => id),
    level: world.party[0].level,
    exp: world.party[0].exp,
    cash: world.money,
    hidden: entity ? !!entity.hidden : null,
  }
}

await runBrowserJourney({
  name: `${engine}-007${options['visual-review'] ? '-visual-review' : ''}`,
  packageName: `@type-pal/${engine}`,
  environment: game ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
  traceConfig: `scripts/e2e/island-${engine}.config.mts`,
  arguments: [options.headed ? '--headed' : '--headless'],
  initScripts: [islandEntranceObserverScript(), installCommittedRoutePlayback],
  sources: reportSources,
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      fragment: '007',
      engine,
      case: 'story',
      kind: 'verify',
      predecessor: {
        report: predecessorPath,
        reportSha256: sha256(predecessorBytes),
        sha256: predecessor.checkpoint.sha256,
      },
      route: { status: 'running', legs: [], inputs: [] },
      encounters: [],
      checks: {},
    })
    const visualReview = options['visual-review'] === true
    if (visualReview) report.visualReviewMarks = []
    let videoStart
    const mark = (name) => {
      report.visualReviewMarks?.push({
        name,
        elapsedMs: Math.round(performance.now() - videoStart),
      })
    }
    let page
    let phase = 'bootstrap'
    const snapshot = () => page.evaluate(game ? readErrandGame : readErrandReforge)
    const evidence = () => page.evaluate(() => window.__readErrandRouteEvidence())
    const readBattle = () => page.evaluate(() => window.__islandBattle?.read() ?? null)
    const press = (key, reason, scope) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, key, reason, scope }),
        record: (action) => report.actions.push(action),
      })
    const waitReady = (scene) =>
      until(snapshot, (state) => ready(state, scene), `control returned in ${scene}`)

    const restore = async (bytes, scene, label, visualReviewVideo = false) => {
      phase = 'restore'
      if (visualReviewVideo) videoStart = performance.now()
      page = await newPage(label, { visualReviewVideo })
      if (game) {
        await page.goto(baseURL)
        await until(
          async () => {
            const reject = page.getByRole('button', { name: '拒绝', exact: true })
            if (await reject.isVisible()) await reject.click()
            const enter = page.locator('#boot-loading-enter-btn')
            if (await enter.isVisible()) await enter.click()
            const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
            if (await start.isVisible()) await start.click()
            const video = await page.evaluate(() => document.querySelector('video')?.currentSrc)
            if (video) {
              await press('Enter', 'close title prelude')
              await until(
                () => page.evaluate(() => document.querySelector('video')?.currentSrc),
                (next) => next !== video,
                'title prelude closed',
              )
              return false
            }
            return (await snapshot()).menu?.kind === 'opening'
          },
          Boolean,
          'opening menu',
          60_000,
        )
        const staged = await page.evaluate(async (bytes) => {
          const { Save } = await import('/src/core/save/api.ts')
          const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
          if ((await Save.listSlots()).length) throw new Error('nonempty test slots')
          await Save.saveSlot(1, parseImportedSave(bytes))
          return serializeSave(await Save.loadSlot(1))
        }, bytes.toString('utf8'))
        assert.equal(sha256(staged), sha256(bytes), 'staged checkpoint bytes changed')
        await press('ArrowDown', '旧的回忆')
        await until(
          snapshot,
          (s) => s.menu?.kind === 'opening' && s.menu.cursor === 1,
          'load selection',
        )
        await press('Enter', 'open save slots')
        await until(
          snapshot,
          (s) => s.menu?.kind === 'save-slot' && s.menu.cursor === 0,
          'slot menu',
        )
        await press('Enter', 'restore formal slot 1')
        await waitReady(scene)
      } else {
        await page.route('**/__007-checkpoint.json', (route) =>
          route.fulfill({ contentType: 'application/json', body: bytes }),
        )
        await page.goto(`${baseURL}/?e2e-load=%2F__007-checkpoint.json`)
        await until(
          snapshot,
          (state) => state.boot?.checkpointLoad === 'loaded' && ready(state, scene),
          `formal checkpoint restored in ${scene}`,
          60_000,
        )
      }
      const trace = await readLongEvidenceArchive(page)
      try {
        assertErrandCollector(trace, '007 restore')
        const payload = JSON.parse(bytes)
        const commits = game ? trace.gameRestores : trace.restoreCommits
        assert.equal(commits.length, 1, 'expected exactly one formal restore')
        const [commit] = commits
        const completeGameDomain = game ? assertBoatGameRestore(payload, commit.payload) : undefined
        if (!game) assertReforgeRestoreInput(trace, payload)
        const expected = errandSaveView(payload, engine)
        assert.deepEqual(errandSaveView(commit.payload, engine), expected)
        assert.equal(trace.pages.filter(({ page }) => page).length, 0, 'restore replayed dialogue')
        return {
          trace,
          proof: {
            source: commit.source,
            order: commit.order,
            stateSha256: sha256(JSON.stringify(expected)),
            completeGameDomain,
          },
        }
      } catch (error) {
        report.rejectedRestore = await writeLongEvidenceArtifact(
          out,
          '007-rejected-restore-trace.json',
          trace,
        )
        throw error
      }
    }

    const settleEncounter = async (initial) => {
      const { entityId, teamId } = initial
      const expected = teams.get(entityId)
      assert(
        initial.allowed && expected?.teamId === teamId,
        `unknown 007 encounter ${entityId}/${teamId}`,
      )
      assert(!report.encounters.some((entry) => entry.entityId === entityId), 'encounter repeated')
      const encounter = { entityId, teamId, status: 'entered', screens: [] }
      report.encounters.push(encounter)
      mark(`encounter-${entityId}`)
      const launch = await snapshot()
      assert.equal(continuousScene(launch, engine), 's015')
      const before = await page.evaluate(observeBattleWorld, { game, entityId })
      assert.deepEqual(before.party, game ? [0] : ['li-xiaoyao'])
      assert.equal(before.hidden, false)
      encounter.position = launch.position
      encounter.before = before
      const active = (battle) => {
        assert(battle?.allowed && battle.entityId === entityId && battle.teamId === teamId)
        return battle
      }
      await until(readBattle, (battle) => active(battle).ready, 'ordinary encounter ready')
      const requests = await page.evaluate(() => [
        window.__islandBattle.request(),
        window.__islandBattle.request(),
      ])
      assert.deepEqual(
        requests,
        [true, false],
        'only the first valid speed-win request may succeed',
      )
      encounter.status = 'requested'
      for (;;) {
        const screen = await until(
          readBattle,
          (battle) =>
            !battle ||
            (active(battle).settlement != null && !encounter.screens.includes(battle.settlement)),
          'victory settlement screen or map return',
        )
        if (!screen) break
        assert(screen.requested)
        encounter.screens.push(screen.settlement)
        mark(`settlement-${entityId}-${encounter.screens.length}`)
        await press('Enter', 'confirm the actual victory settlement')
      }
      assert(encounter.screens.length > 0, 'victory returned without a formal settlement screen')
      const returned = await waitReady('s015')
      assert.deepEqual(returned.position, launch.position, 'battle changed the route position')
      const after = await page.evaluate(observeBattleWorld, { game, entityId })
      assert.deepEqual(after, { ...before, exp: before.exp + expected.exp, hidden: true })
      assert.equal(await page.evaluate(() => window.__islandBattle.request()), false)
      Object.assign(encounter, { status: 'passed', after })
      console.log(`[${engine}-007] ${entityId} victory settled +${expected.exp} EXP`)
    }

    const traverseEntrance = async () => {
      phase = 'walk-island-entrance'
      const scene = 's015'
      const order = (trace) => trace.events.at(-1)?.order ?? -1
      const startOrder = order(await evidence())
      const startInput = report.route.inputs.length
      let index = 0
      let end
      for (;;) {
        health()
        const remaining = islandPlan.steps.slice(index)
        assert(remaining.length, 'route committed without reaching the maze')
        await page.evaluate((steps) => window.__routeArm({ kind: 'moves', steps }), remaining)
        let result
        try {
          await withRecordedKey({
            keyboard: page.keyboard,
            key: 'ArrowUp',
            onInput: (input) => {
              const action = canonicalInput({ phase, scene, ...input })
              report.route.inputs.push(action)
              report.actions.push(action)
            },
            body: async () => {
              result = await page.evaluate(waitForRouteOrEncounter)
              assert(!result.error, result.error)
            },
          })
          if (!result.battle) {
            const finalized = await page.evaluate(() => window.__routeFinalize())
            assert(!finalized.error, finalized.error)
          }
        } finally {
          await page.evaluate(() => window.__routeCancel())
        }
        if (result.battle) {
          await settleEncounter(result.battle)
          end = await waitReady(scene)
        } else end = await waitReady('s017')
        const trace = await evidence()
        const replay = committedRouteReceipt({
          id: 1,
          engine,
          trace,
          startOrder,
          endOrder: order(trace),
          scene,
          end,
          ready: ready(end),
          inputCount: report.route.inputs.length - startInput,
        })
        index = replay.steps.length
        assert.deepEqual(
          replay.steps.map(({ order: _order, ...step }) => step),
          islandPlan.steps.slice(0, index),
          'movement diverged from the authored island route',
        )
        if (!result.battle) {
          assert.equal(index, islandPlan.steps.length)
          assert.deepEqual(replay.completion, islandPlan.completion)
          report.route.legs.push({
            phase,
            scene,
            startOrder,
            endOrder: order(trace),
            replay,
            inputPlan: islandPlan,
          })
          return end
        }
        const next = islandPlan.steps[index]
        assert(next && ready(end, scene))
        assert.deepEqual(end.position, next.from, 'wrong resumption grid after encounter')
      }
    }

    const start = await restore(inputBytes, 's014', '007-real-006-restore', visualReview)
    report.checks.predecessorRestore = start.proof
    mark('start-ready')
    phase = 'walk-dock'
    await executeFixedRoute({
      page,
      engine,
      plan: dockPlan,
      scene: 's014',
      id: 0,
      phase,
      report,
      snapshot,
      evidence,
      ready,
      finished: (s) => ready(s, 's015'),
      health,
    })
    const end = await traverseEntrance()
    mark('end-ready')
    assert(report.encounters.length > 0, '007 route did not encounter an enemy')
    assert(report.encounters.every((entry) => entry.status === 'passed'))
    report.route.status = 'passed'
    report.endWorld = {
      scene: 's017',
      position: end.position,
      facing: end.facing,
      controlReturned: true,
    }
    await waitForOpeningFrame(page, until)
    await page.screenshot({ path: resolve(out, '007-maze-arrival.png') })

    phase = 'end-save'
    const readSaveStatus = () => page.evaluate(() => window.__readErrandStatus())
    const beforeSave = game ? await readSaveStatus() : null
    let bytes
    if (game) {
      await press('F5', 'formal maze arrival checkpoint')
      await until(
        readSaveStatus,
        (status) => status.saveCompletions === beforeSave.saveCompletions + 1,
        'formal terminal save acknowledged',
      )
      bytes = Buffer.from(
        await page.evaluate(async () => {
          const { Save } = await import('/src/core/save/api.ts')
          const { serializeSave } = await import('/src/tools/save-io.ts')
          return serializeSave(await Save.loadSlot(1))
        }),
      )
    } else {
      bytes = Buffer.from(JSON.stringify(await page.evaluate(() => window.__tpE2e.dumpSave())))
    }
    const trace = await readLongEvidenceArchive(page)
    assertErrandCollector(trace, '007 story and save')
    report.contextTraces = [await writeLongEvidenceArtifact(out, '007-trace.json', trace)]
    const payload = JSON.parse(bytes)
    let captureProof
    if (game) {
      assert.equal(payload.gs.wNumScene, 18)
      assert.deepEqual([payload.gs.party.x, payload.gs.party.y], end.position)
      const captures = trace.saveCaptures.slice(beforeSave.saveCaptures)
      const completions = trace.saveCompletions.slice(beforeSave.saveCompletions)
      assert.equal(captures.length, 1)
      assert.equal(completions.length, 1)
      const [capture] = captures
      const [completion] = completions
      assert.equal(capture.slot, 1)
      assert.equal(completion.captureSeq, capture.seq)
      assert(completion.order > capture.order)
      assertBoatGameSaveCapture(payload, capture.payload)
      captureProof = { inputOrder: capture.order, acknowledgementOrder: completion.order }
    } else {
      assert.equal(payload.position.sceneId, 's017')
      const { col, row, height } = payload.position.pos
      assert.deepEqual([col, row, height], end.position)
    }
    await writeFile(resolve(out, '007.end.save.json'), bytes, { flag: 'wx' })
    report.checkpoint = {
      path: '007.end.save.json',
      sha256: sha256(bytes),
      byteLength: bytes.length,
      ...(captureProof ? { captureProof } : {}),
    }
    await page.close()
    const restored = await restore(bytes, 's017', '007-fresh-maze-restore')
    assert.deepEqual((await snapshot()).position, end.position)
    await waitForOpeningFrame(page, until)
    await page.screenshot({ path: resolve(out, '007-maze-restored.png') })
    report.contextTraces.push(
      await writeLongEvidenceArtifact(out, '007-fresh-trace.json', restored.trace),
    )
    report.checks.terminalSave = 'passed'
    report.checks.terminalRestore = 'passed'
    report.persistence = { ...restored.proof, freshContext: true }
    assertInputLedger(report.actions, { requireReceipts: true })
    for (const [path, expected] of Object.entries(report.hashes)) {
      assert.equal(
        sha256(await readFile(resolve(repoRoot, path))),
        expected,
        `007 source changed: ${path}`,
      )
    }
    report.sourceHashesStable = true
  },
})
