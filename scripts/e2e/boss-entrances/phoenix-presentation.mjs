import assert from 'node:assert/strict'
import { sourceDialogueGroups } from '../rendered-dialogue-comparison.mjs'

const diskPoint = ([x, y, h]) => [x + y + h, y - x, 0]

export function readPhoenixSources(data, commands, spec) {
  const { scene, world } = spec
  const actors = data.gameScene.eventObjects
  const caller = actors.find(({ id }) => `e${id}` === spec.owner)
  const branch = actors.find(({ id }) => id === 3092)
  assert.equal(branch.triggerLabel, 'L_25527')
  const upperWalk = commands[25532]
  assert.equal(upperWalk.opcode, 0x7a)
  assert.deepEqual(diskPoint(upperWalk.operands), spec.start)
  const authoredWalk = data.rfScene.entities
    .find(({ id }) => id === 'e3092')
    .behaviors.trigger.default.flow.stages[0].body.findLast(({ kind }) => kind === 'moveParty')
  assert.deepEqual([authoredWalk.to.col, authoredWalk.to.row, authoredWalk.to.height], spec.start)
  assert.equal(commands[25965].sceneId, 193)
  assert.equal(commands[25615].sceneId, 186)
  const distance = ([col, row]) =>
    Math.abs(16 * (col - row) - caller.x) + 2 * Math.abs(8 * (col + row) - caller.y)
  const range = (caller.triggerMode - 4) * 32 + 16
  assert(distance(spec.start) >= range && distance(spec.contact) < range)
  assert.deepEqual(spec.contact, [spec.start[0] - 1, spec.start[1], spec.start[2]])
  assert.deepEqual([commands[26194].opcode, commands[26194].operands[0]], [0x47, 71])
  assert.deepEqual(
    [commands[26206].op, Number(commands[26206].itemId), commands[26206].count],
    ['giveItem', Number(world.inventory[0].itemId), 0],
  )
  assert.deepEqual(commands[26368].operands, [0, 521, 65535])
  assert(
    data.skills.levelUp['li-xiaoyao'].some(
      ({ skillId, level }) => skillId === spec.recovery.skill && level <= 35,
    ),
  )
  return {
    audition: 71,
    entrySprite: 521,
    pages: sourceDialogueGroups(commands, [{ scene, first: 26204, last: 26309 }]),
  }
}
