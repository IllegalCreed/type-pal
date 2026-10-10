import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { parseSpriteChunk } from '../../packages/shared/src/rle.ts'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { scopeNpcStoryTrace } from './npc-story-scope.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

test('actual decoded render bytes match source independently of claimed asset names; mutation, wrong binding and loss are detected', async (t) => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const frames = parseSpriteChunk(
    gunzipSync(await readFile(new URL('../../data/extracted/data/sprite/2.rle', import.meta.url))),
  )
  const errors = [],
    recorder = createEvidenceRecorder({
      context: () => ({}),
      errors,
      onOverflow: () => assert.fail('unexpected overflow'),
    })
  t.after(() => delete globalThis.__e2eRecordSpriteFrame)
  const draw = (frame) => globalThis.__e2eRecordSpriteFrame(frame)
  const id = draw(frames[0])
  assert.equal(draw(frames[0]), id)
  const trace = {
    resources: structuredClone(recorder.resources()),
    events: [
      { kind: 'actor', id: 'e56', scene: 's003', sceneVisit: 1, order: 1, state: { sprite: 2 } },
      {
        kind: 'actor-render',
        source: 'render:world',
        id: 'e56',
        scene: 's003',
        sceneVisit: 1,
        order: 2,
        state: { frame: 0, drawStatus: 'drawn', frameResourceId: id },
      },
    ],
  }
  assert.equal((await checkSpriteResources(trace, 'game', root)).status, 'proved')
  trace.events[0].state.sprite = 'li-xiaoyao'
  assert.equal((await checkSpriteResources(trace, 'reforge', root)).status, 'proved')
  Object.assign(trace.events[1], {
    throughOrder: 6,
    renderId: 1,
    throughRenderId: 2,
    atMs: 1,
    tick: 1,
    throughAtMs: 2,
  })
  trace.worldRenders = [
    { order: 3, renderId: 1, scene: 's003', sceneVisit: 1, atMs: 1, tick: 1 },
    { order: 6, renderId: 2, scene: 's003', sceneVisit: 1, atMs: 2, tick: 2 },
  ]
  trace.events.push({
    ...structuredClone(trace.events[0]),
    order: 4,
    state: { sprite: 'li-xiaoyao', behavior: 'changed' },
  })
  trace.events.push({ kind: 'control', order: 7, state: { control: true } })
  const scoped = scopeNpcStoryTrace(trace, { start: { afterOrder: 5 }, end: { afterOrder: 6 } })
  assert.equal(
    (await checkSpriteResources(scoped, 'reforge', root)).status,
    'proved',
    'cross-boundary draw uses its own preceding commit, not a later baseline',
  )
  trace.events[2].state.sprite = 'sprite-21'
  assert.equal(
    (
      await checkSpriteResources(
        scopeNpcStoryTrace(trace, { start: { afterOrder: 5 }, end: { afterOrder: 6 } }),
        'reforge',
        root,
      )
    ).status,
    'rejected',
    'continued draw after sprite change cannot borrow earlier canonical selection',
  )
  trace.events[2].state.sprite = 'li-xiaoyao'
  const omitted = structuredClone(trace)
  omitted.resources = []
  assert.equal((await checkSpriteResources(omitted, 'reforge', root)).status, 'unknown')
  const wrong = structuredClone(trace)
  wrong.events[1].state.frame = 1
  assert.equal(
    (await checkSpriteResources(wrong, 'reforge', root)).witness.rule,
    'draw-resource-pixels',
  )
  // Reuse the same typed-array/object identity after corruption; the recorder must not trust its cache.
  frames[0].pixels[0] ^= 1
  const changed = draw(frames[0])
  assert.notEqual(changed, id)
  assert.equal(recorder.resources()[0].pixels[0], trace.resources[0].pixels[0])
  trace.resources = structuredClone(recorder.resources())
  trace.events[1].state.frameResourceId = changed
  assert.equal(
    (await checkSpriteResources(trace, 'reforge', root)).witness.rule,
    'draw-resource-pixels',
  )
  assert.deepEqual(errors, [])
})
