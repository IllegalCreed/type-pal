import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { link, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { tsImport } from 'tsx/esm/api'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { checkWorldDialoguePixels, decodeWorldDialoguePixels } from './world-dialogue-pixels.mjs'

const run = promisify(execFile)
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
    anchor: (trial.applied.dispatches[0].atMs - startClock) / 1000,
  }
  source.authoredInputs = Object.fromEntries(
    ['projects/pal/content/items.json', 'projects/pal/content/scenes/s002.json'].map((file) => {
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

/** E39 is a static sprite with native CurrentFrameNum 2, at [1424,728]. */
export function inspectInnActorFrames(engine, records, span) {
  // A presented pose remains on screen until the next world draw. In Game a
  // dialogue can keep that frame while the separate palette and UI clocks advance.
  const ranges =
    records?.map((row, index) => ({
      ...row,
      heldUntilMs: records[index + 1]?.atMs ?? row.endAtMs,
    })) ?? []
  const observed = ranges.filter(
    ({ atMs, heldUntilMs }) => heldUntilMs > span.startAtMs && atMs <= span.endAtMs,
  )
  const expected = {
    resource: engine === 'game' ? 215 : 'sprite.pal.215',
    frame: 2,
    facing: 'down',
    position: engine === 'game' ? [1424, 728] : [90, 1, 0],
  }
  if (
    !observed.length ||
    observed[0].atMs > span.startAtMs ||
    observed.at(-1).heldUntilMs < span.endAtMs
  ) {
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

let spriteDecoder
async function nativeNightPose(spriteId, frame) {
  spriteDecoder ??= tsImport('../../packages/shared/src/rle.ts', import.meta.url)
  const { parsePalSpriteChunk } = await spriteDecoder
  const paths = [`data/extracted/data/sprite/${spriteId}.rle`, 'data/extracted/data/palette/0.json']
  const files = await Promise.all(
    paths.map((path) => readFile(new URL(`../../${path}`, import.meta.url))),
  )
  const [sprite, colors] = files
  const { width, height, pixels, opaque } = parsePalSpriteChunk(gunzipSync(sprite))[frame]
  return {
    width,
    height,
    pixels,
    opaque,
    palette: JSON.parse(colors).nightColors,
    sources: Object.fromEntries(paths.map((path, i) => [path, hash(files[i])])),
  }
}

async function checkActorPixels(video, seconds, expected, panel) {
  const viewport = panel === undefined ? '' : `crop=640:400:${panel * 640}:0,`
  const { width, height, pixelPosition } = expected
  const [x, y] = pixelPosition
  const { stdout } = await run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-nostdin',
      '-ss',
      seconds.toFixed(6),
      '-i',
      video,
      '-frames:v',
      '1',
      '-vf',
      `${viewport}scale=320:200:flags=area,crop=${width}:${height}:${x}:${y}`,
      '-pix_fmt',
      'rgb24',
      '-f',
      'rawvideo',
      'pipe:1',
    ],
    { encoding: 'buffer' },
  )
  assert.equal(stdout.length, width * height * 3, 'missing decoded actor pixels')
  let totalError = 0
  let opaquePixels = 0
  for (const [index, drawn] of expected.opaque.entries()) {
    if (!drawn) continue
    const rgb = expected.palette[expected.pixels[index]]
    totalError += rgb.reduce(
      (sum, value, channel) => sum + Math.abs(value - stdout[index * 3 + channel]),
      0,
    )
    opaquePixels++
  }
  const paletteError = totalError / (opaquePixels * 3)
  return {
    status: paletteError < 14 ? 'passed' : 'wrong-actor-pixels',
    seconds,
    opaquePixels,
    paletteError,
    pixelPosition,
    sources: expected.sources,
  }
}

async function nightActorPixels(source, video, trim = 0, panel) {
  const [aunt, player] = await Promise.all([nativeNightPose(215, 2), nativeNightPose(193, 0)])
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
      ...(await checkActorPixels(video, span.start - trim + 0.12, pose, panel)),
    })),
  )
}

export async function compareInnDialogue(game, reforge) {
  const sources = await Promise.all([readSide(game, 'game'), readSide(reforge, 'reforge')])
  assert.equal(sources[0].revision, sources[1].revision)
  assert.deepEqual(sources[0].authoredInputs, sources[1].authoredInputs)
  assert.deepEqual(sources[0].trial.before.position, sources[1].trial.before.position)
  assert.deepEqual(sources[0].trial.returned.position, sources[1].trial.returned.position)
  assert.deepEqual(sources[0].trial.returned.inventory, sources[1].trial.returned.inventory)
  const findings = []
  for (const source of sources) {
    const frames = await decodeWorldDialoguePixels(source.recording)
    source.lastSeconds = frames.at(-1).seconds
    source.background = source.spans.map(({ id, ...span }) => ({
      id,
      ...checkWorldDialoguePixels(frames, span),
    }))
    for (const proof of source.background) {
      if (proof.status !== 'passed') findings.push({ engine: source.engine, ...proof })
    }
  }
  if (findings.length === 0) {
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
    recordings: sources.map(({ trial: _trial, ...proof }) => proof),
  }
}

async function publishSplit(comparison, output, receiptPath) {
  assert.equal(comparison.status, 'passed')
  assert.equal(dirname(output), dirname(receiptPath))
  const temporary = await mkdtemp(join(dirname(output), '.dialogue-review-'))
  try {
    const clip = join(temporary, 'split.mp4')
    const preroll = Math.min(0.34, ...comparison.recordings.map(({ anchor }) => anchor))
    const sides = comparison.recordings.map((entry) => ({ ...entry, trim: entry.anchor - preroll }))
    const duration = Math.max(...sides.map(({ lastSeconds, trim }) => lastSeconds - trim))
    const filters = sides.flatMap(({ trim, lastSeconds }, i) => [
      `[${i}:v]trim=start=${trim},setpts=PTS-${trim}/TB,fps=60:start_time=0,scale=640:400:flags=neighbor,setsar=1,tpad=stop_mode=clone:stop_duration=${duration - lastSeconds + trim + 0.12}[v${i}]`,
      `[${i}:a]atrim=start=${trim},asetpts=PTS-${trim}/TB,aresample=async=1:first_pts=0,aformat=channel_layouts=stereo,pan=mono|c0=0.5*c0+0.5*c1,apad[a${i}]`,
    ])
    filters.push('[v0][v1]hstack=inputs=2[v]', '[a0][a1]join=inputs=2:channel_layout=stereo[a]')
    await run('ffmpeg', [
      '-v',
      'error',
      '-nostdin',
      '-n',
      '-copyts',
      ...sides.flatMap(({ recording }) => ['-i', recording]),
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-t',
      duration.toFixed(6),
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      clip,
    ])
    const decoded = []
    for (const [panel, source] of sides.entries()) {
      const frames = await decodeWorldDialoguePixels(clip, panel)
      const spans = source.spans.map(({ id, start, end, minLitFraction }) => ({
        id,
        ...checkWorldDialoguePixels(frames, {
          start: start - source.trim,
          end: end - source.trim,
          minLitFraction,
        }),
      }))
      assert(
        spans.every(({ status }) => status === 'passed'),
        JSON.stringify({ engine: source.engine, spans }),
      )
      const actorPixels = await nightActorPixels(source, clip, source.trim, panel)
      assert(
        actorPixels.every(({ status }) => status === 'passed'),
        JSON.stringify({ engine: source.engine, actorPixels }),
      )
      decoded.push({ engine: source.engine, spans, actorPixels, trim: source.trim })
    }
    const { stdout } = await run(
      'ffmpeg',
      [
        '-v',
        'error',
        '-nostdin',
        '-i',
        clip,
        '-map',
        '0:a:0',
        '-vn',
        '-ar',
        '8000',
        '-f',
        's16le',
        'pipe:1',
      ],
      { encoding: 'buffer', maxBuffer: Math.ceil((duration + 1) * 8000 * 4) },
    )
    const peaks = [0, 0]
    for (let i = 0; i < stdout.length; i += 2) {
      const channel = (i / 2) % 2
      peaks[channel] = Math.max(peaks[channel], Math.abs(stdout.readInt16LE(i)))
    }
    assert(
      peaks.every((peak) => peak >= 16),
      'the split needs both engines’ original audio',
    )
    const receipt = join(temporary, 'receipt.json')
    await writeFile(
      receipt,
      `${JSON.stringify(
        {
          ...comparison,
          target: output,
          sha256: await sha256(clip),
          duration,
          speed: 1,
          channels: { left: 'game', right: 'reforge' },
          decoded,
          peaks,
        },
        null,
        2,
      )}\n`,
    )
    await link(receipt, receiptPath)
    try {
      await link(clip, output)
    } catch (error) {
      await rm(receiptPath)
      throw error
    }
  } finally {
    await rm(temporary, { recursive: true })
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
    await publishSplit(compare, resolve(output), resolve(receipt))
  }
}
