import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const [comparisonPath, target, gameReport, reforgeReport] = process.argv.slice(2)
assert(
  comparisonPath && target,
  'usage: battle-world-review-split.mjs COMPARE OUTPUT [GAME_REPORT REFORGE_REPORT]',
)
assert(Boolean(gameReport) === Boolean(reforgeReport), 'supply both relocated reports')
const json = async (path) => JSON.parse(await readFile(path, 'utf8'))
const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
const comparison = await json(comparisonPath)
assert.equal(comparison.status, 'passed')
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
  const { packets } = JSON.parse(execFileSync('ffprobe', args, { encoding: 'utf8' }))
  assert(packets.length > 0, 'native recording has no video frames')
  const end = Math.max(
    ...packets.map(({ pts_time, duration_time }) => Number(pts_time) + Number(duration_time ?? 0)),
  )
  assert(Number.isFinite(end) && end > 0, 'invalid native video time')
  return end
}

async function side(engine, relocatedReport) {
  const compare = verified.find((entry) => entry.engine === engine)
  assert(compare, `missing verified ${engine} capture`)
  const reportPath = resolve(relocatedReport ?? compare.path ?? compare.report)
  assert.equal(await sha256(reportPath), compare.sha256)
  const report = await json(reportPath)
  assert.equal(report.profile, 'capture')
  assert.equal(report.media.status, 'passed')
  const recording = resolve(dirname(reportPath), 'story.webm')
  assert.equal(await sha256(recording), report.media.native.sha256)
  const [run] = report.cases
  const rawPath = resolve(dirname(reportPath), run.raw.path)
  assert.equal(await sha256(rawPath), run.raw.sha256)
  const raw = await json(rawPath)
  const handoff = raw.native?.handoff ?? raw.handoff
  const contact =
    engine === 'game'
      ? handoff.find(({ stage }) => stage === 'contact')
      : raw.events.find(({ kind }) => kind === 'contact')
  assert(contact, 'missing real contact for split alignment')
  const started = report.media.browser.startedAt
  const contactSeconds = (contact.atMs - started) / 1000
  const videoEnd = nativeVideoEnd(recording)
  assert(contactSeconds >= 0 && contactSeconds < videoEnd, 'contact outside the native video')
  const returned = handoff.find(({ stage }) => stage === 'world-ready')
  assert(returned, 'missing actual world return')
  const returnSeconds = (returned.atMs - started) / 1000
  if (comparison.outcome)
    assert(
      videoEnd - returnSeconds >= 0.5,
      `${engine} recording must show the returned field for at least 500 ms`,
    )
  return {
    engine,
    recording,
    recordingSha256: report.media.native.sha256,
    report: reportPath,
    reportSha256: compare.sha256,
    videoEnd,
    contactSeconds,
    returnSeconds,
  }
}

const sides = await Promise.all([side('game', gameReport), side('reforge', reforgeReport)])
const preroll = Math.min(1.35, ...sides.map(({ contactSeconds }) => contactSeconds))
for (const entry of sides) entry.trimSeconds = entry.contactSeconds - preroll
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
const pcm = execFileSync('ffmpeg', [
  '-v',
  'error',
  '-i',
  target,
  '-vn',
  '-ar',
  '8000',
  '-f',
  's16le',
  'pipe:1',
])
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
