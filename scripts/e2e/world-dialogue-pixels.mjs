import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createInterface } from 'node:readline'

const width = 80
const height = 50
const frameSize = width * height

async function readBackgroundSamples(stream) {
  const samples = []
  let leftover = Buffer.alloc(0)
  for await (const chunk of stream) {
    const frames = leftover.length ? Buffer.concat([leftover, chunk]) : chunk
    const complete = frames.length - (frames.length % frameSize)
    for (let offset = 0; offset < complete; offset += frameSize) {
      // Read both sides of the room above lower dialogue. Skip the central caption area.
      let lit = 0
      for (let y = 18; y < 25; y++) {
        for (let x = 4; x < 76; x++) {
          if (x >= 32 && x < 48) continue
          if (frames[offset + y * width + x] >= 16) lit++
        }
      }
      samples.push(lit / (7 * 56))
    }
    leftover = frames.subarray(complete)
  }
  assert.equal(leftover.length, 0, 'incomplete decoded video frame')
  return samples
}

async function readPresentationTimestamps(stream) {
  const times = []
  const diagnostics = []
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
    const frame = /\bn:\s*\d+\s+pts:\s*-?\d+\s+pts_time:(\S+)/u.exec(line)
    if (frame) times.push(Number(frame[1]))
    else if (line.trim() && !line.includes('Parsed_showinfo')) {
      diagnostics.push(line)
      if (diagnostics.length > 8) diagnostics.shift()
    }
  }
  return { times, diagnostics }
}

/** Keep the native frame clock. A generated constant-rate sampling grid can miss a bad frame. */
export async function decodeWorldDialoguePixels(path, panel) {
  const viewport = panel === undefined ? '' : `crop=640:400:${panel * 640}:0,`
  const filter = `${viewport}scale=${width}:${height}:flags=area,showinfo`
  const child = spawn(
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
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  try {
    const [samples, { times, diagnostics }, [status, signal]] = await Promise.all([
      readBackgroundSamples(child.stdout),
      readPresentationTimestamps(child.stderr),
      once(child, 'close'),
    ])
    assert.equal(status, 0, `frame decoder failed (${status ?? signal})\n${diagnostics.join('\n')}`)
    assert(
      times.length > 0 && times.length === samples.length,
      'each decoded video frame needs its native presentation timestamp',
    )
    return times.map((seconds, index) => {
      assert(
        Number.isFinite(seconds) && (!index || seconds > times[index - 1]),
        'decoded timestamps must increase',
      )
      return { seconds, litFraction: samples[index] }
    })
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill()
  }
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
