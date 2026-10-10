import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback, recordFacingInput } from './committed-route.mjs'
import {
  assertErrandBackground,
  assertErrandCaseReport,
  assertErrandCollector,
  assertErrandEndWorld,
  assertErrandRestored,
  assertErrandStory,
  ERRAND_GUARD_ROWS,
  ERRAND_PHASE_ROWS,
  errandArguments,
  errandArmed,
  errandReadyPresentation,
  errandSaveView,
  errandScene,
  errandTraceArtifact,
  readErrandContract,
  readErrandPredecessor,
} from './errand-contract.mjs'
import {
  errandCausalObserverScript,
  readErrandGame,
  readErrandReforge,
} from './errand-observer.mjs'
import { guardedEvidenceReader } from './evidence-diagnostics.mjs'
import { executeFixedRoute } from './fixed-route-plan.mjs'
import { readWorld } from './game-observer.mjs'
import { assertInnRestoreCommitted } from './inn-contract.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { kitchenGrid, kitchenReady } from './kitchen-contract.mjs'
import { encodeLongEvidence, readLongEvidenceArchive } from './long-evidence.mjs'
import { assertMealDialogue } from './meal-contract.mjs'
import { mealRenderedConfirmation } from './meal-journey.mjs'
import { readMealReforgeEndWorld } from './meal-observer.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { producerExtraInputs } from './producer-inputs.mjs'
import { storyInputPlan } from './story-input-plans.mjs'

/** One browser task: readiness, log boundary and persistent end world cannot straddle
 * a background tick. Screenshots are asynchronous and must happen after this receipt. */
export function errandDialogueReader(engine) {
  assert(['game', 'reforge'].includes(engine))
  const read = engine === 'game' ? readErrandGame : readErrandReforge
  const world = engine === 'game' ? readWorld : readMealReforgeEndWorld
  return new Function(
    'after',
    `const state = (${read})();
     const trace = window.__readErrandDrive(after);
     return {state, trace, world: (${kitchenReady})(state, ${JSON.stringify(engine)}) ? (${world})() : null};`,
  )
}

export async function runErrandJourney(engine) {
  const options = errandArguments(process.argv.slice(2)),
    predecessor = await readErrandPredecessor(options.from, engine),
    contract = await readErrandContract()
  await runBrowserJourney({
    name: `${engine}-005-${options.case}`,
    packageName: `@type-pal/${engine}`,
    environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
    arguments: [options.headless ? '--headless' : '--headed'],
    traceConfig: `scripts/e2e/errand-${engine}.config.mts`,
    initScripts: [errandCausalObserverScript(), installCommittedRoutePlayback],
    sources: [
      ...producerExtraInputs('005', engine),
      'scripts/e2e/fixed-route-plan.mjs',
      'scripts/e2e/story-input-plans.mjs',
      'scripts/e2e/evidence-artifact.mjs',
      ...Object.keys(contract.hashes),
      'scripts/e2e/npc-story-scope.mjs',
      'scripts/e2e/script-causal-observer.mjs',
      'scripts/e2e/opening-causal-instrumentation.mjs',
    ],
    journey: async ({ newPage, baseURL, out, report, until, health }) => {
      Object.assign(report, {
        fragment: '005',
        engine,
        case: options.case,
        kind: 'verify',
        checks: {},
        predecessor: {
          report: predecessor.reportPath,
          sha256: predecessor.sha256,
          revision: predecessor.revision,
        },
        core: { status: 'running', rows: [], sourceHashes: contract.hashes },
        route: { status: 'running', inputs: [], legs: [] },
        milestones: {},
        contextTraces: [],
      })
      report.predecessorSourceDifferences = Object.entries(predecessor.report.hashes)
        .filter(([file, hash]) => contract.hashes[file] && contract.hashes[file] !== hash)
        .map(([file, hash]) => ({ file, predecessor: hash, current: contract.hashes[file] }))
      if (engine === 'game')
        assert(
          report.predecessorSourceDifferences.every(
            ({ file }) =>
              !file.startsWith('packages/game/') &&
              !file.startsWith('packages/shared/') &&
              !file.startsWith('data/extracted/'),
          ),
          'first-stage predecessor gameplay source changed',
        )
      let page,
        failure,
        phase = 'bootstrap',
        phaseOrder = -1,
        contextLabel = '004-saves-real-predecessor'
      const shownAll = new Map()
      const read = engine === 'game' ? readErrandGame : readErrandReforge
      const snapshot = () => page.evaluate(read)
      report.secondaryDiagnostics = []
      const archive = guardedEvidenceReader({
        page: () => page,
        read: readLongEvidenceArchive,
        diagnostics: report.secondaryDiagnostics,
      })
      const evidence = archive.read
      const status = async () => {
        const value = await page.evaluate(() => window.__readErrandStatus())
        assert.equal(value.overflow, false)
        assert.deepEqual(value.errors, [])
        return value
      }
      const drive = async () => {
        const value = await page.evaluate((after) => window.__readErrandDrive(after), phaseOrder)
        assert.equal(value.overflow, false)
        assert.deepEqual(value.errors, [])
        return value
      }
      const ready = (s) => kitchenReady(s, engine),
        inScene = (s, sid) => errandScene(s, engine, sid)
      const readDialogueProgress = errandDialogueReader(engine)
      const grid = (s) => kitchenGrid(s.position, engine)
      const press = async (key, reason) => {
        console.log(`[${engine}-005] ${phase}: ${key} ${reason}`)
        await pressRecordedKey({
          keyboard: page.keyboard,
          action: canonicalInput({ phase, key, reason, atMs: Date.now() }),
          record: (action) => report.actions.push(action),
        })
      }
      const begin = async (label) => {
        phase = label
        phaseOrder = (await drive()).order
        console.log(`[${engine}-005] ${label}`)
      }
      const bootstrap = async (bytes, label = '004-saves-real-predecessor') => {
        contextLabel = label
        phaseOrder = -1
        page = await newPage(label)
        if (engine === 'reforge') {
          await page.route('**/__errand-checkpoint.json', (route) =>
            route.fulfill({ contentType: 'application/json', body: bytes }),
          )
          await page.goto(`${baseURL}/?e2e-load=${encodeURIComponent('/__errand-checkpoint.json')}`)
          await until(
            snapshot,
            (s) => {
              assert.notEqual(s.boot?.checkpointLoad, 'failed', 'formal checkpoint rejected')
              return s.boot?.checkpointLoad === 'loaded' && ready(s)
            },
            'formal predecessor loaded',
            60000,
          )
        } else {
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
                assert(
                  ['/extracted/videos/1.mp4', '/extracted/videos/2.mp4'].some((path) =>
                    video.endsWith(path),
                  ),
                )
                await press('Enter', 'close title prelude outside 005')
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
          }, bytes)
          assert.equal(sha256(staged), sha256(bytes), 'staged predecessor bytes changed')
          await press('ArrowDown', '旧的回忆')
          await until(
            snapshot,
            (s) => s.menu?.kind === 'opening' && s.menu.cursor === 1,
            'load selection',
          )
          await press('Enter', 'open slot menu')
          await until(
            snapshot,
            (s) => s.menu?.kind === 'save-slot' && s.menu.cursor === 0,
            'slot menu',
          )
          await press('Enter', 'formal slot1 restore')
          await until(snapshot, ready, 'actual predecessor restored', 60000)
        }
      }
      const saveTrace = async (label, provided) => {
        const trace = provided ?? (await evidence())
        assertErrandCollector(trace)
        const artifact = errandTraceArtifact(trace),
          path = `${label}.trace.json`
        await writeFile(resolve(out, path), artifact.bytes, { flag: 'wx' })
        report.contextTraces.push({
          context: contextLabel,
          path,
          sha256: artifact.sha256,
          byteLength: artifact.byteLength,
        })
        return trace
      }
      const navigate = async (sid, finished) =>
        executeFixedRoute({
          page,
          engine,
          plan: storyInputPlan('005', engine, phase, options.case),
          scene: sid,
          id: report.route.legs.length,
          phase,
          context: contextLabel,
          report,
          snapshot,
          evidence: () => page.evaluate(() => window.__readErrandRouteEvidence()),
          ready,
          finished,
          health,
        })
      const touch = async (sid, id, finished) => {
        const actor = (await snapshot()).actors[id]
        assert(actor?.visible, `missing touch ${id}`)
        await navigate(sid, finished)
      }
      const interact = async (sid, id) => {
        const target = (await snapshot()).actors[id],
          [tc, tr] = grid(target)
        assert(target?.visible)
        const near = (c, r) => Math.abs(c - tc) + Math.abs(r - tr) === 1
        await navigate(sid, (s) => inScene(s, sid) && ready(s) && near(...grid(s)))
        const s = await snapshot(),
          [c, r] = grid(s),
          facing = tc > c ? 'right' : tc < c ? 'left' : tr > r ? 'down' : 'up'
        const key = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' }[
          facing
        ]
        await recordFacingInput({
          id: `face:${report.actions.length}`,
          engine: engine,
          page,
          read: snapshot,
          until,
          key,
          facing: facing,
          onInput: (input) => report.actions.push(canonicalInput({ phase, ...input })),
        })
        await press('Enter', `interact ${id}`)
        await until(snapshot, (s) => !ready(s), 'interaction starts')
      }
      const dialogue = async (sid, label) => {
        const rows = ERRAND_PHASE_ROWS[label] ?? ERRAND_GUARD_ROWS[label],
          expected = {
            ...contract,
            rows: rows.map((id) => contract.rows.find((row) => row.id === `dlg.${id}`)),
          }
        let speakingCaptured = false
        for (;;) {
          health()
          const { state: s, trace, world } = await page.evaluate(readDialogueProgress, phaseOrder)
          assert(inScene(s, sid), `dialogue left ${sid}`)
          assert.deepEqual(trace.errors, [])
          assert.equal(trace.overflow, false)
          const shown = assertMealDialogue(trace, engine, expected, false)
          if (ready(s) && errandReadyPresentation(trace)) {
            assertMealDialogue(trace, engine, expected)
            report.core.rows.push(...shown.keys())
            for (const [key, value] of shown) shownAll.set(key, value)
            report.checks[label] = 'passed'
            report.milestones[label] = { state: s, order: trace.order }
            if (label === 'news') {
              report.storyScope.end = { afterOrder: trace.order }
              report.storyEndWorld = world
              report.storyEndWorldHash = sha256(JSON.stringify(world))
              assertErrandEndWorld(world, engine)
            }
            await page.screenshot({ path: resolve(out, `005-${label}-end.png`) })
            return
          }
          const dialog = engine === 'game' ? s.dialog : s.runtime?.dialogue
          if (
            dialog &&
            (engine === 'game'
              ? ['waiting-page-key', 'waiting-end-key'].includes(dialog.phase)
              : dialog.phase === 'waiting-input') &&
            mealRenderedConfirmation(dialog, trace, engine)
          ) {
            const before = JSON.stringify(dialog)
            if (label === 'news' && !speakingCaptured) {
              await page.screenshot({ path: resolve(out, '005-news-speaking.png') })
              speakingCaptured = true
            }
            await press('Enter', 'complete rendered dialogue confirmation')
            await until(
              snapshot,
              (s) => JSON.stringify(engine === 'game' ? s.dialog : s.runtime?.dialogue) !== before,
              'confirmation consumed',
            )
          }
          await new Promise((done) => setTimeout(done, 50))
        }
      }
      const capture = async () => {
        await press('Escape', 'prove normal manual-menu availability')
        await until(
          snapshot,
          (s) => (engine === 'game' ? s.mode === 'menu' : s.runtime?.menuActive),
          'normal save-eligible menu',
        )
        await press('Escape', 'close normal menu')
        await until(snapshot, ready, 'normal menu closed')
        let bytes, payload
        if (engine === 'game') {
          const before = await status()
          await press('F5', 'formal quick-save after manual-menu availability')
          await until(
            status,
            (value) => value.saveCompletions === before.saveCompletions + 1,
            'formal save acknowledgement',
          )
          bytes = await page.evaluate(async () => {
            const { Save } = await import('/src/core/save/api.ts'),
              { serializeSave } = await import('/src/tools/save-io.ts')
            return serializeSave(await Save.loadSlot(1))
          })
          payload = JSON.parse(bytes)
          const trace = await evidence(),
            captures = trace.saveCaptures.slice(before.saveCaptures),
            completions = trace.saveCompletions.slice(before.saveCompletions)
          assert.equal(captures.length, 1)
          assert.equal(completions.length, 1)
          assert.equal(captures[0].slot, 1)
          assert.equal(completions[0].captureSeq, captures[0].seq)
          assert(completions[0].order > captures[0].order)
          assert.deepEqual(
            errandSaveView(captures[0].payload, engine),
            errandSaveView(payload, engine),
            'save differs from synchronous actual input',
          )
          report.saveCapture = {
            order: captures[0].order,
            acknowledgementOrder: completions[0].order,
          }
        } else {
          payload = await page.evaluate(() => window.__tpE2e.dumpSave())
          bytes = JSON.stringify(payload)
        }
        await writeFile(resolve(out, '005.end.save.json'), bytes)
        return { payload, bytes }
      }
      try {
        await bootstrap(predecessor.bytes)
        if (engine === 'game')
          assert.deepEqual(await page.evaluate(readWorld), predecessor.report.endWorld)
        else assertInnRestoreCommitted(await evidence(), predecessor.report.endWorld)
        report.storyScope = { start: { afterOrder: (await drive()).order } }
        await begin('kitchen-entry')
        await touch('s003', 'e53', (s) => inScene(s, 's001') && ready(s))
        await begin('aunt')
        await interact('s001', 'e19')
        await dialogue('s001', 'aunt')
        assert.equal((await snapshot()).cash, 550)
        assert.equal(
          errandArmed((await status()).final, engine),
          false,
          'aunt prematurely armed report',
        )
        if (options.case === 'guards') {
          await begin('auntRepeat')
          await interact('s001', 'e19')
          await dialogue('s001', 'auntRepeat')
          assert.equal((await snapshot()).cash, 550, 'aunt repeat grants duplicate money')
        }
        await begin('kitchen-exit')
        await touch('s001', 'e18', (s) => inScene(s, 's003') && ready(s))
        await begin('inn-exit')
        await touch('s003', 'e44', (s) => inScene(s, 's004') && ready(s))
        await begin('dock-entry')
        await touch('s004', 'e95', (s) => inScene(s, 's005') && ready(s))
        await begin('fish')
        await interact('s005', 'e127')
        await dialogue('s005', 'fish')
        assert.equal(
          errandArmed((await status()).final, engine),
          false,
          'fish prematurely armed report',
        )
        await begin('water')
        await touch('s005', 'e124', (s) => !!(engine === 'game' ? s.dialog : s.runtime?.dialogue))
        await dialogue('s005', 'water')
        assert.equal(
          errandArmed((await status()).final, engine),
          false,
          'water prematurely armed report',
        )
        await begin('zhang')
        await touch('s005', 'e123', (s) => !!(engine === 'game' ? s.dialog : s.runtime?.dialogue))
        await dialogue('s005', 'zhang')
        assert.equal(
          errandArmed((await status()).final, engine),
          true,
          'specific ZhangSi response did not arm report',
        )
        if (options.case === 'guards')
          for (const label of ['zhangReminder', 'zhangPrayer']) {
            await begin(label)
            await interact('s005', 'e123')
            await dialogue('s005', label)
          }
        await begin('news')
        await touch(
          's005',
          'e115',
          (s) => inScene(s, 's004') && !!(engine === 'game' ? s.dialog : s.runtime?.dialogue),
        )
        await dialogue('s004', 'news')
        assert.equal((await snapshot()).cash, 550)
        assertErrandEndWorld(report.storyEndWorld, engine)
        report.endFrame = await waitForOpeningFrame(page, until)
        const storyTrace = await evidence()
        assertErrandStory(storyTrace, engine, shownAll)
        report.checks.causality = 'passed'
        report.checks.end = 'passed'
        if (options.case === 'saves') {
          await begin('end-save')
          const saved = await capture()
          report.checkpoint = {
            path: '005.end.save.json',
            sha256: sha256(saved.bytes),
            source:
              engine === 'game'
                ? 'formal F5 following genuine 004 and complete 005'
                : 'formal dumpSave following genuine 004 and complete 005',
          }
          report.endWorld = errandSaveView(saved.payload, engine)
          assertErrandEndWorld(report.endWorld, engine)
          report.endWorldHash = sha256(JSON.stringify(report.endWorld))
          report.endFrame = await waitForOpeningFrame(page, until)
          await page.screenshot({ path: resolve(out, '005-save.png') })
          await saveTrace('005-before-restore')
          await bootstrap(saved.bytes, '005-fresh-formal-restore')
          report.restoredWorld = assertErrandRestored(await evidence(), saved.payload, engine)
          report.restoredWorldHash = sha256(JSON.stringify(report.restoredWorld))
          report.restoredFrame = await waitForOpeningFrame(page, until)
          await page.screenshot({ path: resolve(out, '005-restored.png') })
          report.frameContract =
            'dynamic village: full persistent state equality at atomic restore commit; actual nonblack restored frame and actors; no whole-canvas pixel equality claim'
          const restoredState = await snapshot(),
            position = restoredState.actors.e83.position
          assert(inScene(restoredState, 's004') && ready(restoredState))
          const continued = await until(
            snapshot,
            (s) => JSON.stringify(s.actors.e83.position) !== JSON.stringify(position),
            'actual Xianglan background return continues after fresh restore',
            10000,
          )
          assert(ready(continued), 'background return took foreground control')
          report.backgroundContinuation = { from: position, to: continued.actors.e83.position }
          const restoredTrace = await saveTrace('005-latest')
          assertErrandBackground(restoredTrace, engine, report.backgroundContinuation)
          report.checks.endRestore = 'passed'
          report.checks.backgroundContinuation = 'passed'
        } else await saveTrace('005-latest', storyTrace)
        report.core.status = 'passed'
        report.route.status = 'passed'
      } catch (error) {
        failure = error
      } finally {
        report.lastPhase = phase
      }
      try {
        const after = await readErrandContract()
        report.sourceHashesStable = JSON.stringify(after.hashes) === JSON.stringify(contract.hashes)
        assert.deepEqual(after.hashes, contract.hashes, '005 sources changed during run')
      } catch (error) {
        if (failure)
          report.secondaryDiagnostics.push({
            label: 'source stability',
            error: error.stack ?? String(error),
          })
        else failure = error
      }
      if (failure) {
        await archive.diagnoseStatus(async () => {
          report.collectorFailure = await page.evaluate(() => window.__readErrandStatus())
          await writeFile(
            resolve(out, '005-failure-status.json'),
            JSON.stringify(report.collectorFailure),
            { flag: 'wx' },
          )
        })
        await archive.diagnose(async () => {
          await writeFile(
            resolve(out, '005-failure-trace.json'),
            JSON.stringify(encodeLongEvidence(await evidence())),
          )
        })
        throw failure
      }
      assertErrandCaseReport({ ...report, status: 'passed' })
    },
  })
}
