import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertReforgeOpening,
  openingSaveView,
  reforgeRoomReady,
  reforgeStateKey,
  reforgeStoryAction,
} from './reforge-opening-policy.mjs'

const room = {
  projectId: 'pal',
  sceneId: 's001',
  dialogue: null,
  scriptRunning: false,
  presentationBusy: false,
  menuActive: false,
  battleActive: false,
  fadeBlack: 0,
  ditherActive: false,
}
test('Reforge driver only confirms a rendered input wait, never a typing page or auto tail', () => {
  for (const phase of ['typing', 'auto-advance'])
    assert.equal(reforgeStoryAction({ ...room, dialogue: { phase } }), 'wait')
  assert.equal(reforgeStoryAction({ ...room, dialogue: { phase: 'waiting-input' } }), 'confirm')
  assert.throws(
    () => reforgeStoryAction({ ...room, dialogue: { phase: 'mystery' } }),
    /unknown dialogue/,
  )
  assert.throws(() => reforgeStoryAction({ ...room, sceneId: 's002' }), /unexpected scene/)
  assert.throws(() => reforgeStoryAction({ ...room, battleActive: true }), /unexpected battle/)
})
test('room is not accepted during presentation, transition, dialogue or script execution', () => {
  assert(reforgeRoomReady(room))
  for (const field of [
    'presentationBusy',
    'menuActive',
    'battleActive',
    'ditherActive',
    'scriptRunning',
    'dialogue',
  ])
    assert.equal(reforgeRoomReady({ ...room, [field]: true }), false, field)
  assert.equal(reforgeRoomReady({ ...room, fadeBlack: 0.01 }), false)
})
test('player position and fade progress do not acknowledge a dialogue key or create frame logs', () => {
  const wrap = (r) => ({ boot: {}, video: null, runtime: r })
  assert.equal(
    reforgeStateKey(wrap({ ...room, position: { col: 1 } })),
    reforgeStateKey(wrap({ ...room, position: { col: 2 } })),
  )
  assert.equal(
    reforgeStateKey(wrap({ ...room, fadeBlack: 0.1 })),
    reforgeStateKey(wrap({ ...room, fadeBlack: 0.8 })),
  )
  assert.notEqual(
    reforgeStateKey(wrap(room)),
    reforgeStateKey(wrap({ ...room, dialogue: { phase: 'typing' } })),
  )
})
test('future declared rows and typing pages cannot fake a displayed story anchor', () => {
  const events = [
    ['s000', 'dlg.2', '作恶多端的罗煞鬼婆'],
    ['s001', 'dlg.1373', '真没意思'],
    ['s001', 'dlg.1383', '现在被发现就惨了'],
  ].map(([sceneId, id, pageText]) => ({
    state: {
      runtime: {
        ...room,
        sceneId,
        dialogue: { phase: 'waiting-input', rowTextIds: [id], pageTextIds: [id], pageText },
      },
    },
  }))
  const proof = { videos: [{ path: '/intro', kind: 'ended' }], events }
  assertReforgeOpening(proof, '/intro')
  const bad = structuredClone(proof)
  bad.events[2].state.runtime.dialogue.pageTextIds = ['dlg.1382']
  assert.throws(() => assertReforgeOpening(bad, '/intro'), /missing s001\/dlg.1383/)
  bad.events[2].state.runtime.dialogue.pageTextIds = ['dlg.1383']
  bad.events[2].state.runtime.dialogue.phase = 'typing'
  assert.throws(() => assertReforgeOpening(bad, '/intro'), /missing/)
  bad.events[2].state.runtime.dialogue.phase = 'waiting-input'
  bad.events[2].state.runtime.dialogue.pageText = 'dlg.1383'
  assert.throws(() => assertReforgeOpening(bad, '/intro'), /missing/)
  assert.throws(() => assertReforgeOpening({ ...proof, videos: [] }, '/intro'), /video/)
})
test('checkpoint comparison is read-only and only normalizes explicitly optional/transient fields', () => {
  // This is the comparison DTO, not a fixture claiming to pass the production SAVE10 structural guard.
  const save = {
    version: 10,
    contentVersion: 21,
    projectId: 'pal',
    position: { sceneId: 's001' },
    world: { party: [{ id: 'p', hp: 100, poisons: [] }], inventory: [], money: 7 },
  }
  const before = structuredClone(save),
    normalized = openingSaveView(save)
  assert.deepEqual(save, before)
  assert.equal(normalized.world.party[0].hp, 100)
  assert.deepEqual(normalized.world.skillUseCounts, {})
  const poisoned = structuredClone(save)
  poisoned.world.party[0].poisons = [{ poisonId: 1 }]
  assert.throws(() => openingSaveView(poisoned), /unexpectedly carries/)
  assert.throws(() => openingSaveView({ ...save, version: 7 }))
  assert.throws(() => openingSaveView({ ...save, version: 8 }))
  assert.throws(() => openingSaveView({ ...save, contentVersion: 20 }))
  assert.throws(() => openingSaveView({ ...save, projectId: 'other' }))
})
