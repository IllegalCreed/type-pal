import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { readWorld } from './game-observer.mjs'
import {
  assertInnChoreography,
  assertInnDialogueHolds,
  assertInnEvidence,
  assertInnRestoreCommitted,
  innArguments,
  readInnContract,
  readPredecessor,
} from './inn-contract.mjs'
import { committedInnMoves, navigateInnRoute, partitionInnMoves } from './inn-navigation.mjs'
import { installInnObserver, readInnGame, readInnReforge } from './inn-observer.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { appendBounded } from './opening-policy.mjs'
import { openingSaveView } from './reforge-opening-policy.mjs'

const ready = (s, engine) =>
  engine === 'game'
    ? s.mode === 'explore' && !s.event && !s.dialog && !s.menu && !s.loading && !s.fading
    : !!s.runtime &&
      !s.runtime.scriptRunning &&
      !s.runtime.dialogue &&
      !s.runtime.presentationBusy &&
      !s.runtime.menuActive &&
      !s.runtime.battleActive &&
      s.runtime.fadeBlack === 0 &&
      !s.runtime.ditherActive
const grid = (s, engine) =>
  engine === 'game'
    ? [(s.position[0] / 16 + s.position[1] / 8) / 2, (s.position[1] / 8 - s.position[0] / 16) / 2]
    : s.position.slice(0, 2)
const room = (s, engine) => s.scene === (engine === 'game' ? 2 : 's001')
const hall = (s, engine) => s.scene === (engine === 'game' ? 4 : 's003')

export async function runInnJourney(engine) {
  const options = innArguments(process.argv.slice(2)),
    predecessor = await readPredecessor(options['--from'], engine),
    contract = await readInnContract()
  const maps = Object.fromEntries(
    await Promise.all(
      ['s001', 's003'].map(async (id) => [
        id,
        JSON.parse(
          await readFile(
            resolve(
              repoRoot,
              `projects/pal/content/maps/map-${id === 's001' ? '012' : '010'}.json`,
            ),
            'utf8',
          ),
        ),
      ]),
    ),
  )
  await runBrowserJourney({
    name: `${engine}-002`,
    packageName: `@type-pal/${engine}`,
    environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
    arguments: [options.headless ? '--headless' : '--headed'],
    traceConfig: `scripts/e2e/${engine}-inn.config.mts`,
    initScripts: [installInnObserver],
    sources: [
      ...Object.keys(contract.hashes),
      'scripts/e2e/inn-journey.mjs',
      'scripts/e2e/inn-contract.mjs',
      'scripts/e2e/inn-observer.mjs',
      'scripts/e2e/inn-route.mjs',
      'scripts/e2e/inn-trace-plugin.mjs',
      'scripts/e2e/opening-trace-plugin.mjs',
      'packages/game/src/core/event-system.ts',
      'packages/game/src/core/scene-system.ts',
      'packages/reforge/src/main.ts',
    ],
    journey: async ({ newPage, baseURL, out, report, until, health }) => {
      report.fragment = '002'
      report.engine = engine
      report.predecessor = {
        report: predecessor.path,
        revision: predecessor.revision,
        sha256: predecessor.sha256,
        source: predecessor.source,
      }
      report.pending = ['capture video/audio', '003 and subsequent fragments']
      let page, lastKey
      const read = engine === 'game' ? readInnGame : readInnReforge
      const snapshot = async () => {
        const s = await page.evaluate(read)
        const key = JSON.stringify({
          scene: s.scene,
          position: s.position,
          cash: s.cash,
          mode: s.mode,
          dialog: s.dialog,
          menu: s.menu,
          loading: s.loading,
          fading: s.fading,
          runtime: s.runtime,
          trio: s.trio,
        })
        if (key !== lastKey) {
          appendBounded(report.events, { atMs: Date.now(), state: s }, 1600)
          lastKey = key
        }
        return s
      }
      const press = async (key, reason) => {
        appendBounded(report.actions, { key, reason }, 240)
        console.log(`[${engine}-002] ${key}: ${reason}`)
        await page.keyboard.down(key)
        await page.keyboard.up(key)
      }
      const bootstrap = async (label, bytes) => {
        page = await newPage(label)
        lastKey = undefined
        if (engine === 'reforge') {
          await page.route('**/__inn-checkpoint.json', (route) =>
            route.fulfill({ contentType: 'application/json', body: bytes }),
          )
          await page.goto(`${baseURL}/?e2e-load=${encodeURIComponent('/__inn-checkpoint.json')}`)
          await until(
            snapshot,
            (s) => {
              assert.notEqual(s.boot?.checkpointLoad, 'failed', 'formal checkpoint rejected')
              return s.boot?.checkpointLoad === 'loaded' && ready(s, engine)
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
                  ['/extracted/videos/1.mp4', '/extracted/videos/2.mp4'].some((p) =>
                    video.endsWith(p),
                  ),
                )
                await press('Enter', 'close title prelude outside 002')
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
            const { Save } = await import('/src/core/save/api.ts')
            const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
            await Save.saveSlot(1, parseImportedSave(text))
            return serializeSave(await Save.loadSlot(1))
          }, bytes)
          assert.equal(sha256(staged), sha256(bytes), 'staged save bytes changed')
          await press('ArrowDown', 'select 旧的回忆')
          await until(
            snapshot,
            (s) => s.menu?.kind === 'opening' && s.menu.cursor === 1,
            'load selection',
          )
          await press('Enter', 'open formal slot menu')
          await until(snapshot, (s) => s.menu?.kind === 'save-slot', 'slot menu')
          assert.equal((await snapshot()).menu.cursor, 0)
          await press('Enter', 'load actual slot1')
          await until(snapshot, (s) => ready(s, engine), 'formal game checkpoint restore', 60000)
        }
      }
      await bootstrap('001-real-predecessor', predecessor.bytes)
      let s = await snapshot()
      assert(room(s, engine))
      assert.deepEqual(grid(s, engine), [60, -24])
      assert.equal(s.cash, 0)
      const evidenceOrder = async () =>
        (await page.evaluate(() => window.__readInnEvidence())).events.at(-1)?.order ?? -1
      report.route = {
        status: 'running',
        steps: [],
        inputs: [],
        legs: [],
        startOrder: await evidenceOrder(),
        stepKind: 'observed progress; actual walking commits are in committedSteps',
        start: { scene: s.scene, position: s.position },
      }
      const navigate = async (sid, destination, finished) => {
        const startOrder = await evidenceOrder()
        await navigateInnRoute({
          keyboard: page.keyboard,
          map: maps[sid],
          read: snapshot,
          until,
          health,
          grid: (state) => grid(state, engine),
          inScene: (state) => (sid === 's001' ? room(state, engine) : hall(state, engine)),
          ready: (state) => ready(state, engine),
          destination,
          finished,
          onInput: (input) => {
            const action = { scene: sid, atMs: Date.now(), ...input }
            appendBounded(report.route.inputs, action, 240)
            appendBounded(report.actions, action, 240)
          },
          onProgress: (step) =>
            appendBounded(report.route.steps, { scene: sid, atMs: Date.now(), ...step }, 240),
        })
        report.route.legs.push({
          scene: sid,
          startOrder,
          endOrder: await evidenceOrder(),
          // game 0x46 relocates before its scene event; RF spawn commits after the scene event.
          moveSources:
            engine === 'game'
              ? ['commit:tickSceneInput', 'commit:pushPartyAwayFromBlockingNpcs']
              : ['commit:player.pos'],
        })
      }
      const radius = (col, row, targetCol, targetRow) =>
        engine === 'game'
          ? Math.abs(col - targetCol) + Math.abs(row - targetRow) <= 1
          : Math.max(Math.abs(col - targetCol), Math.abs(row - targetRow)) <= 1
      await navigate(
        's001',
        (c, r) => radius(c, r, 60, -12),
        (s) => hall(s, engine) && ready(s, engine),
      )
      s = await snapshot()
      assert.deepEqual(grid(s, engine), [143, 45])
      report.route.hallEntry = { scene: s.scene, position: s.position }
      await navigate(
        's003',
        (c, r) =>
          engine === 'game'
            ? Math.abs(16 * (c - r - (124 - 45))) + 2 * Math.abs(8 * (c + r - (124 + 45))) < 80
            : Math.max(Math.abs(c - 124), Math.abs(r - 45)) <= 2,
        (s) => (engine === 'game' ? !!s.dialog : !!s.runtime?.dialogue),
      )
      report.route.status = 'passed'
      report.route.coreEntry = (await snapshot()).position
      report.route.committedMoves = committedInnMoves(
        await page.evaluate(() => window.__readInnEvidence()),
        report.route.startOrder,
      )
      const routeMoves = partitionInnMoves(report.route.committedMoves, report.route.legs)
      report.route.committedSteps = routeMoves.steps
      report.route.placements = routeMoves.placements
      report.core = { status: 'running' }
      report.milestones = {}
      report.dialogueHolds = []
      for (;;) {
        health()
        s = await snapshot()
        assert(hall(s, engine), 'core left s003 unexpectedly')
        assert.equal(s.cash === 0 || s.cash === 500, true, 'wrong reward value')
        const dialog = engine === 'game' ? s.dialog : s.runtime?.dialogue
        if (dialog) {
          const confirm =
            engine === 'game'
              ? ['waiting-page-key', 'waiting-end-key'].includes(dialog.phase)
              : dialog.phase === 'waiting-input'
          assert(
            (engine === 'game'
              ? ['typing', 'line-done', 'waiting-page-key', 'waiting-end-key']
              : ['typing', 'waiting-input', 'auto-advance']
            ).includes(dialog.phase),
            'unknown dialogue phase',
          )
          const evidence = await page.evaluate(() => window.__readInnEvidence())
          const displayed = evidence.pages.at(-1)?.page
          const text = engine === 'game' ? displayed?.lines.join('\n') : displayed?.pageText
          if (displayed && (confirm || (engine === 'game' && displayed.slot === 'narration'))) {
            for (const [id, needle] of [
              ['leader', '这间客栈'],
              ['allowance', '银子你拿去'],
              ['reward', '５００'],
              ['last-line', '财神爷'],
            ])
              if (!report.milestones[id] && text?.includes(needle)) {
                await page.screenshot({ path: resolve(out, `002-${id}.png`) })
                report.milestones[id] = { position: s.position, trio: s.trio, cash: s.cash }
              }
          }
          if (confirm) {
            const heldCue = text?.includes('这间客栈')
              ? 'dlg.32'
              : text?.includes('财神爷')
                ? 'dlg.53'
                : null
            if (
              options.holdLeader &&
              heldCue &&
              !report.dialogueHolds.some((h) => h.cue === heldCue)
            ) {
              const start = {
                trio: s.trio.map(({ id, visible, position }) => ({ id, visible, position })),
                dialogue: { phase: dialog.phase, text },
                order: evidence.events.length + evidence.pages.length,
              }
              const authority = () =>
                page.evaluate(() =>
                  window.__tpE2e
                    .dumpMotionState()
                    .entities.filter((e) => ['e59', 'e60', 'e61'].includes(e.id))
                    .map((e) => ({
                      id: e.id,
                      kind: e.authority.kind,
                      autoMotion: e.autoMotion ?? null,
                    })),
                )
              if (engine === 'reforge') start.authority = await authority()
              const began = Date.now()
              const hold = {
                cue: heldCue,
                start,
                reason: 'normal reader remains at a fully displayed waiting-input page',
              }
              await new Promise((done) => setTimeout(done, 3000))
              const end = await snapshot(),
                after = await page.evaluate(() => window.__readInnEvidence())
              const endDialog = engine === 'game' ? end.dialog : end.runtime?.dialogue
              hold.elapsedMs = Date.now() - began
              hold.end = {
                trio: end.trio.map(({ id, visible, position }) => ({ id, visible, position })),
                dialogue: {
                  phase: endDialog?.phase,
                  text:
                    engine === 'game'
                      ? after.pages.at(-1)?.page?.lines.join('\n')
                      : after.pages.at(-1)?.page?.pageText,
                },
                order: after.events.length + after.pages.length,
              }
              if (engine === 'reforge') hold.end.authority = await authority()
              report.dialogueHolds.push(hold)
            }
            await press('Enter', 'normal full-dialogue confirmation')
            const before = JSON.stringify(dialog)
            await until(
              snapshot,
              (next) =>
                JSON.stringify(engine === 'game' ? next.dialog : next.runtime?.dialogue) !== before,
              'normal confirmation consumed',
            )
          }
        }
        if (
          ready(s, engine) &&
          s.cash === 500 &&
          s.trio.length === 3 &&
          s.trio.every((e) => !e.visible) &&
          s.roomActors.every((e) => e.visible)
        )
          break
        await new Promise((done) => setTimeout(done, 50))
      }
      const trace = await until(
        () => page.evaluate(() => window.__readInnEvidence()),
        (t) => t.final?.control,
        'actual final render control',
      )
      await writeFile(resolve(out, 'inn-trace.json'), JSON.stringify(trace, null, 2))
      assert.deepEqual(
        (await readInnContract()).hashes,
        contract.hashes,
        'sources changed during 002',
      )
      report.core = assertInnEvidence(trace, engine, contract)
      try {
        report.choreography = assertInnChoreography(trace, engine, contract)
      } catch (error) {
        // Retain formal save/restore diagnostics before surfacing this independent staging failure.
        report.choreography = { status: 'failed', failure: error.message }
      }
      assert.equal(
        Object.keys(report.milestones).length,
        4,
        'four rendered visual milestones required',
      )
      report.temporalEvidence = Object.fromEntries(
        ['e56', 'e59', 'e60', 'e61'].map((id) => [
          id,
          trace.events
            .filter((e) => e.kind === 'actor' && e.id === id)
            .map((e) => ({
              order: e.order,
              atMs: e.atMs,
              visible: e.state.visible,
              position: e.state.position,
            })),
        ]),
      )
      report.dialogueTimeline = trace.pages.map((p) => ({
        order: p.order,
        atMs: p.atMs,
        page: p.page,
      }))
      await press('Escape', 'prove normal control menu')
      await until(
        snapshot,
        (s) => (engine === 'game' ? !!s.menu : !!s.runtime?.menuActive),
        'menu opens',
      )
      await press('Escape', 'close actual menu')
      await until(snapshot, (s) => ready(s, engine), 'menu closes')
      const formalReforgeSnapshot = async (label) => {
        const started = Date.now(),
          before = await snapshot()
        try {
          const value = await page.evaluate(() => window.__tpE2e.dumpSave())
          const after = await snapshot()
          report.saveBarriers ??= []
          appendBounded(
            report.saveBarriers,
            { label, elapsedMs: Date.now() - started, before, after },
            4,
          )
          return value
        } catch (error) {
          const diagnostic = await page.evaluate(() => ({
            coordinator: window.__innReadSaveBarrier?.(),
            runtime: window.__tpObserve?.readRuntime?.(),
            motion: window.__tpE2e?.dumpMotionState?.(),
            trace: window.__readInnEvidence?.(),
          }))
          report.saveBarrierFailure = {
            label,
            elapsedMs: Date.now() - started,
            coordinator: diagnostic.coordinator,
          }
          await writeFile(
            resolve(out, '002-save-barrier-failure.json'),
            JSON.stringify(diagnostic, null, 2),
          )
          throw error
        }
      }
      let reforgeCheckpoint
      if (engine === 'game') report.endWorld = await page.evaluate(readWorld)
      else {
        // One real barrier supplies both the persisted reference and the checkpoint bytes.
        // A second capture after screenshots could legally advance background cursors.
        reforgeCheckpoint = await formalReforgeSnapshot('checkpoint')
        report.endWorld = openingSaveView(reforgeCheckpoint)
      }
      report.endWorldHash = sha256(JSON.stringify(report.endWorld))
      report.endFrame = await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '002-end.png') })
      let bytes
      if (engine === 'game') {
        await press('F5', 'formal 002 quick-save')
        bytes = await until(
          () =>
            page.evaluate(async () => {
              const { Save } = await import('/src/core/save/api.ts')
              const { serializeSave } = await import('/src/tools/save-io.ts')
              const gs = await Save.loadSlot(1)
              return gs ? serializeSave(gs) : null
            }),
          (v) => !!v && JSON.parse(v).gs.dwCash === 500,
          'formal 002 save committed',
        )
      } else bytes = JSON.stringify(reforgeCheckpoint)
      await writeFile(resolve(out, '002.end.save.json'), bytes)
      report.checkpoint = {
        path: '002.end.save.json',
        sha256: sha256(bytes),
        source: `this 002 normal route/core / ${engine === 'game' ? 'F5 Save.loadSlot/serialize' : 'production barrier dumpSave'}`,
      }
      await bootstrap('002-real-restore', bytes)
      s = await snapshot()
      assert(hall(s, engine))
      assert.equal(s.cash, 500)
      assert(s.trio.every((e) => !e.visible))
      assert(s.roomActors.every((e) => e.visible))
      const restoredTrace = await page.evaluate(() => window.__readInnEvidence())
      await writeFile(
        resolve(out, '002-restored-trace.json'),
        JSON.stringify(restoredTrace, null, 2),
      )
      if (engine === 'reforge') report.restoreCommits = restoredTrace.restoreCommits
      report.restoredWorld =
        engine === 'game'
          ? await page.evaluate(readWorld)
          : assertInnRestoreCommitted(restoredTrace, report.endWorld)
      report.restoredWorldHash = sha256(JSON.stringify(report.restoredWorld))
      assert.equal(
        report.restoredWorldHash,
        report.endWorldHash,
        'restored persistent world differs',
      )
      if (engine === 'reforge') {
        // This second real barrier can settle an already resumed background stage. Preserve its
        // complete result and before/after evidence, but do not use it as the load equality oracle.
        report.postResumeWorld = openingSaveView(await formalReforgeSnapshot('post-resume'))
        report.postResumeWorldHash = sha256(JSON.stringify(report.postResumeWorld))
      }
      report.restoredFrame = await waitForOpeningFrame(page, until, report.endFrame)
      await page.screenshot({ path: resolve(out, '002-restored.png') })
      await press('Escape', 'restored normal menu')
      await until(
        snapshot,
        (s) => (engine === 'game' ? !!s.menu : !!s.runtime?.menuActive),
        'restored menu opens',
      )
      await press('Escape', 'return from restored menu')
      await until(snapshot, (s) => ready(s, engine), 'restored menu closes')
      assert.equal(report.choreography.status, 'passed', report.choreography.failure)
      if (options.holdLeader)
        report.dialogueHoldVerdict = assertInnDialogueHolds(trace, report.dialogueHolds, engine)
    },
  })
}
