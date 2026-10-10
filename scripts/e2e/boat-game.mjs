import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  assertBoatMotion,
  assertBoatReport,
  assertBoatStoryEnd,
  boatArguments,
  ISLAND_ARRIVAL_ROWS,
  readBoatContract,
} from './boat-contract.mjs'
import { boatMotionEvidence } from './boat-motion-evidence.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback, recordFacingInput } from './committed-route.mjs'
import { assertErrandCollector, readErrandContract, readErrandReceipt } from './errand-contract.mjs'
import { errandCausalObserverScript, readBoatGame } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS } from './errand-trace-plugin.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { guardedEvidenceReader } from './evidence-diagnostics.mjs'
import { executeFixedRoute } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { kitchenGrid, kitchenReady } from './kitchen-contract.mjs'
import {
  encodeLongEvidence,
  readLongEvidenceArchive,
  writeLongEvidenceArtifact,
} from './long-evidence.mjs'
import { assertMealDialogue } from './meal-contract.mjs'
import { npcStoryBoundary } from './npc-story-scope.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { producerExtraInputs } from './producer-inputs.mjs'
import { storyInputPlan } from './story-input-plans.mjs'

const sceneNumbers = { s001: 2, s002: 3, s003: 4, s004: 5, s005: 6, s014: 15 }
const dialogueIds = [
  342, 343, 345, 346, 347, 349, 350, 352, 353, 354, 356, 357, 359, 360, 362, 363, 364, 307, 308,
  310, 311, 312, 314, 316, 318, 319, 321, 322, 323, 325, 327, 328, 330, 331, 332, 334, 336, 337,
  339, 340, 533, 534, 535, 536, 538, 539, 540, 542, 543, 544, 546,
]

function gameGrid(position) {
  return kitchenGrid(position, 'game')
}

function gameScene(state, id) {
  return state.scene === sceneNumbers[id]
}

function assertRenderedRows(trace, dialogue, ids) {
  const rows = ids.map((id) => dialogue.rows.find((row) => row.id === `dlg.${id}`))
  assert(rows.every(Boolean), 'boat phase contains an unknown source row')
  return assertMealDialogue(trace, 'game', { ...dialogue, rows }, true)
}

export async function runBoatGame() {
  const options = boatArguments(process.argv.slice(2)),
    mode = options.headless ? '--headless' : '--headed'
  const predecessorPath = options.from,
    predecessor = await readErrandReceipt(predecessorPath, await readErrandContract())
  assert.equal(predecessor.fragment, '005')
  assert.equal(predecessor.engine, 'game')
  assert.equal(predecessor.case, 'saves')
  assert.equal(predecessor.status, 'passed')
  const checkpointPath = resolve(predecessorPath, '..', predecessor.checkpoint.path),
    checkpointBytes = await readFile(checkpointPath)
  assert.equal(sha256(checkpointBytes), predecessor.checkpoint.sha256)
  const contract = await readBoatContract()

  await runBrowserJourney({
    name: 'game-006',
    packageName: '@type-pal/game',
    environment: { E2E: '1' },
    traceConfig: 'scripts/e2e/errand-game.config.mts',
    arguments: [mode],
    initScripts: [errandCausalObserverScript(), installCommittedRoutePlayback],
    sources: [
      ...producerExtraInputs('006', 'game'),
      'scripts/e2e/boat-motion-evidence.mjs',
      'scripts/e2e/fixed-route-plan.mjs',
      'scripts/e2e/story-input-plans.mjs',
      'scripts/e2e/evidence-artifact.mjs',
      ...Object.keys(contract.hashes),
      'projects/pal/content/locale.json',
      'scripts/e2e/boat-contract.mjs',
      'scripts/e2e/boat-game.mjs',
      'scripts/e2e/npc-story-scope.mjs',
      'scripts/e2e/committed-route.mjs',
      'scripts/e2e/input-ledger.mjs',
      'scripts/e2e/errand-observer.mjs',
      'scripts/e2e/script-causal-observer.mjs',
      'scripts/e2e/opening-causal-instrumentation.mjs',
      ...ERRAND_TRACE_TARGETS,
      'scripts/e2e/opening-trace-plugin.mjs',
      'scripts/e2e/inn-trace-plugin.mjs',
      'scripts/e2e/kitchen-trace-plugin.mjs',
      'scripts/e2e/meal-trace-plugin.mjs',
      'scripts/e2e/errand-trace-plugin.mjs',
      'scripts/e2e/reforge-render-evidence.mjs',
      'scripts/e2e/scene-lifecycle-trace.mjs',
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
      report.secondaryDiagnostics = []
      const archive = guardedEvidenceReader({
        page: () => page,
        read: readLongEvidenceArchive,
        diagnostics: report.secondaryDiagnostics,
      })
      const stateTrace = [],
        stateKeys = { previous: null },
        snapshot = async () => {
          const state = await page.evaluate(readBoatGame)
          const key = JSON.stringify(state)
          if (stateKeys.previous !== key) {
            stateKeys.previous = key
            stateTrace.push({ atMs: Date.now(), phase, state })
          }
          return state
        },
        evidence = archive.read,
        drive = async () => {
          const value = await page.evaluate((after) => window.__readErrandDrive(after), phaseOrder)
          assert.equal(value.overflow, false)
          assert.deepEqual(value.errors, [])
          return value
        },
        ready = (state) => kitchenReady(state, 'game'),
        grid = (state) => gameGrid(state.position),
        press = async (key, reason) => {
          await pressRecordedKey({
            keyboard: page.keyboard,
            action: canonicalInput({ phase, key, reason, atMs: Date.now() }),
            record: (action) => report.actions.push(action),
          })
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
      const navigate = async (sid, planId, finished) =>
        executeFixedRoute({
          page,
          engine: 'game',
          plan: storyInputPlan('006', 'game', planId),
          scene: sid,
          id: report.route.legs.length,
          phase,
          report,
          snapshot,
          evidence: () => page.evaluate(() => window.__readErrandRouteEvidence()),
          ready,
          finished,
          health,
        })
      const touch = async (sid, id, finished) => {
        const actor = (await snapshot()).actors[id]
        assert(actor?.visible, `missing touch target ${sid}/${id}`)
        await navigate(sid, `${sid}/${id}`, finished)
      }
      const interact = async (sid, id, planId = `${sid}/${id}`) => {
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
          planId,
          (state) => gameScene(state, sid) && ready(state) && near(...grid(state)),
        )
        const [col, row] = grid(await snapshot()),
          facing = tc > col ? 'right' : tc < col ? 'left' : tr > row ? 'down' : 'up',
          key = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' }[facing]
        await recordFacingInput({
          id: `face:${report.actions.length}`,
          engine: 'game',
          page,
          read: snapshot,
          until,
          key,
          facing: facing,
          onInput: (input) => report.actions.push(canonicalInput({ phase, ...input })),
        })
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
          if (
            state.dialog &&
            ['waiting-page-key', 'waiting-end-key'].includes(state.dialog.phase)
          ) {
            const before = JSON.stringify(state.dialog)
            await press('Enter', `${label} dialogue confirmation`)
            await until(
              snapshot,
              (next) => JSON.stringify(next.dialog) !== before,
              `${label} confirmation consumed`,
            )
          }
          await new Promise((done) => setTimeout(done, 40))
        }
        const phaseTrace = await drive()
        if (label === 'doctor')
          await writeFile(
            resolve(out, '006-doctor-debug.json'),
            `${JSON.stringify(phaseTrace, null, 2)}\n`,
          )
        assertRenderedRows(phaseTrace, contract.dialogue, ids)
        report.core.rows.push(...ids.map((id) => `dlg.${id}`))
        report.checks[label] = 'passed'
      }
      try {
        await bootstrap()
        assert.equal((await snapshot()).scene, 5)
        report.storyScope = { start: { afterOrder: (await drive()).order } }
        await begin('return-to-inn')
        await touch('s004', 'e94', (state) => gameScene(state, 's003') && ready(state))
        await touch('s003', 'e49', (state) => gameScene(state, 's002') && ready(state))
        await begin('doctor')
        await touch('s002', 'e35', (state) => gameScene(state, 's002') && !!state.dialog)
        await dialogue('doctor', 's002', dialogueIds.slice(0, 17))
        await begin('room')
        await interact('s002', 'e36', 'room-initial')
        await dialogue('room-initial', 's002', dialogueIds.slice(17, 36))
        await begin('room-repeat-1')
        if (ready(await snapshot())) await interact('s002', 'e36', 'room-repeat')
        else await until(snapshot, (state) => !!state.dialog, 'room repeat 1 dialogue starts')
        await dialogue('room-repeat-1', 's002', dialogueIds.slice(36, 38))
        await begin('room-repeat-2')
        if (ready(await snapshot())) await interact('s002', 'e36', 'room-repeat')
        else await until(snapshot, (state) => !!state.dialog, 'room repeat 2 dialogue starts')
        await dialogue('room-repeat-2', 's002', dialogueIds.slice(38, 40))
        report.checks.room = 'passed'
        await begin('miao-leader')
        await touch('s002', 'e32', (state) => gameScene(state, 's003') && ready(state))
        await touch('s003', 'e59', (state) => gameScene(state, 's003') && !!state.dialog)
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
        await touch('s003', 'e44', (state) => gameScene(state, 's004') && ready(state))
        await touch('s004', 'e95', (state) => gameScene(state, 's005') && ready(state))
        await begin('boat')
        await interact('s005', 'e123')
        await dialogue('boat', 's005', dialogueIds.slice(40))
        await page.screenshot({ path: resolve(out, '006-before-ride.png') })
        await begin('island-arrival')
        await drive()
        await touch('s005', 'e116', (s) => gameScene(s, 's014') && !!s.dialog)
        await dialogue('island-arrival', 's014', ISLAND_ARRIVAL_ROWS)
        const islandState = await snapshot()
        assertBoatStoryEnd(islandState, 'game')
        const npcTrace = await evidence()
        assertErrandCollector(npcTrace, '006')
        const boarding = report.route.legs.find((leg) => leg.phase === 'island-arrival')
        assert(boarding, '006 island-arrival route receipt missing')
        const motion = boatMotionEvidence(npcTrace, boarding.startOrder, Infinity)
        report.checks.island = 'passed'
        await page.screenshot({ path: resolve(out, '006-island-arrival.png') })
        report.endWorld = {
          position: {
            sceneId: 's014',
            pos: { x: islandState.position[0], y: islandState.position[1] },
            facing: islandState.facing,
          },
          arrivalDialogue: islandState.dialog ? [islandState.dialog.text] : [],
          controlReturned: ready(islandState),
        }
        const normalized = motion.map((sample) => ({
          ...sample,
          position: gameGrid(sample.position),
          e116: sample.e116 ? gameGrid(sample.e116) : null,
          e117: sample.e117 ? gameGrid(sample.e117) : null,
        }))
        report.boatMotion = {
          ...assertBoatMotion(normalized),
          final: motion.at(-1) ?? null,
          source: '006-boat-motion.json',
        }
        report.boatMotion.artifact = await writeEvidenceArtifact(
          out,
          '006-boat-motion.json',
          motion,
        )
        report.stateTrace = {
          ...(await writeEvidenceArtifact(out, '006-state-trace.json', stateTrace)),
          samples: stateTrace.length,
        }
        assert(
          npcTrace.events.some(
            (event) =>
              event.kind === 'actor' &&
              event.id === 'e203' &&
              event.scene === 's014' &&
              event.source,
          ),
          '006 island arrival requires actual committed actor evidence',
        )
        assertErrandCollector(npcTrace, '006')
        report.storyScope.end = npcStoryBoundary(npcTrace)
        report.boatMotion.interval = {
          startOrder: boarding.startOrder,
          endOrder: report.storyScope.end.afterOrder,
        }
        report.contextTraces = [await writeLongEvidenceArtifact(out, '006-trace.json', npcTrace)]
        await writeFile(
          resolve(out, '006-end.json'),
          `${JSON.stringify(report.endWorld, null, 2)}\n`,
        )
        report.core.status = 'passed'
        report.route.status = 'passed'
        report.status = 'passed'
        assertBoatReport(report)
        report.sourceHashesStable = true
        report.endFrame = await waitForOpeningFrame(page, until)
      } catch (error) {
        await archive.diagnoseStatus(async () => {
          report.collectorFailure = await page.evaluate(() => window.__readErrandStatus())
          await writeFile(
            resolve(out, '006-failure-status.json'),
            JSON.stringify(report.collectorFailure),
            { flag: 'wx' },
          )
        })
        await archive.diagnose(async () => {
          await writeFile(
            resolve(out, '006-failure-state.json'),
            JSON.stringify({
              phase,
              stateTrace,
              state: await snapshot(),
              ...(report.contextTraces?.length
                ? { traceArtifacts: report.contextTraces }
                : { trace: encodeLongEvidence(await evidence()) }),
              cursor: await page.evaluate(() => window.__tpgs?.eventCursor ?? null),
            }),
          )
        })
        throw error
      } finally {
        report.lastPhase = phase
      }
    },
  })
}

await runBoatGame()
