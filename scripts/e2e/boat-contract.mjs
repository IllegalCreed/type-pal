import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { boatRideSamples } from './boat-observations.mjs'
import { repoRoot, sha256 } from './browser-journey.mjs'
import { sourceDialogueText } from './causal-recording-contract.mjs'
import { kitchenReady } from './kitchen-contract.mjs'

export function boatArguments(args) {
  const options = { headless: true },
    seen = new Set()
  for (let index = 0; index < args.length; index++) {
    const key = args[index]
    assert(['--headless', '--headed', '--from'].includes(key), `unknown 006 argument ${key}`)
    const identity = key === '--from' ? key : 'mode'
    assert(!seen.has(identity), `duplicate/conflicting 006 argument ${key}`)
    seen.add(identity)
    if (key === '--from') {
      assert(
        args[index + 1] && !args[index + 1].startsWith('--'),
        '006 --from requires a saves report',
      )
      options.from = resolve(args[++index])
    } else options.headless = key === '--headless'
  }
  assert(options.from, '006 requires --from 005 saves report')
  return options
}

export const ISLAND_ARRIVAL_ROWS = Object.freeze([1886, 1888, 1889, 1890])

export const BOAT_DIALOGUE_ROWS = Object.freeze([
  342,
  343,
  345,
  346,
  347,
  349,
  350,
  352,
  353,
  354,
  356,
  357,
  359,
  360,
  362,
  363,
  364,
  307,
  308,
  310,
  311,
  312,
  314,
  316,
  318,
  319,
  321,
  322,
  323,
  325,
  327,
  328,
  330,
  331,
  332,
  334,
  336,
  337,
  339,
  340,
  366,
  367,
  368,
  369,
  371,
  372,
  374,
  375,
  376,
  378,
  380,
  381,
  382,
  384,
  386,
  387,
  388,
  389,
  390,
  391,
  392,
  394,
  396,
  397,
  398,
  399,
  400,
  401,
  403,
  405,
  406,
  408,
  409,
  410,
  412,
  414,
  415,
  417,
  418,
  419,
  533,
  534,
  535,
  536,
  538,
  539,
  540,
  542,
  543,
  544,
  546,
  ...ISLAND_ARRIVAL_ROWS,
])

export async function readBoatContract(root = repoRoot) {
  const scenes = {}
  const maps = {}
  const hashes = {}
  for (const sid of ['s002', 's003', 's004', 's005', 's014']) {
    const scenePath = `projects/pal/content/scenes/${sid}.json`
    scenes[sid] = JSON.parse(await readFile(resolve(root, scenePath), 'utf8'))
    hashes[scenePath] = sha256(await readFile(resolve(root, scenePath)))
    const mapPath = `projects/pal/content/maps/${scenes[sid].mapId}.json`
    if (!maps[scenes[sid].mapId]) {
      maps[scenes[sid].mapId] = JSON.parse(await readFile(resolve(root, mapPath), 'utf8'))
      hashes[mapPath] = sha256(await readFile(resolve(root, mapPath)))
    }
  }
  const read = async (path) => {
    const bytes = await readFile(resolve(root, path))
    hashes[path] = sha256(bytes)
    return JSON.parse(bytes)
  }
  const locale = await read('projects/pal/content/locale.json'),
    original = await read('data/extracted/events/all.json'),
    sourceRows = new Map()
  let speaker = null
  for (const command of original.segments.flatMap((segment) => segment.commands)) {
    if (command.op.startsWith('setDialogStyle')) speaker = null
    if (command.op !== 'showDialog') continue
    if (command.text.endsWith('∶')) {
      speaker = command.text.slice(0, -1)
      continue
    }
    if (!BOAT_DIALOGUE_ROWS.includes(command.messageIndex)) continue
    assert(!sourceRows.has(command.messageIndex), 'ambiguous boat dialogue source')
    sourceRows.set(command.messageIndex, { text: command.text, speaker })
  }
  const rows = BOAT_DIALOGUE_ROWS.map((id) => {
    const source = sourceRows.get(id),
      text = locale[`dlg.${id}`]
    assert(source && typeof text === 'string', `missing boat dialogue ${id}`)
    assert.equal(
      sourceDialogueText(source.text).replace(/\s/gu, ''),
      text.replace(/<\/?[a-z]+>|\s/gu, ''),
      `boat dialogue source differs ${id}`,
    )
    return { id: `dlg.${id}`, text, speaker: source.speaker }
  })
  return { hashes, scenes, maps, rows: rows.map((row) => row.id), dialogue: { rows, locale } }
}

export function assertBoatReport(report) {
  assert.equal(report.fragment, '006')
  assert(['game', 'reforge'].includes(report.engine))
  assert.equal(report.kind, 'verify')
  assert.equal(report.status, 'passed')
  assert.equal(report.core.status, 'passed')
  assert.equal(report.route.status, 'passed')
  assert.equal(report.checks.room, 'passed')
  assert.equal(report.checks.doctor, 'passed')
  assert.equal(report.checks.boat, 'passed')
  assert.equal(report.checks.island, 'passed')
  assert.equal(report.checks['island-arrival'], 'passed', '006 island-arrival was not completed')
  assert.deepEqual(
    report.core.rows,
    BOAT_DIALOGUE_ROWS.map((id) => `dlg.${id}`),
  )
  assert.equal(report.endWorld.position.sceneId, 's014')
  assert(report.endWorld.position.pos)
  assert.deepEqual(report.endWorld.arrivalDialogue, [], '006 arrival dialogue is still open')
  assert.equal(report.endWorld.controlReturned, true, '006 has not returned control')
  assert(report.boatMotion?.samples >= 3)
  assert.equal(report.boatMotion.partyBoatRelative, 'constant-through-ride')
  assert(Array.isArray(report.boatMotion.relativeOffset))
  assert(Array.isArray(report.boatMotion.companionOffset))
  assert(Array.isArray(report.boatMotion.rideFacings) && report.boatMotion.rideFacings.length > 0)
}

/** Scene arrival alone is not an endpoint: the mandatory closing dialogue must release control. */
export function assertBoatStoryEnd(state, engine) {
  assert(['game', 'reforge'].includes(engine))
  assert.equal(state.scene, engine === 'game' ? 15 : 's014', '006 has not reached the island')
  assert(kitchenReady(state, engine), '006 arrival dialogue/script has not returned control')
}

export function assertBoatMotion(samples) {
  const ride = boatRideSamples(samples)
  assert(ride[0].position && ride[0].e117, 'ride sample missing party/rower position')
  const relativeOffset = ride[0].position.map((value, index) => value - ride[0].e116[index])
  const companionOffset = ride[0].e117.map((value, index) => value - ride[0].e116[index])
  for (const sample of ride) {
    assert(
      sample.position && sample.e116 && sample.e117,
      'ride sample missing party/boat/rower position',
    )
    assert.deepEqual(
      sample.position.map((value, index) => value - sample.e116[index]),
      relativeOffset,
      'party detached from boat during ride',
    )
    assert.deepEqual(
      sample.e117.map((value, index) => value - sample.e116[index]),
      companionOffset,
      'rower detached from boat during ride',
    )
  }
  return {
    samples: ride.length,
    relativeOffset,
    companionOffset,
    rideFacings: [...new Set(ride.map((sample) => sample.facing))],
    partyBoatRelative: 'constant-through-ride',
  }
}
