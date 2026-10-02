import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { assertMealCaseReport, mealSaveView, readMealContract } from './meal-contract.mjs'
import { openingFrameMatches } from './opening-frame.mjs'

export const ERRAND_PHASE_ROWS = {
  aunt: [211, 212, 213, 214, 215, 217, 219, 221, 223],
  fish: [603, 604, 605, 606],
  water: [552, 553, 554, 555, 557, 558, 560, 561, 562, 564, 565],
  zhang: [515, 516, 517, 518, 519, 521, 522],
  news: [282, 283, 284, 286, 288, 289, 290, 292, 293],
}
export const ERRAND_GUARD_ROWS = {
  auntRepeat: [129, 130],
  zhangReminder: [524, 525, 526, 527],
  zhangPrayer: [529, 530, 531],
}
export function errandCaseRows(caseName) {
  assert(['story', 'guards', 'saves'].includes(caseName), 'unknown 005 case')
  return [
    ...ERRAND_PHASE_ROWS.aunt,
    ...(caseName === 'guards' ? ERRAND_GUARD_ROWS.auntRepeat : []),
    ...ERRAND_PHASE_ROWS.fish,
    ...ERRAND_PHASE_ROWS.water,
    ...ERRAND_PHASE_ROWS.zhang,
    ...(caseName === 'guards'
      ? [...ERRAND_GUARD_ROWS.zhangReminder, ...ERRAND_GUARD_ROWS.zhangPrayer]
      : []),
    ...ERRAND_PHASE_ROWS.news,
  ].map((id) => `dlg.${id}`)
}

export function assertErrandCaseReport(report) {
  assert(['game', 'reforge'].includes(report.engine))
  assert.equal(report.fragment, '005')
  assert.equal(report.kind, 'verify')
  assert.equal(report.profile, 'verify')
  assert.equal(report.name, `${report.engine}-005-${report.case}`)
  assert.equal(report.status, 'passed')
  assert.equal(report.core?.status, 'passed')
  assert.equal(report.route?.status, 'passed')
  assert.equal(report.sourceHashesStable, true)
  assert.deepEqual(report.errors, [])
  assert.match(report.revision, /^[a-f0-9]{40}$/)
  assert.match(report.predecessor.sha256, /^[a-f0-9]{64}$/)
  assert(Object.keys(report.core.sourceHashes).length > 0)
  for (const hash of Object.values(report.core.sourceHashes)) assert.match(hash, /^[a-f0-9]{64}$/)
  assert.deepEqual(report.core.rows, errandCaseRows(report.case))
  const checks = [
    ...Object.keys(ERRAND_PHASE_ROWS),
    'controlMove',
    'causality',
    'end',
    ...(report.case === 'guards' ? Object.keys(ERRAND_GUARD_ROWS) : []),
    ...(report.case === 'saves' ? ['endRestore', 'backgroundContinuation'] : []),
  ]
  assert.deepEqual(Object.keys(report.checks).sort(), checks.sort(), 'incomplete 005 case checks')
  for (const check of checks) assert.equal(report.checks[check], 'passed')
  assert.equal(report.contexts.length, report.case === 'saves' ? 2 : 1)
  for (const context of report.contexts) assert.deepEqual(context.initialDatabases, [])
  assert.equal(report.contextTraces.length, report.contexts.length)
  for (const artifact of report.contextTraces) assert.match(artifact.sha256, /^[a-f0-9]{64}$/)
  assert.equal(report.storyEndWorldHash, sha256(JSON.stringify(report.storyEndWorld)))
  assert(openingFrameMatches(report.endFrame), '005 end canvas invalid')
  if (report.case === 'saves') {
    assert.equal(report.checkpoint?.path, '005.end.save.json')
    assert.match(report.checkpoint.sha256, /^[a-f0-9]{64}$/)
    assert.equal(report.endWorldHash, sha256(JSON.stringify(report.endWorld)))
    assert.equal(report.restoredWorldHash, sha256(JSON.stringify(report.restoredWorld)))
    assert.deepEqual(
      report.restoredWorld,
      report.endWorld,
      '005 saved persistent state not restored',
    )
    assert(openingFrameMatches(report.restoredFrame))
    assert.notDeepEqual(
      report.backgroundContinuation.from,
      report.backgroundContinuation.to,
      'no background continuation displacement',
    )
    assert.match(report.frameContract, /no whole-canvas pixel equality/)
  } else {
    for (const key of ['checkpoint', 'restoredWorld', 'restoredFrame', 'backgroundContinuation'])
      assert.equal(report[key], undefined, 'story/guards cannot claim saves coverage')
  }
}
export function assertErrandSuite(reports) {
  assert.equal(reports.length, 6, '005 full suite requires six independent cases')
  assert.deepEqual(
    reports.map((r) => `${r.engine}/${r.case}`).sort(),
    ['game', 'reforge'].flatMap((e) => ['story', 'guards', 'saves'].map((c) => `${e}/${c}`)).sort(),
  )
  for (const report of reports) {
    assertErrandCaseReport(report)
    assert.equal(report.revision, reports[0].revision, '005 cases use different frozen revisions')
    assert.deepEqual(
      report.core.sourceHashes,
      reports[0].core.sourceHashes,
      '005 cases use different sources',
    )
    assert.deepEqual(
      report.predecessor,
      reports.find((r) => r.engine === report.engine).predecessor,
    )
  }
}
export function errandSaveView(payload, engine) {
  if (engine === 'reforge') return mealSaveView(payload, engine)
  return {
    ...mealSaveView(payload, engine),
    allActors: payload.gs.allEventObjects,
    enterOverrides: payload.gs.sceneOnEnterOverride ?? {},
    teleportOverrides: payload.gs.sceneOnTeleportOverride ?? {},
  }
}
export function assertErrandCollector(trace) {
  assert.equal(trace.overflow, false, '005 collector overflow')
  assert.deepEqual(trace.errors, [], '005 collector error')
  const lists = [
    'events',
    'pages',
    'restoreCommits',
    'gameRestores',
    'saveCaptures',
    'saveCompletions',
    'inputs',
  ]
  const ordered = []
  for (const name of lists) {
    assert(Array.isArray(trace[name]), `missing ${name}`)
    trace[name].forEach((event, index) => {
      assert.equal(event.seq, index, `lost ${name} sequence`)
      ordered.push(event)
    })
  }
  ordered
    .sort((a, b) => a.order - b.order)
    .forEach((event, index) => {
      assert.equal(event.order, index, '005 global event gap')
    })
}
export const errandArmed = (state, engine) =>
  engine === 'game'
    ? state.hooks?.[5] === 903
    : state.hooks?.s004?.onEnter?.selection?.value === 'legacy-003'
export const errandZhangSelected = (state, engine) =>
  engine === 'game'
    ? state.persistent?.e123?.trigger === 'L_1436'
    : state.persistent?.s005?.e123?.trigger?.selection?.value === 'legacy-001'

export function assertErrandStory(trace, engine, shown) {
  assertErrandCollector(trace)
  const progress = trace.events.filter((e) => e.kind === 'progress')
  const rewards = progress.filter((e) => e.before && e.state.money !== e.before.money)
  assert.equal(rewards.length, 1, '005 must grant fifty exactly once')
  assert.equal(rewards[0].before.money, 500)
  assert.equal(rewards[0].state.money, 550)
  assert(rewards[0].order > shown.get('dlg.215'), 'money granted before reward prompt')
  const selected = progress.find((e) => errandZhangSelected(e.state, engine))
  assert(
    selected && selected.order > shown.get('dlg.565') && selected.order < shown.get('dlg.515'),
    'ZhangSi selection must follow WaterSheng and precede his response',
  )
  const armed = progress.find((e) => errandArmed(e.state, engine))
  assert(
    armed && armed.order > shown.get('dlg.522') && armed.order < shown.get('dlg.282'),
    'report armed before correct ZhangSi response',
  )
  const newsPages = trace.pages.filter((e) => e.scene === 's004' && e.page)
  assert(newsPages.length > 0, 'report not actually rendered')
  for (const page of newsPages)
    assert.deepEqual(
      page.actors.e83.position,
      newsPages[0].actors.e83.position,
      'Xianglan walks through report dialogue',
    )
  const arrival = trace.events.filter(
    (e) =>
      e.kind === 'actor' &&
      e.id === 'e83' &&
      e.scene === 's004' &&
      e.before &&
      e.order < newsPages[0].order &&
      e.source.startsWith('commit:') &&
      JSON.stringify(e.before.position) !== JSON.stringify(e.state.position),
  )
  assert(arrival.length > 1, 'missing actual Xianglan approach')
}

export function assertErrandRestored(trace, payload, engine) {
  assertErrandCollector(trace)
  const commits = engine === 'game' ? trace.gameRestores : trace.restoreCommits
  assert.equal(commits.length, 1, 'exactly one actual successful restore commit required')
  assert.equal(
    commits[0].source,
    engine === 'game' ? 'commit:loadGameFromSlot' : 'commit:restorePayload',
  )
  const actual = errandSaveView(commits[0].payload, engine)
  assert.deepEqual(
    actual,
    errandSaveView(payload, engine),
    'restored full persistent state differs',
  )
  return actual
}
export const errandScene = (s, engine, sid) =>
  s.scene === (engine === 'game' ? Number(sid.slice(1)) + 1 : sid)

export function errandArguments(args) {
  const options = { headless: false, case: 'story' }
  const seen = new Set()
  for (let n = 0; n < args.length; n++) {
    const key = args[n]
    assert(!seen.has(key), `duplicate ${key}`)
    seen.add(key)
    if (key === '--headless' || key === '--headed') {
      assert(!options.mode, 'choose one browser mode')
      options.mode = key
      options.headless = key === '--headless'
    } else {
      assert(['--from', '--case'].includes(key), `unknown argument ${key}`)
      assert(args[n + 1] && !args[n + 1].startsWith('--'), `missing ${key}`)
      options[key === '--case' ? 'case' : 'from'] = args[++n]
    }
  }
  assert(options.from, 'required genuine 004 saves --from report')
  assert(['story', 'saves', 'guards'].includes(options.case), 'unknown 005 case')
  return options
}

export function validateErrandPredecessor(report, payload, engine, bytes) {
  assert.equal(report.case, 'saves', '005 requires 004 saves, not story/items')
  assert.notEqual(report.profile, 'capture', 'capture cannot be a 005 predecessor')
  assert.equal(report.engine, engine, 'wrong engine predecessor')
  assertMealCaseReport(report)
  assert.equal(report.checkpoint.sha256, sha256(bytes), '004 bytes changed')
  assert.deepEqual(payload, JSON.parse(bytes), '004 parsed payload changed')
  assert.deepEqual(mealSaveView(payload, engine), report.endWorld, '004 saved world differs')
  return { sha256: report.checkpoint.sha256, revision: report.revision }
}

export async function readErrandPredecessor(path, engine) {
  const reportPath = resolve(path),
    report = JSON.parse(await readFile(reportPath, 'utf8')),
    bytes = await readFile(resolve(dirname(reportPath), '004.end.save.json'), 'utf8'),
    payload = JSON.parse(bytes)
  return {
    reportPath,
    report,
    bytes,
    payload,
    ...validateErrandPredecessor(report, payload, engine, bytes),
  }
}

export async function readErrandContract(root = repoRoot) {
  const meal = await readMealContract(root),
    hashes = { ...meal.hashes },
    all = JSON.parse(
      await readFile(resolve(root, 'data/extracted/events/all.json'), 'utf8'),
    ).segments.flatMap((s) => s.commands),
    ids = [...Object.values(ERRAND_PHASE_ROWS).flat(), ...Object.values(ERRAND_GUARD_ROWS).flat()],
    rows = []
  for (const [start, end] of [
    [741, 768],
    [1606, 1612],
    [1528, 1552],
    [1436, 1452],
    [903, 943],
    [565, 569],
    [1452, 1465],
  ]) {
    let speaker = null
    for (const command of all.slice(start, end)) {
      if (command.op.startsWith('setDialogStyle')) speaker = null
      if (command.op !== 'showDialog') continue
      if (command.text.endsWith('∶')) speaker = command.text.slice(0, -1)
      else if (ids.includes(command.messageIndex))
        rows.push({ id: `dlg.${command.messageIndex}`, text: command.text, speaker })
    }
  }
  assert.deepEqual(
    rows.map((r) => Number(r.id.slice(4))),
    ids,
    'original 005 rows changed',
  )
  const scenes = {}
  const maps = {}
  for (const sid of ['s001', 's003', 's004', 's005']) {
    const file = `projects/pal/content/scenes/${sid}.json`
    scenes[sid] = JSON.parse(await readFile(resolve(root, file), 'utf8'))
    const mapFile = `projects/pal/content/maps/${scenes[sid].mapId}.json`
    maps[sid] = JSON.parse(await readFile(resolve(root, mapFile), 'utf8'))
    hashes[mapFile] = sha256(await readFile(resolve(root, mapFile)))
  }
  for (const file of [
    'errand-contract.mjs',
    'errand-observer.mjs',
    'errand-trace-plugin.mjs',
    'errand-journey.mjs',
    'errand-game.mjs',
    'errand-reforge.mjs',
    'errand-both.mjs',
    'errand-game.config.mts',
    'errand-reforge.config.mts',
  ])
    hashes[`scripts/e2e/${file}`] = sha256(await readFile(resolve(root, `scripts/e2e/${file}`)))
  hashes['packages/game/src/shell/bootstrap.ts'] = sha256(
    await readFile(resolve(root, 'packages/game/src/shell/bootstrap.ts')),
  )
  return { hashes, rows, scenes, maps, locale: meal.locale }
}
