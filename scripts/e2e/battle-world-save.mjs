import assert from 'node:assert/strict'
import { beePostWin, beeWorldInput } from './battle-world-bee-scenario.mjs'
import {
  assertRestoredWorld,
  assertSavedWorld,
  badSaveToast,
  manualSaveSlots,
  savedPoses,
  saveWorldFacts,
} from './battle-world-save-contract.mjs'
import { installRespawnWitness, verifyBeeRespawn } from './battle-world-save-respawn.mjs'
import {
  accessBattleSaveSlots,
  rejectCorruptGameImport,
  seedCorruptBattleSlot,
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

function beginLoadPaintWitness(engine) {
  const screen = document.querySelector('#screen')
  if (!screen) throw new Error('missing actual game screen')
  const probe = document.createElement('canvas')
  probe.width = 80
  probe.height = 50
  const ctx = probe.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('missing load paint sample context')
  ctx.imageSmoothingEnabled = false
  ctx.globalCompositeOperation = 'copy'
  const paints = []
  let nextFrame
  const sample = () => {
    ctx.drawImage(screen, 0, 0, probe.width, probe.height)
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height)
    let peak = 0
    let sum = 0
    let opaqueCount = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i] + data[i + 1] + data[i + 2]
      peak = Math.max(peak, data[i], data[i + 1], data[i + 2])
      if (data[i + 3] === 255) opaqueCount++
    }
    const gs = window.__tpgs
    const runtime = window.__tpObserve?.readRuntime()
    const grid =
      engine === 'game'
        ? window.__beeGameRead()?.grid
        : runtime && [runtime.position.col, runtime.position.row]
    const frozen =
      engine === 'game'
        ? !!(gs?.paletteFadeState || gs?.needToFadeIn || gs?.sceneLoading)
        : !!runtime?.presentationBusy
    paints.push({
      atMs: performance.now(),
      peak,
      mean: sum / (3 * probe.width * probe.height),
      opaqueCount,
      grid,
      frozen,
    })
  }
  const tick = () => {
    sample()
    if (paints.length < 720) nextFrame = requestAnimationFrame(tick)
  }
  tick()
  window.__q2EndLoadPaintWitness = () => {
    cancelAnimationFrame(nextFrame)
    sample()
    return paints
  }
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
      repeat: gs.prevBattleActions instanceof Map ? [...gs.prevBattleActions] : null,
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

async function readWorld(page, engine, postWin = false) {
  const payload = await page.evaluate(async (side) => {
    if (side === 'reforge') return globalThis.__tpE2e.dumpSave()
    const { serializeSave } = await import('/src/tools/save-io.ts')
    return JSON.parse(serializeSave(globalThis.__tpgs))
  }, engine)
  return saveWorldFacts(payload, engine, postWin)
}

async function readSlot(page, engine, slot) {
  const [record] = await page.evaluate(accessBattleSaveSlots, { engine, slots: [slot] })
  return record
}

function driver({ page, engine, label, report, until, health }) {
  const record = (input) => {
    input.context = label
    report.actions.push(input)
  }
  const observe = () => page.evaluate(observeSaveState, engine)
  const readEvidence = () => page.evaluate(() => globalThis.__q2SaveEvidence())
  const waitState = (accept, reason) => until(observe, accept, reason)
  const waitEvidence = (accept, reason) =>
    until(readEvidence, ({ events }) => events.some(accept), `${label}: ${reason}`)
  const waitEvent = (kind, accept = () => true) =>
    waitEvidence((row) => row.kind === kind && accept(row), kind)
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
  async function walk(from, to, holds, phase) {
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
      id: phase === 'post-battle-move' ? 'post-battle-save-retreat' : phase,
      scene: beeWorldInput.scene,
      start: from,
      holds,
      completion: { scene: beeWorldInput.scene, position: to, mode: 'ready' },
    })
    await replayCommittedRoute({
      page,
      route,
      health,
      onInput: (input) => {
        // Keep the dispatch object live until withRecordedKey acknowledges down and up.
        Object.assign(input, canonicalInput({ ...input, phase, scope: 'boundary' }))
        record(input)
      },
    })
    await stateAt({ grid: to })
  }
  return {
    observe,
    press,
    record,
    waitEvent,
    waitEvidence,
    inside,
    openSlots,
    moveSlot,
    closeMenus,
    stateAt,
    walk,
    readEvidence,
    setChapter: (value) => {
      chapter = value
    },
  }
}

async function recordedSnapshot(out, name, value) {
  return writeEvidenceArtifact(out, name, value)
}

async function checkInvalidLoads({
  page,
  engine,
  controls,
  trace,
  records,
  slots,
  out,
  label,
  postWin,
}) {
  trace.invalid = {}
  controls.setChapter('post-battle-load-invalid')
  if (engine === 'game') {
    const missingSlot = slots[2]
    trace.invalid.portableError = await page.evaluate(rejectCorruptGameImport, records[1].slot)
    assert.match(trace.invalid.portableError, /dwCash/u)
    assert.equal(await readSlot(page, engine, missingSlot), null)
    await controls.openSlots('load')
    await controls.moveSlot(2)
    const before = await readWorld(page, engine, postWin)
    await controls.press('Enter', 'attempt empty manual slot')
    const observed = await controls.waitEvent('empty-slot', (row) => row.slot === missingSlot)
    const after = await readWorld(page, engine, postWin)
    const menu = (await controls.observe()).menu
    trace.invalid.empty = { slot: missingSlot, before, after, menu, event: observed.events.at(-1) }
    assert.deepEqual(after, before, 'a missing slot must preserve the active world')
    assert.equal(menu?.mode, 'load')
    await controls.closeMenus()
  }

  // Isolated origin only. Both records were created by the normal menu in this case.
  const slot = slots[1]
  const injected = await page.evaluate(seedCorruptBattleSlot, { engine, slot, record: records[1] })
  const malformed = await readSlot(page, engine, slot)
  const input = await recordedSnapshot(out, `${label}-corrupt-slot.json`, malformed)
  await controls.openSlots('load')
  await controls.moveSlot(1)
  const before = await readWorld(page, engine, postWin)
  await controls.press('Enter', 'attempt malformed manual slot')
  const terminal = (row) =>
    (row.kind === 'toast-drawn' && row.text === badSaveToast) ||
    (row.kind === 'restore-committed' && row.slot === slot)
  const observed = await controls.waitEvidence(terminal, 'malformed slot rejection or bad commit')
  const event = observed.events.find(terminal)
  const after = await readWorld(page, engine, postWin)
  const menu = (await controls.observe()).menu
  trace.invalid.malformed = { ...injected, slot, input, before, after, menu, event }
  assert.equal(event.kind, 'toast-drawn', 'a malformed manual slot must be rejected before restore')
  assert.deepEqual(after, before, 'a malformed slot must preserve the active world')
  assert.equal(menu?.mode, 'load')
  await controls.closeMenus()
}

async function install(page, active) {
  await page.evaluate(`(${installSaveObserver})(${createEvidenceRecorder}, ${!active})`)
}

async function observeLoadPaint(page, engine, load) {
  await page.evaluate(beginLoadPaintWitness, engine)
  let paints
  const value = await load().finally(async () => {
    paints = await page.evaluate(() => window.__q2EndLoadPaintWitness())
  })
  assert(paints.length < 720, 'load paint witness overflow')
  return { value, paints }
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

async function selectTitleSlot(controls, until, engine, index) {
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
  postWin,
  prepareFresh,
}) {
  const context = `${label}/restart-slot-${index + 1}`
  const page = await newPage(context)
  const controls = driver({ page, engine, label: context, report, until, health })
  controls.setChapter('post-battle-restart')
  try {
    if (postWin) await prepareFresh?.(page)
    const readbacks = await page.evaluate(accessBattleSaveSlots, {
      engine,
      slots: records.map(({ slot }) => slot),
      stage: records,
    })
    const transferred = []
    for (const [i, { slot, ...record }] of records.entries()) {
      const readback = readbacks[i]
      assert.deepEqual(readback, record, 'fresh context retained exactly the native written slot')
      const { sha256, byteLength } = encodeEvidenceArtifact(readback)
      transferred.push({ slot, sha256, byteLength })
    }
    await navigateTitle(page, baseURL, until, controls, engine)
    await install(page, true)
    await selectTitleSlot(controls, until, engine, index)
    const measureRespawn = postWin && index === 0
    if (measureRespawn) await installRespawnWitness(page)
    const slot = manualSaveSlots[engine][index]
    const {
      value: { commit, observed },
      paints: loadPaint,
    } = await observeLoadPaint(page, engine, async () => {
      await controls.press('Enter', 'load selected slot from title')
      const commit = await controls.waitEvent('restore-committed', (row) => row.slot === slot)
      return { commit, observed: await controls.stateAt(savedPoses[index]) }
    })
    const world = await readWorld(page, engine, postWin)
    assertSavedWorld(world, savedPoses[index], postWin)
    assertRestoredWorld(saveWorldFacts(records[index].payload, engine, postWin), world, 3)
    const resumed = await until(
      controls.observe,
      (s) => s?.ready && s.hidden && s.ticks < observed.ticks,
      'hidden enemy timer resumes on ordinary world ticks',
    )
    assert(resumed.clock > observed.clock)
    const respawn = measureRespawn
      ? await verifyBeeRespawn({
          page,
          controls,
          until,
          health,
          out,
          label,
          savedTicks: saveWorldFacts(records[index].payload, engine, postWin).lifecycle.ticks,
        })
      : undefined
    return {
      slot,
      transferred,
      world,
      restoredAt: observed,
      resumedAt: resumed,
      loadPaint,
      event: commit.events.find((row) => row.kind === 'restore-committed' && row.slot === slot),
      trace: await recordedSnapshot(
        out,
        `${label}-restored-slot-${index + 1}.json`,
        await controls.readEvidence(),
      ),
      ...(respawn && { respawn }),
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
  postWin = false,
  prepareFresh,
}) {
  assert.equal(result.seed, postWin ? beePostWin.seed : 99, 'use the fixed two-drop seed')
  const label = result.label
  const trace = { actionRange: { start: report.actions.length }, saves: [] }
  result.postBattleSave = trace
  const controls = driver({ page, engine, label, report, until, health })
  const slots = manualSaveSlots[engine]
  const records = []
  await install(page, false)
  try {
    const initial = await controls.stateAt(savedPoses[0])
    const starting = await readWorld(page, engine, postWin)
    trace.initial = await recordedSnapshot(out, `${label}-post-battle-before-save.json`, starting)
    assertSavedWorld(starting, savedPoses[0], postWin)
    assert(initial.hidden)
    for (const [index, pose] of savedPoses.entries()) {
      if (index > 0)
        await controls.walk(savedPoses[0].grid, pose.grid, [['ArrowLeft', 1]], 'post-battle-move')
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
      const record = await readSlot(page, engine, slot)
      const world = saveWorldFacts(record.payload, engine, postWin)
      assertSavedWorld(world, pose, postWin)
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
    const afterSecondWrite = await readSlot(page, engine, slots[0])
    const { slot: _first, ...firstRecord } = records[0]
    assert.deepEqual(afterSecondWrite, firstRecord, 'writing slot 2 must keep slot 1 bytes intact')
    if (!capture.enabled)
      await checkInvalidLoads({
        page,
        engine,
        controls,
        trace,
        records,
        slots,
        out,
        label,
        postWin,
      })
    controls.setChapter('post-battle-load')
    await controls.openSlots('load')
    await controls.moveSlot(0)
    if (capture.enabled)
      await capture.readable(
        '读取进度一',
        true,
        async () => (await controls.observe())?.menu?.mode === 'load',
      )
    trace.beforeInGameRestore = await readWorld(page, engine, postWin)
    assertSavedWorld(trace.beforeInGameRestore, savedPoses[1], postWin)
    const { paints } = await observeLoadPaint(page, engine, async () => {
      await controls.press('Enter', 'restore slot 1 from altered active pose')
      await controls.waitEvent('restore-committed', (row) => row.slot === slots[0])
      await controls.stateAt(savedPoses[0])
    })
    trace.loadPaint = paints
    trace.restoredInGame = await readWorld(page, engine, postWin)
    assertSavedWorld(trace.restoredInGame, savedPoses[0], postWin)
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
            postWin,
            prepareFresh,
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
