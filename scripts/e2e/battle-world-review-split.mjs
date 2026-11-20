import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { recordingDependencies } from './evidence-dependencies.mjs'
import {
  checkWorldSpritePixels,
  publishWorldDialogueSplit,
  readWorldSpritePose,
} from './world-dialogue-review.mjs'

const args = process.argv.slice(2)
const reviewLoadReveal = args.at(-1) === '--load-reveal'
if (reviewLoadReveal) args.pop()
const [comparisonPath, target, gameReport, reforgeReport] = args
assert(
  comparisonPath && target,
  'usage: battle-world-review-split.mjs COMPARE OUTPUT [GAME_REPORT REFORGE_REPORT] [--load-reveal]',
)
assert(Boolean(gameReport) === Boolean(reforgeReport), 'supply both relocated reports')
const json = async (path) => JSON.parse(await readFile(path, 'utf8'))
const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
let comparison = await json(comparisonPath)
assert.equal(comparison.status, 'passed')
if (comparison.kind === 'world-boss-entrance') {
  const verifier = fileURLToPath(new URL('./boss-entrances/compare.mjs', import.meta.url))
  const original = [comparison.game, comparison.reforge]
  const paths = [gameReport, reforgeReport].map((relocated, i) =>
    resolve(relocated ?? original[i].report),
  )
  const replay = spawnSync(process.execPath, [verifier, comparison.scenario, ...paths], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (replay.error) throw replay.error
  assert(replay.stdout, replay.stderr || 'the offline comparison produced no receipt')
  const recomputed = JSON.parse(replay.stdout)
  assert(
    replay.status === 0 && recomputed.status === 'passed',
    JSON.stringify(
      recomputed.failures.map(({ engine, phase, issue, path, cue, rows, error }) => ({
        engine,
        phase,
        issue,
        path,
        cue: cue ?? rows?.[0]?.id,
        error,
      })),
    ),
  )
  assert.deepEqual(
    [recomputed.game, recomputed.reforge].map(({ reportSha256 }) => reportSha256),
    original.map(({ reportSha256 }) => reportSha256),
    'recomputed evidence must be the same reports named by the original comparison',
  )
  comparison = { ...recomputed, recheckedBy: await sha256(verifier) }
}
const verified = comparison.engines ?? [comparison.game, comparison.reforge]

function nativeVideoEnd(path) {
  const args = [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'packet=pts_time,duration_time',
    '-of',
    'json',
    path,
  ]
  const { packets } = JSON.parse(
    execFileSync('ffprobe', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }),
  )
  assert(packets.length > 0, 'native recording has no video frames')
  const end = Math.max(
    ...packets.map(({ pts_time, duration_time }) => Number(pts_time) + Number(duration_time ?? 0)),
  )
  assert(Number.isFinite(end) && end > 0, 'invalid native video time')
  return end
}

function equipmentTimes(report, trace, videoEnd) {
  assert.equal(report.scenario, comparison.scenario)
  const first = report.actions.find(({ phase }) => phase === 'world-equip')
  const last = [...trace.paints, ...trace.equips, ...trace.removals].reduce(
    (latest, event) => Math.max(latest, event.atMs),
    -Infinity,
  )
  const started = report.media.browser.startedAt
  const inputSeconds = (first.atMs - trace.timeOrigin - started) / 1000
  const lastPresentedSeconds = (last - started) / 1000
  assert(inputSeconds >= 0 && lastPresentedSeconds > inputSeconds)
  assert(videoEnd - lastPresentedSeconds >= 0.5, 'equipment recording cuts off the final operation')
  return { inputSeconds, lastPresentedSeconds }
}

async function side(engine, relocatedReport) {
  const compare = verified.find((entry) => entry.engine === engine)
  assert(compare, `missing verified ${engine} capture`)
  const bossEntrance = comparison.kind === 'world-boss-entrance'
  const reportPath = resolve(relocatedReport ?? compare.path ?? compare.report)
  const reportSha256 = bossEntrance ? compare.reportSha256 : compare.sha256
  assert.equal(await sha256(reportPath), reportSha256)
  const report = await json(reportPath)
  if (bossEntrance && report.input.sceneRoute?.visits?.length)
    assert(compare.foregroundCoverage?.length, 'the foreground route needs a coverage receipt')
  if (compare.foregroundCoverage) {
    const root = fileURLToPath(new URL('../../', import.meta.url))
    const current = await recordingDependencies(root, report.dependencies.definition)
    assert.deepEqual(
      report.dependencies,
      current,
      'current execution sources differ from the recording',
    )
  }
  assert.equal(report.profile, 'capture')
  assert.equal(report.media.status, 'passed')
  const recording = resolve(dirname(reportPath), 'story.webm')
  assert.equal(await sha256(recording), report.media.native.sha256)
  const [run] = report.cases
  const videoEnd = nativeVideoEnd(recording)
  const identity = {
    engine,
    recording,
    recordingSha256: report.media.native.sha256,
    report: reportPath,
    reportSha256,
    videoEnd,
  }
  const equipment = comparison.kind === 'world-equipment'
  const rawReference = equipment ? run.trace : run.raw
  if (equipment) {
    assert(!reviewLoadReveal, 'equipment footage starts with the first physical menu input')
    assert.deepEqual(rawReference, compare.runs[0].trace)
  }
  const rawPath = resolve(dirname(reportPath), rawReference.path)
  assert.equal(await sha256(rawPath), rawReference.sha256)
  const raw = await json(rawPath)
  if (equipment) return { ...identity, ...equipmentTimes(report, raw, videoEnd) }
  if (bossEntrance) {
    assert(!reviewLoadReveal && !comparison.failures.length)
    assert.deepEqual(rawReference, compare.raw)
    const { events } = raw
    const contact =
      events.find(({ kind }) => kind === 'entrance-trigger') ??
      events.find(({ kind }) => kind === 'trigger' || kind === 'item-trigger')
    const successor = events.find(({ kind }) => kind === 'successor-drawn')
    const scriptedReturn = events.find(({ kind }) => kind === 'scripted-return-drawn')
    const directHandoff = successor && compare.clips.returnMs === successor.atMs
    const battleEnd = events.find(({ kind }) => kind === 'battle-finished')
    const returned =
      scriptedReturn ??
      (directHandoff ? successor : undefined) ??
      (successor
        ? events.find(
            ({ kind, order, scene, colors }) =>
              kind === 'world-drawn' &&
              order > battleEnd.order &&
              scene === (report.input.sceneRoute?.item ? report.input.scene : contact.scene) &&
              colors.some(([r, g, b]) => r || g || b),
          )
        : events.find(({ kind }) => kind === 'world-control'))
    assert(returned, `${engine} missing actual return frame`)
    const exit =
      scriptedReturn ??
      successor ??
      events.find(({ kind, order }) => kind === 'move' && order > returned.order)
    const { contactMs, returnMs, exitMs } = compare.clips
    assert.deepEqual([contact.atMs, returned.atMs, exit.atMs], [contactMs, returnMs, exitMs])
    const start = report.media.browser.startedAt
    const contactSeconds = (contactMs - start) / 1000
    const returnSeconds = (returnMs - start) / 1000
    const exitSeconds = (exitMs - start) / 1000
    assert(contactSeconds >= 0 && returnSeconds > contactSeconds)
    assert(
      scriptedReturn || directHandoff ? exitSeconds === returnSeconds : exitSeconds > returnSeconds,
    )
    assert(videoEnd - exitSeconds >= 0.45, `${engine} recording cuts off the return to control`)
    return {
      ...identity,
      contactSeconds,
      returnSeconds,
      exitSeconds,
      ...(compare.foregroundCoverage && {
        coverage: compare.foregroundCoverage,
        startedAt: start,
        rawPath,
      }),
    }
  }
  const handoff = raw.native?.handoff ?? raw.handoff
  const contact =
    engine === 'game'
      ? handoff.find(({ stage }) => stage === 'contact')
      : raw.events.find(({ kind }) => kind === 'contact')
  assert(contact, 'missing real contact for split alignment')
  const started = report.media.browser.startedAt
  const contactSeconds = (contact.atMs - started) / 1000
  assert(contactSeconds >= 0 && contactSeconds < videoEnd, 'contact outside the native video')
  const returned = handoff.find(({ stage }) => stage === 'world-ready')
  assert(returned, 'missing actual world return')
  const returnSeconds = (returned.atMs - started) / 1000
  if (comparison.outcome)
    assert(
      videoEnd - returnSeconds >= 0.5,
      `${engine} recording must show the returned field for at least 500 ms`,
    )
  const reveal = reviewLoadReveal ? compare.runs[0]?.loadReveal?.[0] : undefined
  let loadRevealSeconds
  if (reviewLoadReveal) {
    assert(reveal, `missing ${engine} verified load reveal`)
    loadRevealSeconds = (reveal.blackAtMs - started) / 1000
    assert(loadRevealSeconds >= 0 && loadRevealSeconds < videoEnd)
    assert(
      videoEnd - (reveal.readyAtMs - started) / 1000 >= 0.5,
      `${engine} recording ends before the loaded field can be reviewed`,
    )
  }
  return {
    ...identity,
    contactSeconds,
    returnSeconds,
    ...(loadRevealSeconds !== undefined && { loadRevealSeconds }),
  }
}

const sides = await Promise.all([side('game', gameReport), side('reforge', reforgeReport)])
if (sides.every(({ coverage }) => coverage)) {
  const recordings = sides.map((entry) => {
    const scenes = entry.coverage.filter(({ backdrop }) => backdrop)
    assert(
      scenes.length > 0 &&
        scenes.every(
          ({ backdrop, pixels }) =>
            backdrop.checkedFrames > 0 &&
            pixels?.length &&
            pixels.every(({ status }) => status === 'passed'),
        ),
      `${entry.engine} missing decoded world-dialogue coverage`,
    )
    const spans = scenes.flatMap(({ phase, scene, pixels }) =>
      pixels.map(({ start, end }, index) => ({
        id: `${scene}-${phase}-${index + 1}`,
        start,
        end,
        minLitFraction: 0.2,
      })),
    )
    return { ...entry, lastSeconds: entry.videoEnd, anchor: entry.contactSeconds, spans }
  })
  const spriteChecks = {
    'dali-earth-beast': { cue: 'dlg.11136', actor: 'e4168' },
    'stone-elder-auto': { cue: 'dlg.5865', actor: 'e2061' },
    'shangshu-lin-tiannan': { cue: 'dlg.6785', actor: 'e2154' },
  }
  const spriteCheck = spriteChecks[comparison.scenario]
  assert(spriteCheck, `${comparison.scenario} needs an independent world sprite check`)
  await publishWorldDialogueSplit(
    {
      status: 'passed',
      scenario: comparison.scenario,
      recheckedBy: comparison.recheckedBy,
      recordings,
    },
    resolve(target),
    resolve(`${target.replace(/\.mp4$/u, '')}-media.json`),
    async (source, clip, trim, panel) => {
      const cues = source.coverage.flatMap(({ cues }) => cues)
      const anchored = cues.find(({ cue }) => cue === spriteCheck.cue)
      assert(anchored?.views.length, `${source.engine} missing the declared foreground pose`)
      const actual = await json(source.rawPath)
      const drawing = actual.events.find(({ order }) => order === anchored.views[0].order)
      const actor = drawing.actors[spriteCheck.actor]
      const { asset, frame, rect } = actor
      const pixels = await readWorldSpritePose(asset, frame)
      const [left, top] = drawing.camera
      const [x, y, width, height] = rect
      assert.deepEqual([width, height], [pixels.width, pixels.height])
      const pixelPosition = [x - left, y - top]
      const visit = actual.events.findLast(
        ({ kind, order }) => kind === 'scene-first-drawn' && order <= drawing.order,
      )
      const precedingCue = cues[cues.indexOf(anchored) - 1]
      const start = Math.max(visit?.atMs ?? 0, precedingCue?.firstComplete.atMs ?? 0)
      // Another sprite can change the view ID without moving the actor being checked.
      const matchingViews = new Set(
        actual.events
          .filter(
            ({ kind, order, atMs, scene, visible, camera, actors }) =>
              kind === 'world-drawn' &&
              visible &&
              order >= (visit?.order ?? 1) - 1 &&
              atMs <= anchored.firstComplete.atMs &&
              scene === drawing.scene &&
              isDeepStrictEqual(camera, drawing.camera) &&
              isDeepStrictEqual(actors[spriteCheck.actor], actor),
          )
          .map(({ order }) => order),
      )
      // Completed text can cross the actor's face. Use independently
      // logged unobscured submissions of that same pose, before the cue finishes.
      const uncovered = actual.events.filter(
        ({ kind, view, atMs, dialogue, backdrop }) =>
          kind === 'world-render' &&
          matchingViews.has(view) &&
          atMs >= start &&
          atMs < anchored.firstComplete.atMs &&
          !dialogue &&
          backdrop?.textured &&
          !backdrop.dark,
      )
      let current = []
      let stable = []
      for (const frame of uncovered) {
        const previous = current.at(-1)
        if (previous && frame.renderId !== previous.renderId + 1) current = []
        current.push(frame)
        if (current.length > stable.length) stable = current
      }
      assert(stable.length >= 2, `${source.engine} missing an unobscured ${spriteCheck.actor}`)
      // Sample inside the interval so a native frame at the boundary can be resampled to 60 Hz.
      const nativeSeconds = ((stable[0].atMs + stable.at(-1).atMs) / 2 - source.startedAt) / 1000
      const expected = { ...pixels, pixelPosition }
      return Promise.all([
        checkWorldSpritePixels(source.recording, nativeSeconds, expected).then((result) => ({
          ...result,
          recording: 'native',
        })),
        checkWorldSpritePixels(clip, nativeSeconds - trim, expected, panel).then((result) => ({
          ...result,
          recording: 'split',
        })),
      ])
    },
  )
  console.log(`${target} ${await sha256(target)}`)
  process.exit(0)
}
const anchor = ({ loadRevealSeconds, contactSeconds, inputSeconds }) =>
  loadRevealSeconds ?? contactSeconds ?? inputSeconds
const preroll = Math.min(reviewLoadReveal ? 0.9 : 1.35, ...sides.map(anchor))
for (const entry of sides) entry.trimSeconds = anchor(entry) - preroll
const duration = Math.max(...sides.map(({ videoEnd, trimSeconds }) => videoEnd - trimSeconds))
const filters = sides.flatMap(({ trimSeconds, videoEnd }, input) => {
  const start = trimSeconds.toFixed(6)
  const pad = (duration - (videoEnd - trimSeconds) + 0.1).toFixed(6)
  return [
    `[${input}:v]trim=start=${start},setpts=PTS-${start}/TB,fps=60:start_time=0,scale=640:400:flags=neighbor,setsar=1,tpad=stop_mode=clone:stop_duration=${pad}[v${input}]`,
    `[${input}:a]atrim=start=${start},asetpts=PTS-${start}/TB,aresample=async=1:first_pts=0,pan=mono|c0=0.5*c0+0.5*c1,apad[a${input}]`,
  ]
})
filters.push('[v0][v1]hstack=inputs=2[v]', '[a0][a1]join=inputs=2:channel_layout=stereo[a]')
const command = [
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
  target,
]
execFileSync('ffmpeg', command)

const media = JSON.parse(
  execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type,width,height,channels,avg_frame_rate:format=duration',
      '-of',
      'json',
      target,
    ],
    { encoding: 'utf8' },
  ),
)
const [video, audio] = media.streams
assert.deepEqual(
  [video.width, video.height, video.avg_frame_rate, audio.channels],
  [1280, 400, '60/1', 2],
)
assert(
  Math.abs(Number(media.format.duration) - duration) <= 0.06,
  'encoded video lost its final frames',
)
const pcm = execFileSync(
  'ffmpeg',
  ['-v', 'error', '-i', target, '-vn', '-ar', '8000', '-f', 's16le', 'pipe:1'],
  { maxBuffer: Math.ceil((duration + 1) * 8000 * 2 * 2) },
)
const peaks = [0, 0]
for (let byte = 0; byte < pcm.length; byte += 2) {
  const channel = (byte / 2) % 2
  peaks[channel] = Math.max(peaks[channel], Math.abs(pcm.readInt16LE(byte)))
}
assert(
  peaks.every((peak) => peak >= 16),
  'one channel lost its captured audio',
)
const receipt = {
  comparison: resolve(comparisonPath),
  target: resolve(target),
  sha256: await sha256(target),
  speed: 1,
  channels: { left: 'game', right: 'reforge' },
  peaks,
  sides,
  media,
  command,
}
await writeFile(
  `${target.replace(/\.mp4$/u, '')}-media.json`,
  `${JSON.stringify(receipt, null, 2)}\n`,
  { flag: 'wx' },
)
console.log(`${target} ${receipt.sha256} ${media.format.duration}s`)
