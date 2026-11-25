import {
  buildWorld,
  validateActors,
  validateAssetCatalog,
  validateBattleSprites,
  validateEnemies,
  validateItems,
  validateSkills,
} from '@type-pal/content'
import { encodeSpriteChunk } from '@type-pal/shared'
import { expect, test, vi } from 'vitest'
import {
  enemyProfile,
  PLAYER_PROFILE,
  realFrame,
  wfActorDef,
  wfBattleSpriteDef,
  wfEnemy,
  wfSkill,
} from '../__tests__/battle-workflows/catalog.js'
import { AssetResolver } from '../asset-resolver.js'
import { BattleSpriteAssetCache, compressGzip } from '../assets.js'
import { sha256Bytes } from '../hash.js'
import { createBattlePlayers } from './battle-player-input.js'
import { prepareBattleSpriteReadiness } from './battle-sprite-readiness.js'

test('loads real sprite assets for equipment appearance, granted skills, and every reachable enemy', async () => {
  const actor = wfActorDef('hero', { initialMagic: ['trance'], coopSkill: 'coop' })
  if (!actor.battler) throw new Error('fixture actor must be able to fight')
  actor.battler.battleSprite = 'base'
  actor.battler.initialEquipment = { weapon: 'guise', accessory: 'earth-pearl' }
  validateActors([actor])
  const items = validateItems([
    {
      id: 'guise',
      name: 'name.guise',
      desc: [],
      buyPrice: 1,
      sellPrice: 0,
      sellable: true,
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [{ kind: 'battleSprite', byActor: { hero: 'equipped' } }],
      },
    },
    {
      id: 'earth-pearl',
      name: 'name.earth-pearl',
      desc: [],
      buyPrice: 1,
      sellPrice: 0,
      sellable: true,
      equip: {
        slot: 'accessory',
        equipableBy: ['hero'],
        effects: [{ kind: 'grantSkill', skillId: 'stone-summon' }],
      },
    },
  ])
  const actorsById = { hero: actor }
  const itemsById = Object.fromEntries(items.map((item) => [item.id, item]))
  const world = buildWorld({ party: ['hero'], inventory: [], money: 0 }, actorsById)
  const [hero] = world.party
  if (!hero) throw new Error('fixture party must contain the hero')
  hero.appearance = { battleSprite: 'persistent' }
  const players = createBattlePlayers(world, { actorsById, items: itemsById })

  const { skills } = validateSkills({
    skills: [
      {
        ...wfSkill('trance'),
        execution: { player: { effects: [{ kind: 'trance', battleSprite: 'trance' }] } },
      },
      {
        ...wfSkill('stone-summon'),
        execution: {
          player: { effects: [{ kind: 'summon', battleSprite: 'stone' }] },
        },
      },
      {
        ...wfSkill('coop'),
        target: 'allEnemies',
        effects: [{ kind: 'summon', battleSprite: 'coop-summon' }],
      },
    ],
    levelUp: {},
  })
  const e1 = wfEnemy('e1', {}, { sounds: {} })
  const e2 = wfEnemy('e2', {}, { sounds: {} })
  const e3 = wfEnemy('e3', {}, { sounds: {} })
  const e4 = wfEnemy('e4', {}, { sounds: {} })
  e1.ai.rules = [{ at: 'act', do: { kind: 'transform', enemyId: 'e2' } }]
  e2.ai.hooks = {
    ready: {
      initial: 'initial',
      states: {
        initial: {
          body: [
            { kind: 'effect', id: 'transform', effect: { kind: 'transform', enemyId: 'e3' } },
            { kind: 'effect', id: 'summon', effect: { kind: 'summon', enemyId: 'e4', count: 1 } },
          ],
          next: { kind: 'stay' },
        },
      },
    },
  }
  e3.ai.rules = [{ at: 'act', do: { kind: 'transform', enemyId: 'e1' } }]
  const enemies = validateEnemies([e1, e2, e3, e4])
  const definitions = [
    ...['base', 'persistent', 'equipped', 'trance'].map((id) =>
      wfBattleSpriteDef(id, PLAYER_PROFILE),
    ),
    { ...wfBattleSpriteDef('stone', { kind: 'summon' }), asset: 'battle-sprite.pal.player.013' },
    wfBattleSpriteDef('coop-summon', { kind: 'summon' }),
    ...enemies.map(({ battleSprite }) =>
      wfBattleSpriteDef(battleSprite, enemyProfile(battleSprite)),
    ),
  ]
  const frames = Array.from({ length: 11 }, () => realFrame())
  frames[10]?.pixels.fill(51)
  const encoded = await compressGzip(encodeSpriteChunk(frames))
  const bytes = Uint8Array.from(encoded).buffer
  const sha256 = await sha256Bytes(encoded)
  const catalog = validateAssetCatalog({
    version: 1,
    assets: Object.fromEntries(
      definitions.map(({ asset }) => [
        asset,
        {
          kind: 'battle-sprite',
          path: `assets/generated/${asset}.rle`,
          mediaType: 'application/vnd.type-pal.rle',
          bytes: bytes.byteLength,
          sha256,
          origin: { kind: 'generated' },
        },
      ]),
    ),
  })
  const parsedDefinitions = validateBattleSprites(definitions, catalog)
  const readBytes = vi.fn(async (path: string) => {
    if (!Object.values(catalog.assets).some((asset) => asset.path === path))
      throw new DOMException(`missing test asset ${path}`, 'NotFoundError')
    return bytes.slice(0)
  })
  const unexpectedRead = async () => {
    throw new Error('sprite readiness should read only binary assets')
  }
  const reader = new AssetResolver(
    'battle-readiness',
    catalog,
    {},
    {
      readBytes,
      readText: unexpectedRead,
      readJson: unexpectedRead,
      urlFor: unexpectedRead,
    },
  )

  const readiness = await prepareBattleSpriteReadiness({
    cache: new BattleSpriteAssetCache(),
    reader,
    definitionsById: Object.fromEntries(parsedDefinitions.map((sprite) => [sprite.id, sprite])),
    party: world.party,
    actorsById,
    itemsById,
    playerSkillIds: players.map(({ skills }) => skills),
    cooperativeSkillIds: players.flatMap(({ cooperativeMagicSkillId }) =>
      cooperativeMagicSkillId ? [cooperativeMagicSkillId] : [],
    ),
    skillsById: Object.fromEntries(skills.map((skill) => [skill.id, skill])),
    enemyDefs: [e1],
    enemiesById: Object.fromEntries(enemies.map((enemy) => [enemy.id, enemy])),
  })

  expect(readiness.playerBaseDefinitionIds).toEqual(['equipped'])
  expect(readiness.reachableEnemyDefs.map(({ id }) => id)).toEqual(['e1', 'e2', 'e3', 'e4'])
  expect([...readiness.byDefinitionId.keys()].sort()).toEqual([
    'battle-sprite.e1',
    'battle-sprite.e2',
    'battle-sprite.e3',
    'battle-sprite.e4',
    'coop-summon',
    'equipped',
    'stone',
    'trance',
  ])
  const summon = readiness.byDefinitionId.get('stone')
  expect(summon?.definition.asset).toBe('battle-sprite.pal.player.013')
  expect(summon?.sprite.frames[10]?.pixels).toEqual(new Uint8Array([51]))
  expect(readBytes.mock.calls.flat().sort()).toEqual([
    'assets/generated/asset.battle-sprite.e1.rle',
    'assets/generated/asset.battle-sprite.e2.rle',
    'assets/generated/asset.battle-sprite.e3.rle',
    'assets/generated/asset.battle-sprite.e4.rle',
    'assets/generated/asset.coop-summon.rle',
    'assets/generated/asset.equipped.rle',
    'assets/generated/asset.trance.rle',
    'assets/generated/battle-sprite.pal.player.013.rle',
  ])
})
