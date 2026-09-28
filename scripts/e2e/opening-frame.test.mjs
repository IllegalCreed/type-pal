import assert from 'node:assert/strict'
import test from 'node:test'
import { openingFrameMatches, readOpeningFrame } from './opening-frame.mjs'

test('loaded state is not enough: black/partial frame and wrong room hash fail', () => {
  const end = { width: 320, height: 200, nonBlack: 40000, sha256: 'real-room' }
  assert.equal(openingFrameMatches(end, end), true)
  assert.equal(openingFrameMatches({ ...end, nonBlack: 0 }, end), false)
  assert.equal(openingFrameMatches({ ...end, nonBlack: 320 }, end), false)
  assert.equal(openingFrameMatches({ ...end, sha256: 'stale-menu' }, end), false)
  assert.equal(openingFrameMatches({ ...end, width: 640 }, end), false)
  assert.equal(openingFrameMatches(null, end), false)
})

test('pixel reader hashes actual RGBA and does not mutate the supplied pixels', async () => {
  const data = new Uint8ClampedArray([0, 0, 0, 255, 10, 20, 30, 255])
  const original = data.slice()
  const document = {
    querySelectorAll: () => [
      { width: 2, height: 1, getContext: () => ({ getImageData: () => ({ data }) }) },
    ],
  }
  const read = new Function('document', 'crypto', `return (${readOpeningFrame.toString()})();`)
  const frame = await read(document, globalThis.crypto)
  assert.equal(frame.nonBlack, 1)
  assert.equal(
    frame.sha256,
    Buffer.from(await crypto.subtle.digest('SHA-256', data)).toString('hex'),
  )
  assert.deepEqual(data, original)
  data[4] = 11
  assert.notEqual((await read(document, globalThis.crypto)).sha256, frame.sha256)
})
