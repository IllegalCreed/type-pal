import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import { canonicalPosition } from './coordinate-evidence.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'

const leaf = (event) => event.occurrence?.command?.command

/** A fade may begin in the same Game tick as the final ride commit, before another
 * world draw. Prove completion from the actual source continuation/slot settlement;
 * the last sampled draw remains a separate observation, never an endpoint oracle.
 */
export function assertBoatRouteTerminal(raw, engine, { startOrder, endOrder }) {
  assert(['game', 'reforge'].includes(engine), 'unknown boat engine')
  const causes = raw.causes.filter(
    (event) => event.order > startOrder && event.order <= endOrder && event.scene === 's005',
  )
  const commands = causes.filter((event) => event.phase === 'command')
  const rides = commands.filter((event) =>
    engine === 'game'
      ? event.actor === 116 && event.channel === 'trigger' && event.command?.opcode === 0x3f
      : leaf(event)?.kind === 'ride' && leaf(event).target.entity === 'e116',
  )
  assert(rides.length, 'boat route has no actual ride command')
  const first = rides[0]
  assert(
    rides.every((event) => event.runId === first.runId && event.sceneVisit === first.sceneVisit),
    'boat route mixes ride invocations',
  )
  const ownPose = (event, id) => {
    const pose = event.poses?.[id]
    const latest = raw.events.findLast(
      (actor) =>
        actor.kind === 'actor' &&
        actor.id === id &&
        actor.scene === event.scene &&
        actor.sceneVisit === event.sceneVisit &&
        actor.order < event.order,
    )
    assert(
      latest && pose?.commitOrder === latest.order && same(pose.state, latest.state),
      `boat ${id} terminal pose lacks its latest same-visit actor observation`,
    )
    return pose.state.position
  }
  let continuation,
    terminal,
    target,
    settlement = null,
    legs = []
  if (engine === 'game') {
    const primary = source.segments[0].commands[1516]
    assert(
      rides.every(
        (event) => event.occurrence.ip === 1516 && same(event.occurrence.command, primary),
      ),
      'boat ride differs from its actual primary instruction',
    )
    continuation = commands.find(
      (event) => event.order > rides.at(-1).order && event.runId === first.runId,
    )
    assert(
      continuation?.sceneVisit === first.sceneVisit &&
        continuation.occurrence.ip === 1517 &&
        same(continuation.occurrence.command, source.segments[0].commands[1517]),
      'boat route lacks its actual primary continuation',
    )
    const [x, y, height] = primary.operands
    const partyTarget = [x * 32 + height * 16, y * 16 + height * 8]
    const originBoat = ownPose(first, 'e116'),
      originParty = ownPose(first, 'party')
    target = canonicalPosition(
      partyTarget.map((value, axis) => value + originBoat[axis] - originParty[axis]),
    )
    assert.deepEqual(
      ownPose(continuation, 'party'),
      partyTarget,
      'boat party missed primary terminal',
    )
    const commit = raw.events.findLast(
      (event) =>
        event.kind === 'actor' &&
        event.id === 'e116' &&
        event.sceneVisit === first.sceneVisit &&
        event.order < continuation.order &&
        event.source === 'commit:partyRideEventObject',
    )
    assert(commit && commit.order > rides.at(-1).order, 'boat final source retry did not commit')
    terminal = canonicalPosition(ownPose(continuation, 'e116'))
    assert.deepEqual(
      canonicalPosition(commit.state.position),
      terminal,
      'boat terminal differs from source commit',
    )
    settlement = commit.order
  } else {
    assert.equal(rides.length, 2, 'boat authored ride lacks its two exact source legs')
    const scene = canonicalScenes.s005
    const flow = scene.entities.find((entity) => entity.id === 'e116').behaviors.trigger[
      'legacy-001'
    ].flow
    const body = flow.stages.find((stage) => stage.id === 'initial').body
    const sourceRide = source.segments[0].commands[1516]
    assert.deepEqual(sourceRide.operands, [47, 77, 0], 'unclassified primary boat ride')
    const [boatCol, boatRow] = ownPose(first, 'e116'),
      [partyCol, partyRow] = ownPose(first, 'party'),
      partyTarget = [sourceRide.operands[0] * 32, sourceRide.operands[1] * 16],
      partyGoal = canonicalPosition(partyTarget),
      xOffset = partyTarget[0] - 16 * (partyCol - partyRow),
      yOffset = partyTarget[1] - 8 * (partyCol + partyRow),
      dx = Math.sign(xOffset) * Math.min(4, Math.abs(xOffset)),
      dy = Math.sign(yOffset) * Math.min(2, Math.abs(yOffset)),
      firstGoal = [boatCol + dx / 32 + dy / 16, boatRow + dy / 16 - dx / 32]
    target = [partyGoal[0] + boatCol - partyCol, partyGoal[1] + boatRow - partyRow]
    assert.deepEqual(
      [leaf(first).to.col, leaf(first).to.row],
      firstGoal,
      'boat first leg differs from the actual primary first stride',
    )
    assert.deepEqual(
      [leaf(rides[1]).to.col, leaf(rides[1]).to.row],
      target,
      'boat final leg differs from the primary party target and actual mounting offset',
    )
    // Boarding may cancel an ambient slot registered before this interval.
    // Keep its real origin, then select only the two actual ride occurrences.
    const slotProof = verifyMotionSlotLifetimes(raw.causes)
    for (const [leg, ride] of rides.entries()) {
      const index = [9, 11][leg]
      assert.deepEqual(
        ride.occurrence.path,
        ['initial', index],
        'boat ride uses another occurrence',
      )
      assert.deepEqual(leaf(ride), body[index], 'boat ride differs from canonical author')
      const slots = [...slotProof.slots.values()].filter(
        (receipt) =>
          receipt.registration.runId === ride.runId &&
          receipt.registration.occurrence.id === ride.occurrence.id,
      )
      assert.equal(slots.length, 1, 'boat ride lacks a unique actual motion slot')
      assert.equal(
        slots[0].registration.slot.preserveFacing,
        true,
        'boat ride changed carrier facing',
      )
      const end = slots[0].events.find((event) => event.phase === 'motion-slot-settled')
      assert(end && end.outcome !== 'droppedByAuthority', 'boat ride did not settle')
      continuation = causes.find(
        (event) =>
          event.phase === 'leaf-completed' &&
          event.runId === ride.runId &&
          event.occurrence?.id === ride.occurrence.id &&
          event.order > end.order,
      )
      assert(
        continuation && same(continuation.occurrence, ride.occurrence),
        'boat ride lacks its completed leaf',
      )
      const next = commands.find(
        (event) => event.runId === ride.runId && event.order > continuation.order,
      )
      assert(next, 'boat ride lacks its actual continuation')
      assert.deepEqual(next.occurrence.path, ['initial', index + 1])
      assert.deepEqual(leaf(next), body[index + 1])
      assert.equal(end.sceneVisit, first.sceneVisit, 'boat settlement borrowed another visit')
      assert.equal(
        continuation.sceneVisit,
        first.sceneVisit,
        'boat completion borrowed another visit',
      )
      terminal = canonicalPosition(ownPose(end, 'e116'))
      assert.deepEqual(
        terminal,
        leg ? target : firstGoal,
        leg
          ? 'boat actual terminal differs from its source/authored target'
          : 'boat first leg missed its exact source target',
      )
      assert.deepEqual(
        canonicalPosition(ownPose(continuation, 'e116')),
        terminal,
        'boat completion changed terminal',
      )
      assert.deepEqual(
        canonicalPosition(ownPose(next, 'e116')),
        terminal,
        'boat next leaf changed terminal',
      )
      if (!leg) {
        assert.equal(leaf(next).kind, 'mountParty', 'boat first step lacks rower mounting')
        const mounted = causes.find(
          (event) =>
            event.phase === 'leaf-completed' && event.occurrence?.id === next.occurrence.id,
        )
        assert(
          mounted && mounted.order < rides[1].order,
          'boat rower mounting did not complete before departure',
        )
        assert.deepEqual(
          ownPose(mounted, 'e117'),
          ownPose(next, 'e117'),
          'boat mounting teleported the rower',
        )
      } else {
        assert(
          leaf(next)?.kind === 'fade' && leaf(next).dir === 'out',
          'boat ride lacks its actual fade continuation',
        )
      }
      settlement = end.order
      legs.push({
        command: ride.order,
        settlement,
        completion: continuation.order,
        position: terminal,
      })
    }
  }
  assert.deepEqual(terminal, target, 'boat actual terminal differs from its source/authored target')
  return {
    status: 'proved',
    runId: first.runId,
    sceneVisit: first.sceneVisit,
    command: first.order,
    settlement,
    continuation: continuation.order,
    position: terminal,
    legs,
  }
}
