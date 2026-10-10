import assert from 'node:assert/strict'
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import { canonicalPosition } from './coordinate-evidence.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { originalSpriteNumber } from './game-pose-semantics.mjs'
import { renderedPoseEvidence } from './npc-transition-contract.mjs'

/** Steering direction is not the rider's picture: native ride retains the last
 * 0x15 frame. Bind that source setter and every completed draw to the actual run.
 */
export function assertBoatRiderPose(raw, engine, terminal) {
  const commands = raw.causes.filter(
    (event) =>
      event.phase === 'command' &&
      event.runId === terminal.runId &&
      event.sceneVisit === terminal.sceneVisit &&
      event.scene === 's005',
  )
  const setter = commands.findLast(
    (event) =>
      event.order < terminal.command &&
      (engine === 'game'
        ? event.occurrence?.ip === 1513
        : event.occurrence?.command?.command?.kind === 'setPartyFacing' &&
          !event.occurrence.command.command.member),
  )
  assert(setter, 'boat rider lacks its actual pre-ride pose setter')
  const primary = source.segments[0].commands[1513]
  assert.deepEqual(primary, { op: 'raw', opcode: 0x15, operands: [0, 0, 0] })
  if (engine === 'game') assert.deepEqual(setter.occurrence.command, primary)
  else {
    const authored = canonicalScenes.s005.entities.find((entity) => entity.id === 'e116').behaviors
      .trigger['legacy-001'].flow.stages[0].body[4]
    assert.deepEqual(setter.occurrence.path, ['initial', 4])
    assert.deepEqual(setter.occurrence.command.command, authored)
    assert.deepEqual(
      authored,
      { kind: 'setPartyFacing', facing: 'down' },
      'boat rider authored facing differs from primary pose',
    )
  }
  const draws = raw.worldRenders.filter(
    (draw) =>
      draw.scene === 's005' &&
      draw.sceneVisit === terminal.sceneVisit &&
      draw.order > terminal.command &&
      draw.order < terminal.continuation,
  )
  assert(draws.length >= 3, 'boat rider lacks full ride draw coverage')
  const poses = renderedPoseEvidence(raw, 'party', 's005')
  const commits = raw.events.filter(
    (event) =>
      event.kind === 'actor' &&
      event.id === 'party' &&
      event.scene === 's005' &&
      event.sceneVisit === terminal.sceneVisit,
  )
  for (const draw of draws) {
    const matches = poses.filter(
      (pose) => pose.sceneVisit === draw.sceneVisit && pose.renderId === draw.renderId,
    )
    assert.equal(matches.length, 1, `boat rider missing/repeated actual draw ${draw.renderId}`)
    const pose = matches[0]
    const actor = commits.findLast((event) => event.order < draw.order)
    assert(
      actor && actor.order > setter.order,
      'boat rider lacks its post-setter actor observation',
    )
    assert.equal(actor.state.walking, false, 'boat rider is walking on the carrier')
    assert.deepEqual(
      pose.position,
      canonicalPosition(actor.state.position),
      'boat rider picture differs from its latest actor position',
    )
    assert.equal(
      originalSpriteNumber(actor.state.sprite),
      originalSpriteNumber('li-xiaoyao'),
      'boat rider is not the canonical leader sprite',
    )
    if (engine === 'game')
      assert.equal(actor.state.scriptedFrame, 0, 'boat rider lost the primary scripted pose')
    else assert.equal(actor.state.facing, 'down', 'boat rider changed authored facing')
    assert.equal(pose.frameSource, 'drawn', 'boat rider frame was not actually drawn')
    assert.equal(pose.drawStatus, 'drawn', 'boat rider draw did not complete')
    assert.equal(pose.frame, 0, `boat rider rendered opposite/wrong pose at draw ${draw.renderId}`)
    assert(Number.isSafeInteger(pose.frameResourceId), 'boat rider lacks drawn resource identity')
    // Resource bytes are independently checked against this committed sprite.
  }
  return {
    status: 'proved',
    runId: terminal.runId,
    sceneVisit: terminal.sceneVisit,
    setter: setter.order,
    command: terminal.command,
    continuation: terminal.continuation,
    draws: draws.length,
    frames: [0],
    facings: ['down'],
  }
}
