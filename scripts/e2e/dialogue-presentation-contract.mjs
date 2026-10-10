import assert from 'node:assert/strict'

const ids = (slots) => slots.map((slot) => slot.presentationId).sort((a, b) => a - b)
const ordinary = (slot) => slot === 'top' || slot === 'bottom'
const context = (event) => [event.scene, event.sceneVisit]

// PAL's recorded story paragraphs end before foreground world actions. Ambient auto
// activity is independent: it may continue while the current paragraph is displayed.
// Scene capture/transition lifetimes have their own presentation contract.
const paragraphActions = new Set([
  'wait',
  'setPartyFacing',
  'setEntityFacing',
  'faceEntityToParty',
  'setEntityFrame',
  'setEntityState',
  'setEntityPos',
  'setEntityPosRelParty',
  'setActorSprite',
  'setActorAppearance',
  'moveEntity',
  'moveParty',
  'stepEntity',
  'nudgeEntity',
  'nudgeParty',
  'teleportParty',
  'ride',
  'mountParty',
  'releaseEntity',
  'fade',
  'ditherScreen',
])

function endsParagraph(event) {
  const occurrence = event.occurrence
  if (occurrence?.timing !== 'interactive' || occurrence.command?.kind !== 'leaf') return false
  const command = occurrence.command.command
  return (
    paragraphActions.has(command.kind) ||
    (command.kind === 'selectEntityBehavior' &&
      command.channel === 'auto' &&
      command.selection.kind === 'use')
  )
}

/** Visible slots are a separate obligation from the active cue's input/typing contract. */
export function verifyDialoguePresentation(events, worldRenders, engine = 'reforge') {
  const lifecycle = events.filter((event) => event.engine === engine && event.phase === 'dialogue')
  const draws = events.filter(
    (event) => event.engine === engine && event.phase === 'dialogue-presentation',
  )
  assert(draws.length, 'missing all-slot dialogue draw evidence')
  const rendered = new Map(),
    worlds = new Map(worldRenders.map((frame) => [frame.renderId, frame]))
  for (const draw of draws) {
    assert.equal(draw.source, 'draw', 'dialogue presentation is not an actual draw')
    assert(Array.isArray(draw.slots), 'missing dialogue slot set')
    const world = worlds.get(draw.renderId)
    assert(world, 'dialogue draw has no world render witness')
    assert.deepEqual(context(draw), context(world), 'dialogue draw belongs to another scene visit')
    assert(world.order < draw.order, 'dialogue draw precedes its world pass')
    assert(!rendered.has(draw.renderId), 'repeated dialogue draw receipt for one world pass')
    rendered.set(draw.renderId, draw)
    assert(draw.slots.filter((slot) => slot.active).length <= 1, 'multiple input-owning slots')
    assert.equal(
      new Set(draw.slots.map((slot) => slot.slot)).size,
      draw.slots.length,
      'repeated slot',
    )
    for (const slot of draw.slots) {
      assert(slot.owner?.runId && slot.owner?.occurrence, 'dialogue slot has no source caller')
      assert.equal(typeof slot.visibleText, 'string', 'slot has no successful text draw')
    }
  }
  // Only the interval actually covered by these receipts is certified. Old active-only
  // recordings cannot establish this obligation, and absent intermediate draws fail closed.
  for (const frame of worldRenders.filter(
    (frame) =>
      frame.order >= worlds.get(draws[0].renderId).order && frame.order < draws.at(-1).order,
  ))
    assert(rendered.has(frame.renderId), 'missing intermediate dialogue presentation draw')

  if (engine === 'reforge') {
    assert(lifecycle.length, 'missing dialogue presentation lifecycle')
    let expected = [],
      scriptSlots = false
    const opened = new Map()
    for (const event of events.filter((event) => event.engine === engine)) {
      if (event.phase === 'command' && endsParagraph(event))
        assert.equal(
          expected.length,
          0,
          `visible dialogue reached foreground ${event.occurrence.command.command.kind} before clearing (order ${event.order})`,
        )
      if (event.phase === 'dialogue') {
        assert(
          Array.isArray(event.beforeSlots) && Array.isArray(event.afterSlots),
          'missing dialogue slot lifecycle evidence',
        )
        if (event.source === 'open') {
          scriptSlots = event.lifetime === 'script' && ordinary(event.after?.slot)
          const cueSlot = event.after?.slot
          assert(cueSlot, 'opening has no active slot')
          const next = event.afterSlots.find((slot) => slot.slot === cueSlot)
          assert(next, 'opening has no new visible slot')
          if (scriptSlots)
            assert.deepEqual(
              ids(event.afterSlots),
              ids([...event.beforeSlots.filter((slot) => slot.slot !== cueSlot), next]),
              'opening another slot cleared retained dialogue',
            )
          opened.set(next.presentationId, { runId: event.runId, occurrence: event.occurrence })
        }
        if (
          scriptSlots &&
          ['advance', 'update'].includes(event.source) &&
          event.before &&
          !event.after
        ) {
          assert.deepEqual(
            ids(event.afterSlots),
            ids(event.beforeSlots),
            'cue completion cleared visible script dialogue',
          )
          assert(
            event.afterSlots.every((slot) => !slot.active),
            'completed cue still owns input',
          )
        }
        expected = event.afterSlots
      } else if (event.phase === 'dialogue-presentation') {
        assert.deepEqual(
          ids(event.slots),
          ids(expected),
          'draw omitted or resurrected a dialogue slot',
        )
        for (const slot of event.slots) {
          const source = opened.get(slot.presentationId)
          assert(source, 'draw uses an unopened slot identity')
          assert.equal(slot.owner.runId, source.runId, 'retained slot rebound to a later runner')
          assert.equal(
            slot.owner.occurrence.id,
            source.occurrence.id,
            'retained slot rebound to a later cue',
          )
          const configured = expected.find(
            (candidate) => candidate.presentationId === slot.presentationId,
          )
          for (const key of [
            'slot',
            'active',
            'speaker',
            'portraitAsset',
            'pageTextIds',
            'pageIndex',
          ])
            assert.deepEqual(slot[key], configured[key], `draw changed retained ${key}`)
        }
      }
    }
  }
  return { status: 'proved', draws: draws.length, lifecycle: lifecycle.length }
}
