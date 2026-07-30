import type {
  ActorDef,
  BattleSpriteDef,
  CharacterInstance,
  EnemyDef,
  ItemData,
  SkillData,
} from '@type-pal/content'
import { effectiveSkills } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { BattleSpriteAssetCache, compressGzip } from '../assets.js'
import { prepareBattleSpriteReadiness } from './battle-sprite-readiness.js'
import { collectReachableEnemyDefs } from './enemy-closure.js'

const fighterProfile: BattleSpriteDef['profile'] = {
  kind: 'player-fighter',
  frames: {
    idle: 0,
    dying: 0,
    dead: 0,
    defend: 0,
    hurt: 0,
    preMagic: 0,
    magic: 0,
    attackWindup: 0,
    attackRush: 0,
    attackStrike: 0,
  },
  castEffectBase: 0,
  attackEffectBase: 0,
}
const enemyProfile: BattleSpriteDef['profile'] = {
  kind: 'enemy',
  idle: { start: 0, count: 1 },
  magic: { start: 1, count: 0 },
  attack: { start: 1, count: 0 },
  idleTicksPerFrame: 1,
  actTicksPerFrame: 0,
}
const definition = (
  id: string,
  profile: BattleSpriteDef['profile'],
  asset = `asset.${id}`,
): BattleSpriteDef => ({
  id,
  label: id,
  asset,
  profile,
})

const enemy = (
  id: string,
  battleSprite: string,
  rules: NonNullable<EnemyDef['ai']['rules']> = [],
) =>
  ({ id, name: id, battleSprite, yPosOffset: 0, ai: { resistanceToSorcery: 0, rules } }) as EnemyDef

const skill = (id: string, effects: SkillData['effects']): SkillData =>
  ({
    id,
    name: id,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'self',
    effects,
  }) as SkillData

describe('battle sprite readiness 完整闭包', () => {
  test('有效装备形象 + 装备授技 + 合体 + trance + 敌 transform/summon BFS 一次预载', async () => {
    const compressed = await compressGzip(new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0x33]))
    const bytes = compressed.buffer.slice(
      compressed.byteOffset,
      compressed.byteOffset + compressed.byteLength,
    ) as ArrayBuffer
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const sha256 = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')

    const definitions = [
      definition('base', fighterProfile),
      definition('persistent', fighterProfile),
      definition('equipment', fighterProfile),
      definition('trance', fighterProfile),
      definition('player-summon-13', { kind: 'summon' }, 'battle-sprite.pal.player.013'),
      definition('coop-summon', { kind: 'summon' }),
      definition('enemy-1', enemyProfile),
      definition('enemy-2', enemyProfile),
      definition('enemy-3', enemyProfile),
    ]
    const definitionsById = Object.fromEntries(definitions.map((entry) => [entry.id, entry]))
    const readBytes = vi.fn(async () => bytes)
    const reader = {
      record: (asset: string) => ({
        kind: 'battle-sprite' as const,
        path: `assets/generated/${asset}.rle`,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: bytes.byteLength,
        sha256,
        origin: { kind: 'generated' as const },
      }),
      readBytes,
    }
    const actor = {
      id: 'hero',
      name: 'hero',
      spriteId: 'hero',
      battler: { battleSprite: 'base' },
    } as unknown as ActorDef
    const character = {
      id: 'party-member-17',
      template: 'hero',
      appearance: { battleSprite: 'persistent' },
      equipment: { weapon: 'appearance-item', accessory: '267' },
    } as unknown as CharacterInstance
    const appearanceItem = {
      id: 'appearance-item',
      name: '形象测试装备',
      equip: {
        slot: 'weapon',
        equipableBy: ['hero'],
        effects: [{ kind: 'battleSprite', byActor: { hero: 'equipment' } }],
      },
    } as unknown as ItemData
    const earthPearl = {
      id: '267',
      name: '土灵珠',
      equip: {
        slot: 'accessory',
        equipableBy: ['hero'],
        effects: [{ kind: 'grantSkill', skillId: '336' }],
      },
    } as unknown as ItemData
    const skillsById = {
      trance: skill('trance', [{ kind: 'trance', battleSprite: 'trance' }]),
      '336': skill('336', [{ kind: 'summon', battleSprite: 'player-summon-13' }]),
      coop: skill('coop', [{ kind: 'summon', battleSprite: 'coop-summon' }]),
    }
    const e1 = enemy('e1', 'enemy-1', [{ at: 'act', do: { kind: 'transform', enemyId: 'e2' } }])
    const e2 = enemy('e2', 'enemy-2', [
      { at: 'act', do: { kind: 'summon', enemyId: 'e3', count: 1 } },
    ])
    const e3 = enemy('e3', 'enemy-3', [{ at: 'act', do: { kind: 'transform', enemyId: 'e1' } }])
    const playerSkills = effectiveSkills(['trance'], character, {
      'appearance-item': appearanceItem,
      '267': earthPearl,
    })
    expect(playerSkills).toContain('336')

    const readiness = await prepareBattleSpriteReadiness({
      cache: new BattleSpriteAssetCache(),
      reader,
      definitionsById,
      party: [character],
      actorsById: { hero: actor },
      itemsById: { 'appearance-item': appearanceItem, '267': earthPearl },
      playerSkillIds: [playerSkills],
      cooperativeSkillIds: ['coop'],
      skillsById,
      enemyDefs: [e1],
      enemiesById: { e1, e2, e3 },
    })

    expect(readiness.playerBaseDefinitionIds).toEqual(['equipment'])
    expect(readiness.reachableEnemyDefs.map(({ id }) => id)).toEqual(['e1', 'e2', 'e3'])
    expect([...readiness.byDefinitionId.keys()].sort()).toEqual(
      [
        'equipment',
        'trance',
        'player-summon-13',
        'coop-summon',
        'enemy-1',
        'enemy-2',
        'enemy-3',
      ].sort(),
    )
    expect(readBytes).toHaveBeenCalledTimes(7)
    expect(readiness.byDefinitionId.has('base')).toBe(false)
    expect(readiness.byDefinitionId.has('persistent')).toBe(false)
    expect(readiness.byDefinitionId.get('player-summon-13')?.definition.asset).toBe(
      'battle-sprite.pal.player.013',
    )
    expect(readBytes).toHaveBeenCalledWith('battle-sprite.pal.player.013', 'battle-sprite')
  })

  test('敌人闭包去环，缺 transform/summon 目标 fail-loud', () => {
    const loop = enemy('loop', 'enemy-1', [
      { at: 'act', do: { kind: 'summon', count: 1 } },
      { at: 'act', do: { kind: 'transform', enemyId: 'loop' } },
    ])
    expect(collectReachableEnemyDefs([loop], { loop })).toEqual([loop])
    const missing = enemy('missing-source', 'enemy-1', [
      { at: 'act', do: { kind: 'transform', enemyId: 'missing-target' } },
    ])
    expect(() => collectReachableEnemyDefs([missing], { 'missing-source': missing })).toThrow(
      'missing-target',
    )
  })

  test('敌 hook effect 的 transform/summon 目标进入同一 readiness 闭包', () => {
    const source = enemy('source', 'enemy-1')
    const transformed = enemy('transformed', 'enemy-2')
    const summoned = enemy('summoned', 'enemy-3')
    source.ai.hooks = {
      ready: {
        initial: 'effects',
        states: {
          effects: {
            body: [
              {
                kind: 'effect',
                id: 'transform',
                effect: { kind: 'transform', enemyId: transformed.id },
              },
              {
                kind: 'effect',
                id: 'summon',
                effect: { kind: 'summon', enemyId: summoned.id, count: 1 },
              },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    expect(
      collectReachableEnemyDefs([source], {
        source,
        transformed,
        summoned,
      }).map((definition) => definition.id),
    ).toEqual(['source', 'transformed', 'summoned'])
  })
})
