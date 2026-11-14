import assert from 'node:assert/strict'
import { parseArgs } from 'node:util'

export const beeCases = [
  { seed: 138, rolls: [36, 12], grants: [0, 0] },
  { seed: 4, rolls: [8, 98], grants: [1, 0] },
  { seed: 99, rolls: [2, 11], grants: [1, 1] },
]
export const beePartyMember = {
  id: 'anu',
  role: 4,
  weapon: 187,
  level: 28,
  hp: 470,
  mp: 400,
  maxHP: 480,
  maxMP: 410,
}
export const beeWorldInput = {
  scene: 's006',
  map: 4,
  battleField: 12,
  enemy: 'e154',
  objectSlots: [403, 403],
  team: 4,
  start: [93, 45],
  hold: [['ArrowRight', 4]],
  stop: [97, 45],
  retreat: [['ArrowLeft', 1]],
  exit: [96, 45],
  party: [beePartyMember],
  battleInput: [
    { turn: 1, kind: 'attack', actorId: beePartyMember.id, targetId: null, targetSide: 'enemy' },
  ],
}
export const honeycombItem = '115'
export const honeycombText = '获得一个蜂巢'

export function beeWorldArguments(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: { seed: { type: 'string' }, capture: { type: 'boolean' } },
  })
  const cases =
    values.seed === undefined
      ? beeCases
      : beeCases.filter(({ seed }) => String(seed) === values.seed)
  assert(cases.length > 0, 'choose seed 4, 99 or 138')
  assert(!values.capture || cases.length === 1, 'capture requires one explicit seed')
  return { cases, capture: values.capture === true }
}
