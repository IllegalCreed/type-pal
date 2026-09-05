// Run at repo root: node --import tsx docs/ops/audits/pre-e2e/probe-battle-core.mjs
// Actual core and current PAL definitions; all battle mutations stay in memory.
// Assertions characterize the unfixed baseline, not desired production behavior.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateSkills } from '../../../../packages/content/src/validate.ts'
import {
  createBattleState,
  stepBattle,
} from '../../../../packages/reforge/src/battle/battle-core.ts'

assert.equal(typeof globalThis.indexedDB, 'undefined')
const oldFetch = globalThis.fetch
globalThis.fetch = () => {
  throw new Error('Game audit forbids network access')
}
try {
  const read = (name) =>
    JSON.parse(
      readFileSync(
        new URL(`../../../../projects/pal/content/${name}.json`, import.meta.url),
        'utf8',
      ),
    )
  const enemies = read('enemies'),
    items = read('items'),
    skillFile = read('skills'),
    poisons = read('poisons')
  const itemsById = Object.fromEntries(items.map((x) => [x.id, x]))
  const skillsById = Object.fromEntries(skillFile.skills.map((x) => [x.id, x]))
  const poisonDefs = Object.fromEntries(poisons.map((x) => [x.id, x]))
  const player = (id, patch = {}) => ({
    roleId: id,
    actorTemplateId: id,
    hp: 999,
    maxHp: 999,
    mp: 999,
    maxMp: 999,
    attackStrength: 40,
    defense: 999,
    magicStrength: 20,
    baseDexterity: 1,
    skills: [],
    fleeRate: 20,
    ...patch,
  })
  const rng0 = () => 0
  const prepare = (state, action) => {
    stepBattle(state, rng0)
    state.pendingActions.set(0, action)
    stepBattle(state, rng0)
  }
  const enemyHit = (enemyId) => {
    const state = createBattleState({
      players: [player('hero')],
      enemySlots: [enemies.find((e) => e.id === enemyId)],
      items: structuredClone(itemsById),
      skills: skillsById,
      poisonDefs,
    })
    prepare(state, { kind: 'defend' })
    assert.equal(state.actionQueue[0].isEnemy, true)
    stepBattle(state, rng0)
    assert.equal(state.lastAction?.side, 'enemy')
    assert.equal(state.lastAction?.kind, 'attack')
    assert.equal(state.lastAction.blocked, false)
    return state
  }
  const sleepy = enemyHit('enemy-401')
  assert.equal(sleepy.players[0].status.sleep, 0)
  const poisonControl = enemyHit('enemy-403')
  assert.equal(poisonControl.players[0].poisons[0].poisonId, 551)
  console.log(
    'C-equiv',
    JSON.stringify({
      enemy: 'enemy-401',
      effects: itemsById['127'].use.effects,
      sleepAfter: sleepy.players[0].status.sleep,
      poisonControl: poisonControl.players[0].poisons,
    }),
  )

  const runRevive = (target) => {
    const spell = { ...structuredClone(skillsById['301']), id: 'probe-revive', target }
    validateSkills({ skills: [spell], levelUp: {} })
    const state = createBattleState({
      players: [
        player('caster', { baseDexterity: 500, skills: [spell.id] }),
        player('fallen', { hp: 0 }),
      ],
      enemySlots: [enemies.find((e) => e.id === 'enemy-401')],
      skills: { [spell.id]: spell },
    })
    prepare(state, { kind: 'cast', skillId: spell.id, targetAllyIdx: 1 })
    assert.equal(state.actionQueue[0].isEnemy, false)
    assert.equal(state.actionQueue[0].idx, 0)
    stepBattle(state, rng0)
    return state
  }
  const all = runRevive('allAllies'),
    single = runRevive('oneAlly')
  assert.equal(all.players[1].hp, 0)
  assert.equal(single.players[1].hp, 99)
  assert.equal(all.players[0].mp, 983)
  console.log(
    'C-revive',
    JSON.stringify({
      allAllyDeadHp: all.players[1].hp,
      singleAllyDeadHp: single.players[1].hp,
      mpAfter: all.players[0].mp,
    }),
  )

  const poisonBattle = createBattleState({
    players: [player('caster', { baseDexterity: 500, skills: ['376'] })],
    enemySlots: [enemies.find((e) => e.id === 'enemy-403')],
    items: structuredClone(itemsById),
    skills: skillsById,
    poisonDefs,
  })
  prepare(poisonBattle, { kind: 'cast', skillId: '376', targetEnemyIdx: 0 })
  let remaining = 20
  while (poisonBattle.phase === 'performAction' && remaining-- > 0) stepBattle(poisonBattle, rng0)
  assert(remaining > 0)
  assert.equal(poisonBattle.enemies[0].hp, 0)
  assert.equal(poisonBattle.phase, 'selectAction')
  assert.equal(poisonBattle.expGained, 0)
  for (let i = 0; i < 3; i++) stepBattle(poisonBattle, rng0)
  assert.equal(poisonBattle.phase, 'selectAction')
  console.log(
    'C-poison-terminal',
    JSON.stringify({
      enemyHp: poisonBattle.enemies[0].hp,
      phase: poisonBattle.phase,
      expGained: poisonBattle.expGained,
      turn: poisonBattle.turn,
      log: poisonBattle.log,
    }),
  )
  poisonBattle.pendingActions.set(0, { kind: 'defend' })
  stepBattle(poisonBattle, rng0)
  stepBattle(poisonBattle, rng0)
  assert.equal(poisonBattle.phase, 'won')
  console.log(
    'C-poison-terminal-control',
    JSON.stringify({
      afterExtraPlayerInput: poisonBattle.phase,
      expGained: poisonBattle.expGained,
    }),
  )
} finally {
  globalThis.fetch = oldFetch
}
