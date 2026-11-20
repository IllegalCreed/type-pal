import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectInnActorFrames } from './inn-dialogue-review.mjs'
import { checkWorldDialoguePixels } from './world-dialogue-pixels.mjs'

const window = { start: 0.075, end: 0.244, minLitFraction: 0.3 }
const complete = [0, 0.06, 0.12, 0.18, 0.24, 0.3].map((seconds) => ({
  seconds,
  litFraction: seconds === 0 || seconds === 0.3 ? 0 : 0.92,
}))

test('a single frame covered by the curtain fails inside the spoken window', () => {
  assert.equal(checkWorldDialoguePixels(complete, window).status, 'passed')
  const blackFrame = complete.map((frame) =>
    frame.seconds === 0.12 ? { ...frame, litFraction: 0 } : frame,
  )
  const result = checkWorldDialoguePixels(blackFrame, window)
  assert.equal(result.status, 'background-hidden')
  assert.deepEqual(result.firstDarkFrame, { seconds: 0.12, litFraction: 0 })
})

test('the frame already displayed at the first syllable counts, and missing coverage fails', () => {
  const blackStart = complete.map((frame) =>
    frame.seconds < window.start ? { ...frame, litFraction: 0 } : frame,
  )
  assert.equal(checkWorldDialoguePixels(blackStart, window).firstDarkFrame.seconds, 0.06)
  assert.equal(checkWorldDialoguePixels(complete.slice(2), window).status, 'missing-frames')
  assert.equal(checkWorldDialoguePixels(complete.slice(0, -1), window).status, 'missing-frames')
})

test('a dark movie can have an off-center subject, but every frame still needs a picture', () => {
  const movie = complete.map(({ seconds }) => ({
    seconds,
    litFraction: 0,
    pictureLitFraction: 0.14,
  }))
  const span = { ...window, sample: 'picture', minLitFraction: 0.1 }
  assert.equal(checkWorldDialoguePixels(movie, span).status, 'passed')
  const hidden = movie.map((frame) =>
    frame.seconds === 0.12 ? { ...frame, pictureLitFraction: 0 } : frame,
  )
  const result = checkWorldDialoguePixels(hidden, span)
  assert.equal(result.status, 'background-hidden')
  assert.equal(result.firstDarkFrame.seconds, 0.12)
})

test('the visible aunt pose is held until the next actual world draw', () => {
  const span = { scene: 's002', id: 's002-night', startAtMs: 120, endAtMs: 210 }
  const scene = {
    scene: 's002',
    atMs: 100,
    endAtMs: 130,
    sick: null,
    standing: { asset: 215, frame: 2, facing: 'down', position: [1424, 728] },
  }
  const nextDraw = { scene: 's001', atMs: 240, endAtMs: 240 }
  assert.equal(inspectInnActorFrames('game', [scene, nextDraw], span).status, 'passed')
  assert.equal(inspectInnActorFrames('game', [scene], span).status, 'missing-actor-frames')
  const wrong = { ...scene, standing: { ...scene.standing, frame: 0 } }
  assert.equal(inspectInnActorFrames('game', [wrong, nextDraw], span).status, 'wrong-actor-frame')
})
