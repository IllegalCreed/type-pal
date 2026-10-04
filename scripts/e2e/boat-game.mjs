import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { readBoatContract } from './boat-contract.mjs'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installErrandObserver, readBoatGame } from './errand-observer.mjs'
import { committedInnMoves } from './inn-navigation.mjs'
import { kitchenGrid, kitchenReady } from './kitchen-contract.mjs'
import { assertMealDialogue } from './meal-contract.mjs'
import { mealGameTouchDestination, navigateMealRoute } from './meal-journey.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'

const sceneMaps = {
  s001: 'map-012',
  s002: 'map-012',
  s003: 'map-010',
  s004: 'map-001',
  s005: 'map-002',
}
const sceneNumbers = { s001: 2, s002: 3, s003: 4, s004: 5, s005: 6, s014: 15 }
const dialogueIds = [
  342, 343, 345, 346, 347, 349, 350, 352, 353, 354, 356, 357, 359, 360, 362, 363, 364, 307, 308,
  310, 311, 312, 314, 316, 318, 319, 321, 322, 323, 325, 327, 328, 330, 331, 332, 334, 336, 337,
  339, 340, 533, 534, 535, 536, 538, 539, 540, 542, 543, 544, 546,
]
const speakerById = {
  ...Object.fromEntries(
    [
      366, 367, 368, 369, 374, 375, 376, 380, 381, 382, 386, 387, 388, 389, 390, 391, 392, 396, 397,
      398, 399, 400, 401, 405, 406, 408, 409, 410, 414, 415,
    ].map((id) => [id, '苗人头领']),
  ),
  ...Object.fromEntries([371, 372, 378, 384, 394, 403, 412, 417].map((id) => [id, '李逍遥'])),
  ...Object.fromEntries([418, 419].map((id) => [id, null])),
  ...Object.fromEntries([342, 343, 349, 350, 356, 357, 362, 363, 364].map((id) => [id, '洪大夫'])),
  ...Object.fromEntries(
    [345, 346, 347, 352, 353, 354, 359, 360, 307, 308, 314, 318, 319, 325, 330, 331, 332].map(
      (id) => [id, '李逍遥'],
    ),
  ),
  ...Object.fromEntries(
    [310, 311, 312, 316, 321, 322, 323, 327, 328, 334, 336, 337, 339, 340].map((id) => [
      id,
      '王小虎',
    ]),
  ),
  ...Object.fromEntries(
    [533, 534, 535, 536, 542, 543, 544, 546, 1888, 1889, 1890].map((id) => [
      id,
      id >= 1888 ? '张四哥' : '张四',
    ]),
  ),
  ...Object.fromEntries([538, 539, 540, 1886].map((id) => [id, '李逍遥'])),
}

function gameGrid(position) {
  return kitchenGrid(position, 'game')
}

function gameScene(state, id) {
  return state.scene === sceneNumbers[id]
}

function rowsFor(locale, ids) {
  return ids.map((id) => ({
    id: `dlg.${id}`,
    text: locale[`dlg.${id}`],
    speaker: speakerById[id],
  }))
}

function assertRenderedRows(trace, locale, ids) {
  return assertMealDialogue(trace, 'game', { locale, rows: rowsFor(locale, ids) }, true)
}

export async function runBoatGame() {
  const args = process.argv.slice(2),
    mode = args.includes('--headed') ? '--headed' : '--headless',
    fromIndex = args.indexOf('--from')
  assert(fromIndex >= 0 && args[fromIndex + 1], '006 game requires --from 005 saves report')
  const predecessorPath = resolve(args[fromIndex + 1]),
    predecessor = JSON.parse(await readFile(predecessorPath, 'utf8'))
  assert.equal(predecessor.fragment, '005')
  assert.equal(predecessor.engine, 'game')
  assert.equal(predecessor.case, 'saves')
  assert.equal(predecessor.status, 'passed')
  const checkpointPath = resolve(predecessorPath, '..', predecessor.checkpoint.path),
    checkpointBytes = await readFile(checkpointPath)
  assert.equal(sha256(checkpointBytes), predecessor.checkpoint.sha256)
  const contract = await readBoatContract(),
    locale = JSON.parse(
      await readFile(resolve(repoRoot, 'projects/pal/content/locale.json'), 'utf8'),
    )

  await runBrowserJourney({
    name: 'game-006',
    packageName: '@type-pal/game',
    environment: { E2E: '1' },
    traceConfig: 'scripts/e2e/errand-game.config.mts',
    arguments: [mode],
    initScripts: [installErrandObserver],
    sources: [
      ...Object.keys(contract.hashes),
      'projects/pal/content/locale.json',
      'scripts/e2e/boat-contract.mjs',
      'scripts/e2e/boat-game.mjs',
      'scripts/e2e/errand-observer.mjs',
      'scripts/e2e/inn-navigation.mjs',
      'scripts/e2e/kitchen-contract.mjs',
      'scripts/e2e/meal-journey.mjs',
      'packages/game/src/core/event-system.ts',
    ],
    journey: async ({ newPage, baseURL, out, report, until, health }) => {
      Object.assign(report, {
        fragment: '006',
        engine: 'game',
        case: 'story',
        kind: 'verify',
        predecessor: { report: predecessorPath, sha256: predecessor.checkpoint.sha256 },
        core: { status: 'running', rows: [], sourceHashes: contract.hashes },
        route: { status: 'running', inputs: [], legs: [] },
        checks: {},
      })
      let page,
        phase = 'bootstrap',
        phaseOrder = -1
      const motion = [],
        stateTrace = [],
        stateKeys = new Set(),
        rideScreenshot = { promise: undefined },
        snapshot = async () => {
          const state = await page.evaluate(readBoatGame)
          const key = JSON.stringify(state)
          if (!stateKeys.has(key)) {
            stateKeys.add(key)
            stateTrace.push({ atMs: Date.now(), phase, state })
          }
          return state
        },
        evidence = () => page.evaluate(() => window.__readErrandEvidence()),
        drive = () => page.evaluate((after) => window.__readErrandDrive(after), phaseOrder),
        ready = (state) => kitchenReady(state, 'game'),
        grid = (state) => gameGrid(state.position),
        press = async (key, reason) => {
          report.actions.push({ phase, key, reason, atMs: Date.now() })
          await page.keyboard.down(key)
          await page.keyboard.up(key)
        },
        begin = async (label) => {
          phase = label
          phaseOrder = (await drive()).order
        }
      const bootstrap = async () => {
        page = await newPage('006-real-005-saves')
        await page.goto(baseURL)
        await until(
          async () => {
            for (const name of ['拒绝']) {
              const button = page.getByRole('button', { name, exact: true })
              if (await button.isVisible()) await button.click()
            }
            const enter = page.locator('#boot-loading-enter-btn')
            if (await enter.isVisible()) await enter.click()
            const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
            if (await start.isVisible()) await start.click()
            const video = await page.evaluate(
              () => document.querySelector('video')?.currentSrc ?? null,
            )
            if (video) {
              await press('Enter', 'close title prelude outside 006')
              await until(
                () => page.evaluate(() => document.querySelector('video')?.currentSrc ?? null),
                (next) => next !== video,
                'title prelude closes',
              )
              return false
            }
            return (await snapshot()).menu?.kind === 'opening'
          },
          Boolean,
          'opening menu',
          60000,
        )
        const staged = await page.evaluate(async (bytes) => {
          const { Save } = await import('/src/core/save/api.ts'),
            { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
          if ((await Save.listSlots()).length) throw new Error('nonempty test slots')
          await Save.saveSlot(1, parseImportedSave(bytes))
          return serializeSave(await Save.loadSlot(1))
        }, checkpointBytes.toString('utf8'))
        assert.equal(sha256(staged), sha256(checkpointBytes), 'staged predecessor bytes changed')
        await press('ArrowDown', '旧的回忆')
        await until(
          snapshot,
          (state) => state.menu?.kind === 'opening' && state.menu.cursor === 1,
          'load selection',
        )
        await press('Enter', 'open slot menu')
        await until(
          snapshot,
          (state) => state.menu?.kind === 'save-slot' && state.menu.cursor === 0,
          'slot menu',
        )
        await press('Enter', 'formal slot1 restore')
        await until(
          snapshot,
          (state) => ready(state) && gameScene(state, 's004'),
          '005 predecessor restored',
          60000,
        )
      }
      const navigate = async (sid, destination, finished, sample) => {
        const startOrder = (await drive()).order
        await navigateMealRoute({
          engine: 'game',
          keyboard: page.keyboard,
          map: contract.maps[sceneMaps[sid]],
          read: async () => {
            const state = await snapshot()
            sample?.(state)
            // The original first-stage touch footprint is checked separately;
            // NPC bodies are not route waypoints and must not make the planner
            // declare a dead end while approaching the next trigger.
            return { ...state, routeActors: [] }
          },
          until,
          health,
          grid,
          inScene: (state) => gameScene(state, sid),
          ready,
          destination,
          finished,
          boundaryCommitted: async () =>
            committedInnMoves(await evidence(), startOrder).some(
              (event) =>
                event.scene === sid &&
                event.source === 'commit:tickSceneInput' &&
                destination(...gameGrid(event.state.position)),
            ),
          onInput: (input) => report.route.inputs.push({ phase, scene: sid, ...input }),
          onProgress: (progress) => {
            report.route.progress ??= []
            report.route.progress.push({ phase, scene: sid, ...progress })
          },
          onReplan: (value) => {
            report.route.replans ??= []
            report.route.replans.push({ phase, scene: sid, ...value })
          },
        })
        report.route.legs.push({ phase, scene: sid, startOrder, endOrder: (await drive()).order })
      }
      const touch = async (sid, id, finished, sample) => {
        const actor = (await snapshot()).actors[id]
        assert(actor?.visible, `missing touch target ${sid}/${id}`)
        const range = actor.triggerMode >= 4 ? actor.triggerMode - 4 : 1
        await navigate(
          sid,
          (col, row) =>
            mealGameTouchDestination(actor, col, row) ||
            Math.max(
              Math.abs(col - gameGrid(actor.position)[0]),
              Math.abs(row - gameGrid(actor.position)[1]),
            ) <= range,
          finished,
          sample,
        )
      }
      const interact = async (sid, id) => {
        const actor = (await snapshot()).actors[id]
        assert(actor?.visible, `missing interaction target ${sid}/${id}`)
        const [tc, tr] = gameGrid(actor.position),
          near = (col, row) => Math.abs(col - tc) + Math.abs(row - tr) === 1
        if (sid === 's002' && id === 'e36')
          console.log(
            '[game-006] room-start',
            JSON.stringify({
              position: (await snapshot()).position,
              target: actor.position,
              grid: grid(await snapshot()),
              targetGrid: [tc, tr],
            }),
          )
        await navigate(
          sid,
          near,
          (state) => gameScene(state, sid) && ready(state) && near(...grid(state)),
        )
        const [col, row] = grid(await snapshot()),
          facing = tc > col ? 'right' : tc < col ? 'left' : tr > row ? 'down' : 'up',
          key = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' }[facing]
        await page.keyboard.down(key)
        await until(snapshot, (state) => state.facing === facing, 'face interaction target')
        await page.keyboard.up(key)
        await press('Enter', `interact ${sid}/${id}`)
        await until(snapshot, (state) => !ready(state), 'interaction starts')
      }
      const dialogue = async (label, sid, ids) => {
        phase = label
        for (;;) {
          health()
          const state = await snapshot()
          if (label === 'doctor' && !report._doctorSnapshot) {
            report._doctorSnapshot = state
            console.log('[game-006] doctor-start', JSON.stringify(state))
          }
          assert(gameScene(state, sid), `${label} left ${sid}`)
          if (ready(state)) break
          if (state.dialog && ['waiting-page-key', 'waiting-end-key'].includes(state.dialog.phase))
            await press('Enter', `${label} dialogue confirmation`)
          await new Promise((done) => setTimeout(done, 40))
        }
        const phaseTrace = await drive()
        if (label === 'doctor')
          await writeFile(
            resolve(out, '006-doctor-debug.json'),
            `${JSON.stringify(phaseTrace, null, 2)}\n`,
          )
        assertRenderedRows(phaseTrace, locale, ids)
        report.core.rows.push(...ids.map((id) => `dlg.${id}`))
        report.checks[label] = 'passed'
      }
      try {
        await bootstrap()
        assert.equal((await snapshot()).scene, 5)
        await begin('return-to-inn')
        await touch('s004', 'e94', (state) => gameScene(state, 's003') && ready(state))
        await touch('s003', 'e49', (state) => gameScene(state, 's002') && ready(state))
        await begin('doctor')
        await touch('s002', 'e35', (state) => gameScene(state, 's002') && !ready(state))
        await dialogue('doctor', 's002', dialogueIds.slice(0, 17))
        await begin('room')
        await interact('s002', 'e36')
        await dialogue('room-initial', 's002', dialogueIds.slice(17, 36))
        await begin('room-repeat-1')
        if (ready(await snapshot())) await interact('s002', 'e36')
        else await until(snapshot, (state) => !!state.dialog, 'room repeat 1 dialogue starts')
        await dialogue('room-repeat-1', 's002', dialogueIds.slice(36, 38))
        await begin('room-repeat-2')
        if (ready(await snapshot())) await interact('s002', 'e36')
        else await until(snapshot, (state) => !!state.dialog, 'room repeat 2 dialogue starts')
        await dialogue('room-repeat-2', 's002', dialogueIds.slice(38, 40))
        report.checks.room = 'passed'
        await begin('miao-leader')
        await touch('s002', 'e32', (state) => gameScene(state, 's003'))
        await until(
          snapshot,
          (state) => gameScene(state, 's003') && ready(state),
          'miao leader auto settles',
        )
        await touch('s003', 'e59', (state) => gameScene(state, 's003') && !ready(state))
        await until(
          snapshot,
          (state) => gameScene(state, 's003') && !!state.dialog,
          'miao leader counsel starts',
        )
        await dialogue(
          'miao-leader',
          's003',
          [
            366, 367, 368, 369, 371, 372, 374, 375, 376, 378, 380, 381, 382, 384, 386, 387, 388,
            389, 390, 391, 392, 394, 396, 397, 398, 399, 400, 401, 403, 405, 406, 408, 409, 410,
            412, 414, 415, 417, 418, 419,
          ],
        )
        await begin('inn-exit')
        await touch(
          's003',
          'e44',
          (state) => gameScene(state, 's004') || (gameScene(state, 's003') && !ready(state)),
        )
        await until(snapshot, ready, 's004 entry settles')
        await touch(
          's004',
          'e95',
          (state) => gameScene(state, 's005') || (gameScene(state, 's004') && !ready(state)),
        )
        await until(snapshot, ready, 's005 entry settles')
        await begin('boat')
        await interact('s005', 'e123')
        await dialogue('boat', 's005', dialogueIds.slice(40))
        await page.screenshot({ path: resolve(out, '006-before-ride.png') })
        await touch(
          's005',
          'e116',
          (state) => gameScene(state, 's014'),
          (state) => {
            if (!gameScene(state, 's005')) return
            const sample = {
              position: state.position,
              facing: state.facing,
              e116: state.actors.e116?.position,
              e117: state.actors.e117?.position,
              e123: state.actors.e123?.position,
              e123Visible: state.actors.e123?.visible,
            }
            if (JSON.stringify(motion.at(-1)) !== JSON.stringify(sample)) {
              motion.push(sample)
              if (!rideScreenshot.promise && motion.length > 30)
                rideScreenshot.promise = page.screenshot({
                  path: resolve(out, '006-during-ride.png'),
                })
            }
          },
        )
        if (rideScreenshot.promise) await rideScreenshot.promise
        report.checks.island = 'passed'
        await page.screenshot({ path: resolve(out, '006-island-arrival.png') })
        report.endWorld = {
          position: {
            sceneId: 's014',
            pos: { x: (await snapshot()).position[0], y: (await snapshot()).position[1] },
          },
          arrivalDialogue: [],
        }
        const normalized = motion.map((sample) => ({
            ...sample,
            position: gameGrid(sample.position),
            e116: sample.e116 ? gameGrid(sample.e116) : null,
            e117: sample.e117 ? gameGrid(sample.e117) : null,
          })),
          origin = normalized[0]?.e116,
          ride = normalized.filter(
            (sample) =>
              sample.e116 &&
              origin &&
              Math.hypot(sample.e116[0] - origin[0], sample.e116[1] - origin[1]) > 0.01,
          )
        assert(ride.length >= 3, 'boat never committed a multi-sample ride')
        const relativeOffset = ride[0].position.map((value, index) => value - ride[0].e116[index]),
          companionOffset = ride[0].e117.map((value, index) => value - ride[0].e116[index])
        for (const sample of ride) {
          assert.deepEqual(
            sample.position.map((value, index) => value - sample.e116[index]),
            relativeOffset,
            'party detached from boat during ride',
          )
          assert.deepEqual(
            sample.e117.map((value, index) => value - sample.e116[index]),
            companionOffset,
            'rower detached from boat during ride',
          )
        }
        report.boatMotion = {
          samples: ride.length,
          relativeOffset,
          companionOffset,
          rideFacings: [...new Set(ride.map((sample) => sample.facing))],
          partyBoatRelative: 'constant-through-ride',
          final: motion.at(-1) ?? null,
          source: '006-boat-motion.json',
        }
        await writeFile(
          resolve(out, '006-boat-motion.json'),
          `${JSON.stringify(motion, null, 2)}\n`,
        )
        await writeFile(
          resolve(out, '006-state-trace.json'),
          `${JSON.stringify(stateTrace, null, 2)}\n`,
        )
        report.stateTrace = { path: '006-state-trace.json', samples: stateTrace.length }
        await writeFile(
          resolve(out, '006-end.json'),
          `${JSON.stringify(report.endWorld, null, 2)}\n`,
        )
        report.core.status = 'passed'
        report.route.status = 'passed'
        report.status = 'passed'
        report.sourceHashesStable = true
        report.endFrame = await waitForOpeningFrame(page, until)
      } finally {
        report.lastPhase = phase
      }
    },
  })
}

await runBoatGame()
