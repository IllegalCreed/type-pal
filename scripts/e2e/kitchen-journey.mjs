import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { readCaptureWorld } from './capture-local.mjs'
import {
  committedRouteReceipt,
  installCommittedRoutePlayback,
  recordFacingInput,
  replayCommittedRoute,
} from './committed-route.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { readWorld } from './game-observer.mjs'
import { assertInnRestoreCommitted } from './inn-contract.mjs'
import { committedInnMoves, partitionInnMoves } from './inn-navigation.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import {
  assertKitchenDialogue,
  assertKitchenEndPayload,
  assertKitchenStoryEnd,
  assertKitchenTrace,
  kitchenArguments,
  kitchenEndPresented,
  kitchenGrid,
  kitchenHandoffReady,
  kitchenReady,
  kitchenScene,
  readKitchenContract,
  readKitchenPredecessor,
} from './kitchen-contract.mjs'
import { kitchenInputPlan } from './kitchen-input-plan.mjs'
import {
  kitchenCausalObserverScript,
  readKitchenGame,
  readKitchenReforge,
} from './kitchen-observer.mjs'
import { npcStoryBoundary } from './npc-story-scope.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { appendBounded } from './opening-policy.mjs'
import { producerExtraInputs } from './producer-inputs.mjs'
import { openingSaveView } from './reforge-opening-policy.mjs'

export async function runKitchenJourney(engine) {
  const options = kitchenArguments(process.argv.slice(2)),
    predecessor = await readKitchenPredecessor(options['--from'], engine),
    contract = await readKitchenContract()
  await runBrowserJourney({
    name: `${engine}-003`,
    packageName: `@type-pal/${engine}`,
    environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
    arguments: [
      options.headless ? '--headless' : '--headed',
      ...(options.capture ? ['--capture'] : []),
    ],
    traceConfig: `scripts/e2e/kitchen-${engine}.config.mts`,
    initScripts: [kitchenCausalObserverScript(), installCommittedRoutePlayback],
    sources: [
      ...producerExtraInputs('003', engine),
      'scripts/e2e/evidence-artifact.mjs',
      ...Object.keys(contract.hashes),
      'scripts/e2e/npc-story-scope.mjs',
      'scripts/e2e/kitchen-input-plan.mjs',
      'scripts/e2e/fixed-route-plan.mjs',
      'scripts/e2e/committed-route.mjs',
      'scripts/e2e/script-causal-observer.mjs',
      'scripts/e2e/opening-causal-instrumentation.mjs',
      'scripts/e2e/opening-hold-intent.mjs',
      'scripts/e2e/kitchen-timing-intent.mjs',
      'scripts/e2e/npc-transition-contract.mjs',
    ],
    journey: async ({ newPage, baseURL, out, report, until, health, capture }) => {
      report.fragment = '003'
      report.engine = engine
      report.predecessor = {
        report: predecessor.path,
        revision: predecessor.revision,
        sha256: predecessor.sha256,
        source: predecessor.source,
      }
      report.predecessorSourceDifferences = Object.entries(predecessor.report.hashes)
        .filter(([file, hash]) => contract.hashes[file] && contract.hashes[file] !== hash)
        .map(([file, hash]) => ({ file, predecessor: hash, current: contract.hashes[file] }))
      report.pending = ['004 pickup/serving excluded', 'audio/video recording']
      let page,
        lastKey,
        phase = 'bootstrap'
      const read = engine === 'game' ? readKitchenGame : readKitchenReforge
      const snapshot = async () => {
        const state = await page.evaluate(read),
          key = JSON.stringify(state)
        if (key !== lastKey) {
          appendBounded(report.events, { atMs: Date.now(), phase, state }, 2400)
          lastKey = key
        }
        return state
      }
      const press = async (key, reason, scope = 'story') => {
        console.log(`[${engine}-003] ${key}: ${reason}`)
        await pressRecordedKey({
          keyboard: page.keyboard,
          action: canonicalInput({ key, reason, phase, scope }),
          record: (action) => appendBounded(report.actions, action, 320),
        })
      }
      const evidence = () => page.evaluate(() => window.__readKitchenEvidence())
      const progress = () => page.evaluate(() => window.__readKitchenProgress())
      const evidenceOrder = () => page.evaluate(() => window.__readKitchenProgress().order)
      const ready = (s) => kitchenReady(s, engine)
      const inScene = (s, sid) => kitchenScene(s, engine, sid)
      const bootstrap = async (label, bytes) => {
        page = await newPage(label)
        lastKey = undefined
        if (engine === 'reforge') {
          await page.route('**/__kitchen-checkpoint.json', (route) =>
            route.fulfill({ contentType: 'application/json', body: bytes }),
          )
          await page.goto(
            `${baseURL}/?e2e-load=${encodeURIComponent('/__kitchen-checkpoint.json')}`,
          )
          await until(
            snapshot,
            (s) => {
              assert.notEqual(s.boot?.checkpointLoad, 'failed', 'formal checkpoint rejected')
              return s.boot?.checkpointLoad === 'loaded' && ready(s)
            },
            'formal checkpoint loaded',
            60000,
          )
        } else {
          await page.goto(baseURL)
          await until(
            async () => {
              const opt = page.getByRole('button', { name: '拒绝', exact: true })
              if (await opt.isVisible()) await opt.click()
              const boot = page.locator('#boot-loading-enter-btn')
              if (await boot.isVisible()) await boot.click()
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
                await press('Enter', 'close title prelude outside 003', 'boundary')
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
            'formal opening menu',
            60000,
          )
          const slots = await page.evaluate(async () => {
            const { Save } = await import('/src/core/save/api.ts')
            return (await Save.listSlots()).length
          })
          assert.equal(slots, 0)
          const staged = await page.evaluate(async (text) => {
            const { Save } = await import('/src/core/save/api.ts'),
              { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
            await Save.saveSlot(1, parseImportedSave(text))
            return serializeSave(await Save.loadSlot(1))
          }, bytes)
          assert.equal(sha256(staged), sha256(bytes), 'staged save bytes changed')
          await press('ArrowDown', 'select 旧的回忆', 'boundary')
          await until(
            snapshot,
            (s) => s.menu?.kind === 'opening' && s.menu.cursor === 1,
            'load selection',
          )
          await press('Enter', 'open formal slot menu', 'boundary')
          await until(snapshot, (s) => s.menu?.kind === 'save-slot', 'slot menu')
          assert.equal((await snapshot()).menu.cursor, 0)
          await press('Enter', 'load actual slot1', 'boundary')
          await until(snapshot, ready, 'formal game checkpoint restore', 60000)
        }
      }
      const navigate = async (sid, finished) => {
        const startOrder = await evidenceOrder(),
          routeId = report.route.legs.length
        const plan = kitchenInputPlan(engine, routeId, phase)
        assert.equal(plan.steps[0].scene, sid, '003 input plan scene mismatch')
        await replayCommittedRoute({
          page,
          route: plan,
          health,
          onInput: (input) => {
            const action = canonicalInput({
              scene: sid,
              phase,
              routeId,
              atMs: Date.now(),
              ...input,
            })
            appendBounded(report.route.inputs, action, 320)
            appendBounded(report.actions, action, 320)
          },
        })
        const endOrder = await evidenceOrder(),
          end = await snapshot()
        assert(finished(end), '003 fixed input ended before the independent story condition')
        report.route.legs.push({
          scene: sid,
          phase,
          inputPlan: plan,
          startOrder,
          endOrder,
          replay: committedRouteReceipt({
            inputCount: report.route.inputs.filter((input) => input.routeId === routeId).length,
            id: routeId,
            engine,
            trace: await page.evaluate(() => window.__readKitchenRouteEvidence()),
            startOrder,
            endOrder,
            scene: sid,
            end,
            ready: ready(end),
          }),
          moveSources:
            engine === 'game'
              ? ['commit:tickSceneInput', 'commit:pushPartyAwayFromBlockingNpcs']
              : ['commit:player.input'],
        })
      }
      const finishDialogue = async (sid, expectedLast) => {
        for (;;) {
          health()
          const s = await snapshot()
          assert(inScene(s, sid), 'dialogue left expected scene')
          assert.equal(s.cash, 500)
          const trace = await progress(),
            shown = assertKitchenDialogue(trace, engine, contract, false)
          const dialog = engine === 'game' ? s.dialog : s.runtime?.dialogue
          if (ready(s)) {
            assert(shown.has(`dlg.${expectedLast}`), `missing last dialogue ${expectedLast}`)
            return
          }
          if (dialog) {
            const confirm =
              engine === 'game'
                ? ['waiting-page-key', 'waiting-end-key'].includes(dialog.phase)
                : dialog.phase === 'waiting-input'
            if (confirm) {
              const displayed = trace.pages.at(-1)?.page
              assert(displayed, 'confirmation before actual complete rendered page')
              if (!report.milestones[phase]) {
                await page.screenshot({ path: resolve(out, `003-${phase}.png`) })
                report.milestones[phase] = {
                  state: s,
                  page: displayed,
                  order: await evidenceOrder(),
                }
              }
              const before = JSON.stringify(dialog)
              const text = engine === 'game' ? displayed.lines.join('\n') : displayed.pageText
              if (
                !(await capture.readable(text, before, async () => {
                  const next = await snapshot()
                  return JSON.stringify(engine === 'game' ? next.dialog : next.runtime?.dialogue)
                }))
              )
                continue
              await press('Enter', 'normal full-dialogue confirmation')
              await until(
                snapshot,
                (next) =>
                  JSON.stringify(engine === 'game' ? next.dialog : next.runtime?.dialogue) !==
                  before,
                'normal confirmation consumed',
              )
            }
          }
          await new Promise((done) => setTimeout(done, 50))
        }
      }
      const interact = async (id, sid) => {
        const target = (await snapshot()).actors[id]
        assert(target?.visible, `missing interaction actor ${id}`)
        const [tc, tr] = kitchenGrid(target.position, engine)
        const near = (col, row) => Math.abs(col - tc) + Math.abs(row - tr) === 1
        await navigate(
          sid,
          (s) => ready(s) && inScene(s, sid) && near(...kitchenGrid(s.position, engine)),
        )
        const [col, row] = kitchenGrid((await snapshot()).position, engine)
        const facing = tc > col ? 'right' : tc < col ? 'left' : tr > row ? 'down' : 'up'
        const key = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' }[
          facing
        ]
        await recordFacingInput({
          id: `face:${report.actions.length}`,
          page,
          key,
          facing: facing,
          onInput: (input) => report.actions.push(canonicalInput({ phase, ...input })),
        })
        await press('Enter', `normal interaction ${id}`)
        await until(snapshot, (s) => !ready(s), 'normal interaction starts')
      }
      report.route = {
        status: 'running',
        inputs: [],
        legs: [],
        strategy: 'fixed-input-plan',
      }
      report.milestones = {}
      try {
        await bootstrap('002-real-predecessor', predecessor.bytes)
        const start = await snapshot()
        assert(inScene(start, 's003'))
        assert.equal(start.cash, 500)
        report.storyScope = { start: npcStoryBoundary(await evidence()) }
        report.route.startOrder = await evidenceOrder()
        report.route.start = start
        if (capture.enabled) {
          const frame = await waitForOpeningFrame(page, until)
          await capture.arm(page, { event: '002-predecessor-restored', state: start, frame })
        }
        phase = 'stairs'
        report.stairs = { startOrder: await evidenceOrder() }
        await navigate(
          's003',
          (s) =>
            ready(s) &&
            inScene(s, 's003') &&
            JSON.stringify(kitchenGrid(s.position, engine)) === '[131,52]',
        )
        await until(
          progress,
          (t) =>
            t.final?.control === true &&
            JSON.stringify(kitchenGrid(t.final.actors.party.position, engine)) === '[131,52]',
          'stairs actual final render',
        )
        report.stairs.endOrder = await evidenceOrder()
        report.stairs.end = await snapshot()
        await page.screenshot({ path: resolve(out, '003-stairs-end.png') })
        phase = 'aunt'
        const aunt = (await snapshot()).actors.e56
        assert(aunt.visible)
        await navigate('s003', (s) => (engine === 'game' ? !!s.dialog : !!s.runtime?.dialogue))
        await finishDialogue('s003', 58)
        phase = 'taoist'
        await interact('e62', 's003')
        await finishDialogue('s003', 156)
        phase = 'aunt-handoff'
        report.auntHandoff = (
          await until(
            progress,
            kitchenHandoffReady,
            'actual kitchen aunt activation and hall aunt disappearance',
          )
        ).final
        phase = 'kitchen-entry'
        await navigate('s003', (s) => inScene(s, 's001') && ready(s))
        phase = 'kitchen'
        await interact('e19', 's001')
        await finishDialogue('s001', 127)
        await until(progress, kitchenEndPresented, 'actual kitchen final render/control')
        const trace = await evidence()
        report.storyScope.end = npcStoryBoundary(trace)
        report.route.committedMoves = committedInnMoves(trace, report.route.startOrder)
        const partition = partitionInnMoves(report.route.committedMoves, report.route.legs)
        report.route.committedSteps = partition.steps
        report.route.scriptedOrPlacement = partition.placements
        report.route.status = 'passed'
        report.core = assertKitchenTrace(trace, engine, contract, report.stairs)
        if (capture.enabled) {
          report.captureEndWorld = await readCaptureWorld(page, engine)
          assertKitchenStoryEnd(report.captureEndWorld, engine, predecessor.payload, contract)
          report.endFrame = await waitForOpeningFrame(page, until)
          report.contextTraces = [await writeEvidenceArtifact(out, 'kitchen-trace.json', trace)]
          await capture.finish(page, {
            event: 'aunt-orders-serving-food-not-taken',
            frame: report.endFrame,
            worldHash: sha256(JSON.stringify(report.captureEndWorld)),
          })
          report.pending = ['004 pickup/serving excluded; full-series capture readiness']
          return
        }
        phase = 'save'
        await press('Escape', 'prove normal control menu', 'boundary')
        await until(
          snapshot,
          (s) => (engine === 'game' ? !!s.menu : !!s.runtime?.menuActive),
          'menu opens',
        )
        await press('Escape', 'close actual menu', 'boundary')
        await until(snapshot, ready, 'menu closes')
        const formalSnapshot = async (label) => {
          const began = Date.now(),
            before = await snapshot()
          try {
            const payload = await page.evaluate(() => window.__tpE2e.dumpSave())
            report.saveBarriers ??= []
            report.saveBarriers.push({
              label,
              elapsedMs: Date.now() - began,
              before,
              after: await snapshot(),
            })
            return payload
          } catch (error) {
            report.saveBarrierFailure = {
              label,
              elapsedMs: Date.now() - began,
              diagnostic: await page.evaluate(() => ({
                coordinator: window.__kitchenReadSaveBarrier?.(),
                runtime: window.__tpObserve?.readRuntime?.(),
                motion: window.__tpE2e?.dumpMotionState?.(),
              })),
            }
            throw error
          }
        }
        let payload, bytes
        if (engine === 'game') {
          report.endWorld = await page.evaluate(readWorld)
          await press('F5', 'formal 003 quick-save', 'boundary')
          bytes = await until(
            () =>
              page.evaluate(async () => {
                const { Save } = await import('/src/core/save/api.ts'),
                  { serializeSave } = await import('/src/tools/save-io.ts')
                const gs = await Save.loadSlot(1)
                return gs ? serializeSave(gs) : null
              }),
            (value) => !!value && JSON.parse(value).gs.wNumScene === 2,
            'formal 003 save committed',
          )
          payload = JSON.parse(bytes)
        } else {
          payload = await formalSnapshot('checkpoint')
          bytes = JSON.stringify(payload)
          report.endWorld = openingSaveView(payload)
        }
        assertKitchenEndPayload(payload, engine, predecessor.payload, contract)
        report.endWorldHash = sha256(JSON.stringify(report.endWorld))
        report.endFrame = await waitForOpeningFrame(page, until)
        await page.screenshot({ path: resolve(out, '003-end.png') })
        await writeFile(resolve(out, '003.end.save.json'), bytes)
        report.checkpoint = {
          path: '003.end.save.json',
          sha256: sha256(bytes),
          source: `this 003 normal route/dialogue, no pickup / ${engine === 'game' ? 'F5 Save.loadSlot/serialize' : 'production barrier dumpSave'}`,
        }
        report.contextTraces = [await writeEvidenceArtifact(out, 'kitchen-trace.json', trace)]
        phase = 'restore'
        await bootstrap('003-real-restore', bytes)
        const restoredTrace = await evidence()
        report.restoredWorld =
          engine === 'game'
            ? await page.evaluate(readWorld)
            : assertInnRestoreCommitted(restoredTrace, report.endWorld)
        report.restoredWorldHash = sha256(JSON.stringify(report.restoredWorld))
        assert.equal(
          report.restoredWorldHash,
          report.endWorldHash,
          'restored persistent kitchen world differs',
        )
        if (engine === 'reforge') {
          report.restoreCommits = restoredTrace.restoreCommits
          report.postResumeWorld = openingSaveView(await formalSnapshot('post-resume'))
          report.postResumeWorldHash = sha256(JSON.stringify(report.postResumeWorld))
        }
        await writeFile(
          resolve(out, '003-restored-trace.json'),
          JSON.stringify(restoredTrace, null, 2),
        )
        report.restoredFrame = await waitForOpeningFrame(page, until, report.endFrame)
        await page.screenshot({ path: resolve(out, '003-restored.png') })
        assertKitchenEndPayload(
          engine === 'game' ? JSON.parse(bytes) : report.restoredWorld,
          engine,
          predecessor.payload,
          contract,
        )
      } finally {
        report.lastPhase = phase
        if (page)
          await writeFile(
            resolve(
              out,
              phase === 'restore' ? '003-restore-latest-trace.json' : 'kitchen-latest-trace.json',
            ),
            JSON.stringify(await evidence(), null, 2),
          )
        const after = await readKitchenContract()
        report.sourceHashesStable = JSON.stringify(after.hashes) === JSON.stringify(contract.hashes)
        assert.deepEqual(after.hashes, contract.hashes, 'sources changed during 003')
      }
    },
  })
}
