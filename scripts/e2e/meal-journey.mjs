import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback, recordFacingInput } from './committed-route.mjs'
import { readEvidenceArchive } from './evidence-transport.mjs'
import { executeFixedRoute } from './fixed-route-plan.mjs'
import { readWorld } from './game-observer.mjs'
import { assertInnRestoreCommitted } from './inn-contract.mjs'
import { committedInnMoves, partitionInnMoves } from './inn-navigation.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { kitchenGrid, kitchenReady, kitchenScene } from './kitchen-contract.mjs'
import {
  assertMealAttendantReturn,
  assertMealCollector,
  assertMealDialogue,
  assertMealDrive,
  assertMealEnd,
  assertMealEndWorld,
  assertMealGameSaveInput,
  assertMealHealth,
  assertMealPhase,
  assertMealRestored,
  MEAL_ROWS,
  mealArguments,
  mealCasePlan,
  mealInventoryCount,
  mealPhaseWindow,
  mealSaveView,
  mealTraceArtifact,
  readMealContract,
  readMealPredecessor,
} from './meal-contract.mjs'
import { selectMealWine } from './meal-menu.mjs'
import {
  mealCausalObserverScript,
  readMealGame,
  readMealReforge,
  readMealReforgeEndWorld,
} from './meal-observer.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { appendBounded } from './opening-policy.mjs'
import { producerExtraInputs } from './producer-inputs.mjs'
import { storyInputPlan } from './story-input-plans.mjs'

/** A hidden serving zone is not success: prove this leg actually entered its original body. */
export function mealGameServingStarted(trace, startOrder, cursor) {
  assertMealCollector(trace)
  if (
    cursor.scene !== 2 ||
    cursor.owner !== 15 ||
    !Number.isInteger(cursor.ip) ||
    cursor.ip < 469 ||
    cursor.ip >= 541
  )
    return false
  const hidden = trace.events.find(
    (event) =>
      event.order > startOrder &&
      event.kind === 'actor' &&
      event.scene === 's001' &&
      event.id === 'e15' &&
      event.source === 'commit:applyRawOpcode' &&
      event.before?.visible === true &&
      event.before.state === 1 &&
      event.state.visible === false &&
      event.state.state === 0 &&
      event.state.trigger === 'L_469' &&
      event.state.triggerMode === 5,
  )
  if (!hidden) return false
  // The delta observer may first see IP advancement at a causal snapshot, before tick/render.
  // Its sampling source is not execution identity: bind the hide to the actual native run.
  const entries = (trace.causes ?? []).filter(
    (e) =>
      e.phase === 'command' &&
      e.scene === 's001' &&
      e.channel === 'trigger' &&
      e.actor === 15 &&
      e.ip === 469 &&
      e.order > startOrder &&
      e.order < hidden.order,
  )
  if (entries.length !== 1) return false
  const entry = entries[0]
  return (trace.causes ?? []).some(
    (e) =>
      e.phase === 'command' &&
      e.runId === entry.runId &&
      e.sceneVisit === entry.sceneVisit &&
      e.scene === 's001' &&
      e.channel === 'trigger' &&
      e.actor === 15 &&
      e.ip === 470 &&
      e.order > hidden.order,
  )
}

/** One atomic DOM observation chooses the branch; full evidence is fetched only for an inactive zone. */
export async function mealGameServingEntry(readObservation, readTrace, startOrder) {
  const observation = await readObservation(),
    target = observation.target
  assert(
    target?.id === 15 && target.scene === 2 && observation.cursor.scene === 2,
    'serving snapshot belongs to another scene/entity',
  )
  if (target.state > 0 && target.triggerMode >= 4) return { kind: 'navigate', target }
  assert(
    mealGameServingStarted(await readTrace(), startOrder, observation.cursor),
    'inactive serving zone has no actual current-leg body-start evidence',
  )
  return { kind: 'started', cursor: observation.cursor }
}

/** A waiting runtime page is confirmable only after that same page was actually rendered. */
export function mealRenderedConfirmation(dialog, trace, engine) {
  const page = trace.pages.at(-1)?.page
  if (!page || !dialog) return false
  if (engine === 'game')
    return (
      page.title === (dialog.title ?? null) &&
      (dialog.text === null || page.lines.includes(dialog.text))
    )
  return (
    page.phase === 'waiting-input' &&
    ['dialogueId', 'cueIndex', 'pageIndex', 'pageStartedAtMs'].every(
      (key) => page[key] === dialog[key],
    )
  )
}

/** Diagnostics must not replace the error that made the actual case fail. */
export async function finalizeMealEvidence({ failure, diagnose, verifySources, secondary }) {
  for (const [label, operation] of [
    ...(failure ? [['failure trace', diagnose]] : []),
    ['source stability', verifySources],
  ]) {
    try {
      await operation()
    } catch (error) {
      if (!failure) throw error
      secondary({ label, error: error.stack ?? String(error) })
    }
  }
}

export async function runMealJourney(engine) {
  const options = mealArguments(process.argv.slice(2)),
    plan = mealCasePlan(options.case),
    predecessor = await readMealPredecessor(options['--from'], engine),
    contract = await readMealContract()
  await runBrowserJourney({
    name: `${engine}-004-${options.case}`,
    packageName: `@type-pal/${engine}`,
    environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
    arguments: [
      options.headless ? '--headless' : '--headed',
      ...(options.capture ? ['--capture'] : []),
    ],
    traceConfig: `scripts/e2e/meal-${engine}.config.mts`,
    initScripts: [mealCausalObserverScript(), installCommittedRoutePlayback],
    sources: [
      ...producerExtraInputs('004', engine),
      'scripts/e2e/fixed-route-plan.mjs',
      'scripts/e2e/story-input-plans.mjs',
      'scripts/e2e/evidence-artifact.mjs',
      ...Object.keys(contract.hashes),
      'scripts/e2e/npc-story-scope.mjs',
      'scripts/e2e/script-causal-observer.mjs',
      'scripts/e2e/opening-causal-instrumentation.mjs',
    ],
    journey: async ({ newPage, baseURL, out, report, until, health, capture: mediaCapture }) => {
      report.fragment = '004'
      report.engine = engine
      report.kind = mediaCapture.enabled ? 'capture' : 'verify'
      report.case = options.case
      report.scope = plan.scope
      report.checks = {}
      report.rpc = []
      report.predecessor = {
        report: predecessor.reportPath,
        revision: predecessor.revision,
        sha256: predecessor.sha256,
        source: predecessor.source,
      }
      report.predecessorSourceDifferences = Object.entries(predecessor.report.hashes)
        .filter(([f, h]) => contract.hashes[f] && contract.hashes[f] !== h)
        .map(([f, h]) => ({ file: f, predecessor: h, current: contract.hashes[f] }))
      if (engine === 'game')
        assert(
          report.predecessorSourceDifferences.every(
            ({ file }) =>
              !file.startsWith('packages/game/') &&
              !file.startsWith('data/extracted/') &&
              !file.startsWith('packages/shared/'),
          ),
          'first-stage predecessor gameplay source changed',
        )
      report.pending = ['capture video/audio']
      report.route = { status: 'running', inputs: [], steps: [], legs: [] }
      report.milestones = {}
      report.contextTraces = []
      report.core = { status: 'running', rows: [] }
      let page,
        lastKey,
        phase = 'bootstrap',
        contextLabel,
        phaseOrder = -1
      const failedExports = new WeakSet(),
        observedBrowsers = new WeakSet()
      let failure,
        diagnosticStage = 'journey'
      report.browserDiagnostics = []
      report.secondaryDiagnostics = []
      const read = engine === 'game' ? readMealGame : readMealReforge
      const rpc = async (label, action) => {
        const startedAtMs = performance.now(),
          wallAtMs = Date.now()
        let status = 'failed'
        try {
          const value = await action()
          status = 'completed'
          return value
        } finally {
          const endedAtMs = performance.now()
          appendBounded(
            report.rpc,
            {
              label,
              phase,
              context: contextLabel,
              clock: 'node-monotonic',
              wallAtMs,
              startedAtMs,
              endedAtMs,
              durationMs: endedAtMs - startedAtMs,
              status,
            },
            5000,
          )
        }
      }
      const snapshot = async () => {
        const s = await rpc('snapshot', () => page.evaluate(read)),
          key = JSON.stringify(s)
        if (key !== lastKey) {
          appendBounded(
            report.events,
            { atMs: Date.now(), phase, context: contextLabel, state: s },
            4000,
          )
          lastKey = key
        }
        return s
      }
      const press = async (key, reason, scope = 'story') => {
        const action = {
          key,
          reason,
          phase,
          context: contextLabel,
          requestedAtMs: Date.now(),
          startedAtMs: performance.now(),
        }
        console.log(`[${engine}-004] ${key}: ${reason}`)
        await pressRecordedKey({
          keyboard: page.keyboard,
          action: canonicalInput({ ...action, scope }),
          record: (input) => appendBounded(report.actions, input, 500),
        })
      }
      const evidence = async () => {
        const sourcePage = page
        try {
          return await rpc('full-trace', () =>
            readEvidenceArchive(sourcePage, '__readMealEvidence'),
          )
        } catch (error) {
          failedExports.add(sourcePage)
          throw error
        }
      }
      const status = async () => {
        const dto = await rpc('status', () => page.evaluate(() => window.__readMealStatus()))
        assertMealHealth(dto)
        return dto
      }
      const drive = async (afterOrder = phaseOrder) => {
        const dto = await rpc('drive', () =>
          page.evaluate((order) => window.__readMealDrive(order), afterOrder),
        )
        assertMealDrive(dto)
        return dto
      }
      const evidenceOrder = async () => (await drive()).order
      const ready = (s) => kitchenReady(s, engine),
        inScene = (s, sid) => kitchenScene(s, engine, sid)
      const bootstrap = async (label, bytes) => {
        contextLabel = label
        page = await newPage(label)
        const recordBrowserEvent = (event, context = label) =>
          report.browserDiagnostics.push({
            event,
            context,
            phase,
            stage: diagnosticStage,
            atMs: Date.now(),
          })
        page.on('crash', () => recordBrowserEvent('page-crash'))
        page.on('close', () => recordBrowserEvent('page-close'))
        const browser = page.context().browser()
        if (browser && !observedBrowsers.has(browser)) {
          observedBrowsers.add(browser)
          browser.on('disconnected', () => recordBrowserEvent('browser-disconnected', null))
        }
        lastKey = undefined
        if (engine === 'reforge') {
          await page.route('**/__meal-checkpoint.json', (route) =>
            route.fulfill({ contentType: 'application/json', body: bytes }),
          )
          await page.goto(`${baseURL}/?e2e-load=${encodeURIComponent('/__meal-checkpoint.json')}`)
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

      const saveTrace = async (label) => {
        const t = await evidence()
        assertMealCollector(t)
        if (report.attendantReturn && contextLabel !== '004-real-restore')
          assertMealAttendantReturn(t, engine, report.attendantReturn)
        const artifact = mealTraceArtifact(t)
        await writeFile(resolve(out, `${label}.trace.json`), artifact.bytes, { flag: 'wx' })
        report.contextTraces.push({
          context: contextLabel,
          path: `${label}.trace.json`,
          sha256: artifact.sha256,
          byteLength: artifact.byteLength,
          events: t.events.length,
          pages: t.pages.length,
          menus: t.menus.length,
          dispatches: t.dispatches.length,
        })
        return t
      }
      const finishCase = async (label) => {
        const trace = await saveTrace(label)
        const partition = partitionInnMoves(
          committedInnMoves(trace, -1),
          report.route.legs.filter((l) => l.context === contextLabel),
        )
        report.route.committedSteps = partition.steps
        report.route.scriptedOrPlacement = partition.placements
        report.route.status = 'passed'
        report.core.status = 'passed'
        report.core.sourceHashes = contract.hashes
      }
      const navigate = async (sid, finished) =>
        executeFixedRoute({
          page,
          engine,
          plan: storyInputPlan('004', engine, phase, options.case),
          scene: sid,
          id: report.route.legs.length,
          phase,
          context: contextLabel,
          report,
          snapshot,
          evidence: () =>
            rpc('route-evidence', () => page.evaluate(() => window.__readMealRouteEvidence())),
          ready,
          finished,
          health,
        })
      const beginPhase = async (label) => {
        phase = label
        const marker = await rpc('input-phase', () =>
          page.evaluate((label) => window.__mealSetInputPhase(label), label),
        )
        assert(Number.isSafeInteger(marker?.order), 'input phase marker was not recorded')
        phaseOrder = marker.order
      }
      const checkPhase = async (label, shown) => {
        const end = await rpc('phase-end', () =>
          page.evaluate(({ label, start }) => window.__mealFinishPhase(label, start), {
            label,
            start: phaseOrder,
          }),
        )
        assert(Number.isSafeInteger(end?.order), 'phase close was not recorded')
        const projection = await rpc('phase-evidence', () =>
          page.evaluate(() => window.__readMealPhaseEvidence()),
        )
        assertMealHealth(projection)
        const window = mealPhaseWindow(projection, engine, label)
        assertMealPhase(window.trace, engine, shown, label, window.startOrder)
      }
      const finishDialogue = async (sid, ids, { holdAunt = false, failure = false } = {}) => {
        const c = {
          ...contract,
          rows: failure
            ? [{ id: 'dlg.12538', text: contract.locale['dlg.12538'], speaker: null }]
            : ids.map((id) => contract.rows.find((r) => r.id === `dlg.${id}`)),
        }
        assert(c.rows.every(Boolean), 'missing phase dialogue contract')
        let held = false
        for (;;) {
          health()
          const s = await snapshot()
          assert(inScene(s, sid), 'dialogue left expected scene')
          assert.equal(s.cash, 500)
          const trace = await drive(),
            shown = assertMealDialogue(trace, engine, c, false),
            dialog = engine === 'game' ? s.dialog : s.runtime?.dialogue
          if (ready(s)) {
            assertMealDialogue(trace, engine, c)
            if (!failure) report.core.rows.push(...shown.keys())
            return shown
          }
          const confirming =
            dialog &&
            (engine === 'game'
              ? ['waiting-page-key', 'waiting-end-key'].includes(dialog.phase)
              : dialog.phase === 'waiting-input')
          if (confirming && mealRenderedConfirmation(dialog, trace, engine)) {
            if (holdAunt && !held) {
              const began = performance.now()
              await until(
                async () => {
                  const t = await drive(),
                    a = t.aunt
                  assert.equal(a?.facing, 'down', 'aunt pose overwritten during pickup dialogue')
                  assert.equal(a.frame, 0)
                  return performance.now() - began
                },
                (elapsed) => elapsed >= 3000,
                'three-second pickup pose observation',
                5000,
              )
              held = true
              report.pickupPoseHold = {
                durationMs: performance.now() - began,
                order: await evidenceOrder(),
              }
            }
            if (!report.milestones[phase]) {
              await page.screenshot({ path: resolve(out, `004-${phase}.png`) })
              report.milestones[phase] = {
                state: s,
                page: trace.pages.at(-1).page,
                order: await evidenceOrder(),
                context: contextLabel,
              }
            }
            const before = JSON.stringify(dialog)
            const displayed = trace.pages.at(-1)?.page
            const text = engine === 'game' ? displayed?.lines.join('\n') : displayed?.pageText
            if (
              !(await mediaCapture.readable(text, before, async () => {
                const next = await snapshot()
                return JSON.stringify(engine === 'game' ? next.dialog : next.runtime?.dialogue)
              }))
            )
              continue
            await press('Enter', 'normal full-dialogue confirmation')
            await until(
              snapshot,
              (n) => JSON.stringify(engine === 'game' ? n.dialog : n.runtime?.dialogue) !== before,
              'normal dialogue confirmation consumed',
            )
          }
          await new Promise((done) => setTimeout(done, 50))
        }
      }
      const faceActor = async (id) => {
        const s = await snapshot(),
          a = s.actors[id]
        assert(a?.visible, 'target actor missing')
        const [tc, tr] = kitchenGrid(a.position, engine),
          [c, r] = kitchenGrid(s.position, engine),
          facing = tc > c ? 'right' : tc < c ? 'left' : tr > r ? 'down' : 'up',
          key = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' }[facing]
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
      }
      const interact = async (id, sid) => {
        const a = (await snapshot()).actors[id]
        assert(a?.visible, 'interaction actor missing')
        const [tc, tr] = kitchenGrid(a.position, engine)
        const near = (c, r) => Math.abs(c - tc) + Math.abs(r - tr) === 1
        await navigate(
          sid,
          (s) => ready(s) && inScene(s, sid) && near(...kitchenGrid(s.position, engine)),
        )
        await faceActor(id)
        await press('Enter', `normal interaction ${id}`)
        await until(snapshot, (s) => !ready(s), 'interaction starts')
      }
      const inventory = async () => mealInventoryCount((await snapshot()).inventory, engine)
      const taoistTrigger = async () => {
        const actor = (await status()).taoist
        assert(actor, 'taoist persistent state missing')
        return actor.behavior
          ? {
              trigger: actor.behavior.trigger ?? null,
              activation: actor.behavior.triggerActivation ?? null,
            }
          : { trigger: actor.trigger, resume: actor.resume, activation: actor.triggerMode }
      }
      const readMenu = async () => {
        const s = await snapshot()
        const active = engine === 'game' ? s.mode === 'menu' && !!s.menu : !!s.runtime?.menuActive
        const menu = s.menuView
        if (active !== menu?.active)
          return (
            await until(
              snapshot,
              (n) =>
                (engine === 'game' ? n.mode === 'menu' && !!n.menu : !!n.runtime?.menuActive) ===
                n.menuView?.active,
              'actual menu render catches up',
            )
          ).menuView
        return menu
      }
      const chooseWine = async () =>
        selectMealWine({
          readMenu,
          press,
          until,
          engine,
          record: (menu) =>
            (report.milestones[`${phase}-menu`] = {
              context: contextLabel,
              menu,
              atMs: Date.now(),
            }),
        })
      const closeMenus = async () => {
        for (let n = 0; n < 6; n++) {
          const s = await snapshot()
          if (ready(s)) return
          assert(
            engine === 'game' ? s.mode === 'menu' : s.runtime?.menuActive,
            'unexpected non-menu during cancel',
          )
          const m = JSON.stringify(await readMenu())
          await press('Escape', 'normal menu cancel')
          await until(readMenu, (next) => JSON.stringify(next) !== m, 'menu cancel consumed')
        }
        throw new Error('menu cancel budget exhausted')
      }
      const capture = async (label) => {
        let payload, bytes
        if (engine === 'game') {
          const old = await page.evaluate(async () => {
            const { Save } = await import('/src/core/save/api.ts'),
              { serializeSave } = await import('/src/tools/save-io.ts')
            const value = await Save.loadSlot(1)
            return value ? serializeSave(value) : null
          })
          const traceBefore = await evidence()
          const arm = await page.evaluate((phase) => window.__mealArmSaveCapture(phase, 1), label)
          await press('F5', `formal ${label} quick-save`, 'boundary')
          bytes = await until(
            () =>
              page.evaluate(async () => {
                const { Save } = await import('/src/core/save/api.ts'),
                  { serializeSave } = await import('/src/tools/save-io.ts')
                const value = await Save.loadSlot(1)
                return value ? serializeSave(value) : null
              }),
            (value) => value && value !== old,
            `formal ${label} save committed`,
          )
          payload = JSON.parse(bytes)
          const captured = assertMealGameSaveInput(
            await evidence(),
            traceBefore.saveCaptures.length,
            traceBefore.saveCompletions.length,
            arm,
            payload,
          )
          report.saveInputCaptures ??= []
          report.saveInputCaptures.push({ label, context: contextLabel, captured })
        } else {
          payload = await page.evaluate(() => window.__tpE2e.dumpSave())
          bytes = JSON.stringify(payload)
        }
        const world = mealSaveView(payload, engine),
          frame = await waitForOpeningFrame(page, until)
        await page.screenshot({ path: resolve(out, `004-${label}.png`) })
        await writeFile(resolve(out, `${label}.save.json`), bytes)
        return {
          payload,
          bytes,
          world,
          worldHash: sha256(JSON.stringify(world)),
          frame,
          path: `${label}.save.json`,
          sha256: sha256(bytes),
        }
      }
      const restoreCheck = async (saved, label) => {
        await bootstrap(label, saved.bytes)
        const trace = await evidence(),
          world = assertMealRestored(trace, saved.world, engine)
        assert.deepEqual(world, saved.world, 'actual restored persistent world differs')
        const frame = await waitForOpeningFrame(page, until, saved.frame)
        await page.screenshot({ path: resolve(out, `004-${label}.png`) })
        return { world, worldHash: sha256(JSON.stringify(world)), frame }
      }
      try {
        await bootstrap('003-real-predecessor', predecessor.bytes)
        const t = await evidence()
        if (engine === 'game')
          assert.deepEqual(await page.evaluate(readWorld), predecessor.report.endWorld)
        else assertInnRestoreCommitted(t, predecessor.report.endWorld)
        if (mediaCapture.enabled) {
          const frame = await waitForOpeningFrame(page, until)
          await mediaCapture.arm(page, {
            event: '003-predecessor-restored',
            frame,
            inputHash: predecessor.sha256,
          })
        }
        // Specialist cases are not the story tape; saves also span independent contexts.
        if (options.case === 'story')
          report.storyScope = { start: { afterOrder: await evidenceOrder() } }
        await beginPhase('pickup')
        await interact('e20', 's001')
        const pickupShown = await finishDialogue('s001', [141, 142], {
          holdAunt: plan.holdAunt,
        })
        assert.equal((await snapshot()).actors.e20.visible, false)
        assert.equal(await inventory(), 0)
        await until(
          drive,
          (t) => [208, 'sprite-208'].includes(t.latestFrame?.frame.sprite),
          'actual carrying-meal frame',
        )
        await checkPhase('pickup', pickupShown)
        report.checks.pickup = 'passed'
        if (plan.saveRestore) {
          // L_35631 only resets the cursor; L_35630 sets the cooking pose on
          // the next eligible auto call. Require that actual call and its draw.
          if (engine === 'game')
            report.pickupPoseRender = await rpc('pickup-pose-return', () =>
              page.evaluate(
                (afterOrder) =>
                  window.__mealWaitActorRender({
                    engine: 'game',
                    scene: 's001',
                    id: 'e19',
                    position: [704, 1072],
                    facing: 'up',
                    frame: 6,
                    autoIp: 35631,
                    afterOrder,
                    sourceCall: {
                      ip: 35630,
                      command: { op: 'raw', opcode: 15, operands: [2, 0, 0], label: 'L_35630' },
                    },
                  }),
                pickupShown.get('dlg.142'),
              ),
            )
          const pose = (await drive()).aunt
          assert.equal(pose?.facing, 'up', 'aunt did not explicitly return to cooking after pickup')
          report.pickupPoseReturn = pose
          report.checks.pose = 'passed'
          await beginPhase('carry-save')
          const saved = await capture('004.carry')
          if (engine === 'game')
            assert.equal(saved.payload.gs.PlayerRolesRuntime.rgwSpriteNum[0], 208)
          else
            assert.equal(
              saved.payload.world.party[0].appearance?.spriteId,
              'sprite-208',
              'carried appearance is not persistent',
            )
          report.carryCheckpoint = {
            path: saved.path,
            sha256: saved.sha256,
            worldHash: saved.worldHash,
            endWorld: saved.world,
            endFrame: saved.frame,
          }
          await saveTrace('004-before-carry-restore')
          const restored = await restoreCheck(saved, 'carried-meal-real-restore')
          report.carryCheckpoint.restoredWorld = restored.world
          report.carryCheckpoint.restoredWorldHash = restored.worldHash
          report.carryCheckpoint.restoredFrame = restored.frame
          await until(
            drive,
            (t) => [208, 'sprite-208'].includes(t.latestFrame?.frame.sprite),
            'restored carried-meal actual frame',
          )
          report.checks.carryRestore = 'passed'
        }
        await beginPhase('kitchen-exit')
        await navigate('s001', (s) => inScene(s, 's003') && ready(s))
        await beginPhase('stairs-up')
        await navigate(
          's003',
          (s) =>
            inScene(s, 's003') &&
            ready(s) &&
            JSON.stringify(kitchenGrid(s.position, engine)) === '[121,49]',
        )
        await beginPhase('stairs-upper-landing')
        await navigate(
          's003',
          (s) => ready(s) && JSON.stringify(kitchenGrid(s.position, engine)) === '[121,48]',
        )
        await beginPhase('guest-room')
        const servingStartOrder = phaseOrder
        await navigate('s003', (s) => inScene(s, 's001') && ready(s))
        await beginPhase('serve')
        // First-stage idle touch can start e15 immediately after entering its true footprint.
        // Keep its first hide/95 even if they preceded the next ready-state observation.
        if (engine === 'game') phaseOrder = servingStartOrder
        let servingStarted = false
        if (engine === 'game') {
          const entry = await mealGameServingEntry(
            () =>
              page.evaluate(() => {
                const gs = window.__tpgs,
                  npc = gs.allEventObjects.find((actor) => actor.id === 15)
                if (!npc || !gs.npcs.some((actor) => actor.id === 15))
                  throw new Error('serving entity absent from actual scene')
                return {
                  target: {
                    id: 15,
                    scene: gs.wNumScene,
                    state: npc.sState,
                    triggerMode: npc.triggerMode,
                    position: [npc.x, npc.y],
                    anchor: [npc.autoTriggerAnchorX ?? npc.x, npc.autoTriggerAnchorY ?? npc.y],
                  },
                  cursor: {
                    scene: gs.wNumScene,
                    owner: gs.eventCursor?.currentEventObjectId,
                    ip: gs.eventCursor?.ip,
                  },
                }
              }),
            evidence,
            servingStartOrder,
          )
          servingStarted = entry.kind === 'started'
          if (servingStarted)
            report.servingEntryHandoff = {
              context: contextLabel,
              startOrder: servingStartOrder,
              cursor: entry.cursor,
              source: 'actual e15 hide commit and original serving-body cursor',
            }
        }
        if (!servingStarted)
          await navigate('s001', (s) => !!(engine === 'game' ? s.dialog : s.runtime?.dialogue))
        const serveShown = await finishDialogue('s001', MEAL_ROWS.slice(2, 15))
        assert.equal(await inventory(), 1, 'serving did not give exactly one wine')
        assert.equal((await snapshot()).actors.e15.visible, false)
        await until(
          drive,
          (t) => t.latestFrame?.frame.sprite === (engine === 'game' ? 2 : 'li-xiaoyao'),
          'serving restores ordinary party frame',
        )
        await checkPhase('serve', serveShown)
        report.checks.serve = 'passed'
        // Observe the complete eight-step automatic return before the fixed exit
        // input. Leaving mid-return only records a prefix, not its terminal pose.
        report.attendantReturn = await rpc('attendant-return', () =>
          page.evaluate(
            (engine) =>
              window.__mealWaitActorRender({
                engine,
                scene: 's001',
                id: 'e26',
                position: engine === 'game' ? [1328, 1048] : [107, 24, 0],
                facing: 'left',
                frame: 3,
                autoIp: 543,
                behavior: 'legacy-003',
              }),
            engine,
          ),
        )
        await beginPhase('guest-room-exit')
        await navigate('s001', (s) => inScene(s, 's003') && ready(s))
        await beginPhase('stairs-down')
        await navigate(
          's003',
          (s) =>
            inScene(s, 's003') &&
            ready(s) &&
            JSON.stringify(kitchenGrid(s.position, engine)) === '[131,52]',
        )
        if (plan.itemChecks) {
          await beginPhase('cancel-use')
          const beforeCancelInventory = (await snapshot()).inventory,
            beforeCancelTrigger = await taoistTrigger()
          await chooseWine()
          await page.screenshot({ path: resolve(out, '004-cancel-menu.png') })
          const cancelDispatch = (await status()).dispatches.length
          await closeMenus()
          assert.deepEqual(
            (await snapshot()).inventory,
            beforeCancelInventory,
            'cancel changed inventory',
          )
          assert.deepEqual(
            await taoistTrigger(),
            beforeCancelTrigger,
            'cancel changed taoist trigger',
          )
          assert.equal(
            (await status()).dispatches.length,
            cancelDispatch,
            'cancel dispatched item use',
          )
          assert.equal(await inventory(), 1)
          report.cancelUse = { status: 'passed', dispatches: 0 }
          report.checks.cancel = 'passed'
          await beginPhase('wrong-facing-use')
          const beforeInvalidInventory = (await snapshot()).inventory,
            beforeInvalidTrigger = await taoistTrigger()
          await chooseWine()
          await page.screenshot({ path: resolve(out, '004-invalid-menu.png') })
          await press('Enter', 'normal wine use away from taoist')
          await until(
            snapshot,
            (s) => !!(engine === 'game' ? s.dialog : s.runtime?.dialogue),
            'actual rejected use prompt',
          )
          await finishDialogue('s003', [], { failure: true })
          assert.deepEqual(
            (await snapshot()).inventory,
            beforeInvalidInventory,
            'invalid use changed inventory',
          )
          assert.deepEqual(
            await taoistTrigger(),
            beforeInvalidTrigger,
            'invalid use changed taoist trigger',
          )
          assert.equal(await inventory(), 1, 'failed use consumed wine')
          assert.equal((await snapshot()).actors.e62.visible, true, 'failed use hid taoist')
          report.invalidUse = {
            status: 'passed',
            dispatches: (await status()).dispatches.filter((e) => e.order > phaseOrder).length,
          }
          assert.equal(report.invalidUse.dispatches, 1)
          report.checks.invalidUse = 'passed'
          assert.deepEqual(
            report.core.rows,
            plan.rows.map((id) => `dlg.${id}`),
          )
          await finishCase('004-items')
          return
        }
        await beginPhase('taoist-front')
        const a = (await snapshot()).actors.e62,
          [tc, tr] = kitchenGrid(a.position, engine)
        await navigate(
          's003',
          (s) =>
            ready(s) &&
            inScene(s, 's003') &&
            Math.abs(kitchenGrid(s.position, engine)[0] - tc) +
              Math.abs(kitchenGrid(s.position, engine)[1] - tr) ===
              1,
        )
        await faceActor('e62')
        await beginPhase('wine-gift')
        await chooseWine()
        await page.screenshot({ path: resolve(out, '004-use-menu.png') })
        const frozenPosition = (await snapshot()).position
        await press('Enter', 'normal selected wine use; no movement to repair missing entry')
        await until(
          snapshot,
          (s) => {
            assert.deepEqual(s.position, frozenPosition, 'movement repaired wine entry')
            return !!(engine === 'game' ? s.dialog : s.runtime?.dialogue)
          },
          'stationary use immediately starts complete gift',
          5000,
        )
        const giftShown = await finishDialogue('s003', MEAL_ROWS.slice(15))
        await checkPhase('wine-gift', giftShown)
        assert.equal(await inventory(), 0)
        assert.equal((await snapshot()).actors.e62.visible, false)
        const giftDispatch = (await status()).dispatches.filter((e) => e.order > phaseOrder)
        assert.equal(giftDispatch.length, 1, 'gift dispatched more than once')
        assert.equal(giftDispatch[0].request.itemId, '272')
        report.giftDispatch = giftDispatch
        report.checks.gift = 'passed'
        assert.deepEqual(
          report.core.rows,
          MEAL_ROWS.map((id) => `dlg.${id}`),
          '004 closure incomplete',
        )
        assert(ready(await snapshot()), '004 story closure did not return control')
        report.storyEndControl = true
        if (!plan.saveRestore) {
          report.storyScope.end = { afterOrder: await evidenceOrder() }
          const world = await rpc('live-end-world', () =>
            page.evaluate(engine === 'game' ? readWorld : readMealReforgeEndWorld),
          )
          assertMealEndWorld(world, engine)
          assert.deepEqual(
            engine === 'game' ? world.inventory : world.world.inventory,
            engine === 'game'
              ? predecessor.payload.gs.inventory
              : predecessor.payload.world.inventory,
            '004 left unexpected inventory changes',
          )
          report.checks.end = 'passed'
          report.storyEndWorld = world
          report.storyEndWorldHash = sha256(JSON.stringify(world))
          report.endFrame = await waitForOpeningFrame(page, until)
          await page.screenshot({ path: resolve(out, '004-story-end.png') })
          await finishCase('004-story')
          if (mediaCapture.enabled) {
            await mediaCapture.finish(page, {
              event: 'taoist-departed-story-closure',
              frame: report.endFrame,
              worldHash: report.storyEndWorldHash,
            })
            report.pending = ['full-series capture readiness']
          }
          return
        }
        await beginPhase('end-save')
        await press('Escape', 'prove normal menu control', 'boundary')
        await until(readMenu, (m) => m.active, 'normal end menu opens')
        await closeMenus()
        const saved = await capture('004.end')
        assertMealEnd(saved.payload, engine)
        report.checks.end = 'passed'
        assert.deepEqual(
          engine === 'game' ? saved.payload.gs.inventory : saved.payload.world.inventory,
          engine === 'game'
            ? predecessor.payload.gs.inventory
            : predecessor.payload.world.inventory,
          '004 left unexpected inventory changes',
        )
        await finishCase('004-saves-story')
        report.endWorld = saved.world
        report.endWorldHash = saved.worldHash
        report.endFrame = saved.frame
        report.checkpoint = {
          path: saved.path,
          sha256: saved.sha256,
          source:
            'normal 003 -> pickup/carry save and fresh restore/serve/menu wine/full gift/movement -> formal ' +
            (engine === 'game' ? 'F5' : 'dumpSave'),
        }
        await beginPhase('restore')
        const restored = await restoreCheck(saved, '004-real-restore')
        report.restoredWorld = restored.world
        report.restoredWorldHash = restored.worldHash
        report.restoredFrame = restored.frame
        assertMealEnd(engine === 'game' ? saved.payload : restored.world, engine)
        report.checks.endRestore = 'passed'
        await saveTrace('004-restored')
      } catch (error) {
        failure = error
        throw error
      } finally {
        report.lastPhase = phase
        try {
          await finalizeMealEvidence({
            failure,
            diagnose: async () => {
              if (!page || page.isClosed() || failedExports.has(page)) {
                report.secondaryDiagnostics.push({
                  label: 'failure trace',
                  skipped: !page
                    ? 'no page'
                    : page.isClosed()
                      ? 'page closed'
                      : 'export already failed',
                })
                return
              }
              await writeFile(
                resolve(out, '004-latest-trace.json'),
                JSON.stringify(await evidence()),
              )
            },
            verifySources: async () => {
              const after = await readMealContract()
              report.sourceHashesStable =
                JSON.stringify(after.hashes) === JSON.stringify(contract.hashes)
              assert.deepEqual(
                after.hashes,
                contract.hashes,
                '004 sources changed during execution',
              )
            },
            secondary: (diagnostic) => report.secondaryDiagnostics.push(diagnostic),
          })
        } finally {
          diagnosticStage = 'outer-cleanup'
        }
      }
    },
  })
}
