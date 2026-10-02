import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { readWorld } from './game-observer.mjs'
import { assertInnRestoreCommitted } from './inn-contract.mjs'
import { committedInnMoves, navigateInnRoute, partitionInnMoves } from './inn-navigation.mjs'
import { INN_DIRECTIONS, planInnRoute } from './inn-route.mjs'
import { kitchenGrid, kitchenReady, kitchenScene } from './kitchen-contract.mjs'
import {
  assertMealCollector,
  assertMealDialogue,
  assertMealEnd,
  assertMealGameSaveInput,
  assertMealPhase,
  MEAL_ROWS,
  mealArguments,
  mealInventoryCount,
  mealSaveView,
  mealServingDestination,
  mealTraceArtifact,
  readMealContract,
  readMealPredecessor,
} from './meal-contract.mjs'
import { selectMealWine } from './meal-menu.mjs'
import { installMealObserver, readMealGame, readMealReforge } from './meal-observer.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { appendBounded } from './opening-policy.mjs'

/** Target touch may acquire its script between two reads, before dialogue or scene load is visible. */
export async function navigateMealRoute({
  keyboard,
  map,
  read,
  until,
  health,
  grid,
  inScene,
  ready,
  destination,
  finished,
  onInput,
  onProgress,
  boundaryCommitted = () => false,
}) {
  let heldKey
  const release = async (reason) => {
    if (heldKey === undefined) return
    const key = heldKey
    await keyboard.up(key)
    heldKey = undefined
    onInput({ kind: 'up', key, reason })
  }
  const cleanup = async () => {
    try {
      await release('route end or failure')
    } catch (error) {
      await release('retry failed release')
      throw error
    }
  }
  try {
    for (let n = 0; n < 120; n++) {
      health()
      const state = await read()
      if (finished(state)) return
      const atTarget = inScene(state) && destination(...grid(state))
      if (atTarget) {
        await release('verified target touch/scene boundary')
        await until(read, finished, 'actual expected target transition settles')
        return
      }
      if (!inScene(state) || !ready(state)) {
        // Proof may transfer a large trace. Never keep an old direction held while awaiting it.
        await release('stop before exceptional boundary evidence')
        if (await boundaryCommitted()) {
          await until(read, finished, 'actual expected target transition settles')
          return
        }
      }
      assert(inScene(state), 'route entered unexpected scene without target landing')
      assert(ready(state), 'unexpected script/dialogue outside target boundary')
      const path = planInnRoute(map, grid(state), destination, state.routeActors)
      assert(path.length > 0)
      const key = path[0]
      if (key !== heldKey) {
        await release('turn')
        heldKey = key
        await keyboard.down(key)
        onInput({ kind: 'down', key, reason: 'normal held route' })
      }
      const before = state.position
      const observed = await until(
        read,
        (next) =>
          JSON.stringify(next.position) !== JSON.stringify(before) ||
          !inScene(next) ||
          !ready(next) ||
          finished(next),
        'normal input committed progress',
        5000,
      )
      onProgress({ key, from: before, to: observed.position })
      if (finished(observed)) return
      const targetObserved = inScene(observed) && destination(...grid(observed))
      if (targetObserved) {
        await release('verified target effect')
        await until(read, finished, 'actual expected target transition settles')
        return
      }
      if (!inScene(observed) || !ready(observed)) {
        await release('stop before exceptional boundary evidence')
        if (await boundaryCommitted()) {
          await until(read, finished, 'actual expected target transition settles')
          return
        }
      }
      assert(inScene(observed), 'route entered unexpected scene without target landing')
      assert(ready(observed), 'unexpected script/dialogue outside target boundary')
    }
    throw new Error('normal meal route action budget exhausted')
  } finally {
    await cleanup()
  }
}

/** Only real first-stage player input commits in this leg can prove an already-left touch cell. */
export function mealGameBoundaryCommitted(trace, startOrder, scene, destination) {
  return committedInnMoves(trace, startOrder).some(
    (event) =>
      event.scene === scene &&
      event.source === 'commit:tickSceneInput' &&
      destination(...kitchenGrid(event.state.position, 'game')),
  )
}

/** Exact current first-stage touch footprint: pixel-axis weighted distance, not grid MD. */
export function mealGameTouchDestination(target, col, row) {
  assert(
    Number.isInteger(target.triggerMode) && Number.isInteger(target.state),
    'missing actual game trigger mode/state',
  )
  assert(
    target.anchor?.length === 2 && target.anchor.every(Number.isFinite),
    'missing actual game touch anchor',
  )
  if (target.state <= 0 || target.triggerMode < 4) return false
  const x = 16 * (col - row),
    y = 8 * (col + row)
  return (
    Math.abs(x - target.anchor[0]) + 2 * Math.abs(y - target.anchor[1]) <
    (target.triggerMode - 4) * 32 + 16
  )
}

export async function runMealJourney(engine) {
  const options = mealArguments(process.argv.slice(2)),
    predecessor = await readMealPredecessor(options['--from'], engine),
    contract = await readMealContract()
  assert(
    !options.baseline || engine === 'reforge',
    'stationary old-transfer counter is Reforge-only',
  )
  const maps = Object.fromEntries(
    await Promise.all(
      ['s001', 's003'].map(async (sid) => [
        sid,
        JSON.parse(
          await readFile(
            resolve(
              repoRoot,
              `projects/pal/content/maps/map-${sid === 's001' ? '012' : '010'}.json`,
            ),
            'utf8',
          ),
        ),
      ]),
    ),
  )
  await runBrowserJourney({
    name: `${engine}-004${options.baseline ? '-stationary-baseline' : ''}`,
    packageName: `@type-pal/${engine}`,
    environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
    arguments: [options.headless ? '--headless' : '--headed'],
    traceConfig: `scripts/e2e/meal-${engine}.config.mts`,
    initScripts: [installMealObserver],
    sources: Object.keys(contract.hashes),
    journey: async ({ newPage, baseURL, out, report, until, health }) => {
      report.fragment = '004'
      report.engine = engine
      report.kind = options.baseline ? 'counter-diagnostic' : 'verify'
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
      const read = engine === 'game' ? readMealGame : readMealReforge
      const snapshot = async () => {
        const s = await page.evaluate(read),
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
      const press = async (key, reason) => {
        appendBounded(report.actions, { key, reason, phase, context: contextLabel }, 500)
        console.log(`[${engine}-004] ${key}: ${reason}`)
        try {
          await page.keyboard.down(key)
        } finally {
          await page.keyboard.up(key)
        }
      }
      const evidence = () => page.evaluate(() => window.__readMealEvidence())
      const evidenceOrder = async () => {
        const t = await evidence()
        return Math.max(
          -1,
          ...[
            ...t.events,
            ...t.pages,
            ...t.frames,
            ...t.menus,
            ...t.dispatches,
            ...t.saveCaptures,
            ...t.saveCompletions,
          ].map((e) => e.order),
        )
      }
      const ready = (s) => kitchenReady(s, engine),
        inScene = (s, sid) => kitchenScene(s, engine, sid)
      const bootstrap = async (label, bytes) => {
        contextLabel = label
        page = await newPage(label)
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
                await press('Enter', 'close title prelude outside 003')
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
          await until(snapshot, ready, 'formal game checkpoint restore', 60000)
        }
      }

      const saveTrace = async (label) => {
        const t = await evidence()
        assertMealCollector(t)
        const artifact = mealTraceArtifact(t)
        await writeFile(resolve(out, `${label}.trace.json`), artifact.bytes)
        report.contextTraces.push({
          context: contextLabel,
          path: `${label}.trace.json`,
          sha256: artifact.sha256,
          events: t.events.length,
          pages: t.pages.length,
          menus: t.menus.length,
          dispatches: t.dispatches.length,
        })
        return t
      }
      const navigate = async (sid, destination, finished) => {
        const startOrder = await evidenceOrder()
        const navigateDriver = engine === 'game' ? navigateMealRoute : navigateInnRoute
        await navigateDriver({
          keyboard: page.keyboard,
          map: maps[sid],
          read: snapshot,
          until,
          health,
          grid: (s) => kitchenGrid(s.position, engine),
          inScene: (s) => inScene(s, sid),
          ready,
          destination,
          finished,
          boundaryCommitted: () =>
            evidence().then((trace) =>
              mealGameBoundaryCommitted(trace, startOrder, sid, destination),
            ),
          onInput: (input) => {
            const a = { scene: sid, phase, context: contextLabel, atMs: Date.now(), ...input }
            appendBounded(report.route.inputs, a, 600)
            appendBounded(report.actions, a, 500)
          },
          onProgress: (step) =>
            appendBounded(
              report.route.steps,
              { scene: sid, phase, context: contextLabel, atMs: Date.now(), ...step },
              600,
            ),
        })
        report.route.legs.push({
          scene: sid,
          phase,
          context: contextLabel,
          startOrder,
          endOrder: await evidenceOrder(),
          moveSources:
            engine === 'game'
              ? ['commit:tickSceneInput', 'commit:pushPartyAwayFromBlockingNpcs']
              : ['commit:player.pos'],
        })
      }
      const touchDestination = async (id, reforgeDestination) => {
        if (engine === 'reforge') return reforgeDestination
        const target = await page.evaluate((id) => {
          const gs = window.__tpgs,
            npc = gs.allEventObjects.find((actor) => actor.id === id)
          if (!npc || !gs.npcs.some((actor) => actor.id === id))
            throw new Error('touch target absent from actual current scene')
          return {
            id,
            scene: gs.wNumScene,
            position: [npc.x, npc.y],
            anchor: [npc.autoTriggerAnchorX ?? npc.x, npc.autoTriggerAnchorY ?? npc.y],
            triggerMode: npc.triggerMode,
            state: npc.sState,
          }
        }, id)
        assert(target.state > 0 && target.triggerMode >= 4, 'actual game touch target is inactive')
        report.route.touchFootprints ??= []
        report.route.touchFootprints.push({ phase, context: contextLabel, target })
        return (col, row) => mealGameTouchDestination(target, col, row)
      }
      const beginPhase = async (label) => {
        phase = label
        phaseOrder = await evidenceOrder()
      }
      const phaseTrace = async () => {
        const t = await evidence()
        return { ...t, pages: t.pages.filter((e) => e.order > phaseOrder) }
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
          const trace = await phaseTrace(),
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
          if (confirming) {
            assert(trace.pages.at(-1)?.page, 'confirmation before actual rendered page')
            if (holdAunt && !held) {
              const began = performance.now()
              await until(
                async () => {
                  const t = await evidence(),
                    a = t.final?.actors.e19
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
        try {
          await page.keyboard.down(key)
          await until(snapshot, (n) => n.facing === facing, 'normal facing toward target', 5000)
        } finally {
          await page.keyboard.up(key)
        }
      }
      const interact = async (id, sid) => {
        const a = (await snapshot()).actors[id]
        assert(a?.visible, 'interaction actor missing')
        const [tc, tr] = kitchenGrid(a.position, engine)
        const near = (c, r) => Math.abs(c - tc) + Math.abs(r - tr) === 1
        await navigate(
          sid,
          near,
          (s) => ready(s) && inScene(s, sid) && near(...kitchenGrid(s.position, engine)),
        )
        await faceActor(id)
        await press('Enter', `normal interaction ${id}`)
        await until(snapshot, (s) => !ready(s), 'interaction starts')
      }
      const inventory = async () => mealInventoryCount((await snapshot()).inventory, engine)
      const taoistTrigger = async () => {
        const actor = (await evidence()).final.persistent.e62
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
          await press('F5', `formal ${label} quick-save`)
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
          world =
            engine === 'game'
              ? await page.evaluate(readWorld)
              : assertInnRestoreCommitted(trace, saved.world)
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
        await beginPhase('pickup')
        await interact('e20', 's001')
        const pickupShown = await finishDialogue('s001', [141, 142], {
          holdAunt: !options.baseline,
        })
        assert.equal((await snapshot()).actors.e20.visible, false)
        assert.equal(await inventory(), 0)
        await until(
          evidence,
          (t) => t.frames.some((f) => [208, 'sprite-208'].includes(f.frame.sprite)),
          'actual carrying-meal frame',
        )
        assertMealPhase(await evidence(), engine, pickupShown, 'pickup', phaseOrder)
        if (!options.baseline) {
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
            evidence,
            (t) => t.frames.some((f) => [208, 'sprite-208'].includes(f.frame.sprite)),
            'restored carried-meal actual frame',
          )
        }
        await beginPhase('kitchen-exit')
        await navigate(
          's001',
          await touchDestination(18, (c, r) => Math.abs(c - 102) + Math.abs(r - 59) <= 1),
          (s) => inScene(s, 's003') && ready(s),
        )
        await beginPhase('stairs-up')
        await navigate(
          's003',
          (c, r) => c === 130 && r === 52,
          (s) =>
            inScene(s, 's003') &&
            ready(s) &&
            JSON.stringify(kitchenGrid(s.position, engine)) === '[121,49]',
        )
        await beginPhase('stairs-upper-landing')
        await navigate(
          's003',
          (c, r) => c === 121 && r === 48,
          (s) => ready(s) && JSON.stringify(kitchenGrid(s.position, engine)) === '[121,48]',
        )
        await beginPhase('guest-room')
        const servingStartOrder = phaseOrder
        await navigate(
          's003',
          await touchDestination(51, (c, r) => Math.abs(c - 133) + Math.abs(r - 42) <= 1),
          (s) => inScene(s, 's001') && ready(s),
        )
        await beginPhase('serve')
        // First-stage idle touch can start e15 immediately after entering its true footprint.
        // Keep its first hide/95 even if they preceded the next ready-state observation.
        if (engine === 'game') phaseOrder = servingStartOrder
        await navigate(
          's001',
          await touchDestination(15, mealServingDestination),
          (s) => !!(engine === 'game' ? s.dialog : s.runtime?.dialogue),
        )
        const serveShown = await finishDialogue('s001', MEAL_ROWS.slice(2, 15))
        assert.equal(await inventory(), 1, 'serving did not give exactly one wine')
        assert.equal((await snapshot()).actors.e15.visible, false)
        await until(
          evidence,
          (t) => t.frames.at(-1)?.frame.sprite === (engine === 'game' ? 2 : 'li-xiaoyao'),
          'serving restores ordinary party frame',
        )
        assertMealPhase(await evidence(), engine, serveShown, 'serve', phaseOrder)
        await beginPhase('guest-room-exit')
        await navigate(
          's001',
          await touchDestination(12, (c, r) => Math.abs(c - 108) + Math.abs(r - 33) <= 1),
          (s) => inScene(s, 's003') && ready(s),
        )
        await beginPhase('stairs-down')
        await navigate(
          's003',
          (c, r) => c === 122 && r === 49,
          (s) =>
            inScene(s, 's003') &&
            ready(s) &&
            JSON.stringify(kitchenGrid(s.position, engine)) === '[131,52]',
        )
        await beginPhase('cancel-use')
        const beforeCancelInventory = (await snapshot()).inventory,
          beforeCancelTrigger = await taoistTrigger()
        await chooseWine()
        await page.screenshot({ path: resolve(out, '004-cancel-menu.png') })
        const cancelDispatch = (await evidence()).dispatches.length
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
          (await evidence()).dispatches.length,
          cancelDispatch,
          'cancel dispatched item use',
        )
        assert.equal(await inventory(), 1)
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
          dispatches: (await evidence()).dispatches.filter((e) => e.order > phaseOrder).length,
        }
        assert.equal(report.invalidUse.dispatches, 1)
        await beginPhase('taoist-front')
        const a = (await snapshot()).actors.e62,
          [tc, tr] = kitchenGrid(a.position, engine)
        await navigate(
          's003',
          (c, r) => Math.abs(c - tc) + Math.abs(r - tr) === 1,
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
        if (options.baseline) {
          const began = Date.now()
          await until(
            async () => {
              const s = await snapshot()
              assert.deepEqual(s.position, frozenPosition, 'baseline moved after use')
              assert(!s.runtime?.dialogue, 'baseline unexpectedly started gift')
              assert.equal(await inventory(), 1)
              return ready(s) && Date.now() - began >= 2000
            },
            Boolean,
            'baseline stationary use does not start gift',
            5000,
          )
          report.counter = {
            status: 'confirmed',
            reason: 'normal stationary wine use returned without gift dialogue',
            position: frozenPosition,
            inventory: 1,
          }
          report.core.status = 'counter-confirmed'
          await saveTrace('004-stationary-baseline')
          return
        }
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
        assertMealPhase(await evidence(), engine, giftShown, 'wine-gift', phaseOrder)
        assert.equal(await inventory(), 0)
        assert.equal((await snapshot()).actors.e62.visible, false)
        const giftDispatch = (await evidence()).dispatches.filter((e) => e.order > phaseOrder)
        assert.equal(giftDispatch.length, 1, 'gift dispatched more than once')
        assert.equal(giftDispatch[0].request.itemId, '272')
        report.giftDispatch = giftDispatch
        assert.deepEqual(
          report.core.rows,
          MEAL_ROWS.map((id) => `dlg.${id}`),
          '004 closure incomplete',
        )
        await beginPhase('control-move')
        const s = await snapshot(),
          start = kitchenGrid(s.position, engine)
        const key = planInnRoute(
            maps.s003,
            start,
            (c, r) => Math.abs(c - start[0]) + Math.abs(r - start[1]) === 1,
            s.routeActors,
          )[0],
          d = INN_DIRECTIONS.find((d) => d.key === key)
        assert(d)
        const destination = [start[0] + d.col, start[1] + d.row]
        await navigate(
          's003',
          (c, r) => c === destination[0] && r === destination[1],
          (s) =>
            ready(s) &&
            inScene(s, 's003') &&
            JSON.stringify(kitchenGrid(s.position, engine)) === JSON.stringify(destination),
        )
        const moves = committedInnMoves(await evidence(), phaseOrder)
        assert(
          moves.some((e) => ['commit:tickSceneInput', 'commit:player.pos'].includes(e.source)),
          'no actual final ordinary input displacement',
        )
        report.controlMove = { from: start, to: destination, commits: moves }
        await beginPhase('end-save')
        await press('Escape', 'prove normal menu control')
        await until(readMenu, (m) => m.active, 'normal end menu opens')
        await closeMenus()
        const saved = await capture('004.end')
        assertMealEnd(saved.payload, engine)
        assert.deepEqual(
          engine === 'game' ? saved.payload.gs.inventory : saved.payload.world.inventory,
          engine === 'game'
            ? predecessor.payload.gs.inventory
            : predecessor.payload.world.inventory,
          '004 left unexpected inventory changes',
        )
        const trace = await saveTrace('004-story')
        const partition = partitionInnMoves(
          committedInnMoves(trace, -1),
          report.route.legs.filter((l) => l.context === contextLabel),
        )
        report.route.committedSteps = partition.steps
        report.route.scriptedOrPlacement = partition.placements
        report.route.status = 'passed'
        report.core.status = 'passed'
        report.core.sourceHashes = contract.hashes
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
        await saveTrace('004-restored')
      } finally {
        report.lastPhase = phase
        if (page)
          await writeFile(
            resolve(out, '004-latest-trace.json'),
            JSON.stringify(await evidence(), null, 2),
          )
        const after = await readMealContract()
        report.sourceHashesStable = JSON.stringify(after.hashes) === JSON.stringify(contract.hashes)
        assert.deepEqual(after.hashes, contract.hashes, '004 sources changed during execution')
      }
    },
  })
}
