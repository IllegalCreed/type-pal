import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { assertMealCaseReport, mealSaveView, readMealContract } from './meal-contract.mjs'

export const ERRAND_PHASE_ROWS = {
  aunt: [211, 212, 213, 214, 215, 217, 219, 221, 223],
  fish: [603, 604, 605, 606],
  water: [552, 553, 554, 555, 557, 558, 560, 561, 562, 564, 565],
  zhang: [515, 516, 517, 518, 519, 521, 522],
  news: [282, 283, 284, 286, 288, 289, 290, 292, 293],
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
    ids = Object.values(ERRAND_PHASE_ROWS).flat(),
    rows = []
  for (const [start, end] of [
    [741, 768],
    [1606, 1612],
    [1528, 1552],
    [1436, 1452],
    [903, 943],
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
    'errand-game.config.mts',
    'errand-reforge.config.mts',
  ])
    hashes[`scripts/e2e/${file}`] = sha256(await readFile(resolve(root, `scripts/e2e/${file}`)))
  return { hashes, rows, scenes, maps, locale: meal.locale }
}
