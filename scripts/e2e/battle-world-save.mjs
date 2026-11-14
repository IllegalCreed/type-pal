import assert from 'node:assert/strict'
import { beeWorldInput } from './battle-world-bee-scenario.mjs'
import {
  assertRestoredWorld,
  assertSavedWorld,
  badSaveToast,
  manualSaveSlots,
  savedPoses,
  saveWorldFacts,
} from './battle-world-save-contract.mjs'
import {
  readStoredBattleSave,
  seedCorruptBattleSlot,
  stageBattleSaves,
} from './battle-world-save-storage.mjs'
import { replayCommittedRoute } from './committed-route.mjs'
import { encodeEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { fixedRoutePlan } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'

function installSaveObserver(createRecorder, beginOnNextWrite) {
  const events = [],
    errors = []
  let overflow = false
  let active = !beginOnNextWrite
  let toast
  const { append } = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const record = (kind, detail) => {
    if (active) append(events, { kind, ...detail }, 24)
  }
  window.__q2SaveWritten = (slot) => {
    active = true
    record('write-committed', { slot })
  }
  window.__q2SaveRestored = (slot) => record('restore-committed', { slot })
  window.__q2SaveAbsent = (slot) => record('empty-slot', { slot })
  window.__q2SaveToast = (text) => {
    if (toast !== text) {
      record('toast-drawn', { text })
      toast = text
    }
  }
  window.__q2SaveEvidence = () => ({ events, errors, overflow, timeOrigin: performance.timeOrigin })
}

function observeSaveState(engine) {
  if (engine === 'game') {
    const gs = globalThis.__tpgs
    if (!gs) return null
    const top = gs.menuStack.at(-1)
    const world = globalThis.__beeGameRead()
    return {
      menu: top
        ? { kind: top.kind, cursor: top.state.selection?.cursor, mode: top.state.mode }
        : null,
      scene: gs.wNumScene,
      grid: world.grid,
      ready: world.ready,
      hidden: world.npc?.state === -1,
      ticks: world.npc?.vanishTime,
      clock: gs.frameNum,
      suspended: Boolean(gs.suspendRaf),
    }
  }
  const boot = globalThis.__tpObserve?.readBoot()
  const current = globalThis.__tpObserve?.readRuntime()
  const motion = globalThis.__tpE2e?.dumpMotionState()
  const entity = globalThis.__rfScene?.entities.find(({ id }) => id === 'e154')
  const entry = globalThis.__rfWorld?.entityLifecycles?.s006?.e154
  return {
    menu: globalThis.__q2SaveMenu?.() ?? null,
    opening: boot?.opening,
    ready:
      current?.sceneId === 's006' &&
      !current.menuActive &&
      !current.battleActive &&
      !current.dialogue &&
      !current.presentationBusy &&
      !current.scriptRunning &&
      !current.ditherActive &&
      current.fadeBlack === 0 &&
      !motion?.hostileBusy,
    grid: current && [current.position.col, current.position.row],
    hidden: entity?.hidden,
    ticks: entry?.remainingTicks,
    clock: motion?.worldTick,
  }
}

async function readWorld(page, engine) {
  const payload = await page.evaluate(async (side) => {
    if (side === 'reforge') return globalThis.__tpE2e.dumpSave()
    const { serializeSave } = await import('/src/tools/save-io.ts')
    return JSON.parse(serializeSave(globalThis.__tpgs))
  }, engine)
  return saveWorldFacts(payload, engine)
}

function driver({ page, engine, label, report, until, health }) {
  const record = (input) => {
    input.context = label
    report.actions.push(input)
  }
  const observe = () => page.evaluate(observeSaveState, engine)
  const readEvidence = () => page.evaluate(() => globalThis.__q2SaveEvidence())
  const waitState = (accept, reason) => until(observe, accept, reason)
  const waitEvent = (kind, accept = () => true) =>
    until(
      readEvidence,
      ({ events }) => events.some((row) => row.kind === kind && accept(row)),
      `${label}: ${kind}`,
    )
  let chapter = 'post-battle-save'
  const press = async (key, reason) => {
    health()
    const input = await pressRecordedKey({
      keyboard: page.keyboard,
      action: { key, phase: chapter, scope: 'boundary', reason },
      record,
    })
    if (engine === 'game') {
      const frame = await page.evaluate(() => globalThis.__tpgs?.frameNum)
      const later = await page.waitForFunction(
        (previous) => {
          const gs = globalThis.__tpgs
          return gs?.frameNum !== previous && gs?.frameNum
        },
        frame,
        { timeout: 3000 },
      )
      try {
        // The clock can reset to the persisted value on a successful load.
        input.gameLogic = { dispatchedFrame: frame, observedFrame: await later.jsonValue() }
      } finally {
        await later.dispose()
      }
    }
    return input
  }
  const inside = (kind, cursor) =>
    waitState(
      (state) =>
        state?.menu?.kind === kind && (cursor === undefined || state.menu.cursor === cursor),
      `${label}: ${kind} cursor ${cursor ?? 'ready'}`,
    )
  const cursorTo = async (cursor, get, accept, reason) => {
    let current = await get()
    while (current !== cursor) {
      const next = current + Math.sign(cursor - current)
      await press(next > current ? 'ArrowDown' : 'ArrowUp', reason)
      const state = await accept(next)
      current = state
    }
  }
  async function openSlots(mode) {
    const hub = await observe()
    if (!hub?.menu) await press('Escape', 'open actual world menu')
    await inside('in-game')
    await cursorTo(
      3,
      async () => (await observe()).menu.cursor,
      async (value) => (await inside('in-game', value)).menu.cursor,
      'select System',
    )
    await press('Enter', 'open System')
    await inside('system')
    await cursorTo(
      mode === 'save' ? 0 : 1,
      async () => (await observe()).menu.cursor,
      async (value) => (await inside('system', value)).menu.cursor,
      `select ${mode}`,
    )
    await press('Enter', `open ${mode} slots`)
    await waitState((state) => state?.menu?.kind === 'save-slot' && state.menu.mode === mode, mode)
  }
  const moveSlot = (index) =>
    cursorTo(
      index + (engine === 'game' ? 0 : 2),
      async () => (await inside('save-slot')).menu.cursor,
      async (value) => (await inside('save-slot', value)).menu.cursor,
      'select manual slot',
    )
  async function closeMenus() {
    for (const kind of ['save-slot', 'system', 'in-game']) {
      if ((await observe())?.menu?.kind !== kind) continue
      await press('Escape', `close ${kind}`)
      await waitState((state) => state && state.menu?.kind !== kind, `closed ${kind}`)
    }
    await waitState((state) => state?.ready, 'world receives input')
  }
  const stateAt = (pose) =>
    waitState(
      (state) => state?.ready && state.grid.every((value, axis) => value === pose.grid[axis]),
      'original world control restored at selected pose',
    )
  async function retreat(from, to) {
    await page.evaluate(
      ({ scene, side }) => {
        if (side === 'reforge') {
          const state = globalThis.__tpObserve.readRuntime()
          globalThis.__beeWorld.route(
            'read:world.ready',
            state.sceneId,
            state.position,
            state.facing,
            true,
          )
        } else {
          const gs = globalThis.__tpgs
          globalThis.__routeObserve('read:world.ready', {
            scene,
            sceneVisit: 1,
            actors: { party: { position: [gs.party.x, gs.party.y], facing: gs.party.facing } },
            ...globalThis.__routeGameReadiness(gs),
          })
        }
      },
      { scene: beeWorldInput.scene, side: engine },
    )
    const route = fixedRoutePlan(engine, {
      id: 'post-battle-save-retreat',
      scene: beeWorldInput.scene,
      start: from.grid,
      holds: [['ArrowLeft', 1]],
      completion: { scene: beeWorldInput.scene, position: to.grid, mode: 'ready' },
    })
    await replayCommittedRoute({
      page,
      route,
      health,
      onInput: (input) => {
        // Keep the dispatch object live until withRecordedKey acknowledges down and up.
        Object.assign(
          input,
          canonicalInput({ ...input, phase: 'post-battle-move', scope: 'boundary' }),
        )
        record(input)
      },
    })
    await stateAt(to)
  }
  return {
    observe,
    press,
    record,
    waitEvent,
    inside,
    openSlots,
    moveSlot,
    closeMenus,
    stateAt,
    retreat,
    readEvidence,
    setChapter: (value) => {
      chapter = value
    },
  }
}

async function recordedSnapshot(out, name, value) {
  return writeEvidenceArtifact(out, name, value)
}

async function install(page, active) {
  await page.evaluate(`(${installSaveObserver})(${createEvidenceRecorder}, ${!active})`)
}

async function navigateTitle(page, baseURL, until, controls, engine) {
  await page.goto(`${baseURL}/${engine === 'game' ? '?q2PostBattleTitle=1' : '?menu&skip-startup'}`)
  if (engine === 'game') {
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
          await pressRecordedKey({
            keyboard: page.keyboard,
            action: {
              key: 'Enter',
              phase: 'post-battle-restart',
              scope: 'boundary',
              reason: 'skip title prelude',
            },
            record: controls.record,
          })
          await until(
            () => page.evaluate(() => document.querySelector('video')?.currentSrc),
            (next) => next !== video,
            'title prelude closed',
          )
        }
        return controls.observe()
      },
      (state) => state?.menu?.kind === 'opening',
      'Game title menu',
      60_000,
    )
  } else {
    await until(
      controls.observe,
      (state) => state?.opening?.phase === 'menu',
      'Reforge title menu',
      60_000,
    )
  }
}

async function restoreFromTitle(controls, until, engine, index) {
  if (engine === 'game') {
    await controls.press('ArrowDown', 'select 旧的回忆')
    await controls.inside('opening', 1)
    await controls.press('Enter', 'open title load slots')
    await controls.inside('save-slot')
    await controls.moveSlot(index)
  } else {
    const state = await controls.observe()
    if (state.opening.selectedId !== '__load__') {
      await controls.press('ArrowUp', 'select 旧的回忆')
      await until(
        controls.observe,
        (s) => s.opening?.selectedId === '__load__',
        'title load selected',
      )
    }
    await controls.press('Enter', 'open title load slots')
    await until(controls.observe, (s) => s.opening?.phase === 'load', 'title slots ready')
    for (let cursor = 1; cursor <= index + 2; cursor++) {
      await controls.press('ArrowDown', 'select persisted manual slot')
      await until(
        controls.observe,
        (s) => s.opening?.phase === 'load' && s.opening.cursor === cursor,
        'title slot cursor',
      )
    }
  }
  await controls.press('Enter', 'load selected slot from title')
}

async function verifyFreshRestore({
  engine,
  newPage,
  baseURL,
  out,
  report,
  until,
  health,
  label,
  records,
  index,
}) {
  const context = `${label}/restart-slot-${index + 1}`
  const page = await newPage(context)
  const controls = driver({ page, engine, label: context, report, until, health })
  controls.setChapter('post-battle-restart')
  try {
    await page.evaluate(stageBattleSaves, { engine, records })
    const transferred = []
    for (const { slot, ...record } of records) {
      const readback = await page.evaluate(readStoredBattleSave, { engine, slot })
      assert.deepEqual(readback, record, 'fresh context retained exactly the native written slot')
      const { sha256, byteLength } = encodeEvidenceArtifact(readback)
      transferred.push({ slot, sha256, byteLength })
    }
    await navigateTitle(page, baseURL, until, controls, engine)
    await install(page, true)
    await restoreFromTitle(controls, until, engine, index)
    const slot = manualSaveSlots[engine][index]
    const commit = await controls.waitEvent('restore-committed', (row) => row.slot === slot)
    const observed = await controls.stateAt(savedPoses[index])
    const world = await readWorld(page, engine)
    assertSavedWorld(world, savedPoses[index])
    assertRestoredWorld(saveWorldFacts(records[index].payload, engine), world, 3)
    const resumed = await until(
      controls.observe,
      (s) => s?.ready && s.hidden && s.ticks < observed.ticks,
      'hidden enemy timer resumes on ordinary world ticks',
    )
    assert(resumed.clock > observed.clock)
    return {
      slot,
      transferred,
      world,
      restoredAt: observed,
      resumedAt: resumed,
      event: commit.events.find((row) => row.kind === 'restore-committed' && row.slot === slot),
      trace: await recordedSnapshot(
        out,
        `${label}-restored-slot-${index + 1}.json`,
        await controls.readEvidence(),
      ),
    }
  } finally {
    await page.close()
  }
}

export async function verifyPostBattleSave({
  engine,
  page,
  newPage,
  baseURL,
  out,
  report,
  until,
  health,
  capture,
  result,
}) {
  assert.equal(result.seed, 99, 'post-battle save requires the fixed two-drop seed')
  const label = result.label
  const trace = { actionRange: { start: report.actions.length }, saves: [] }
  result.postBattleSave = trace
  const controls = driver({ page, engine, label, report, until, health })
  const slots = manualSaveSlots[engine]
  const records = []
  await install(page, false)
  try {
    const initial = await controls.stateAt(savedPoses[0])
    const starting = await readWorld(page, engine)
    trace.initial = await recordedSnapshot(out, `${label}-post-battle-before-save.json`, starting)
    assertSavedWorld(starting, savedPoses[0])
    assert(initial.hidden)
    for (const [index, pose] of savedPoses.entries()) {
      if (index > 0) await controls.retreat(savedPoses[0], pose)
      await controls.openSlots('save')
      await controls.moveSlot(index)
      if (capture.enabled)
        await capture.readable(
          `储存进度 ${index + 1}`,
          true,
          async () => (await controls.observe())?.menu?.mode === 'save',
        )
      await controls.press('Enter', 'commit manual save in selected slot')
      const slot = slots[index]
      await controls.waitEvent('write-committed', (row) => row.slot === slot)
      const record = await page.evaluate(readStoredBattleSave, { engine, slot })
      const world = saveWorldFacts(record.payload, engine)
      assertSavedWorld(world, pose)
      records.push({ slot, ...record })
      trace.saves.push({
        slot,
        world,
        record: await recordedSnapshot(out, `${label}-slot-${index + 1}.json`, record),
      })
      await controls.closeMenus()
    }
    assert(
      records[1].meta.savedTimes > records[0].meta.savedTimes,
      'manual saves must retain independent commit order',
    )
    const afterSecondWrite = await page.evaluate(readStoredBattleSave, { engine, slot: slots[0] })
    const { slot: _first, ...firstRecord } = records[0]
    assert.deepEqual(afterSecondWrite, firstRecord, 'writing slot 2 must keep slot 1 bytes intact')
    if (!capture.enabled) {
      controls.setChapter('post-battle-load-invalid')
      // Reforge's browser only attempts occupied slots. Temporarily alter a separate
      // persisted copy of slot 2 in this disposable context, preserving its receipt.
      const invalidIndex = engine === 'game' ? 2 : 1
      const invalidSlot = slots[invalidIndex]
      const invalid = await page.evaluate(seedCorruptBattleSlot, {
        engine,
        slot: invalidSlot,
        record: records[1],
      })
      trace.invalid = invalid
      if (engine === 'game') {
        assert.match(invalid.error, /dwCash/)
        assert.equal(await page.evaluate(readStoredBattleSave, { engine, slot: invalidSlot }), null)
      } else {
        const malformed = await page.evaluate(readStoredBattleSave, { engine, slot: invalidSlot })
        assert.equal(malformed.payload.world.money, invalid.value)
        trace.invalid.input = await recordedSnapshot(out, `${label}-corrupt-slot.json`, malformed)
      }
      await controls.openSlots('load')
      await controls.moveSlot(invalidIndex)
      const retained = await readWorld(page, engine)
      await controls.press(
        'Enter',
        engine === 'game' ? 'attempt empty manual slot' : 'attempt malformed manual slot',
      )
      if (engine === 'game')
        await controls.waitEvent('empty-slot', (row) => row.slot === invalidSlot)
      else await controls.waitEvent('toast-drawn', (row) => row.text === badSaveToast)
      trace.invalid.before = retained
      trace.invalid.after = await readWorld(page, engine)
      assert.deepEqual(
        trace.invalid.after,
        retained,
        'a rejected or missing slot must preserve the active world',
      )
      assert.equal((await controls.observe()).menu?.mode, 'load')
      await controls.closeMenus()
    }
    controls.setChapter('post-battle-load')
    await controls.openSlots('load')
    await controls.moveSlot(0)
    if (capture.enabled)
      await capture.readable(
        '读取进度一',
        true,
        async () => (await controls.observe())?.menu?.mode === 'load',
      )
    trace.beforeInGameRestore = await readWorld(page, engine)
    assertSavedWorld(trace.beforeInGameRestore, savedPoses[1])
    await controls.press('Enter', 'restore slot 1 from altered active pose')
    await controls.waitEvent('restore-committed', (row) => row.slot === slots[0])
    await controls.stateAt(savedPoses[0])
    trace.restoredInGame = await readWorld(page, engine)
    assertSavedWorld(trace.restoredInGame, savedPoses[0])
    assertRestoredWorld(trace.saves[0].world, trace.restoredInGame, 3)
    if (!capture.enabled) {
      trace.fresh = []
      for (const index of [0, 1])
        trace.fresh.push(
          await verifyFreshRestore({
            engine,
            newPage,
            baseURL,
            out,
            report,
            until,
            health,
            label,
            records,
            index,
          }),
        )
    }
  } finally {
    trace.actionRange.end = report.actions.length
    const recorded = await controls.readEvidence()
    trace.raw = await recordedSnapshot(out, `${label}-post-battle-save-trace.json`, recorded)
    assert.deepEqual(recorded.errors, [])
    assert.equal(recorded.overflow, false)
  }
}
