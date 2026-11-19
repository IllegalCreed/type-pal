import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const width = 80
const height = 50
const frameSize = width * height

/** Keep the native frame clock. A generated constant-rate sampling grid can miss a bad frame. */
export async function decodeWorldDialoguePixels(path, panel) {
  const viewport = panel === undefined ? '' : `crop=640:400:${panel * 640}:0,`
  const filter = `${viewport}scale=${width}:${height}:flags=area,showinfo`
  const { stdout, stderr } = await run(
    'ffmpeg',
    [
      '-nostdin',
      '-hide_banner',
      '-copyts',
      '-loglevel',
      'info',
      '-i',
      path,
      '-map',
      '0:v:0',
      '-an',
      '-vf',
      filter,
      '-fps_mode',
      'passthrough',
      '-pix_fmt',
      'gray',
      '-f',
      'rawvideo',
      'pipe:1',
    ],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
  )
  const times = [
    ...stderr.toString('utf8').matchAll(/\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:([\d.-]+)/gu),
  ].map((match) => Number(match[1]))
  assert(
    times.length > 0 && times.length * frameSize === stdout.length,
    'each decoded video frame needs its native presentation timestamp',
  )
  return times.map((seconds, index) => {
    assert(
      Number.isFinite(seconds) && (!index || seconds > times[index - 1]),
      'decoded timestamps must increase',
    )
    const frame = stdout.subarray(index * frameSize, (index + 1) * frameSize)
    // Read both sides of the room above lower dialogue. Skip the central caption area.
    let lit = 0
    for (let y = 18; y < 25; y++) {
      for (let x = 4; x < 76; x++) {
        if (x >= 32 && x < 48) continue
        if (frame[y * width + x] >= 16) lit++
      }
    }
    return { seconds, litFraction: lit / (7 * 56) }
  })
}

export function checkWorldDialoguePixels(frames, { start, end, minLitFraction }) {
  assert(Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start)
  assert(minLitFraction > 0 && minLitFraction <= 1)
  const first = frames.findLastIndex(({ seconds }) => seconds <= start)
  const after = frames.findIndex(({ seconds }) => seconds >= end)
  if (first < 0 || after <= first) return { status: 'missing-frames', start, end }
  const coverage = frames.slice(first, after + 1)
  const visible = coverage.slice(0, -1)
  const gap = coverage.find(
    (row, index) => index && row.seconds - coverage[index - 1].seconds > 0.15,
  )
  if (gap) return { status: 'missing-frames', firstGapAt: gap.seconds, start, end }
  const dark = visible.find(({ litFraction }) => litFraction < minLitFraction)
  const result = {
    start,
    end,
    checkedFrames: visible.length,
    minimumLitFraction: Math.min(...visible.map(({ litFraction }) => litFraction)),
  }
  return dark
    ? { ...result, status: 'background-hidden', firstDarkFrame: dark }
    : { ...result, status: 'passed' }
}
