import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import source from '../../data/extracted/events/all.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { canonicalPosition } from './coordinate-evidence.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { gameNpcRequestedFrame, originalSpriteNumber } from './game-pose-semantics.mjs'

const directions = ['down', 'left', 'up', 'right']
const facingSuffix = (events) =>
  events.map((e) => e.state.facing).filter((value, i, all) => i === 0 || value !== all[i - 1])
const leaf = (event) => event.occurrence?.command?.command

/** User-approved initial idle choice (2026-10-10), not an invisible-pose claim.
 * Each engine must draw its own canonical seed until its real first facing writer.
 * Only that prefix differs; all later facing changes still have to agree.
 * Other state, route, action, source-call and resource contracts remain independent.
 */
export function approvedAutomaticInitialFacing({
  fragment,
  id,
  game,
  reforge,
  gameTransitions,
  reforgeTransitions,
  gameRenders,
  reforgeRenders,
  storyTiming,
}) {
  // A concrete adjudicated presentation interval, never a blanket NPC exemption.
  if (fragment !== '005' || id !== 'e84' || storyTiming?.status !== 'passed') return null
  try {
    const scene = 's004',
      definition = canonicalScenes[scene].entities.find((entity) => entity.id === id),
      meta = objects.eventObjects.find((entity) => `e${entity.id}` === id),
      sprite = sprites.find((entry) => entry.id === definition.sprite),
      g = gameTransitions[0],
      r = reforgeTransitions[0]
    assert(g && r && meta && sprite)
    assert.equal(sprite.layout.kind, 'directional')
    assert.equal(meta.nSpriteFrames, sprite.layout.framesPerDir)
    assert.equal(originalSpriteNumber(definition.sprite), meta.spriteNum)
    assert.equal(g.source, 'commit:scene-ready')
    assert.equal(r.source, 'commit:scene-ready')
    assert.equal(g.before, null)
    assert.equal(r.before, null)
    const seeds = [
      { position: canonicalPosition([meta.x, meta.y]), facing: directions[meta.direction] },
      {
        position: [definition.pos.col, definition.pos.row],
        facing: definition.facing ?? 'down',
      },
    ]
    assert(!same(seeds[0].facing, seeds[1].facing))
    assert(same(seeds[0].position, seeds[1].position))
    assert.equal(meta.currentFrameNum, 0)
    const flow = definition.behaviors.auto.default.flow,
      body = flow.stages.find((stage) => stage.id === flow.initial).body[0].body
    assert.equal(flow.stages.find((stage) => stage.id === flow.initial).body[0].kind, 'loop')
    assert.equal(body[0].kind, 'wait')
    assert(body[0].ms > 0)
    assert.equal(body[1].kind, 'setEntityFacing')
    assert(same(body[1].target, { scene, entity: id }))
    const entry = source.segments[0].commands.findIndex(
        (command) => command.label === meta.autoLabel,
      ),
      primary = source.segments[0].commands[entry + 1]
    assert.equal(source.segments[0].commands[entry].opcode, 9)
    assert.equal(primary.opcode, 15)
    assert.equal(directions[primary.operands[0]], body[1].facing)
    assert.equal(primary.operands[1], 0)
    const receipts = []
    for (const [index, trace] of [game, reforge].entries()) {
      const states = [gameTransitions, reforgeTransitions][index],
        renders = [gameRenders, reforgeRenders][index],
        initial = states[0],
        seed = seeds[index],
        setterIndex = states.findIndex((event) => event.state.facing !== seed.facing),
        setter = states[setterIndex]
      assert(setterIndex > 0)
      assert.equal(setter.sceneVisit, initial.sceneVisit)
      assert.equal(setter.state.facing, body[1].facing)
      assert(Number.isSafeInteger(initial.sceneVisit))
      for (const event of states.slice(0, setterIndex)) {
        assert.equal(event.scene, scene)
        assert.equal(event.sceneVisit, initial.sceneVisit)
        assert(same(canonicalPosition(event.state.position), seed.position))
        assert.equal(event.state.facing, seed.facing)
        assert.equal(event.state.frame, 0)
        assert.equal(event.state.sprite, meta.spriteNum)
        assert.equal(event.state.visible, true)
        assert.equal(event.state.state, meta.sState)
        if (index === 1) {
          const debug = event.state.frameDebug
          assert(debug && debug.authority === 'world')
          for (const key of ['override', 'gait', 'action', 'explicit'])
            assert.equal(debug[key], null)
        }
      }
      const command = trace.causes.find((event) =>
        index === 0
          ? event.phase === 'command' && event.actor === meta.id && event.ip === entry + 1
          : event.phase === 'command' && same(leaf(event), body[1]),
      )
      assert(command && command.scene === scene && command.sceneVisit === initial.sceneVisit)
      assert(command.order > initial.order && command.order < setter.order)
      if (index === 0) assert(same(command.command, primary))
      else {
        assert(same(command.occurrence.self, { scene, entity: id }))
        assert.equal(command.occurrence.timing, 'auto')
        const wait = trace.causes.find(
          (event) =>
            event.phase === 'wait-start' &&
            event.runId === command.runId &&
            event.sceneVisit === initial.sceneVisit &&
            same(leaf(event), body[0]) &&
            event.order < command.order,
        )
        assert(wait)
        assert(
          trace.causes.some(
            (event) =>
              event.phase === 'wait-end' &&
              event.runId === wait.runId &&
              event.sceneVisit === wait.sceneVisit &&
              event.occurrence.id === wait.occurrence.id &&
              event.order > wait.order &&
              event.order < command.order,
          ),
        )
      }
      const prefix = renders.filter((draw) => draw.order < setter.order),
        clocks = trace.worldRenders.filter(
          (draw) =>
            draw.scene === scene &&
            draw.sceneVisit === initial.sceneVisit &&
            draw.order > initial.order &&
            draw.order < setter.order,
        ),
        frame = gameNpcRequestedFrame(meta.nSpriteFrames, 0, seed.facing)
      assert(prefix.length > 0 && prefix.length === clocks.length)
      for (const [drawIndex, draw] of prefix.entries()) {
        assert.equal(draw.sceneVisit, initial.sceneVisit)
        assert.equal(draw.renderId, clocks[drawIndex].renderId)
        assert(same(draw.position, seed.position))
        assert.equal(draw.facing, seed.facing)
        assert.equal(draw.visible, true)
        if (draw.drawStatus === 'drawn') assert.equal(draw.frame, frame)
        else assert.equal(draw.drawStatus, 'not-drawn')
      }
      receipts.push({
        seed: { order: initial.order, sceneVisit: initial.sceneVisit, facing: seed.facing, frame },
        writer: { command: command.order, observation: setter.order, run: command.runId },
        prefixDraws: prefix.length,
        suffix: facingSuffix(states.slice(setterIndex)),
      })
    }
    assert(same(receipts[0].suffix, receipts[1].suffix))
    return {
      type: 'approved-automatic-initial-facing',
      id,
      game: receipts[0],
      reforge: receipts[1],
    }
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error
    return null
  }
}
