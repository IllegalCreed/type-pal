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
export const beePostWin = {
  seed: 6,
  rolls: [3, 6],
  grants: [1, 1],
  threshold: 10165,
  before: { ...beePartyMember, level: 29, exp: 10162, hp: 480, maxHP: 490, mp: 408, maxMP: 418 },
  priorGrowth: { attack: 4, magicAttack: 4, defense: 2, speed: 2, luck: 2 },
  growthRolls: [0, 5, 1, 0, 1, 0],
  after: { level: 30, exp: 1, hp: 500, maxHP: 500, mp: 431, maxMP: 431 },
  skill: { id: '354', label: '万蚁蚀象', mp: 37 },
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
  returnInput: ['Escape', 'Escape'],
  party: [beePartyMember],
  battleInput: [
    { turn: 1, kind: 'attack', actorId: beePartyMember.id, targetId: null, targetSide: 'enemy' },
  ],
}
export const honeycombItem = '115'
export const honeycombText = '获得一个蜂巢'

export const beeEscapeParty = [
  { id: 'li-xiaoyao', role: 0, weapon: 166, level: 1, hp: 145, mp: 95, maxHP: 150, maxMP: 100 },
  { id: 'zhao-linger', role: 1, weapon: 170, level: 5, hp: 225, mp: 230, maxHP: 240, maxMP: 240 },
]
export const beeEscapeCases = [
  { escape: 'success', seed: 4, attempts: 1 },
  { escape: 'failure', seed: 3, attempts: 2 },
]
export const beeEscapeExits = [
  { exitKey: 'ArrowRight', exitSteps: 1, exitGrid: [98, 45] },
  { exitKey: 'ArrowLeft', exitSteps: 1, exitGrid: [96, 45] },
  { exitKey: 'ArrowUp', exitSteps: 1, exitGrid: [97, 44] },
  { exitKey: 'ArrowDown', exitSteps: 1, exitGrid: [97, 46] },
  { exitKey: 'ArrowLeft', exitSteps: 4, exitGrid: [93, 45] },
]

export function beeWorldArguments(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      seed: { type: 'string' },
      capture: { type: 'boolean' },
      escape: { type: 'string' },
      'escape-exits': { type: 'boolean' },
      'post-battle-save': { type: 'boolean' },
      'post-win-save': { type: 'boolean' },
      probe: { type: 'boolean' },
    },
  })
  const escaped = values.escape !== undefined
  const escapeExits = values['escape-exits'] === true
  const postWin = values['post-win-save'] === true
  const postBattleSave = values['post-battle-save'] === true || postWin
  assert(!postBattleSave || !escaped, 'post-battle save uses the victory route')
  assert(
    !values.probe || (escaped && !values.capture),
    'probe requires an escape case and no capture',
  )
  assert(
    !postBattleSave || values.seed === String(postWin ? beePostWin.seed : 99),
    'use the registered explicit seed for the save scenario',
  )
  assert(
    !escapeExits || (values.escape === 'success' && !values.probe && !values.capture),
    'directional checks require the success case without capture or probe',
  )
  let cases = escaped
    ? beeEscapeCases.filter((entry) => entry.escape === values.escape)
    : postWin
      ? [beePostWin].map(({ seed, rolls, grants }) => ({ seed, rolls, grants }))
      : beeCases
  if (values.seed !== undefined) cases = cases.filter(({ seed }) => String(seed) === values.seed)
  assert(cases.length > 0, 'choose a registered battle outcome and seed')
  assert(!values.capture || cases.length === 1, 'capture requires one explicit case')
  if (escapeExits) cases = beeEscapeExits.map((exit) => ({ ...cases[0], ...exit }))
  return {
    cases,
    capture: values.capture === true,
    escape: values.escape,
    escapeExits,
    postBattleSave,
    postWin,
    probe: values.probe === true,
  }
}
