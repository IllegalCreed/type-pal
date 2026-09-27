import assert from 'node:assert/strict'
import test from 'node:test'
import {
  appendBounded,
  assertOpeningEvidence,
  isControllableRoom,
  stateKey,
  storyAction,
} from './opening-policy.mjs'

const room = {
  ready: true,
  scene: 2,
  mode: 'explore',
  menu: null,
  dialog: null,
  event: false,
  loading: false,
  suspended: false,
  fading: false,
  video: null,
}
const proof = () => ({
  final: { ...room },
  videos: [{ kind: 'ended', path: '/extracted/videos/3.mp4' }],
  lines: [
    { map: 20, text: '作恶多端的罗煞鬼婆' },
    { map: 12, text: '真没意思' },
    { map: 12, text: '现在被发现就惨了' },
  ],
})

test('only genuinely idle room qualifies; scene alone is not enough', () => {
  assert(isControllableRoom(room))
  for (const key of ['event', 'loading', 'suspended', 'fading', 'menu', 'dialog', 'video']) {
    assert.equal(isControllableRoom({ ...room, [key]: true }), false, key)
  }
  assert.equal(isControllableRoom({ ...room, scene: 1 }), false)
})
test('only real dialogue wait states produce Confirm; typing and tail waits run normally', () => {
  for (const phase of ['typing', 'line-done'])
    assert.equal(storyAction({ ...room, dialog: { phase } }), 'wait')
  for (const phase of ['waiting-page-key', 'waiting-end-key'])
    assert.equal(storyAction({ ...room, dialog: { phase } }), 'confirm')
  assert.throws(() => storyAction({ ...room, dialog: { phase: 'unknown' } }), /unknown dialogue/)
})
test('unknown scene, battle, menu and video fail closed', () => {
  for (const override of [
    { scene: 3 },
    { mode: 'battle' },
    { menu: { kind: 'opening' } },
    { video: { path: '/extracted/videos/4.mp4' } },
  ]) {
    assert.throws(() => storyAction({ ...room, ...override }))
  }
})
test('scene transition cannot fake the opening: video ended and three scene-bound anchors required', () => {
  assertOpeningEvidence(proof())
  for (let i = 0; i < 3; i++) {
    const p = proof()
    p.lines.splice(i, 1)
    assert.throws(() => assertOpeningEvidence(p), /missing story anchor/)
  }
  const p = proof()
  p.videos[0].kind = 'attached'
  assert.throws(() => assertOpeningEvidence(p), /native video 3/)
  p.videos[0] = { kind: 'ended', path: '/extracted/videos/2.mp4' }
  assert.throws(() => assertOpeningEvidence(p), /native video 3/)
})
test('bounded log fails at overflow; no frame or glyph progress in state keys', () => {
  const log = []
  appendBounded(log, 1, 1)
  assert.throws(() => appendBounded(log, 2, 1), /overflow/)
  assert.deepEqual(log, [1])
  assert.equal(stateKey({ ...room, frame: 1 }), stateKey({ ...room, frame: 100 }))
})
