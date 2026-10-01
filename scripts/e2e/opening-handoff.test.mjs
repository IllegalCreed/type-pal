import assert from 'node:assert/strict'
import test from 'node:test'
import { assertOpeningHandoff, installOpeningHandoffObserver } from './opening-handoff.mjs'

const title = { width: 2, height: 1, nonBlack: 1, opaque: 2 }
const removal = {
  path: '/intro.mp4',
  naturalEnd: true,
  runtimeReady: false,
  frame: { ...title, nonBlack: 0 },
}

test('handoff requires real title pixels, natural completion and an opaque black gap', () => {
  assertOpeningHandoff({ title, removals: [removal] }, '/intro.mp4')
  for (const altered of [
    { ...removal, frame: title },
    { ...removal, frame: { ...removal.frame, opaque: 0 } },
    { ...removal, runtimeReady: true },
    { ...removal, naturalEnd: false },
  ])
    assert.throws(() => assertOpeningHandoff({ title, removals: [altered] }, '/intro.mp4'))
  assert.throws(() => assertOpeningHandoff({ title, removals: [] }, '/intro.mp4'))
  assert.throws(() =>
    assertOpeningHandoff({ title: removal.frame, removals: [removal] }, '/intro.mp4'),
  )
})

test('DOM removal observer reads actual RGBA without writing the canvas or engine', () => {
  const data = new Uint8ClampedArray([0, 0, 0, 255, 10, 20, 30, 255])
  let callback
  const canvas = {
    width: 2,
    height: 1,
    getContext: () => ({ getImageData: () => ({ data }) }),
    toDataURL: () => 'data:image/png;base64,fixture',
  }
  const document = { querySelector: () => canvas }
  const window = { __tpObserve: { readRuntime: () => null } }
  class Observer {
    constructor(fn) {
      callback = fn
    }
    observe(target, options) {
      assert.equal(target, document)
      assert.deepEqual(options, { childList: true, subtree: true })
    }
  }
  new Function(
    'window',
    'document',
    'MutationObserver',
    'location',
    `(${installOpeningHandoffObserver.toString()})();`,
  )(window, document, Observer, { href: 'http://localhost/' })
  window.__openingHandoff.arm('/intro.mp4')
  const before = data.slice()
  callback([{ removedNodes: [{ nodeName: 'VIDEO', src: '/other.mp4' }] }])
  assert.equal(window.__openingHandoff.read().removals.length, 0)
  callback([{ removedNodes: [{ nodeName: 'VIDEO', src: '/intro.mp4', ended: true }] }])
  assert.equal(window.__openingHandoff.read().removals[0].frame.nonBlack, 1)
  assert.deepEqual(data, before)
  assert.equal(window.__tpObserve.readRuntime(), null)
})
