import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { readCheckpointInput, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { guardedEvidenceReader } from './evidence-diagnostics.mjs'
import { evidenceObserverScript } from './evidence-recorder.mjs'
import {
  assertFairyMazeGameTrace,
  FAIRY_MAZE_GAME_TRACE_TARGETS,
  installFairyMazeGameObserver,
} from './fairy-island-maze-game-observer.mjs'
import {
  FAIRY_MAZE_GAME_LOOT,
  FAIRY_MAZE_GAME_SOURCES,
  FAIRY_MAZE_GAME_STATUES,
  fairyMazeGamePlan,
} from './fairy-island-maze-game-plan.mjs'
import { executeFixedRoute } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { readLongEvidenceArtifact } from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'

const { values: options } = parseArgs({
  options: {
    from: { type: 'string' },
    headless: { type: 'boolean' },
    headed: { type: 'boolean' },
    'visual-review': { type: 'boolean' },
  },
})
assert(
  options.from && isAbsolute(options.from),
  '008 Game requires --from an absolute 007 report path',
)
assert(!(options.headed && options.headless), 'choose one browser mode')
const mazePosition = [576, 1152]
const grovePosition = [304, 824]
const hammerItem = 279
const samePosition = (a, b) => a[0] === b[0] && a[1] === b[1]
const itemCount = (state, id) => state.inventory.find(({ itemId }) => itemId === id)?.count ?? 0
const at = (state, scene, position) =>
  !!state?.ready && state.scene === scene && samePosition(state.position, position)
const dialogueWaiting = (dialog) => ['waiting-page-key', 'waiting-end-key'].includes(dialog?.phase)
const positionOf = ({ gs }) => [gs.party.x, gs.party.y]

const suppliedReport = JSON.parse(await readFile(options.from, 'utf8'))
const predecessorRef = { report: options.from, sha256: suppliedReport.checkpoint?.sha256 }
const { payload: predecessor, artifacts } = await readCheckpointInput(predecessorRef, 'game', '007')
const [predecessorReport, predecessorSave] = artifacts
const previous = predecessorReport.value
assert.equal(previous.kind, 'verify')
assert.equal(previous.case, 'story')
assert.equal(previous.checkpoint.path, '007.end.save.json')
assert.equal(previous.checks.terminalSave, 'passed')
assert.equal(previous.checks.terminalRestore, 'passed')
assert.equal(previous.persistence.freshContext, true)
assert.equal(previous.contextTraces.length, 2)
assert.equal(predecessor.gs.wNumScene, 18)
assert.deepEqual(positionOf(predecessor), mazePosition)
assert.equal(itemCount(predecessor.gs, hammerItem), 1)
const [previousStory, previousRestored] = await Promise.all(
  previous.contextTraces.map(
    async (reference) => (await readLongEvidenceArtifact(dirname(options.from), reference)).value,
  ),
)
const previousCapture = previousStory.saveCaptures.find(
  ({ order }) => order === previous.checkpoint.captureProof.inputOrder,
)
const previousAck = previousStory.saveCompletions.find(
  ({ order }) => order === previous.checkpoint.captureProof.acknowledgementOrder,
)
assert.equal(previousCapture.source, 'before:Save.saveSlot:deepClone')
assert.equal(previousAck.source, 'commit:Save.saveSlot')
assert.equal(previousCapture.slot, 1)
assert.equal(previousAck.captureSeq, previousCapture.seq)
assert(previousCapture.order < previousAck.order)
assertBoatGameSaveCapture(predecessor, previousCapture.payload)
assert.equal(previousRestored.gameRestores.length, 1)
assert.equal(previousRestored.gameRestores[0].source, 'commit:loadGameFromSlot')
assertBoatGameRestore(predecessor, previousRestored.gameRestores[0].payload)
const inputBytes = await readFile(predecessorSave.path)
assert.equal(sha256(inputBytes), predecessorSave.sha256)

const mazePlan = fairyMazeGamePlan()
const specialRaftWaypoints = [
  [
    [1328, 600],
    [1392, 568],
    [1328, 536],
    [1280, 560],
  ],
  [[1104, 472]],
  [[1280, 560]],
]

function verifyRestore(trace, payload) {
  assertFairyMazeGameTrace(trace)
  assert.equal(trace.gameRestores.length, 1, 'exactly one Game slot restore expected')
  const [commit] = trace.gameRestores
  const [capture] = trace.saveCaptures
  const [ack] = trace.saveCompletions
  assert.equal(capture.slot, 1)
  assert.equal(ack.captureSeq, capture.seq)
  assert(
    capture.order < ack.order && ack.order < commit.order,
    'staging must finish before restore',
  )
  assert.equal(commit.source, 'commit:loadGameFromSlot')
  assertBoatGameSaveCapture(payload, capture.payload)
  return {
    source: commit.source,
    order: commit.order,
    completeGameDomain: assertBoatGameRestore(payload, commit.payload),
  }
}

function verifyStory(trace, report, beforeF5) {
  const { legs } = report.route
  assert.equal(legs.length, 41)
  assert.equal(
    legs.reduce((sum, leg) => sum + leg.replay.steps.length, 0),
    636,
  )
  const story = trace.events.filter(({ kind }) => kind === 'ready')
  const boundaries = story.filter(({ scene }, index) => scene !== story[index - 1]?.scene)
  assert.deepEqual(
    boundaries.map(({ scene }) => scene),
    ['s017', 's018', 's016'],
  )
  const [start, , end] = boundaries
  assert.deepEqual(start.position, mazePosition)
  assert.deepEqual(end.position, grovePosition)
  assert(!trace.events.some(({ kind, order }) => kind === 'actor' && order > end.order))
  const observed = trace.inputs.filter(({ order }) => order > start.order && order < end.order)
  const delivered = report.actions
    .filter(({ scope }) => scope === 'story')
    .flatMap((action) => (action.kind === 'press' ? action.execution.dispatches : [action]))
  assert.deepEqual(
    observed.map(({ type, key, repeat }) => [type, key, repeat]),
    delivered.map(({ kind, key }) => [`key${kind}`, key, false]),
    'Game 008 delivered keys differ from native DOM input',
  )
  const rides = report.mazeActions.filter(({ kind }) => kind === 'raft')
  assert.equal(rides.length, 31)
  assert.equal(new Set(rides.map(({ id }) => id)).size, 15)
  const special = []
  for (const action of rides) {
    const leg = legs[action.index]
    const movement = trace.events.filter(
      ({ kind, owner, order }) =>
        kind === 'raft-motion' &&
        owner === action.id &&
        order > leg.startOrder &&
        order <= leg.endOrder,
    )
    const riding = movement.filter(({ source }) => source === 'commit:partyRideEventObject')
    assert.equal(riding[0]?.ip, action.entry)
    assert.deepEqual(riding.at(-1)?.raft, action.raftEnd)
    assert.equal(movement.at(-1)?.source, 'commit:partyWalkTo')
    assert.deepEqual(movement.at(-1)?.party, action.after)
    if (action.id === 259) {
      const targets = [...new Set(riding.map(({ ip }) => ip))].map(
        (ip) => riding.findLast((entry) => entry.ip === ip).raft,
      )
      assert.deepEqual(targets, specialRaftWaypoints[special.length])
      special.push({ entry: action.entry, resume: action.resume, targets, arrival: action.after })
    }
  }
  assert.deepEqual(
    special.map(({ entry }) => entry),
    [4183, 4192, 4186],
  )
  const frames = trace.events.filter(({ kind }) => kind === 'floor-frame')
  assert(new Set(frames.map(({ frame }) => frame)).size >= 2, 'active floor did not animate')
  const terminalDown = trace.inputs.filter(({ key, type }) => key === 'F5' && type === 'keydown')
  assert.equal(terminalDown.length, 1)
  assert(terminalDown[0].order > end.order, 'Game 008 F5 preceded the first playable grove')
  const captures = trace.saveCaptures.slice(beforeF5.captures)
  const completions = trace.saveCompletions.slice(beforeF5.completions)
  assert.equal(captures.length, 1)
  assert.equal(completions.length, 1)
  const [capture] = captures,
    [ack] = completions
  assert.equal(capture.source, 'before:Save.saveSlot:deepClone')
  assert.equal(ack.source, 'commit:Save.saveSlot')
  assert.equal(capture.slot, 1)
  assert.equal(ack.captureSeq, capture.seq)
  assert(terminalDown[0].order < capture.order && capture.order < ack.order)
  return { start, end, special, capture, ack }
}

await runBrowserJourney({
  name: options['visual-review'] ? 'game-008-visual-review' : 'game-008',
  packageName: '@type-pal/game',
  environment: { E2E: '1' },
  traceConfig: 'scripts/e2e/fairy-island-maze-game.config.mts',
  arguments: [options.headed ? '--headed' : '--headless'],
  // The legal route took 209 seconds before the terminal save and its fresh restore.
  journeyTimeoutMs: 360_000,
  initScripts: [
    installCommittedRoutePlayback,
    evidenceObserverScript(installFairyMazeGameObserver),
  ],
  sources: [...FAIRY_MAZE_GAME_TRACE_TARGETS, ...FAIRY_MAZE_GAME_SOURCES],
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      fragment: '008',
      engine: 'game',
      kind: 'verify',
      case: 'story',
      predecessor: { ...predecessorRef, reportSha256: predecessorReport.sha256 },
      route: { status: 'running', inputs: [], legs: [] },
      mazeActions: [],
      checks: {},
      secondaryDiagnostics: [],
    })
    let page
    let phase = 'restore'
    const snapshot = () => page.evaluate(() => window.__fairyMazeGameRead())
    const evidence = () => page.evaluate(() => window.__fairyMazeGameRouteEvidence())
    const saveStatus = () => page.evaluate(() => window.__fairyMazeGameSaveStatus())
    const archive = guardedEvidenceReader({
      page: () => page,
      read: (page) => page.evaluate(() => window.__fairyMazeGameArchive()),
      diagnostics: report.secondaryDiagnostics,
    })
    const press = (key, reason) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, key, reason }),
        record: (action) => report.actions.push(action),
      })

    const restore = async (bytes, scene, position, label, visualReviewVideo = false) => {
      phase = 'restore'
      page = await newPage(label, { visualReviewVideo })
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
          return (await snapshot())?.menu?.kind === 'opening'
        },
        Boolean,
        'opening menu',
        60_000,
      )
      const staged = await page.evaluate(async (text) => {
        const { Save } = await import('/src/core/save/api.ts')
        const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
        if ((await Save.listSlots()).length) throw new Error('008 restore inherited a Game slot')
        await Save.saveSlot(1, parseImportedSave(text))
        return serializeSave(await Save.loadSlot(1))
      }, bytes.toString('utf8'))
      assert.equal(sha256(staged), sha256(bytes), '008 staging altered checkpoint bytes')
      await press('ArrowDown', '旧的回忆')
      await until(
        snapshot,
        (s) => s?.menu?.kind === 'opening' && s.menu.cursor === 1,
        'load option',
      )
      await press('Enter', 'open slots')
      await until(snapshot, (s) => s?.menu?.kind === 'save-slot' && s.menu.cursor === 0, 'slot one')
      await press('Enter', 'restore formal slot 1')
      await until(snapshot, (s) => at(s, scene, position), `ready in Game scene ${scene}`)
      return verifyRestore(await archive.read(), JSON.parse(bytes))
    }

    const settle = async (finished, label) => {
      const pages = []
      let lastPage
      for (;;) {
        const state = await until(
          snapshot,
          (s) =>
            finished(s) || (dialogueWaiting(s?.dialog) && JSON.stringify(s.dialog) !== lastPage),
          label,
        )
        if (finished(state)) return { state, pages }
        pages.push(state.dialog)
        lastPage = JSON.stringify(state.dialog)
        await press('Enter', 'confirm actual native dialogue')
      }
    }

    const useHammer = async () => {
      await press('e', 'open native usable items')
      const menu = (
        await until(
          snapshot,
          (s) => s.menu?.kind === 'inventory' && s.menu.phase === 'list',
          'usable inventory',
        )
      ).menu
      const index = menu.items.indexOf(hammerItem)
      assert.equal(index, 0, '007 hammer must be the first usable item')
      if (menu.cursor !== index) {
        await press('Home', 'select first inventory position')
        await until(
          snapshot,
          (s) => s.menu?.kind === 'inventory' && s.menu.cursor === index,
          'hammer selected',
        )
      }
      await press('Enter', 'use 破天锤 from its native inventory entry')
    }

    try {
      const routePageStartedAt = Date.now()
      report.checks.predecessorRestore = await restore(
        inputBytes,
        18,
        mazePosition,
        '008-from-007',
        !!options['visual-review'],
      )
      const initial = await snapshot()
      assert.equal(itemCount(initial, hammerItem), 1)
      assert(FAIRY_MAZE_GAME_STATUES.every((id) => initial.objects[id].state === 2))
      assert.equal(initial.objects[262].state, 0)
      assert.deepEqual([initial.objects[260].state, initial.objects[261].state], [2, 0])
      const smashed = []
      const pickups = []
      for (const [index, action] of mazePlan.entries()) {
        const { kind, id, route, scene } = action
        phase = `walk-${index + 1}-${kind}-e${id}`
        const before = await snapshot()
        if (kind === 'gate') {
          assert.equal(before.objects[id].state, 1)
          await until(
            snapshot,
            (s) =>
              Number.isInteger(s.objects[id].frame) &&
              s.objects[id].frame !== before.objects[id].frame,
            'activated floor animates before boarding',
          )
        }
        const approached = await executeFixedRoute({
          page,
          engine: 'game',
          plan: route,
          scene,
          id: index,
          phase,
          report,
          snapshot,
          evidence,
          ready: (s) => s.ready,
          health,
          finished: (s) => (kind === 'exit' ? !!s.dialog : s.ready),
        })
        const record = { index, kind, id, after: approached.position, scene: approached.scene }
        if (kind === 'raft') {
          assert.equal(approached.objects[id].entry, action.resume)
          assert.deepEqual(approached.objects[id].position, action.raftEnd)
          if (id === 259)
            assert.deepEqual([approached.objects[260].state, approached.objects[261].state], [0, 2])
          Object.assign(record, {
            entry: action.entry,
            resume: action.resume,
            raftEnd: action.raftEnd,
          })
        }
        phase = `${kind}-e${id}`
        if (kind === 'search') {
          const loot = FAIRY_MAZE_GAME_LOOT[id]
          assert(!pickups.includes(id))
          assert.equal(before.objects[id].entry, null)
          await press('Enter', 'native Search for the intended pickup')
          const { state, pages } = await settle(
            (s) =>
              at(s, 18, approached.position) &&
              loot.every((item) => itemCount(s, item) === itemCount(before, item) + 1),
            `native pickup e${id}`,
          )
          const resume = id === 235 ? 4200 : 36509
          assert.equal(state.objects[id].entry, resume)
          pickups.push(id)
          Object.assign(record, { loot, resume, pages })
        }
        if (kind === 'hammer') {
          assert(FAIRY_MAZE_GAME_STATUES.includes(id) && !smashed.includes(id))
          assert.equal(before.objects[id].state, 2)
          assert.equal(itemCount(before, hammerItem), 1)
          await useHammer()
          const { state, pages } = await settle(
            (s) => at(s, 18, approached.position) && s.objects[id].state === 0,
            `native hammer effect e${id}`,
          )
          smashed.push(id)
          const final = smashed.length === FAIRY_MAZE_GAME_STATUES.length
          assert.equal(itemCount(state, hammerItem), final ? 0 : 1)
          assert.equal(state.objects[262].state, final ? 1 : 0)
          assert.deepEqual(state.objects[236], initial.objects[236])
          for (const statue of FAIRY_MAZE_GAME_STATUES) {
            assert.equal(state.objects[statue].state, smashed.includes(statue) ? 0 : 2)
          }
          assert.deepEqual(
            pages.flatMap((page) => [...page.lines, page.text]),
            final ? ['第六具石像亦应声而碎', '然而破天锤也断了'] : [],
          )
          Object.assign(record, {
            statueState: state.objects[id].state,
            hammerCount: itemCount(state, hammerItem),
            pages,
          })
        }
        if (kind === 'exit') {
          const { state, pages } = await settle(
            (s) => at(s, 17, grovePosition),
            'first playable fairy island peach grove',
          )
          assert.deepEqual(
            pages.map(({ text }) => text),
            ['仙．．灵．．洞天！？'],
          )
          Object.assign(record, { after: state.position, scene: state.scene, pages })
        }
        report.mazeActions.push(record)
        console.log(`[game-008] ${index + 1}/${mazePlan.length} ${kind} e${id}`)
      }
      assert.deepEqual(
        [...smashed].sort((a, b) => a - b),
        FAIRY_MAZE_GAME_STATUES,
      )
      assert.deepEqual(pickups, [235, 263])
      const end = await snapshot()
      assert(at(end, 17, grovePosition))
      const expectedInventory = [...Object.values(FAIRY_MAZE_GAME_LOOT).flat()].map((itemId) => ({
        itemId,
        count: 1,
      }))
      assert.deepEqual(end.inventory, expectedInventory)
      report.endWorld = {
        scene: 's016',
        position: end.position,
        facing: end.facing,
        controlReturned: true,
      }
      await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '008-peach-grove-arrival.png') })

      phase = 'end-save'
      const beforeF5 = await saveStatus()
      assert.deepEqual(beforeF5, { captures: 1, completions: 1 })
      await press('F5', 'formal Game 008 terminal save')
      await until(
        saveStatus,
        ({ completions }) => completions === beforeF5.completions + 1,
        'native terminal slot save acknowledged',
      )
      const bytes = Buffer.from(
        await page.evaluate(async () => {
          const { Save } = await import('/src/core/save/api.ts')
          const { serializeSave } = await import('/src/tools/save-io.ts')
          return serializeSave(await Save.loadSlot(1))
        }),
      )
      const trace = await archive.read()
      report.contextTraces = [await writeEvidenceArtifact(out, '008-trace.json', trace)]
      assertFairyMazeGameTrace(trace)
      const { start, end: arrived, special, capture, ack } = verifyStory(trace, report, beforeF5)
      const payload = JSON.parse(bytes)
      assert.equal(payload.gs.wNumScene, 17)
      assert.deepEqual(positionOf(payload), grovePosition)
      assert.equal(payload.gs.party.facing, end.facing)
      assert.deepEqual(payload.gs.inventory, expectedInventory)
      assertBoatGameSaveCapture(payload, capture.payload)
      const timeOrigin = await page.evaluate(() => performance.timeOrigin)
      report.visualReviewMarks = [
        {
          name: 'start-ready',
          elapsedMs: Math.round(timeOrigin + start.atMs - routePageStartedAt),
        },
        {
          name: 'peach-ready',
          elapsedMs: Math.round(timeOrigin + arrived.atMs - routePageStartedAt),
        },
      ]
      report.raftVariant = special
      await writeFile(resolve(out, '008.end.save.json'), bytes, { flag: 'wx' })
      report.checkpoint = {
        path: '008.end.save.json',
        sha256: sha256(bytes),
        byteLength: bytes.length,
        captureProof: { inputOrder: capture.order, acknowledgementOrder: ack.order },
      }
      report.checks.terminalSave = 'passed'
      await page.close()

      const persistence = await restore(bytes, 17, grovePosition, '008-fresh-peach-grove-restore')
      const fresh = await archive.read()
      assert.deepEqual(await saveStatus(), { captures: 1, completions: 1 })
      assert(!fresh.events.some(({ kind }) => kind === 'actor'))
      assert(!fresh.inputs.some(({ key }) => key === 'F5'))
      assert.equal((await snapshot()).facing, end.facing)
      await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '008-peach-grove-restored.png') })
      report.contextTraces.push(await writeEvidenceArtifact(out, '008-fresh-trace.json', fresh))
      report.checks.terminalRestore = 'passed'
      report.persistence = { ...persistence, freshContext: true }
      report.route.status = 'passed'
    } catch (error) {
      report.failedPhase = phase
      await archive.diagnose(async () => {
        report.rejectedTrace = await writeEvidenceArtifact(
          out,
          '008-rejected-trace.json',
          await archive.read(),
        )
      })
      throw error
    }
  },
})
