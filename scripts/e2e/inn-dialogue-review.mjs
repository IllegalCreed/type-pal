import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { compareRenderedDialogue, sourceDialogueGroups } from './rendered-dialogue-comparison.mjs'
import {
  bindSceneHandoffVideo,
  compareSceneHandoff,
  decodeSceneHandoff,
  requireSceneTransferCoverage,
} from './scene-handoff.mjs'
import {
  checkWorldSpritePixels,
  inspectDialogueBackground,
  publishWorldDialogueSplit,
  readWorldSpritePose,
} from './world-dialogue-review.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sha256 = async (path) => hash(await readFile(path))

// SSS 1690–1728, 1736–1785 and the following room dialogue. The blackout between
// the first two spans and the fade before the room entrance belong to the script.
const dialogue = [
  {
    id: 's002-treatment',
    scene: 's002',
    game: ['李大娘服下紫金丹', '发作，昏倒在地'],
    reforge: ['dlg.610', 'dlg.614'],
  },
  {
    id: 's002-night',
    scene: 's002',
    game: ['夜晚', '回房间睡觉去'],
    reforge: ['dlg.615', 'dlg.633'],
  },
  {
    id: 's001-bedroom',
    scene: 's001',
    game: ['奇怪．．好像有件很重要的事', '说不定我真的是遇到高人了'],
    reforge: ['dlg.634', 'dlg.640'],
  },
]

function dialogueSpans(source) {
  const { trial, engine, startClock } = source
  const trace = trial.nightFrames?.map(({ dialogue: content, ...frame }) => ({
    ...frame,
    rows: content?.rows ?? [],
  }))
  // Older captures still carry genuine dialogue observations and can exercise the pixel oracle.
  // They need the continuous render trace before they may produce an accepted split.
  const rows =
    trace ??
    trial.used.displayed.map((line) => ({
      ...line,
      rows: line.rows ?? [line.text ?? ''],
      endAtMs: line.atMs,
    }))
  const seconds = (ms) => (ms - startClock) / 1000
  return dialogue.map(({ id, scene, ...labels }) => {
    const [first, last] = labels[engine]
    const has = (line, label) =>
      line.rows.some((row) => (engine === 'game' ? row.includes(label) : row === label))
    const inScene = rows.filter((row) => !row.scene || row.scene === scene)
    const start = inScene.find((row) => has(row, first))
    const end = inScene.findLast((row) => has(row, last))
    assert(start && end, `${engine} missing first or last dialogue for ${id}`)
    return {
      id,
      scene,
      start: seconds(start.atMs),
      end: seconds(end.endAtMs),
      startAtMs: start.atMs,
      endAtMs: end.endAtMs,
      minLitFraction: 0.26,
    }
  })
}

async function readSide(path, engine) {
  const reportPath = resolve(path)
  const bytes = await readFile(reportPath)
  const report = JSON.parse(bytes)
  assert.equal(report.engine, engine)
  assert.equal(report.status, 'passed')
  assert.equal(report.profile, 'capture')
  assert.equal(report.inputExecution.status, 'passed')
  assert.equal(report.media.status, 'passed')
  assert.equal(report.cases.length, 1)
  const [trial] = report.cases
  assert.deepEqual(
    [trial.id, trial.before.scene, trial.returned.scene],
    ['purple-for-aunt', 's002', 's001'],
  )
  assert.deepEqual(
    trial.applied.dispatches.map(({ itemId }) => itemId),
    ['273'],
  )
  assert(trial.before.inventory.some(({ itemId, count }) => itemId === '273' && count === 1))
  assert(!trial.returned.inventory.some(({ itemId }) => itemId === '273'))
  assert.equal(trial.returned.music, 'music.pal.036')
  const save = await readEvidenceArtifact(dirname(reportPath), trial.save)
  assert.equal(save.binding.status, 'verified')
  const recording = resolve(dirname(reportPath), 'story.webm')
  assert.equal(await sha256(recording), report.media.native.sha256)
  const startClock = report.media.browser.startedAt
  const source = {
    engine,
    report: reportPath,
    reportSha256: hash(bytes),
    recording,
    recordingSha256: report.media.native.sha256,
    revision: report.revision,
    startClock,
    trial,
    sourceHashes: report.hashes,
    anchor: (trial.applied.dispatches[0].atMs - startClock) / 1000,
  }
  source.authoredInputs = Object.fromEntries(
    [
      'projects/pal/content/items.json',
      'projects/pal/content/scenes/s002.json',
      'projects/pal/content/scenes/s001.json',
      'projects/pal/content/maps/map-012.json',
    ].map((file) => {
      const digest = report.hashes[file]
      assert.match(digest ?? '', /^[a-f\d]{64}$/u, `${engine} missing authored input: ${file}`)
      return [file, digest]
    }),
  )
  source.spans = dialogueSpans(source)
  return source
}

function compareDrawings(source) {
  const { engine, trial } = source
  const records = trial.realPartyDraws.history.filter(({ slot }) => slot === 0)
  const at =
    (x, y) =>
    ({ world }) =>
      world[0] === x && world[1] === y
  const collapse = records.findIndex(at(1376, 704))
  assert(collapse > 0, `${engine} missing actually drawn collapsed position`)
  const first = records[collapse]
  assert.deepEqual(
    [first.sprite, first.frame],
    [engine === 'game' ? 193 : 'sprite-193', 0],
    `${engine} first drawing at the collapse position must already be the lying pose`,
  )
  const turns = records.slice(0, collapse).filter(at(1408, 704))
  const down = turns.findIndex(({ frame }) => frame === 0)
  assert(down >= 0, `${engine} missing first turn`)
  assert.deepEqual(
    turns.slice(down).map(({ frame }) => frame),
    [0, 3, 6, 9],
    `${engine} visible turn order`,
  )
  return { stood: turns.slice(down), firstCollapsed: first }
}

function actorFramesIn(records, span) {
  // Game can present one world draw while separate palette and dialogue clocks advance.
  return (
    records?.map((row, index) => ({
      ...row,
      heldUntilMs: records[index + 1]?.atMs ?? row.endAtMs,
    })) ?? []
  ).filter(({ atMs, heldUntilMs }) => heldUntilMs > span.startAtMs && atMs <= span.endAtMs)
}

function coversTime(observed, span) {
  return (
    observed.length > 0 &&
    observed[0].atMs <= span.startAtMs &&
    observed.at(-1).heldUntilMs >= span.endAtMs
  )
}

const wangXiaohu = { id: 'e36', position: [1472, 736], sprite: 32, frame: 0, facing: 'down' }
const treatmentCast = [
  { id: 'e34', position: [1488, 728], sprite: 58, frame: 0, facing: 'down' },
  wangXiaohu,
]
const nightCast = [
  wangXiaohu,
  { id: 'e39', position: [1424, 728], sprite: 215, frame: 2, facing: 'down' },
]

const bedroomCast = [{ id: 'e8', position: [1376, 288], sprite: 55, frame: 0, facing: 'down' }]

function inspectInnCast(source) {
  const start = {
    id: 'inn-before-use',
    scene: 's002',
    startAtMs: source.trial.before.atMs,
    endAtMs: source.trial.applied.dispatches[0].atMs,
  }
  const firstBedroom = source.handoff.firstVisible?.atMs
  const spans = source.spans.map((span) =>
    span.scene === 's001' && firstBedroom !== undefined
      ? { ...span, startAtMs: firstBedroom }
      : span,
  )
  const casts = {
    'inn-before-use': treatmentCast,
    's002-treatment': treatmentCast,
    's002-night': nightCast,
    's001-bedroom': bedroomCast,
  }
  return [start, ...spans].map((span) => {
    const expected = casts[span.id]
    const observed = actorFramesIn(source.trial.actorFrames, span)
    const receipt = { id: span.id, expected }
    if (!coversTime(observed, span) || observed.some(({ cast }) => !Array.isArray(cast)))
      return { ...receipt, status: 'missing-visible-cast' }
    const differing = observed.find(
      ({ scene, cast, camera }) =>
        scene !== span.scene ||
        !isDeepStrictEqual(cast, expected) ||
        (span.id === 'inn-before-use' && !isDeepStrictEqual(camera, [1296, 616])),
    )
    if (differing) return { ...receipt, status: 'wrong-visible-cast', observed: differing }
    return {
      ...receipt,
      status: 'passed',
      draws: observed.reduce((n, { frames }) => n + frames, 0),
    }
  })
}

/** E39 is a static sprite with native CurrentFrameNum 2, at [1424,728]. */
export function inspectInnActorFrames(engine, records, span) {
  const observed = actorFramesIn(records, span)
  const expected = {
    resource: engine === 'game' ? 215 : 'sprite.pal.215',
    frame: 2,
    facing: 'down',
    position: engine === 'game' ? [1424, 728] : [90, 1, 0],
  }
  if (!coversTime(observed, span)) {
    return { status: 'missing-actor-frames', engine, id: span.id, actor: 'e39', expected }
  }
  for (const row of observed) {
    const { standing, sick } = row
    if (
      row.scene !== span.scene ||
      sick ||
      !standing ||
      standing.asset !== expected.resource ||
      standing.frame !== expected.frame ||
      standing.facing !== expected.facing ||
      JSON.stringify(standing.position) !== JSON.stringify(expected.position)
    ) {
      return {
        status: 'wrong-actor-frame',
        engine,
        id: span.id,
        actor: 'e39',
        expected,
        observed: row,
      }
    }
  }
  return { status: 'passed', engine, id: span.id, actor: 'e39', ranges: observed }
}

async function nightActorPixels(source, video, trim = 0, panel) {
  const [aunt, player] = await Promise.all([
    readWorldSpritePose(215, 2, true),
    readWorldSpritePose(193, 0, true),
  ])
  const span = source.spans.find(({ id }) => id === 's002-night')
  const { standing, camera } = source.actors.ranges[0]
  assert.deepEqual(standing.rect.slice(2), [aunt.width, aunt.height])
  const [worldX, worldY] = source.drawings.firstCollapsed.world
  // Game retains the original party +4. Reforge's shared world blit uses +7.
  const partyBias = source.engine === 'game' ? 4 : 7
  const poses = {
    e39: { ...aunt, pixelPosition: standing.rect.slice(0, 2).map((axis, i) => axis - camera[i]) },
    'li-xiaoyao': {
      ...player,
      pixelPosition: [
        worldX - camera[0] - Math.floor(player.width / 2),
        worldY - camera[1] - player.height + partyBias,
      ],
    },
  }
  return Promise.all(
    Object.entries(poses).map(async ([actor, pose]) => ({
      actor,
      ...(await checkWorldSpritePixels(video, span.start - trim + 0.12, pose, panel)),
    })),
  )
}

// SSS 1771 fades the composited farewell. SSS 1782 (41,15,1) is (57,-26)
// and SSS 1783 selects the bed pose on the already changed world sprite.
const expectedBedroom = {
  scene: 's001',
  map: 'map-012',
  camera: [1168, 136],
  leader: { position: [1328, 248], sprite: 193, frame: 11, facing: 'down' },
}
const bedroomPoses = [
  [[1328, 248], 193, 11],
  [[1328, 248], 193, 10],
  [[1312, 256], 193, 1],
  [[1312, 272], 193, 1],
  [[1312, 272], 193, 2],
  [[1312, 272], 2, 0],
]

function innHandoff(source) {
  const frames = source.trial.presentedHandoff
  if (!frames?.length)
    return { status: 'rejected', findings: [{ issue: 'missing-handoff-frames' }] }
  const coverage = requireSceneTransferCoverage(frames, ['s002', 's001'])
  if (coverage) return { status: 'rejected', findings: [coverage] }
  const game = source.engine === 'game'
  const handoff = compareSceneHandoff(frames, {
    source: 's002',
    sourceCue: game ? '回房间睡觉去！' : 'dlg.633',
    targetCue: game ? '奇怪．．好像有件很重要的事' : 'dlg.634',
    target: expectedBedroom,
  })
  if (handoff.status !== 'passed') return handoff
  const { history } = source.trial.realPartyDraws
  const start = history.findIndex(
    ({ slot, world, frame }) => slot === 0 && world[0] === 1328 && world[1] === 248 && frame === 11,
  )
  const moves = history
    .slice(start)
    .filter(({ slot }) => slot === 0)
    .map(({ world, sprite, frame, atMs }) => ({
      position: world,
      sprite: game ? sprite : sprite === 'li-xiaoyao' ? 2 : Number(sprite.split('-').at(-1)),
      frame,
      atMs,
    }))
  const actual = moves.map(({ position, sprite, frame }) => [position, sprite, frame])
  if (start < 0 || JSON.stringify(actual) !== JSON.stringify(bedroomPoses))
    return {
      ...handoff,
      status: 'rejected',
      findings: [{ issue: 'wrong-bedroom-pose-sequence', expected: bedroomPoses, actual }],
    }
  return { ...handoff, moves }
}

async function decodedInnScene(source, recording, trim = 0, panel) {
  const bytes = await readFile(source.report)
  assert.equal(hash(bytes), source.reportSha256)
  const report = JSON.parse(bytes)
  const captured = report.cases[0].presentedHandoff
  const frames = await decodeSceneHandoff(recording, panel)
  const scopes = {
    'scene-handoff': source.handoff,
    'dialogue-draws': {
      source: source.renderedDialogue.checked[0].firstComplete,
      firstTargetDialogue: source.renderedDialogue.checked.at(-1).firstComplete,
    },
  }
  return Object.entries(scopes).map(([check, proof]) => ({
    check,
    ...bindSceneHandoffVideo(frames, captured, proof, source.startClock, trim),
  }))
}

async function checkInnSplit(source, video, trim, panel) {
  return [
    ...(await nightActorPixels(source, video, trim, panel)),
    ...(await decodedInnScene(source, video, trim, panel)),
  ]
}

async function innDialogueContract() {
  const input = ['data/extracted/events/all.json', 'projects/pal/content/locale.json']
  const bytes = await Promise.all(
    input.map((file) => readFile(new URL(`../../${file}`, import.meta.url))),
  )
  const [original, locale] = bytes.map((value) => JSON.parse(value))
  const commands = original.segments.find(({ name }) => name === 'all').commands
  return {
    locale,
    sources: Object.fromEntries(input.map((path, index) => [path, hash(bytes[index])])),
    groups: sourceDialogueGroups(commands, [
      { scene: 's002', first: 1690, last: 1771 },
      { scene: 's001', first: 1785, last: 1808 },
    ]),
  }
}

export async function compareInnDialogue(game, reforge) {
  const sources = await Promise.all([readSide(game, 'game'), readSide(reforge, 'reforge')])
  assert.equal(sources[0].revision, sources[1].revision)
  assert.deepEqual(sources[0].authoredInputs, sources[1].authoredInputs)
  assert.deepEqual(sources[0].trial.before.position, sources[1].trial.before.position)
  assert.deepEqual(sources[0].trial.before.inventory, sources[1].trial.before.inventory)
  assert.equal(sources[0].trial.before.facing, sources[1].trial.before.facing)
  assert.equal(sources[0].trial.before.music, sources[1].trial.before.music)
  assert.deepEqual(sources[0].trial.returned.position, sources[1].trial.returned.position)
  assert.deepEqual(sources[0].trial.returned.inventory, sources[1].trial.returned.inventory)
  const { groups, locale, sources: dialogueSources } = await innDialogueContract()
  const findings = []
  for (const source of sources) {
    for (const [file, digest] of Object.entries(dialogueSources))
      assert.equal(
        source.sourceHashes[file],
        digest,
        `${source.engine} dialogue source drift: ${file}`,
      )
    const draws = source.trial.renderedDialogue?.filter(
      ({ atMs }) => atMs >= source.trial.applied.dispatches[0].atMs,
    )
    source.renderedDialogue = compareRenderedDialogue(draws, groups, locale)
    source.handoff = innHandoff(source)
    source.cast = inspectInnCast(source)
    for (const proof of [
      ...source.handoff.findings,
      ...source.renderedDialogue.findings,
      ...source.cast.filter(({ status }) => status !== 'passed'),
    ])
      findings.push({ engine: source.engine, ...proof })
    const { lastSeconds, background } = await inspectDialogueBackground(
      source.recording,
      source.spans,
    )
    source.lastSeconds = lastSeconds
    source.background = background
    for (const proof of source.background) {
      if (proof.status !== 'passed') findings.push({ engine: source.engine, ...proof })
    }
  }
  if (sources.every(({ background }) => background.every(({ status }) => status === 'passed'))) {
    for (const source of sources) {
      const span = source.spans.find(({ id }) => id === 's002-night')
      const trace = source.trial.nightFrames?.filter(
        ({ atMs, endAtMs }) => endAtMs >= span.startAtMs && atMs <= span.endAtMs,
      )
      assert(trace?.length > 0, `${source.engine} missing continuous night rendering evidence`)
      assert(trace.every((frame) => frame.scene === 's002'))
      assert(
        trace.every((frame) =>
          source.engine === 'game'
            ? frame.night && !frame.needReveal
            : frame.ambience === 'night' && frame.curtain === 0,
        ),
        `${source.engine} night dialogue began or continued before the scene was revealed`,
      )
      source.drawings = compareDrawings(source)
      source.actors = inspectInnActorFrames(source.engine, source.trial.actorFrames, span)
      if (source.actors.status !== 'passed') {
        findings.push(source.actors)
        continue
      }
      source.actorPixels = await nightActorPixels(source, source.recording)
      for (const proof of source.actorPixels) {
        if (proof.status !== 'passed') findings.push({ engine: source.engine, ...proof })
      }
      if (source.handoff.status === 'passed' && source.renderedDialogue.status === 'passed') {
        source.nativeVideo = await decodedInnScene(source, source.recording)
        for (const proof of source.nativeVideo)
          if (proof.status !== 'passed') findings.push({ engine: source.engine, ...proof })
      }
    }
  }
  for (const source of sources) {
    assert.equal(
      await sha256(source.report),
      source.reportSha256,
      'report changed during comparison',
    )
    assert.equal(
      await sha256(source.recording),
      source.recordingSha256,
      'native video changed during comparison',
    )
  }
  return {
    status: findings.length ? 'rejected' : 'passed',
    findings,
    dialogueSources,
    recordings: sources.map(({ trial: _trial, sourceHashes: _sourceHashes, ...proof }) => proof),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [game, reforge, output, receipt, ...extra] = process.argv.slice(2)
  assert(
    game && reforge && output && receipt && !extra.length,
    'usage: inn-dialogue-review.mjs GAME_REPORT REFORGE_REPORT NEW_MP4 NEW_RECEIPT_JSON',
  )
  const compare = await compareInnDialogue(game, reforge)
  if (compare.status !== 'passed') {
    await writeFile(receipt, `${JSON.stringify(compare, null, 2)}\n`, { flag: 'wx' })
    process.exitCode = 1
  } else {
    await publishWorldDialogueSplit(compare, resolve(output), resolve(receipt), checkInnSplit)
  }
}
