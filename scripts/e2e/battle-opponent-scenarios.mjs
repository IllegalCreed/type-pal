import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { battleFoundationInputSources } from './battle-foundation-scenarios.mjs'
import { battleStatusSources, prepareBattleStatusInputs } from './battle-status-scenarios.mjs'

const raw = 'data/extracted/data'
const canonical = 'projects/pal/content'
const fields = [
  { team: 228, scene: 's201', field: 35 },
  { team: 104, scene: 's071', field: 55 },
  { team: 55, scene: 's045', field: 27 },
  { team: 344, scene: 's218', field: 34 },
  { team: 203, scene: 's185', field: 17, rawBattleStart: 26202 },
]

const heroes = ['li-xiaoyao', 'zhao-linger', 'anu']
const seed = 4

function findEncounters(value, team) {
  if (typeof value !== 'object' || value === null) return []
  return [
    ...(value.enemyTeamId === team ? [value] : []),
    ...Object.values(value).flatMap((child) => findEncounters(child, team)),
  ]
}

const defend = (turn, actorId) => ({ turn, actorId, kind: 'defend', targetId: null })
const attack = (turn, actorId, targetId) => ({ turn, actorId, kind: 'attack', targetId })

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
    ...selected.map(({ scene }) => `${canonical}/scenes/${scene}.json`),
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
  ] = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(resolve(root, path)))))
  const prepare = await prepareBattleStatusInputs()
  const script = events.segments.find(({ name }) => name === 'all').commands
  return Promise.all(
    selected.map(async ({ team, scene, field, rawBattleStart }, index) => {
      const id = `team-${team}`
      const source = scenes[index]
      const encounter = findEncounters(source, id).find(
        (entry) => (entry.fieldId ?? source.battleFieldId) === field,
      )
      assert(encounter, `${scene} has no ${id} encounter on battle field ${field}`)
      if (rawBattleStart !== undefined) {
        const { opcode: setField, operands: fieldOperands } = script[rawBattleStart - 2]
        const { opcode: startBattle, operands: battleOperands } = script[rawBattleStart]
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
      const party = heroes.slice(0, opponents.length).map((id, index) => ({
        id,
        level: 36,
        hp: 2000,
        maxHP: 2000,
        defense: 250,
        attack: 6500,
        speed: [900, 600, 300][index],
        skills: [],
        weapon: null,
      }))
      assert(opponents.length && opponents.length <= party.length, `${id} requires a finish plan`)
      const commands = [
        ...party.map(({ id }) => defend(1, id)),
        ...party.map(({ id }, i) => attack(2, id, opponents[i].id)),
      ]
      const configured = prepare({ id, seed, team, party, commands })
      configured.game.fixture.battleFieldId = field
      configured.game.fixture.isBoss = Boolean(encounter.boss)
      configured.reforge.config.fieldId = field
      configured.reforge.config.boss = Boolean(encounter.boss)
      return {
        id,
        team,
        scene,
        field: battleField,
        rawBattleStart,
        slots,
        sprites,
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
