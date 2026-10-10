import assert from 'node:assert/strict'
import objects from '../../data/extracted/data/event-objects.json' with { type: 'json' }
import original from '../../data/extracted/events/all.json' with { type: 'json' }
import sprites from '../../projects/pal/content/sprites.json' with { type: 'json' }
import { canonicalPosition } from './coordinate-evidence.mjs'
import { canonicalScenes } from './entity-action-contract.mjs'
import { originalSpriteNumber } from './game-pose-semantics.mjs'

const commands = original.segments[0].commands
const directions = ['down', 'left', 'up', 'right']
const leaf = (event) => event.occurrence?.command?.command

/** A finite, self-only static frame loop. No movement, branching, entry/exit,
 * cross-target effects or unknown instructions can obtain this certificate.
 * The first eligible/reset tick supplies the 100ms initial idle interval.
 */
function sourcePageSteps(meta) {
  const entry = commands.findIndex((command) => command.label === meta.autoLabel)
  assert(entry >= 0 && meta.nSpriteFrames === 0 && meta.direction === 0)
  const steps = [{ frame: meta.currentFrameNum, durationMs: 100 }],
    domain = new Set()
  for (let ip = entry; ip < entry + 256; ip++) {
    const command = commands[ip]
    assert(command, 'page cycle source instruction missing')
    domain.add(ip)
    if (command.op === 'end') {
      assert(command.reset && command.resetTo === entry && !command.idleFrames)
      assert(steps.length > 1, 'page cycle lacks changing frames')
      assert.equal(steps.at(-1).frame, steps[0].frame, 'page cycle does not close its seed')
      return { entry, domain, steps }
    }
    assert.equal(command.op, 'raw', 'page cycle source control unsupported')
    const [a, b, c] = command.operands
    assert.equal(b, 0)
    assert.equal(c, 0)
    if (command.opcode === 9) steps.at(-1).durationMs += Math.max(1, a) * 100
    else {
      assert.equal(command.opcode, 20, 'page cycle is not a self frame/wait loop')
      assert(Number.isSafeInteger(a) && a >= 0)
      steps.push({ frame: a, durationMs: 100 })
    }
  }
  assert.fail('page cycle exceeds finite source budget')
}

function verifyPageCycle(game, reforge, scene, id, proof, { renders, states }) {
  const entity = canonicalScenes[scene].entities.find((entry) => entry.id === id),
    meta = objects.eventObjects.find((entry) => `e${entry.id}` === id),
    sprite = entity && sprites.find((entry) => entry.id === entity.sprite),
    page = entity?.pages?.[0],
    binding = page?.animation,
    action = binding && sprite?.poses?.[binding.action]
  assert(entity && meta && sprite && page && binding && action, 'page cycle definition unsupported')
  const source = sourcePageSteps(meta)
  assert.equal(entity.pages.length, 1, 'page cycle has unproved page transitions')
  assert.equal(page.id, entity.initialPage)
  assert(!entity.behaviors?.auto, 'page cycle also has a behavior writer')
  assert.equal(sprite.layout.kind, 'static')
  assert.equal(originalSpriteNumber(entity.sprite), meta.spriteNum)
  assert.equal(binding.sprite, entity.sprite)
  assert.equal(binding.loop, true)
  assert.equal(binding.startAtMs ?? 0, 0)
  assert.equal(action.loopFrom, 0)
  assert.deepEqual(action.steps, source.steps, 'page cycle source/action steps differ')
  const gameDraws = renders(game, id, scene),
    reforgeDraws = renders(reforge, id, scene)
  for (const [index, trace] of [game, reforge].entries()) {
    const draws = [gameDraws, reforgeDraws][index],
      coverage = [proof.gamePresentation, proof.presentation.actors][index].find(
        (actor) => actor.id === id,
      ),
      visits = [...new Set(draws.map((draw) => draw.sceneVisit))],
      visit = visits[0],
      observations = states(trace, id, scene).filter((event) => event.sceneVisit === visit),
      ready = trace.events.find(
        (event) =>
          event.kind === 'scene-lifecycle' &&
          event.phase === 'ready' &&
          event.scene === scene &&
          event.sceneVisit === visit &&
          event.order < draws[0].order,
      ),
      seed = ready && observations.findLast((event) => event.order < ready.order),
      expected = {
        position: canonicalPosition([meta.x, meta.y]),
        facing: directions[meta.direction],
        visible: true,
        state: meta.sState,
        sprite: meta.spriteNum,
      }
    assert(draws.length && visits.length === 1, 'page cycle needs a complete single visit')
    assert.equal(coverage?.draws, draws.length, 'page cycle draw coverage incomplete')
    assert(ready && seed, 'page cycle initial state lacks real ready commit and latest observation')
    assert.equal(seed.state.frame, meta.currentFrameNum)
    if (index === 0) {
      assert.equal(seed.source, 'commit:scene-materialized')
      assert.equal(seed.state.auto, meta.autoLabel)
      assert.equal(seed.state.autoIp, source.entry)
    }
    assert.deepEqual([entity.pos.col, entity.pos.row], expected.position)
    assert.equal(entity.facing ?? 'down', expected.facing)
    for (const event of observations) {
      assert.deepEqual(
        {
          position: canonicalPosition(event.state.position),
          facing: event.state.facing,
          visible: event.state.visible,
          state: event.state.state,
          sprite: event.state.sprite,
        },
        expected,
        'page cycle changed non-frame state',
      )
      if (index === 1) {
        const debug = event.state.frameDebug
        assert(debug && debug.authority === 'world', 'page cycle has an authority writer')
        for (const field of ['override', 'gait', 'explicit']) assert.equal(debug[field], null)
      }
    }
    const world = trace.worldRenders.filter(
      (event) => event.scene === scene && event.sceneVisit === visit && event.order > ready.order,
    )
    assert.equal(world.length, draws.length, 'page cycle omitted world draws')
    for (const event of trace.causes.filter(
      (event) => event.scene === scene && event.sceneVisit === visit && event.order > ready.order,
    )) {
      if (event.phase === 'authority-changed') assert.notEqual(event.actor, id)
      if (event.phase !== 'command') continue
      if (index === 0) {
        assert.deepEqual(event.command, commands[event.ip])
        const command = event.command
        if (command.op === 'raw' && ![5, 9, 21, 67, 69, 70].includes(command.opcode)) {
          assert(source.domain.has(event.ip) && event.actor === meta.id)
          assert.equal(event.channel, 'auto', 'page cycle has a foreground source writer')
        } else if (command.op !== 'raw')
          assert(
            ['end', 'showDialog', 'setDialogStyleBottom', 'setDialogStyleTop'].includes(command.op),
            'page cycle source incoming command unsupported',
          )
      } else {
        const command = leaf(event),
          addressed = [command?.target, ...(command?.riders ?? []).map((rider) => rider.target)]
        assert(
          !addressed.some((target) => target?.scene === scene && target.entity === id) &&
            event.occurrence?.self?.entity !== id,
          'page cycle has an authored script writer',
        )
      }
    }
    if (index === 0) continue
    const installation = trace.causes.findLast(
        (event) =>
          event.phase === 'action-installed' &&
          event.scene === scene &&
          event.sceneVisit === visit &&
          event.order < draws[0].order &&
          event.installed.some((entry) => entry.entity === id),
      ),
      trackId = installation?.installed.find((entry) => entry.entity === id).base?.trackId,
      selection = proof.actions.selections.get(`${visit}/${scene}/${id}`),
      gates = trace.causes.filter(
        (event) => event.phase === 'action-gate' && event.trackId === trackId,
      ),
      advances = proof.actions.outputs.filter((event) => event.trackId === trackId && event.state)
    assert(installation && trackId && selection, 'page cycle lacks actual install/selection')
    assert.equal(selection.trackId, trackId)
    assert.equal(selection.slot, 'base')
    assert(selection.order < draws[0].order)
    assert.deepEqual(proof.actions.tracks.get(trackId).state.binding, binding)
    assert(gates.length && advances.length === gates.length, 'page cycle advance coverage missing')
    for (const gate of gates) {
      assert.equal(gate.sceneVisit, visit)
      assert.equal(gate.scene, scene)
      assert.equal(gate.entity, id)
      assert.equal(gate.paused, false, 'unrelated page cycle was frozen')
      assert.equal(gate.inputs.held, false)
      assert.equal(gate.inputs.ownerHeld, false)
    }
    for (const [index, draw] of draws.entries()) {
      assert.equal(draw.renderId, world[index].renderId)
      const input = proof.actions.frames.find((frame) => frame.order === world[index].order)
      assert(input && input.scene === scene && input.sceneVisit === visit)
      const expectedFrame = input.frames[id],
        observation = observations.findLast((event) => event.order < draw.order)
      assert.equal(observation?.state.frameDebug.action, expectedFrame)
      assert.equal(observation?.state.frame, expectedFrame)
      if (draw.drawStatus === 'drawn') assert.equal(draw.frame, expectedFrame)
    }
    return {
      scene,
      entity: id,
      sourceEntry: source.entry,
      steps: source.steps,
      gameDraws: gameDraws.length,
      reforgeDraws: reforgeDraws.length,
      sceneVisit: visit,
      installation: installation.order,
      selection: selection.order,
      trackId,
      advances: advances.length,
    }
  }
}

/** Each engine's full pose/action oracle is a prerequisite, never a frame-domain waiver. */
export function pageCycleProgressCertificates(game, reforge, participants, proof, access) {
  const proved = [],
    declined = []
  for (const { scene, entity } of participants) {
    const definition = canonicalScenes[scene]?.entities.find((entry) => entry.id === entity)
    if (!definition?.pages?.some((page) => page.animation)) continue
    try {
      proved.push(verifyPageCycle(game, reforge, scene, entity, proof, access))
    } catch (error) {
      if (error?.code !== 'ERR_ASSERTION') throw error
      declined.push({ scene, entity, reason: error.message })
    }
  }
  return { proved, declined }
}
