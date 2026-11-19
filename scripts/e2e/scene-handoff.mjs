import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { isDeepStrictEqual, promisify } from 'node:util'

export const HANDOFF_SAMPLE_WIDTH = 64
export const HANDOFF_SAMPLE_HEIGHT = 40
const frameSize = HANDOFF_SAMPLE_WIDTH * HANDOFF_SAMPLE_HEIGHT
const run = promisify(execFile)

export async function decodeSceneHandoff(path, panel) {
  const viewport = panel === undefined ? '' : `crop=640:400:${panel * 640}:0,`
  const filter = `${viewport}scale=${HANDOFF_SAMPLE_WIDTH}:${HANDOFF_SAMPLE_HEIGHT}:flags=neighbor,showinfo`
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
  assert(times.length > 0 && times.length * frameSize === stdout.length)
  return times.map((seconds, index) => {
    assert(Number.isFinite(seconds) && (!index || seconds > times[index - 1]))
    return { seconds, luma: stdout.subarray(index * frameSize, (index + 1) * frameSize) }
  })
}

const cueOnScreen = (row, cue) => row.dialogue?.includes(cue)
const isBlack = ({ luma }) => luma.every((value) => value <= 7)
const grid = (index) => [index % HANDOFF_SAMPLE_WIDTH, Math.floor(index / HANDOFF_SAMPLE_WIDTH)]
const mean = (numbers) => numbers.reduce((sum, value) => sum + value, 0) / numbers.length

function fadePixels(reference, frames) {
  const background = []
  const dialogue = []
  for (const [index, value] of reference.entries()) {
    const [x, y] = grid(index)
    if (x <= 2 || x >= 61) continue
    if (y >= 3 && y < 17 && value >= 24) background.push(index)
    if (y >= 21 && y <= 37 && value >= 76) dialogue.push(index)
  }
  assert(
    background.length >= 80 && dialogue.length >= 30,
    'missing source image and dialogue pixels',
  )
  const ratio = (sample, indices) =>
    mean(indices.map((index) => sample[index])) / mean(indices.map((index) => reference[index]))
  return frames.map(({ luma, ...row }) => ({
    ...row,
    backgroundFactor: ratio(luma, background),
    dialogueFactor: ratio(luma, dialogue),
  }))
}

function witness(row) {
  const { luma: _luma, ...evidence } = row
  return evidence
}

/**
 * The caller supplies authored source/target cues and the actual first target composition.
 * Coalescing rendered frames by scene, or substituting the settled state, hides a one-frame error.
 */
export function compareSceneHandoff(recording, contract) {
  assert(Array.isArray(recording) && recording.length > 0, 'missing submitted canvas frames')
  const frames = recording.map(({ luma, ...row }) => ({
    ...row,
    luma: Buffer.from(luma, 'base64'),
  }))
  assert(frames.every((row) => row.luma.length === frameSize))
  const targetCue = frames.findIndex(
    (row) => row.world?.scene === contract.target.scene && cueOnScreen(row, contract.targetCue),
  )
  const sourceFrames = frames.slice(0, targetCue)
  const sourceCue = sourceFrames.findLastIndex(
    (row, index) =>
      row.world?.scene === contract.source &&
      cueOnScreen(row, contract.sourceCue) &&
      !row.held &&
      !row.effect &&
      index + 1 < sourceFrames.length &&
      (!cueOnScreen(sourceFrames[index + 1], contract.sourceCue) ||
        sourceFrames[index + 1].held ||
        Boolean(sourceFrames[index + 1].effect)),
  )
  assert(targetCue > 0 && sourceCue >= 0, 'missing actual source or target dialogue anchor')
  const segment = frames.slice(sourceCue, targetCue + 1)
  assert(segment.length > 2, 'missing rendered handoff frames')
  assert(
    segment.every((row, index) => {
      const previous = segment[index - 1]
      return (
        !previous ||
        (row.captureFrame === previous.captureFrame + 1 &&
          row.atMs >= previous.atMs &&
          row.atMs - previous.atMs <= 120 &&
          row.id >= previous.id)
      )
    }),
    'submitted frame order or cadence has missing evidence',
  )

  const findings = []
  const blackAt = segment.findIndex(isBlack)
  const sourceReference = segment[0]
  const fade = fadePixels(sourceReference.luma, segment.slice(1, blackAt < 0 ? undefined : blackAt))
  const mismatchedFade = fade.find(
    ({ backgroundFactor, dialogueFactor }) =>
      backgroundFactor >= 0.08 &&
      backgroundFactor <= 0.94 &&
      Math.abs(backgroundFactor - dialogueFactor) > 0.12,
  )
  if (mismatchedFade)
    findings.push({ issue: 'dialogue-did-not-fade-with-scene', ...mismatchedFade })
  const sourceActive = fade.filter(
    ({ backgroundFactor }) => backgroundFactor >= 0.1 && backgroundFactor <= 0.85,
  )
  if (sourceActive.length < 8 || blackAt < 0)
    findings.push({ issue: 'no-complete-fade-out', gradientFrames: sourceActive.length, blackAt })
  const firstVisible =
    blackAt < 0 ? -1 : segment.findIndex((row, i) => i > blackAt && !isBlack(row))
  if (firstVisible < 0) findings.push({ issue: 'target-never-revealed' })
  const revealed =
    firstVisible < 0 ? [] : segment.slice(firstVisible).filter((row) => !isBlack(row))
  const badArrival = revealed.find(({ world }) => !isDeepStrictEqual(world, contract.target))
  if (badArrival)
    findings.push({
      issue: 'wrong-visible-scene-frame',
      expected: contract.target,
      ...witness(badArrival),
    })
  const leaked = revealed.find((row) => cueOnScreen(row, contract.sourceCue))
  if (leaked) findings.push({ issue: 'stale-dialogue-on-target-scene', ...witness(leaked) })

  return {
    status: findings.length ? 'rejected' : 'passed',
    findings,
    source: witness(sourceReference),
    firstBlack: blackAt < 0 ? null : witness(segment[blackAt]),
    firstVisible: firstVisible < 0 ? null : witness(segment[firstVisible]),
    firstTargetDialogue: witness(segment.at(-1)),
    observedFrames: segment.length,
    fadeFrames: sourceActive.length,
  }
}

function difference(a, b) {
  let total = 0
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i])
  return total / a.length
}

/** Bind every decoded native or composite frame in the handoff to a submitted canvas sample. */
export function bindSceneHandoffVideo(frames, recording, proof, startClock, trim = 0) {
  const start = (proof.source.atMs - startClock) / 1000 - trim
  const end = (proof.firstTargetDialogue.atMs - startClock) / 1000 - trim
  const samples = recording
    .filter(
      ({ atMs }) => atMs >= proof.source.atMs - 80 && atMs <= proof.firstTargetDialogue.atMs + 80,
    )
    .map(({ atMs, luma, captureFrame }) => ({
      seconds: (atMs - startClock) / 1000 - trim,
      luma: Buffer.from(luma, 'base64'),
      captureFrame,
    }))
  const span = frames.filter(({ seconds }) => seconds >= start && seconds <= end)
  assert(span.length > 16, 'video omits the scene handoff')
  let maximumError = 0
  for (const frame of span) {
    const nearby = samples.filter((row) => Math.abs(row.seconds - frame.seconds) <= 0.085)
    const nearest = nearby
      .map(({ luma, ...row }) => ({ ...row, error: difference(frame.luma, luma) }))
      .toSorted((a, b) => a.error - b.error)[0]
    if (!nearest || nearest.error > 8)
      return {
        status: 'encoded-handoff-mismatch',
        firstUnmatchedSeconds: frame.seconds,
        nearest,
      }
    maximumError = Math.max(maximumError, nearest.error)
  }
  return { status: 'passed', decodedFrames: span.length, start, end, maximumError }
}
