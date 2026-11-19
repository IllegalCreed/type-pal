import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { battleFoundationInputSources } from './battle-foundation-scenarios.mjs'
import { battleStatusSources, prepareBattleStatusInputs } from './battle-status-scenarios.mjs'

const raw = 'data/extracted/data'
const canonical = 'projects/pal/content'
const sceneRewardScripts = new Set([41012, 41022, 41027, 42828])
const fields = [
  { team: 228, scene: 's201', field: 35 },
  { team: 104, scene: 's071', field: 55 },
  { team: 55, scene: 's045', field: 27 },
  { team: 344, scene: 's218', field: 34 },
  { team: 203, scene: 's185', field: 17, rawBattleStart: 26202 },
  { team: 40, scene: 's015', field: 10 },
  { team: 137, scene: 's101', field: 20 },
  { team: 237, scene: 's229', field: 11 },
  { team: 264, scene: 's279', field: 57 },
  { team: 332, scene: 's219', field: 34 },
  { team: 340, scene: 's217', field: 34 },
  { team: 30, scene: 's092', field: 57 },
  { team: 74, scene: 's060', field: 39 },
  { team: 105, scene: 's070', field: 55 },
  { team: 154, scene: 's161', field: 33 },
  { team: 168, scene: 's166', field: 40, seed: 6 },
  { team: 207, scene: 's180', field: 47 },
  { team: 8, scene: 's006', field: 12 },
  { team: 26, scene: 's065', field: 21 },
  { team: 42, scene: 's138', field: 42 },
  { team: 68, scene: 's060', field: 39 },
  { team: 86, scene: 's059', field: 53 },
  { team: 139, scene: 's139', field: 11 },
  { team: 164, scene: 's148', field: 40 },
  { team: 179, scene: 's147', field: 40 },
  { team: 185, scene: 's147', field: 40 },
  { team: 201, scene: 's185', field: 16 },
  { team: 222, scene: 's278', field: 48 },
  { team: 224, scene: 's201', field: 35 },
  { team: 225, scene: 's201', field: 35 },
  { team: 226, scene: 's201', field: 35 },
  { team: 241, scene: 's229', field: 11 },
  { team: 259, scene: 's250', field: 50 },
  { team: 275, scene: 's289', field: 57 },
  { team: 286, scene: 's279', field: 57, attackStrength: 9000 },
  { team: 287, scene: 's231', field: 54, attackStrength: 10500 },
  { team: 288, scene: 's279', field: 57, attackStrength: 10200 },
  { team: 292, scene: 's279', field: 57 },
  { team: 293, scene: 's148', field: 40, attackStrength: 11500 },
  { team: 315, scene: 's250', field: 50, seed: 6, attackStrength: 13000 },
  { team: 348, scene: 's222', field: 34 },
  { team: 0, scene: 's006', field: 12 },
  { team: 18, scene: 's001', field: 24 },
  { team: 160, scene: 's161', field: 33 },
  { team: 195, scene: 's185', field: 16 },
  { team: 213, scene: 's180', field: 47 },
  { team: 223, scene: 's215', field: 20, attackStrength: 8200 },
  { team: 316, scene: 's228', field: 11 },
  { team: 5, scene: 's006', field: 12 },
  { team: 109, scene: 's072', field: 55 },
  { team: 253, scene: 's250', field: 50 },
  // Both original encounter commands lack a migrated scene entry. Use the trial's default field.
  { team: 189, scene: null, field: 7, rawBattleStart: 41843 },
  { team: 212, scene: null, field: 7, rawBattleStart: 41889 },
  // The alternate Elder is present in the original formation table and has no scripted entrance.
  { team: 312, scene: null, field: 7 },
]

const heroes = ['li-xiaoyao', 'zhao-linger', 'anu']

function findEncounters(value, team) {
  if (typeof value !== 'object' || value === null) return []
  return [
    ...(value.enemyTeamId === team ? [value] : []),
    ...Object.values(value).flatMap((child) => findEncounters(child, team)),
  ]
}

function sceneReward(source, onDefeated, entry) {
  const branch = source[entry]
  const chanceUnder = branch.opcode === 0x06 ? branch.operands[0] : null
  let body = onDefeated
  if (chanceUnder !== null) {
    assert.deepEqual(branch.operands.slice(1), [0, 0])
    assert.equal(onDefeated.length, 1)
    const [compiled] = onDefeated
    assert.equal(compiled.kind, 'branch')
    assert.deepEqual(compiled.cond, { kind: 'chance', percent: chanceUnder - 1 })
    body = compiled.then
  }
  const start = entry + Number(chanceUnder !== null)
  const [item, style, dialogue, end] = source.slice(start, start + 4)
  assert.deepEqual(
    [item.op, item.count, style.op, dialogue.op, end.op],
    ['giveItem', 0, 'setDialogStyleNarration', 'showDialog', 'end'],
  )
  const itemId = String(item.itemId)
  assert.equal(body.length, 2)
  assert.deepEqual(body[0], { kind: 'giveItem', itemId })
  assert.equal(body[1].kind, 'dialog')
  assert.equal(body[1].cue.rows[0].text, `dlg.${dialogue.messageIndex}`)
  return { itemId, chanceUnder }
}

const defend = (turn, actorId) => ({ turn, actorId, kind: 'defend', targetId: null })
const attack = (turn, actorId, targetId) => ({ turn, actorId, kind: 'attack', targetId })

function commandPlan(team, opponents, party) {
  const opening = party.map(({ id }) => defend(1, id))
  // Continue to the Zombie King's scheduled spell and the Ghost King's post-dialogue spell.
  if (team === 26 || team === 293)
    return [...opening, defend(2, heroes[0]), attack(3, heroes[0], opponents[0].id)]
  if (team === 42)
    return [
      ...opening,
      ...[2, 3].flatMap((turn) => party.map(({ id }) => attack(turn, id, opponents[0].id))),
    ]
  // Ghost Confusion makes the sole player attack the remaining enemy automatically.
  if (team === 68) return opening
  // In rotation two the confused third member knocks out the first member.
  if (team === 168)
    return [
      ...opening,
      attack(2, heroes[0], opponents[0].id),
      attack(2, heroes[1], opponents[1].id),
      attack(3, heroes[1], opponents[2].id),
    ]
  if (team === 222)
    return [...opening, ...[2, 3, 4].map((turn) => attack(turn, heroes[0], opponents[0].id))]
  assert(
    opponents.length && opponents.length <= party.length,
    `team-${team} requires a finish plan`,
  )
  return [...opening, ...party.map(({ id }, i) => attack(2, id, opponents[i].id))]
}

export async function battleOpponentScenarios(root, selector = 'all') {
  const chosen = new Set(selector.split(','))
  const selected = fields.filter(({ team }) => chosen.has('all') || chosen.has(`team-${team}`))
  assert(
    selected.length && (selector === 'all' || selected.length === chosen.size),
    `unknown opponent formation in ${selector}`,
  )
  const paths = [
    `${raw}/enemy-teams.json`,
    `${raw}/enemy-objects.json`,
    `${raw}/enemies.json`,
    `${raw}/enemy-pos.json`,
    `${raw}/battle-fields.json`,
    `${canonical}/enemy-teams.json`,
    `${canonical}/enemies.json`,
    `${canonical}/battle-fields.json`,
    `${canonical}/battle-sprites.json`,
    'projects/pal/assets/index.json',
    'data/extracted/events/all.json',
    ...selected.map(({ scene }) => scene && `${canonical}/scenes/${scene}.json`),
  ]
  const [
    originalTeams,
    originalObjects,
    originalEnemies,
    { layouts },
    originalFields,
    authoredTeams,
    authoredEnemies,
    authoredFields,
    battleSprites,
    assetIndex,
    events,
    ...scenes
  ] = await Promise.all(
    paths.map(async (path) => (path ? JSON.parse(await readFile(resolve(root, path))) : null)),
  )
  const prepare = await prepareBattleStatusInputs()
  const script = events.segments.find(({ name }) => name === 'all').commands
  return Promise.all(
    selected.map(async (formationSpec, index) => {
      const { team, scene, field, rawBattleStart, seed = 4, attackStrength = 6500 } = formationSpec
      const id = `team-${team}`
      const source = scenes[index]
      const encounter = findEncounters(source, id).find(
        (entry) => (entry.fieldId ?? source.battleFieldId) === field,
      )
      const rawEncounter = rawBattleStart === undefined ? null : script[rawBattleStart]
      if (source) assert(encounter, `${scene} has no ${id} encounter on battle field ${field}`)
      else if (rawBattleStart !== undefined) {
        assert.equal(rawEncounter?.opcode, 0x07)
        assert.deepEqual(rawEncounter.operands, [team, 41075, 41073])
      } else {
        assert.equal(team, 312)
        assert(!script.some((entry) => entry.opcode === 0x07 && entry.operands[0] === team))
      }
      if (source && rawBattleStart !== undefined) {
        const { opcode: setField, operands: fieldOperands } = script[rawBattleStart - 2]
        const { opcode: startBattle, operands: battleOperands } = rawEncounter
        assert.deepEqual(
          [setField, fieldOperands, startBattle, battleOperands[0]],
          [0x4a, [field, 0, 0], 0x07, team],
        )
      }
      const battleField = originalFields.find(({ id }) => id === field)
      const authoredField = authoredFields.find(({ id }) => id === field)
      assert.deepEqual(
        authoredField.magicEffect,
        battleField.magicEffect,
        `${field} element effects`,
      )
      assert.equal(authoredField.screenWave, battleField.screenWave, `${field} wave`)

      const formation = originalTeams.find(({ id }) => id === team)
      const authoredTeam = authoredTeams.find(({ id }) => id === `team-${team}`)
      assert(formation && authoredTeam, `missing original or authored ${id}`)
      const firstEnd = formation.enemyObjectIndexes.indexOf(65535)
      const extent = firstEnd === -1 ? formation.enemyObjectIndexes.length : firstEnd
      assert(formation.enemyObjectIndexes.slice(extent).every((entry) => entry === 65535))
      assert.equal(authoredTeam.slots.length, extent, `${id} formation extent`)
      const names = formation._names.values()
      const victoryScriptOwners = []
      const slots = formation.enemyObjectIndexes.map((objectIndex, slot) => {
        if (objectIndex === 0 || objectIndex === 65535) {
          assert.equal(authoredTeam.slots[slot] ?? null, null, `${id} empty slot ${slot}`)
          return null
        }
        const templateId = `enemy-${objectIndex}`
        assert.equal(authoredTeam.slots[slot], templateId, `${id} slot ${slot}`)
        const object = originalObjects.find((entry) => entry.objectIndex === objectIndex)
        const original = originalEnemies.find((entry) => entry.id === object?.enemyId)
        const authored = authoredEnemies.find((entry) => entry.id === templateId)
        assert(original && authored, `missing object ${objectIndex}`)
        assert.equal(authored.stats.health, original.health)
        assert.equal(authored.yPosOffset, original.yPosOffset)
        const victoryScript = object.scriptOnBattleEnd
        if (sceneRewardScripts.has(victoryScript)) {
          victoryScriptOwners.push({
            slot,
            templateId,
            script: victoryScript,
            ...sceneReward(script, authored.onDefeated, victoryScript),
          })
        }
        if (team === 26) {
          assert.equal(object.scriptOnTurnStart, 42476)
          const program = authored.ai.hooks.turnStart
          assert.equal(program.initial, 'initial')
          const first = program.states.initial
          const second = program.states[first.next.state]
          for (const [index, magic] of [
            [42476, 0xffff],
            [42478, 357],
          ]) {
            assert.equal(script[index].opcode, 0x67)
            assert.deepEqual(script[index].operands, [magic, 0, 0])
            assert.equal(script[index + 1].advance, true)
          }
          assert.deepEqual(first.body, [
            {
              kind: 'setFallback',
              fallback: { action: { kind: 'pass' }, chancePercent: 100 },
            },
          ])
          assert.deepEqual(second.body, [
            {
              kind: 'setFallback',
              fallback: { action: { kind: 'cast', skillId: '357' }, chancePercent: 100 },
            },
          ])
        }
        const sprite = battleSprites.find(({ id }) => id === authored.battleSprite)
        assert.equal(
          sprite?.asset,
          `battle-sprite.pal.enemy.${String(original.id).padStart(3, '0')}`,
        )
        const { x, y } = layouts[extent - 1][slot]
        return {
          id: `foe-${slot}`,
          slot,
          templateId,
          name: names.next().value,
          objectIndex,
          health: original.health,
          position: { x, y: y + original.yPosOffset },
          sprite: sprite.asset,
          spriteChunk: original.id,
          idleFrames: original.idleFrames,
        }
      })
      const opponents = slots.filter(Boolean)
      const sprites = await Promise.all(
        opponents.map(async ({ sprite, spriteChunk }) => {
          const asset = assetIndex.assets[sprite]
          const source = `data/extracted/data/battle-sprite/enemy/${spriteChunk}.rle`
          const target = `projects/pal/${asset.path}`
          const [original, authored] = await Promise.all(
            [source, target].map((path) => readFile(resolve(root, path))),
          )
          assert(original.equals(authored), `${sprite} differs from original bytes`)
          assert.equal(createHash('sha256').update(original).digest('hex'), asset.sha256, sprite)
          return { sprite, source, target, sha256: asset.sha256 }
        }),
      )
      // Ling'er would make the leaf monster end team 40 before command selection.
      const activeHeroes = team === 40 ? [heroes[0], heroes[2]] : heroes
      const partySize = team === 42 ? 3 : opponents.length
      // The old tree grants a level. Use the original primary-growth HP cap.
      const hp = team === 222 ? 999 : 2000
      const party = activeHeroes.slice(0, partySize).map((id, index) => ({
        id,
        level: 36,
        hp,
        maxHP: hp,
        defense: 250,
        attack: attackStrength,
        speed: [900, 600, 300][index],
        skills: [],
        weapon: null,
      }))
      const commands = commandPlan(team, opponents, party)
      const configured = prepare({ id, seed, team, party, commands })
      const boss = source ? Boolean(encounter.boss) : rawEncounter?.operands[2] === 0
      if (!source) assert.equal(configured.game.fixture.battleFieldId, field)
      configured.game.fixture.battleFieldId = field
      configured.game.fixture.isBoss = boss
      configured.reforge.config.fieldId = field
      configured.reforge.config.boss = boss
      return {
        id,
        team,
        scene,
        field: battleField,
        rawBattleStart,
        slots,
        sprites,
        victoryScriptOwners,
        seed,
        configured,
        commands,
      }
    }),
  )
}

export async function battleOpponentSources(root, scenarios) {
  const spriteSources = scenarios.flatMap(({ sprites }) =>
    sprites.flatMap(({ source, target }) => [source, target]),
  )
  return [
    ...new Set([
      ...(await battleFoundationInputSources(root)),
      ...battleStatusSources,
      ...spriteSources,
    ]),
  ]
}
