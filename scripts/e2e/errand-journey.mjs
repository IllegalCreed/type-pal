import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import {
  assertErrandCollector,
  assertErrandRestored,
  assertErrandStory,
  ERRAND_GUARD_ROWS,
  ERRAND_PHASE_ROWS,
  errandArguments,
  errandArmed,
  errandSaveView,
  errandScene,
  readErrandContract,
  readErrandPredecessor,
} from './errand-contract.mjs'
import { installErrandObserver, readErrandGame, readErrandReforge } from './errand-observer.mjs'
import { readWorld } from './game-observer.mjs'
import { assertInnRestoreCommitted } from './inn-contract.mjs'
import { committedInnMoves, navigateInnRoute } from './inn-navigation.mjs'
import { INN_DIRECTIONS, planInnRoute } from './inn-route.mjs'
import { kitchenGrid, kitchenReady } from './kitchen-contract.mjs'
import { assertMealDialogue } from './meal-contract.mjs'
import {
  mealGameTouchDestination,
  mealRenderedConfirmation,
  navigateMealRoute,
} from './meal-journey.mjs'
import { readMealReforgeEndWorld } from './meal-observer.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'

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
    initScripts: [installErrandObserver],
    sources: Object.keys(contract.hashes),
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
      let page,
        phase = 'bootstrap',
        phaseOrder = -1,
        contextLabel = '004-saves-real-predecessor'
      const shownAll = new Map()
      const read = engine === 'game' ? readErrandGame : readErrandReforge
      const snapshot = () => page.evaluate(read)
      const evidence = () => page.evaluate(() => window.__readErrandEvidence())
      const drive = () => page.evaluate((after) => window.__readErrandDrive(after), phaseOrder)
      const ready = (s) => kitchenReady(s, engine),
        inScene = (s, sid) => errandScene(s, engine, sid)
      const grid = (s) => kitchenGrid(s.position, engine)
      const press = async (key, reason) => {
        report.actions.push({ phase, key, reason, atMs: Date.now() })
        console.log(`[${engine}-005] ${phase}: ${key} ${reason}`)
        try {
          await page.keyboard.down(key)
        } finally {
          await page.keyboard.up(key)
        }
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
      const saveTrace = async (label) => {
        const trace = await evidence()
        const bytes = JSON.stringify(trace, null, 2),
          path = `${label}.trace.json`
        await writeFile(resolve(out, path), bytes)
        report.contextTraces.push({ context: contextLabel, path, sha256: sha256(bytes) })
        assertErrandCollector(trace)
        return trace
      }
      const navigate = async (sid, destination, finished) => {
        const startOrder = (await drive()).order
        await (engine === 'game' ? navigateMealRoute : navigateInnRoute)({
          keyboard: page.keyboard,
          map: contract.maps[sid],
          read: snapshot,
          until,
          health,
          grid,
          inScene: (s) => inScene(s, sid),
          ready,
          destination,
          finished,
          boundaryCommitted: async () =>
            committedInnMoves(await evidence(), startOrder).some(
              (e) =>
                e.scene === sid &&
                e.source === 'commit:tickSceneInput' &&
                destination(...kitchenGrid(e.state.position, engine)),
            ),
          onInput: (input) => report.route.inputs.push({ phase, scene: sid, ...input }),
          onProgress: () => {},
        })
        report.route.legs.push({ phase, scene: sid, startOrder, endOrder: (await drive()).order })
      }
      const touch = async (sid, id, finished) => {
        const actor = (await snapshot()).actors[id]
        assert(actor?.visible, `missing touch ${id}`)
        let destination
        if (engine === 'game') destination = (c, r) => mealGameTouchDestination(actor, c, r)
        else {
          const entity = contract.scenes[sid].entities.find((e) => e.id === id),
            range = entity.pages[0].triggerActivation.range
          const [c, r] = grid({ position: actor.position })
          destination = (col, row) => Math.max(Math.abs(col - c), Math.abs(row - r)) <= range
        }
        await navigate(sid, destination, finished)
      }
      const interact = async (sid, id) => {
        const target = (await snapshot()).actors[id],
          [tc, tr] = grid(target)
        assert(target?.visible)
        const near = (c, r) => Math.abs(c - tc) + Math.abs(r - tr) === 1
        await navigate(sid, near, (s) => inScene(s, sid) && ready(s) && near(...grid(s)))
        const s = await snapshot(),
          [c, r] = grid(s),
          facing = tc > c ? 'right' : tc < c ? 'left' : tr > r ? 'down' : 'up'
        const key = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' }[
          facing
        ]
        try {
          await page.keyboard.down(key)
          await until(snapshot, (s) => s.facing === facing, 'normal facing', 5000)
        } finally {
          await page.keyboard.up(key)
        }
        await press('Enter', `interact ${id}`)
        await until(snapshot, (s) => !ready(s), 'interaction starts')
      }
      const dialogue = async (sid, label) => {
        const rows = ERRAND_PHASE_ROWS[label] ?? ERRAND_GUARD_ROWS[label],
          expected = {
            ...contract,
            rows: rows.map((id) => contract.rows.find((row) => row.id === `dlg.${id}`)),
          }
        for (;;) {
          health()
          const s = await snapshot(),
            trace = await drive()
          assert(inScene(s, sid), `dialogue left ${sid}`)
          assert.deepEqual(trace.errors, [])
          assert.equal(trace.overflow, false)
          const shown = assertMealDialogue(trace, engine, expected, false)
          if (ready(s)) {
            assertMealDialogue(trace, engine, expected)
            report.core.rows.push(...shown.keys())
            for (const [key, value] of shown) shownAll.set(key, value)
            report.checks[label] = 'passed'
            report.milestones[label] = { state: s, order: trace.order }
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
          const before = await evidence()
          await press('F5', 'formal quick-save after manual-menu availability')
          await until(
            evidence,
            (trace) => trace.saveCompletions.length === before.saveCompletions.length + 1,
            'formal save acknowledgement',
          )
          bytes = await page.evaluate(async () => {
            const { Save } = await import('/src/core/save/api.ts'),
              { serializeSave } = await import('/src/tools/save-io.ts')
            return serializeSave(await Save.loadSlot(1))
          })
          payload = JSON.parse(bytes)
          const trace = await evidence(),
            captures = trace.saveCaptures.slice(before.saveCaptures.length),
            completions = trace.saveCompletions.slice(before.saveCompletions.length)
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
        await begin('kitchen-entry')
        await touch('s003', 'e53', (s) => inScene(s, 's001') && ready(s))
        await begin('aunt')
        await interact('s001', 'e19')
        await dialogue('s001', 'aunt')
        assert.equal((await snapshot()).cash, 550)
        assert.equal(
          errandArmed((await evidence()).final, engine),
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
          errandArmed((await evidence()).final, engine),
          false,
          'fish prematurely armed report',
        )
        await begin('water')
        await touch('s005', 'e124', (s) => !!(engine === 'game' ? s.dialog : s.runtime?.dialogue))
        await dialogue('s005', 'water')
        assert.equal(
          errandArmed((await evidence()).final, engine),
          false,
          'water prematurely armed report',
        )
        await begin('zhang')
        await touch('s005', 'e123', (s) => !!(engine === 'game' ? s.dialog : s.runtime?.dialogue))
        await dialogue('s005', 'zhang')
        assert.equal(
          errandArmed((await evidence()).final, engine),
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
        await begin('control-move')
        const state = await snapshot(),
          start = grid(state),
          key = planInnRoute(
            contract.maps.s004,
            start,
            (c, r) => Math.abs(c - start[0]) + Math.abs(r - start[1]) === 1,
            state.routeActors,
          )[0],
          d = INN_DIRECTIONS.find((d) => d.key === key)
        assert(d)
        const destination = (c, r) => c === start[0] + d.col && r === start[1] + d.row
        await navigate(
          's004',
          destination,
          (s) => inScene(s, 's004') && ready(s) && destination(...grid(s)),
        )
        const moves = committedInnMoves(await evidence(), phaseOrder)
        assert(
          moves.some((e) => ['commit:tickSceneInput', 'commit:player.pos'].includes(e.source)),
          'no actual control movement',
        )
        assert.equal((await snapshot()).cash, 550)
        report.controlMove = { from: start, commits: moves }
        report.checks.controlMove = 'passed'
        report.storyEndWorld = await page.evaluate(
          engine === 'game' ? readWorld : readMealReforgeEndWorld,
        )
        report.storyEndWorldHash = sha256(JSON.stringify(report.storyEndWorld))
        report.endFrame = await waitForOpeningFrame(page, until)
        assertErrandStory(await evidence(), engine, shownAll)
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
          report.checks.endRestore = 'passed'
          report.checks.backgroundContinuation = 'passed'
        }
        report.core.status = 'passed'
        report.route.status = 'passed'
      } finally {
        report.lastPhase = phase
        if (page) await saveTrace('005-latest')
        const after = await readErrandContract()
        report.sourceHashesStable = JSON.stringify(after.hashes) === JSON.stringify(contract.hashes)
        assert.deepEqual(after.hashes, contract.hashes, '005 sources changed during run')
      }
    },
  })
}
