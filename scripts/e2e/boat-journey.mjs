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
import { errandCausalObserverScript, readErrandReforge } from './errand-observer.mjs'
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
import { npcStoryBoundary } from './npc-story-scope.mjs'
import { producerExtraInputs } from './producer-inputs.mjs'
import { storyInputPlan } from './story-input-plans.mjs'

export async function runBoatJourney() {
  const options = boatArguments(process.argv.slice(2)),
    mode = options.headless ? '--headless' : '--headed'
  const predecessorPath = options.from
  const predecessor = await readErrandReceipt(predecessorPath, await readErrandContract())
  assert.equal(predecessor.fragment, '005')
  assert.equal(predecessor.engine, 'reforge')
  assert.equal(predecessor.case, 'saves')
  assert.equal(predecessor.status, 'passed')
  const checkpoint = resolve(predecessorPath, '..', predecessor.checkpoint.path)
  const checkpointBytes = await readFile(checkpoint)
  assert.equal(sha256(checkpointBytes), predecessor.checkpoint.sha256)
  const contract = await readBoatContract()

  await runBrowserJourney({
    name: 'reforge-006',
    packageName: '@type-pal/reforge',
    environment: { VITE_PROJECT_ID: 'pal' },
    traceConfig: 'scripts/e2e/errand-reforge.config.mts',
    arguments: [mode],
    initScripts: [errandCausalObserverScript(), installCommittedRoutePlayback],
    sources: [
      ...producerExtraInputs('006', 'reforge'),
      'scripts/e2e/boat-motion-evidence.mjs',
      'scripts/e2e/fixed-route-plan.mjs',
      'scripts/e2e/story-input-plans.mjs',
      'scripts/e2e/evidence-artifact.mjs',
      ...Object.keys(contract.hashes),
      'scripts/e2e/boat-contract.mjs',
      'scripts/e2e/boat-journey.mjs',
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
      'projects/pal/manifest.json',
    ],
    journey: async ({ newPage, baseURL, out, report, until, health }) => {
      Object.assign(report, {
        fragment: '006',
        engine: 'reforge',
        case: 'story',
        kind: 'verify',
        predecessor: { report: predecessorPath, sha256: predecessor.checkpoint.sha256 },
        core: { status: 'running', rows: [], sourceHashes: contract.hashes },
        route: { status: 'running', inputs: [], legs: [] },
        checks: {},
      })
      let page
      let phase = 'bootstrap'
      let phaseOrder = -1
      const shown = new Set()
      const stateTrace = []
      const stateKeys = { previous: null }
      const snapshot = async () => {
        const state = await page.evaluate(readErrandReforge)
        const key = JSON.stringify(state)
        if (stateKeys.previous !== key) {
          stateKeys.previous = key
          stateTrace.push({ atMs: Date.now(), phase, state })
        }
        return state
      }
      report.secondaryDiagnostics = []
      const archive = guardedEvidenceReader({
        page: () => page,
        read: readLongEvidenceArchive,
        diagnostics: report.secondaryDiagnostics,
      })
      const evidence = archive.read
      const drive = async () => {
        const value = await page.evaluate((after) => window.__readErrandDrive(after), phaseOrder)
        assert.equal(value.overflow, false)
        assert.deepEqual(value.errors, [])
        return value
      }
      const ready = (s) => kitchenReady(s, 'reforge')
      const inScene = (s, sid) => s.scene === sid
      const grid = (s) => kitchenGrid(s.position, 'reforge')
      const press = async (key, reason) => {
        await pressRecordedKey({
          keyboard: page.keyboard,
          action: canonicalInput({ phase, key, reason, atMs: Date.now() }),
          record: (action) => report.actions.push(action),
        })
      }
      const begin = async (next) => {
        phase = next
        phaseOrder = (await drive()).order
      }
      const navigate = async (sid, planId, finished) =>
        executeFixedRoute({
          page,
          engine: 'reforge',
          plan: storyInputPlan('006', 'reforge', planId),
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
        const [tc, tr] = actor.position
        await navigate(
          sid,
          planId,
          (s) =>
            inScene(s, sid) &&
            ready(s) &&
            Math.abs(grid(s)[0] - tc) + Math.abs(grid(s)[1] - tr) === 1,
        )
        const [c, r] = grid(await snapshot())
        const key = tc > c ? 'ArrowRight' : tc < c ? 'ArrowLeft' : tr > r ? 'ArrowDown' : 'ArrowUp'
        await recordFacingInput({
          id: `face:${report.actions.length}`,
          engine: 'reforge',
          page,
          read: snapshot,
          until,
          key,
          facing: { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' }[key],
          onInput: (input) => report.actions.push(canonicalInput({ phase, ...input })),
        })
        await press('Enter', `interact ${sid}/${id}`)
        await until(snapshot, (s) => !ready(s), 'interaction starts')
      }
      const dialogue = async (label, sid, expected) => {
        phase = label
        for (;;) {
          health()
          const s = await snapshot()
          if (!inScene(s, sid)) console.log(`[reforge-006] ${label} left ${sid}`, JSON.stringify(s))
          assert(inScene(s, sid), `${label} left ${sid}`)
          for (const id of s.runtime?.dialogue?.pageTextIds ?? []) shown.add(id)
          if (ready(s)) break
          if (s.runtime?.dialogue?.phase === 'waiting-input') {
            const before = JSON.stringify(s.runtime.dialogue)
            await press('Enter', `${label} dialogue confirmation`)
            await until(
              snapshot,
              (next) => JSON.stringify(next.runtime?.dialogue) !== before,
              `${label} confirmation consumed`,
            )
          }
          await new Promise((done) => setTimeout(done, 40))
        }
        for (const id of expected) assert(shown.has(`dlg.${id}`), `${label} missing dlg.${id}`)
        report.checks[label] = 'passed'
        report.core.rows = [...shown]
      }
      try {
        page = await newPage('006-real-005-saves')
        await page.route('**/__006-checkpoint.json', (route) =>
          route.fulfill({ contentType: 'application/json', body: checkpointBytes }),
        )
        await page.goto(`${baseURL}/?e2e-load=${encodeURIComponent('/__006-checkpoint.json')}`)
        await until(
          snapshot,
          (s) => s.boot?.checkpointLoad === 'loaded' && inScene(s, 's004') && ready(s),
          '005 saves predecessor loaded',
          60000,
        )

        report.storyScope = {
          start: { afterOrder: (await drive()).order },
        }
        await begin('return-to-inn')
        await touch('s004', 'e94', (s) => inScene(s, 's003') && ready(s))
        await touch('s003', 'e49', (s) => inScene(s, 's002') && ready(s))
        await touch('s002', 'e35', (s) => inScene(s, 's002') && !!s.runtime?.dialogue)
        await begin('doctor')
        await dialogue(
          'doctor',
          's002',
          [342, 343, 345, 346, 347, 349, 350, 352, 353, 354, 356, 357, 359, 360, 362, 363, 364],
        )
        assert.equal(
          await page.evaluate(
            () =>
              window.__rfWorld?.script?.behaviors?.entities?.s005?.e123?.trigger?.selection?.value,
          ),
          'legacy-002',
        )
        assert.equal(
          await page.evaluate(() => window.__rfWorld?.script?.entityState?.s005?.e123),
          2,
          '洪大夫结束后未恢复张四原始可见挡路状态',
        )
        await begin('room')
        await interact('s002', 'e36', 'room-initial')
        await dialogue(
          'room-initial',
          's002',
          [
            307, 308, 310, 311, 312, 314, 316, 318, 319, 321, 322, 323, 325, 327, 328, 330, 331,
            332, 334,
          ],
        )
        await interact('s002', 'e36', 'room-repeat')
        await dialogue('room-repeat-1', 's002', [336, 337])
        await interact('s002', 'e36', 'room-repeat')
        await dialogue('room-repeat-2', 's002', [339, 340])
        report.checks.room = 'passed'
        await touch('s002', 'e32', (s) => inScene(s, 's003') && ready(s))
        await touch('s003', 'e59', (s) => inScene(s, 's003') && !!s.runtime?.dialogue)
        await dialogue(
          'miao-leader',
          's003',
          [
            366, 367, 368, 369, 371, 372, 374, 375, 376, 378, 380, 381, 382, 384, 386, 387, 388,
            389, 390, 391, 392, 394, 396, 397, 398, 399, 400, 401, 403, 405, 406, 408, 409, 410,
            412, 414, 415, 417, 418, 419,
          ],
        )
        await touch('s003', 'e44', (s) => inScene(s, 's004') && ready(s))
        await touch('s004', 'e95', (s) => inScene(s, 's005') && ready(s))
        await interact('s005', 'e123')
        await dialogue('boat', 's005', [533, 534, 535, 536, 538, 539, 540, 542, 543, 544, 546])
        await page.screenshot({ path: resolve(out, '006-before-ride.png') })
        await begin('island-arrival')
        await drive()
        await touch('s005', 'e116', (s) => inScene(s, 's014') && !!s.runtime?.dialogue)
        await dialogue('island-arrival', 's014', ISLAND_ARRIVAL_ROWS)
        const islandState = await snapshot()
        assertBoatStoryEnd(islandState, 'reforge')
        const npcTrace = await evidence()
        assertErrandCollector(npcTrace, '006')
        const boarding = report.route.legs.find((leg) => leg.phase === 'island-arrival')
        assert(boarding, '006 island-arrival route receipt missing')
        const boatMotion = boatMotionEvidence(npcTrace, boarding.startOrder, Infinity)
        const motionArtifact = await writeEvidenceArtifact(out, '006-boat-motion.json', boatMotion)
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
        report.contextTraces = [await writeLongEvidenceArtifact(out, '006-trace.json', npcTrace)]
        report.checks.island = 'passed'
        report.endWorld = {
          position: {
            sceneId: 's014',
            facing: islandState.facing,
            pos: {
              col: islandState.position[0],
              row: islandState.position[1],
              height: islandState.position[2],
            },
          },
          arrivalDialogue: islandState.runtime?.dialogue?.pageTextIds ?? [],
          controlReturned: ready(islandState),
        }
        await page.screenshot({ path: resolve(out, '006-island-arrival.png') })
        report.boatMotion = {
          ...assertBoatMotion(boatMotion),
          final: boatMotion.at(-1) ?? null,
          source: '006-boat-motion.json',
          artifact: motionArtifact,
          interval: {
            startOrder: boarding.startOrder,
            endOrder: report.storyScope.end.afterOrder,
          },
        }
        report.core.status = 'passed'
        report.route.status = 'passed'
        report.status = 'passed'
        report.sourceHashesStable = true
        await writeFile(
          resolve(out, '006-end.json'),
          `${JSON.stringify(report.endWorld, null, 2)}\n`,
        )
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
            }),
          )
        })
        throw error
      } finally {
        report.lastPhase = phase
      }
      assertBoatReport(report)
    },
  })
}
