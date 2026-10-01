import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { openingSaveView } from './reforge-opening-policy.mjs'

export const INN_ROWS = Object.freeze([
  25, 27, 29, 30, 32, 33, 34, 36, 37, 38, 40, 41, 43, 45, 46, 47, 49, 50, 51, 53,
])
export const INN_ACTORS = Object.freeze([
  'party',
  'e54',
  'e55',
  'e56',
  'e59',
  'e60',
  'e61',
  'e73',
  'e74',
])
export const TRIO = Object.freeze(['e59', 'e60', 'e61'])

/** Control can return before the next render observes the last participant becoming hidden. */
export function innEndPresented(trace) {
  const final = trace.final
  return (
    final?.scene === 's003' &&
    final.control === true &&
    final.money === 500 &&
    TRIO.every((id) => final.actors?.[id]?.visible === false) &&
    ['e24', 'e25', 'e26'].every((id) =>
      final.roomActors?.some((actor) => actor.id === id && actor.visible === true),
    )
  )
}

export function innArguments(args, both = false) {
  const options = { headless: false }
  for (let i = 0; i < args.length; i++) {
    const key = args[i]
    if (key === '--hold-leader') {
      assert(!options.holdLeader, 'duplicate leader hold')
      options.holdLeader = true
    } else if (key === '--headless' || key === '--headed') {
      assert(options.mode === undefined, 'choose one browser mode')
      options.mode = key
      options.headless = key === '--headless'
    } else {
      assert(
        (both ? ['--game-report', '--reforge-report'] : ['--from']).includes(key),
        `unknown argument ${key}`,
      )
      assert(args[i + 1] && !args[i + 1].startsWith('--'), `missing value for ${key}`)
      assert(options[key] === undefined, `duplicate ${key}`)
      options[key] = resolve(args[++i])
    }
  }
  for (const key of both ? ['--game-report', '--reforge-report'] : ['--from'])
    assert(options[key], `required ${key}: genuine passed 001 report`)
  return options
}

export function validatePredecessor(report, payload, engine, bytes) {
  assert.equal(report.status, 'passed', 'predecessor report did not pass')
  assert.equal(
    engine === 'game' ? report.fragment : report.name,
    engine === 'game' ? '001' : 'reforge-001',
    'wrong predecessor fragment/engine',
  )
  assert.equal(
    report.checkpoint?.path,
    '001.end.save.json',
    'unexpected predecessor checkpoint path',
  )
  assert.match(report.revision, /^[a-f0-9]{40}$/)
  assert.equal(
    report.checkpoint.sha256,
    sha256(bytes),
    'predecessor bytes differ from passed report',
  )
  if (engine === 'game') {
    assert.equal(payload.format, 'type-pal-save')
    assert.equal(payload.gs.wNumScene, 2)
    assert.deepEqual(payload.gs.party, { x: 1344, y: 288, facing: 'down' })
    assert.equal(payload.gs.dwCash, 0)
    assert.deepEqual(payload.gs.partyMembers, [0])
  } else {
    assert.equal(payload.version, 9)
    assert.equal(payload.contentVersion, 21)
    assert.equal(payload.projectId, 'pal')
    assert.deepEqual(payload.position, {
      sceneId: 's001',
      pos: { col: 60, height: 0, row: -24 },
      facing: 'down',
    })
    assert.equal(payload.world.money, 0)
    assert.deepEqual(
      payload.world.party.map((a) => a.id),
      ['li-xiaoyao'],
    )
  }
  return {
    revision: report.revision,
    sha256: report.checkpoint.sha256,
    source: report.checkpoint.source,
  }
}

export async function readPredecessor(path, engine) {
  const report = JSON.parse(await readFile(path, 'utf8'))
  const bytes = await readFile(resolve(dirname(path), '001.end.save.json'), 'utf8')
  const payload = JSON.parse(bytes)
  return { path, bytes, payload, ...validatePredecessor(report, payload, engine, bytes) }
}

/** Story handoff, not merely save equality: L373 must select first-day L355, not late L2369. */
export function assertInnHandoffPayload(payload, engine) {
  assert(['game', 'reforge'].includes(engine), 'unknown inn handoff engine')
  if (engine === 'game') {
    assert.equal(payload.format, 'type-pal-save')
    const gs = payload.gs
    assert.equal(gs.wNumScene, 4, '002 handoff is not in the inn hall')
    assert.equal(gs.dwCash, 500)
    const actor = (id) => {
      const matches = gs.allEventObjects.filter((e) => e.id === id)
      assert.equal(matches.length, 1, `missing/duplicate handoff actor e${id}`)
      return matches[0]
    }
    const aunt = actor(56),
      taoist = actor(62)
    assert.equal(aunt.triggerLabel, 'L_355', '002 aunt handoff must select first-day L355')
    assert.equal(aunt.triggerMode, 6, '002 aunt first-day approach trigger missing')
    assert.equal(aunt.sState, 2, '002 aunt prematurely hidden')
    assert.equal(aunt.triggerResume, undefined, 'first-day aunt instruction already executed')
    assert.equal(taoist.triggerLabel, 'L_601', 'first beggar talk prematurely dispatched')
    assert.equal(taoist.sState, 2)
    assert.equal(taoist.triggerResume, undefined, 'initial taoist observation already executed')
    for (const [id, label] of [
      [19, 'L_557'],
      [20, 'L_579'],
    ]) {
      const e = actor(id)
      assert.equal(e.sState, 0, `kitchen actor e${id} prematurely active`)
      assert.equal(e.triggerLabel, label, `kitchen actor e${id} premature handoff`)
      assert.equal(e.triggerResume, undefined, `kitchen actor e${id} already executed`)
    }
  } else {
    assert.equal(payload.version, 9)
    assert.equal(payload.contentVersion, 21)
    assert.equal(payload.projectId, 'pal')
    assert.equal(payload.position.sceneId, 's003', '002 handoff is not in the inn hall')
    const script = payload.world.script,
      bindings = script.behaviors?.entities ?? {},
      aunt = bindings.s003?.e56
    assert.equal(payload.world.money, 500)
    assert.deepEqual(
      aunt?.trigger?.selection,
      { kind: 'use', value: 'greet-after-guests' },
      '002 aunt handoff must select first-day greet-after-guests',
    )
    assert.equal(aunt.trigger.cursor, undefined, 'first-day aunt instruction already executed')
    assert.deepEqual(
      aunt.triggerActivation,
      { kind: 'use', value: { on: 'touch', range: 2 } },
      '002 aunt first-day approach trigger missing',
    )
    assert.deepEqual(
      aunt.auto?.selection,
      { kind: 'use', value: 'legacy-006' },
      'kitchen movement prematurely dispatched',
    )
    // Canonical e56/e62 are visible+collidable (state2); hidden kitchen e19/e20 default to state0.
    for (const id of ['e56', 'e62'])
      assert.equal(script.entityState?.s003?.[id] ?? 2, 2, `handoff actor ${id} prematurely hidden`)
    const unexecutedDefault = (slot, label) => {
      const selection = slot?.trigger?.selection
      assert(
        !selection ||
          selection.kind === 'inherit' ||
          (selection.kind === 'use' && selection.value === 'default'),
        `${label} prematurely dispatched`,
      )
      assert.equal(slot?.trigger?.cursor, undefined, `${label} already executed`)
    }
    unexecutedDefault(bindings.s003?.e62, 'first beggar talk')
    for (const id of ['e19', 'e20']) {
      assert.equal(script.entityState?.s001?.[id] ?? 0, 0, `kitchen actor ${id} prematurely active`)
      unexecutedDefault(bindings.s001?.[id], `kitchen actor ${id}`)
    }
  }
  return {
    status: 'passed',
    aunt: engine === 'game' ? 'L_355' : 'greet-after-guests',
    kitchen: 'not activated',
    beggar: 'initial observation',
  }
}

/** Compare the real synchronous restore commit, never a later background-resumed save. */
export function assertInnRestoreCommitted(trace, expected) {
  assert.equal(trace.overflow, false, 'inn restore collector overflow')
  assert.deepEqual(trace.errors, [], 'inn restore observer error')
  assert.equal(trace.restoreCommits?.length, 1, 'one actual restore commit required')
  const commit = trace.restoreCommits[0]
  assert.equal(commit.seq, 0)
  assert(Number.isFinite(commit.atMs), 'missing restore commit clock')
  assert.equal(commit.source, 'commit:restorePayload')
  const actual = openingSaveView(commit.payload)
  assert.deepEqual(actual, expected, 'restored committed persistent world differs')
  return actual
}

export async function readInnContract(root = repoRoot) {
  const files = [
    'data/extracted/events/all.json',
    'data/extracted/data/scene/1.json',
    'data/extracted/data/scene/3.json',
    'projects/pal/content/scenes/s001.json',
    'projects/pal/content/scenes/s003.json',
    'projects/pal/content/locale.json',
    'projects/pal/content/maps/map-010.json',
    'projects/pal/content/maps/map-012.json',
    'projects/pal/manifest.json',
    'projects/pal/assets/index.json',
    'packages/game/src/present/present.ts',
    'packages/game/src/present/dialog-box.ts',
    'packages/game/src/core/save/api.ts',
    'packages/game/src/tools/save-io.ts',
    'packages/game/src/shell/bootstrap.ts',
    'packages/reforge/src/dialog/dialog-box.ts',
    'packages/reforge/src/save/ops.ts',
    'packages/reforge/src/save/current-codec.ts',
    'scripts/e2e/game-inn.config.mts',
    'scripts/e2e/reforge-inn.config.mts',
    'scripts/e2e/browser-journey.mjs',
    'scripts/e2e/game-observer.mjs',
    'scripts/e2e/opening-frame.mjs',
    'scripts/e2e/reforge-opening-policy.mjs',
    'scripts/e2e/inn-journey.mjs',
    'scripts/e2e/inn-contract.mjs',
    'scripts/e2e/inn-observer.mjs',
    'scripts/e2e/inn-route.mjs',
    'scripts/e2e/inn-navigation.mjs',
    'scripts/e2e/inn-trace-plugin.mjs',
    'scripts/e2e/inn-both.mjs',
    'scripts/e2e/game-inn.mjs',
    'scripts/e2e/reforge-inn.mjs',
    'scripts/e2e/opening-trace-plugin.mjs',
    'scripts/e2e/opening-policy.mjs',
    'packages/game/src/core/event-system.ts',
    'packages/game/src/core/scene-system.ts',
    'packages/reforge/src/main.ts',
    'packages/reforge/src/world-scene-presentation.ts',
    'packages/reforge/src/render.ts',
    'packages/reforge/src/runtime-script-project.ts',
    'packages/reforge/src/script-world.ts',
    'packages/reforge/src/script-runner-core.ts',
    'packages/reforge/src/script-project-core.ts',
    'packages/reforge/src/motion-runtime-wiring.ts',
    'packages/reforge/src/motion-runtime-coordinator.ts',
    'packages/reforge/src/entity-lifecycle.ts',
    'projects/pal/content/actors.json',
    'packages/content/src/author-dialogue.ts',
    'projects/pal/content/sprites.json',
    'packages/reforge/src/world-scene-presentation.ts',
    'packages/reforge/src/entity-action-player.ts',
  ]
  const bytes = await Promise.all(files.map((f) => readFile(resolve(root, f))))
  const hashes = Object.fromEntries(files.map((f, i) => [f, sha256(bytes[i])]))
  const original = JSON.parse(bytes[0]).segments.flatMap((s) => s.commands)
  const start = original.findIndex((c) => c.label === 'L_285')
  assert(start >= 0)
  const end = original.findIndex((c, i) => i >= start && c.op === 'end')
  const script = original.slice(start, end)
  assert(script.some((c) => c.op === 'raw' && c.opcode === 30 && c.operands[0] === 500))
  const lines = script.filter((c) => c.op === 'showDialog' && INN_ROWS.includes(c.messageIndex))
  assert.deepEqual(
    lines.map((c) => c.messageIndex),
    INN_ROWS,
  )
  const scene = JSON.parse(bytes[4]),
    locale = JSON.parse(bytes[5]),
    actors = JSON.parse(bytes[files.indexOf('projects/pal/content/actors.json')])
  const flow = scene.entities.find((e) => e.id === 'e56').behaviors.trigger.default.flow
  const dialogs = flow.stages
    .find((s) => s.id === 'initial')
    .body.filter((c) => c.kind === 'dialog')
  assert.deepEqual(
    dialogs.flatMap((c) => c.cue.rows.map((r) => Number(r.text.slice(4)))),
    INN_ROWS,
  )
  const rows = lines.map((line) => {
    const cue = dialogs.find((c) =>
      c.cue.rows.some((r) => r.text === `dlg.${line.messageIndex}`),
    ).cue
    const speaker = innSpeaker(cue.identity, actors, locale)
    assert.equal(locale[`dlg.${line.messageIndex}`], line.text)
    return { id: `dlg.${line.messageIndex}`, text: line.text, speaker }
  })
  return { hashes, rows, locale }
}

export function innSpeaker(identity, actors, locale) {
  if (identity.kind === 'narration') return null
  let speakerId = identity.speaker
  if (identity.kind === 'actor') {
    const actor = actors.find((a) => a.id === identity.actor)
    assert(actor, `unknown inn actor identity ${identity.actor}`)
    speakerId = identity.speakerOverride ?? actor.name
  }
  if (speakerId === undefined) return null
  assert(typeof locale[speakerId] === 'string', `missing inn speaker locale ${speakerId}`)
  return locale[speakerId]
}

export function assertInnEvidence(trace, engine, contract) {
  assert.equal(trace.overflow, false, 'inn collector overflow')
  assert.deepEqual(trace.errors, [], 'inn observer error')
  assert(trace.events.length > 0)
  trace.events.forEach((e, i) => {
    assert.equal(e.seq, i, 'inn event gap')
    assert(i === 0 || e.order > trace.events[i - 1].order, 'inn event/global order inversion')
  })
  trace.pages.forEach((e, i) => {
    assert.equal(e.seq, i, 'inn page gap')
    assert(i === 0 || e.order > trace.pages[i - 1].order, 'inn page/global order inversion')
  })
  const timeline = [...trace.events, ...trace.pages].sort((a, b) => a.order - b.order)
  timeline.forEach((e, i) => {
    assert.equal(e.order, i, 'inn global order gap')
    assert(
      Number.isFinite(e.atMs) && (i === 0 || e.atMs >= timeline[i - 1].atMs),
      'inn global clock inversion',
    )
    assert(
      Number.isInteger(e.sample) && (i === 0 || e.sample >= timeline[i - 1].sample),
      'inn global sample inversion',
    )
  })
  const priorActors = new Map(),
    priorRooms = new Map()
  for (const e of trace.events) {
    if (e.kind !== 'actor' && e.kind !== 'roomActor') continue
    const prior = e.kind === 'actor' ? priorActors : priorRooms,
      key = e.kind === 'actor' ? `${e.scene}/${e.id}` : e.id
    assert.deepEqual(e.before, prior.get(key) ?? null, 'lost actor continuity')
    if (
      e.kind === 'actor' &&
      e.before &&
      JSON.stringify(e.before.position) !== JSON.stringify(e.state.position)
    )
      assert(e.source.startsWith('commit:'), 'movement is not an actual commit')
    prior.set(key, e.state)
  }
  const normalize = (s) => s.replace(/\s/g, '').replace(/[∶：:]$/u, '')
  const shown = new Map()
  let previousLines = [],
    maxRow = -1,
    previousInstance = null
  for (const page of trace.pages) {
    assert.equal(page.engine, engine)
    if (!page.page) {
      previousLines = []
      previousInstance = null
      continue
    }
    const instance =
      engine === 'game'
        ? page.page.instance
        : JSON.stringify([
            page.page.dialogueId,
            page.page.cueIndex,
            page.page.pageIndex,
            page.page.pageStartedAtMs,
          ])
    if (engine === 'game')
      assert(Number.isSafeInteger(instance), 'missing actual game page instance')
    else {
      assert(typeof page.page.dialogueId === 'string', 'missing actual RF dialogue instance')
      assert(Number.isFinite(page.page.pageStartedAtMs), 'missing actual RF page start')
      assert(
        Number.isInteger(page.page.cueIndex) && Number.isInteger(page.page.pageIndex),
        'missing actual RF cue/page index',
      )
    }
    if (instance !== previousInstance) previousLines = []
    const lines = engine === 'game' ? page.page.lines : page.page.pageText.split('\n')
    const speakerId = engine === 'game' ? page.page.title : page.page.speaker
    const speaker = contract.locale[speakerId] ?? speakerId
    const rows = lines.map((line) => {
      const row = contract.rows.find((r) => normalize(r.text) === normalize(line))
      assert(row, `unexpected displayed 002 line: ${line}`)
      return row
    })
    const ids = rows.map((r) => r.id)
    assert.equal(new Set(ids).size, ids.length, 'duplicate line within rendered page')
    if (shown.has(ids[0]))
      assert.deepEqual(
        ids.slice(0, previousLines.length),
        previousLines,
        'rendered page rolled back/reordered its accumulated rows',
      )
    for (const row of rows) {
      assert.equal(
        normalize(speaker ?? ''),
        normalize(row.speaker ?? ''),
        `wrong speaker for ${row.id}`,
      )
      const index = contract.rows.indexOf(row)
      assert(index > maxRow || previousLines.includes(row.id), 'repeated/replayed rendered cue')
      if (!shown.has(row.id)) {
        shown.set(row.id, page.order)
        maxRow = index
      }
    }
    previousLines = ids
    previousInstance = instance
  }
  assert.deepEqual(
    [...shown.keys()],
    contract.rows.map((r) => r.id),
    'missing/reordered fully rendered dialogue',
  )
  const cash = trace.events.filter((e) => e.kind === 'money')
  assert.deepEqual(
    cash.map((e) => e.value),
    [0, 500],
    'actual cash must change exactly once 0→500',
  )
  assert(
    shown.get('dlg.50') < cash[1].order && cash[1].order < shown.get('dlg.51'),
    'money not committed between thanks and reward display',
  )
  for (const id of TRIO) {
    const changes = trace.events.filter(
      (e) => e.kind === 'actor' && e.id === id && e.scene === 's003',
    )
    assert(changes[0]?.state.visible, `${id} missing initial visible state`)
    const hidden = changes.find((e) => !e.state.visible)
    assert(hidden, `${id} never entered room/hidden`)
    assert(changes.at(-1).state.visible === false, `${id} unexpectedly reappeared`)
    const moves = changes.filter(
      (e) => e.before && JSON.stringify(e.before.position) !== JSON.stringify(e.state.position),
    )
    assert(
      moves.length > 0 && moves.at(-1).seq <= hidden.seq,
      `${id} hidden without committed movement`,
    )
    const expected =
      engine === 'game'
        ? { e59: [1312, 1328], e60: [1456, 1416], e61: [1440, 1408] }
        : { e59: [124, 42, 0], e60: [134, 43, 0], e61: [133, 43, 0] }
    assert.deepEqual(
      hidden.state.position,
      expected[id],
      `${id} not hidden at authored room endpoint`,
    )
    const roomId = `e${24 + TRIO.indexOf(id)}`
    const roomChanges = trace.events.filter((e) => e.kind === 'roomActor' && e.id === roomId)
    assert.deepEqual(
      roomChanges.map((e) => e.state.state),
      [0, 2],
      `wrong room counterpart lifecycle ${roomId}`,
    )
    assert(
      roomChanges[1].order <= hidden.order || roomChanges[1].sample === hidden.sample,
      `room counterpart ${roomId} missing before ${id} hides`,
    )
  }
  for (const id of ['e54', 'e55', 'e73', 'e74']) {
    const changes = trace.events.filter(
      (e) => e.kind === 'actor' && e.id === id && e.scene === 's003',
    )
    assert.equal(changes[0]?.state.sprite, id === 'e54' || id === 'e73' ? 54 : 53)
    assert.equal(changes[0]?.state.state, id === 'e54' || id === 'e55' ? 1 : 2)
    assert.equal(
      changes.at(-1)?.state.state,
      id === 'e54' || id === 'e55' ? 0 : 1,
      `wrong door-prop lifecycle ${id}`,
    )
    if (id === 'e73' || id === 'e74')
      assert.equal(changes.at(-1)?.state.frame, 1, `room door did not open ${id}`)
  }
  assert(trace.final?.control, 'inn final control missing')
  assert.deepEqual(
    trace.final.roomActors.map((a) => ({ id: a.id, state: a.state })),
    [
      { id: 'e24', state: 2 },
      { id: 'e25', state: 2 },
      { id: 'e26', state: 2 },
    ],
    'room counterparts not present',
  )
  return {
    status: 'passed',
    rows: shown.size,
    money: cash.map((e) => e.value),
    actors: TRIO,
    sourceHashes: contract.hashes,
  }
}

/** A normal reader may stay on these pages. Only the three participants must remain in place. */
export function assertInnDialogueHolds(trace, holds, engine) {
  assert.deepEqual(
    holds.map((h) => h.cue),
    ['dlg.32', 'dlg.53'],
  )
  for (const hold of holds) {
    assert(hold.elapsedMs >= 3000, 'dialogue hold shorter than reader profile')
    assert.equal(hold.start.dialogue.phase, hold.end.dialogue.phase)
    assert.equal(hold.start.dialogue.text, hold.end.dialogue.text)
    assert.deepEqual(
      hold.start.trio.map((a) => a.id),
      TRIO,
    )
    assert(
      hold.start.trio.every((a) => a.visible),
      `participant gone at ${hold.cue}`,
    )
    assert.deepEqual(hold.end.trio, hold.start.trio, `participants moved during ${hold.cue}`)
    if (engine === 'reforge')
      for (const boundary of [hold.start, hold.end])
        assert.deepEqual(
          boundary.authority?.map((a) => ({ id: a.id, kind: a.kind })),
          TRIO.map((id) => ({ id, kind: 'script' })),
          `participants not explicitly held during ${hold.cue}`,
        )
    const movements = trace.events.filter(
      (e) =>
        e.kind === 'actor' &&
        TRIO.includes(e.id) &&
        e.order >= hold.start.order &&
        e.order < hold.end.order,
    )
    assert.equal(movements.length, 0, `participant commit during ${hold.cue}`)
  }
  for (const id of TRIO)
    assert(
      trace.events.some(
        (e) =>
          e.kind === 'actor' &&
          e.id === id &&
          e.order >= holds[1].end.order &&
          e.before &&
          JSON.stringify(e.before.position) !== JSON.stringify(e.state.position),
      ),
      `${id} did not resume after last dialogue`,
    )
  return { status: 'passed', cues: holds.map((h) => h.cue), durationMs: 3000 }
}

/** Preserve phase-one staging without requiring unlike engine coordinates or identical frame counts. */
export function assertInnChoreography(trace, engine, contract) {
  const displayed = (id) => {
    const text = contract.rows.find((r) => r.id === id).text.replace(/\s/g, '')
    const page = trace.pages.find((p) =>
      (engine === 'game' ? p.page?.lines : p.page?.pageText.split('\n'))?.some(
        (line) => line.replace(/\s/g, '') === text,
      ),
    )
    assert(page, `choreography lacks rendered ${id}`)
    return page.order
  }
  const leader = displayed('dlg.32'),
    reward = displayed('dlg.51'),
    last = displayed('dlg.53')
  const moves = (e) =>
    e.before && JSON.stringify(e.before.position) !== JSON.stringify(e.state.position)
  for (const id of TRIO) {
    const changes = trace.events.filter(
      (e) => e.kind === 'actor' && e.scene === 's003' && e.id === id,
    )
    const at = (order) => changes.findLast((e) => e.order < order)?.state
    assert(
      changes.some((e) => e.order < leader && moves(e)),
      `${id} did not start before leader dialogue`,
    )
    assert(
      at(leader)?.visible && at(reward)?.visible && at(last)?.visible,
      `${id} left while still participating`,
    )
    assert(
      !changes.some((e) => e.order > leader && e.order < reward && (moves(e) || !e.state.visible)),
      `${id} moved during leader/reward dialogue`,
    )
    assert(
      changes.some((e) => e.order > reward && e.order < last && moves(e)),
      `${id} did not move during reward interlude`,
    )
    assert(
      changes.some((e) => e.order > last && moves(e)),
      `${id} did not resume after final dialogue`,
    )
  }
  return {
    status: 'passed',
    leader,
    reward,
    last,
    policy: 'start / participants pause / short interlude / final pause / resume',
  }
}
