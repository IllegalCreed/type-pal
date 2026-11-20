import assert from 'node:assert/strict'
import { sourceDialogueGroups } from '../rendered-dialogue-comparison.mjs'

const deltas = {
  ArrowUp: [0, -1],
  ArrowRight: [1, 0],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
}

function walkFrom(start, runs) {
  const steps = []
  let from = start
  for (const [key, count] of runs) {
    const [dc, dr] = deltas[key]
    for (let i = 0; i < count; i++) {
      const to = [from[0] + dc, from[1] + dr, from[2]]
      steps.push({ key, from, to })
      from = to
    }
  }
  return steps
}

export function readGoldenToadSources(data, commands, spec) {
  const { revisit } = spec
  const cave = data.gameScene
  const bridge = data.diskRevisitScene
  const caveActor = (id) => cave.eventObjects.find((actor) => actor.id === id)
  const owner = caveActor(Number(spec.owner.slice(1)))
  const into = walkFrom(revisit.checkpoint, revisit.into.runs)
  const out = walkFrom(revisit.departure, revisit.out.runs)
  const approach = walkFrom(revisit.checkpoint, revisit.cave)
  assert.deepEqual(approach.at(-1).to, spec.start)
  const [dc, dr] = deltas[spec.approach]
  assert.deepEqual(spec.contact, [spec.start[0] + dc, spec.start[1] + dr, spec.start[2]])

  for (const [scene, door, steps, arrival, target] of [
    [cave, revisit.into, into, revisit.arrival, revisit.scene],
    [bridge, revisit.out, out, revisit.checkpoint, spec.scene],
  ]) {
    const trigger = scene.eventObjects.find(({ id }) => `e${id}` === door.owner)
    assert.equal(trigger.triggerLabel, `L_${door.ip}`)
    const [x, y, half] = commands[door.ip + 1].operands
    assert.deepEqual(arrival, [x + y + half, y - x, 0])
    assert.equal(commands[door.ip].sceneId, Number(target.slice(1)) + 1)
    const inside = ([col, row]) =>
      Math.abs(16 * (col - row) - trigger.x) + 2 * Math.abs(8 * (col + row) - trigger.y) <
      (trigger.triggerMode - 4) * 32 + 16
    assert(!inside(steps.at(-1).from) && inside(steps.at(-1).to))
  }
  assert.deepEqual(commands[21473].operands, [102, revisit.hookIp, 0])
  const firstVisit = data.rfScene.entities
    .find(({ id }) => id === spec.owner)
    .behaviors.trigger.default.flow.stages.flatMap(({ body }) => body)
  assert(
    firstVisit.some(
      (command) =>
        command.kind === 'selectSceneHooks' &&
        command.scene === revisit.scene &&
        command.selection.onEnter.value === revisit.hook,
    ),
  )
  const finishedEarlier = bridge.eventObjects.find(({ triggerLabel }) => triggerLabel === 'L_21296')
  assert.deepEqual(
    [finishedEarlier.id, commands[21303].opcode, commands[21303].operands],
    [1846, 0x49, [0xffff, 0, 0]],
  )
  const earlier = data.revisitScene.entities
    .find(({ id }) => id === 'e1846')
    .behaviors.trigger.default.flow.stages.flatMap(({ body }) => body)
  assert(
    earlier.some(
      ({ kind, state, target }) =>
        kind === 'setEntityState' && state === 0 && target.entity === 'e1846',
    ),
  )
  const prep = data.revisitScene.hooks.onEnter.variants[revisit.hook].flow.stages[0].body
  const selected = prep.find(
    ({ kind, target }) =>
      kind === 'selectEntityBehavior' &&
      target.scene === spec.scene &&
      target.entity === spec.owner,
  )
  assert.deepEqual(
    [commands[21486].opcode, commands[21486].operands],
    [0x7d, [owner.id + 1, 32, 0]],
  )
  assert.deepEqual(
    [commands[21487].opcode, commands[21487].operands],
    [0x25, [owner.id + 1, spec.disk.entry, 0]],
  )
  assert.equal(selected.channel, 'trigger')
  assert.equal(selected.selection.kind, 'use')

  const boulder = caveActor(commands[21485].operands[0] - 1)
  return {
    steps: { into, out, approach },
    behavior: selected.selection.value,
    relocated: [owner.x + commands[21486].operands[1], owner.y + commands[21486].operands[2]],
    boulder: { asset: boulder.spriteNum, position: [boulder.x, boulder.y] },
    pages: sourceDialogueGroups(commands, [
      { scene: revisit.scene, first: 21495, last: 21510 },
      { scene: spec.scene, first: spec.disk.entry, last: spec.disk.battle - 1 },
    ]),
  }
}
