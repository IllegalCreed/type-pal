import type { AssetRecordV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { collectBattleDataReferences } from './battle-data-references.js'
import {
  AssetInUseError,
  assertBattleSpriteRecord,
  assertSpriteRecord,
  assertTilesetRecord,
  sameAssetRecord,
} from './command-asset-record.js'

function record(overrides: Partial<AssetRecordV1> = {}): AssetRecordV1 {
  return {
    kind: 'sprite',
    path: 'assets/runtime/sprite-a.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: 4,
    sha256: 'a'.repeat(64),
    origin: { kind: 'authored' },
    ...overrides,
  }
}

const gzipBytes = new Uint8Array([0x1f, 0x8b, 0, 1]).buffer
const plainBytes = new Uint8Array([0, 1, 2, 3]).buffer

function baseState(): EditorState {
  return {
    actors: [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'hero-sprite',
        battler: {
          battleSprite: 'hero-battle',
          baseStats: {
            level: 1,
            hp: 100,
            maxHP: 100,
            mp: 10,
            maxMP: 10,
            attack: 5,
            defense: 5,
            magicAttack: 5,
            speed: 5,
            luck: 5,
          },
          initialEquipment: {},
          initialMagic: ['skill.fire', 'skill.ice'],
          cooperativeMagicSkillId: 'skill.duo',
        },
      },
    ],
    skills: [],
    enemies: [],
    poisons: [],
    scenes: [],
    manifest: {
      id: 't',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主入口',
          scene: 's001',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
  } as unknown as EditorState
}

describe('sameAssetRecord 剩余合同', () => {
  test('compares every identity field and ignores extra presentation keys', () => {
    const left = record({ label: '甲' })
    expect(sameAssetRecord(left, record({ label: '甲' }))).toBe(true)
    expect(sameAssetRecord(left, record({ label: '乙' }))).toBe(false)
    expect(sameAssetRecord(left, record({ path: 'assets/runtime/other.rle' }))).toBe(false)
    expect(sameAssetRecord(left, record({ sha256: 'b'.repeat(64) }))).toBe(false)
    expect(sameAssetRecord(left, record({ bytes: 5 }))).toBe(false)
    expect(sameAssetRecord(left, record({ origin: { kind: 'legacy-migrated', ref: 'pal' } }))).toBe(
      false,
    )
    expect(sameAssetRecord(left, record({ mediaType: 'image/png' }))).toBe(false)
    expect(sameAssetRecord(left, record({ kind: 'battle-sprite' }))).toBe(false)
  })
})

describe('assert*Record 剩余合同', () => {
  test('tileset guard checks kind, mediaType, path, bytes, sha and gzip head', () => {
    const valid = record({
      kind: 'tileset',
      path: 'assets/runtime/tiles.rle',
    })
    expect(() => assertTilesetRecord(valid, gzipBytes)).not.toThrow()
    expect(() => assertTilesetRecord(record({ kind: 'sprite' }), gzipBytes)).toThrow('kind')
    expect(() => assertTilesetRecord(valid, plainBytes)).toThrow('gzip')
    expect(() => assertTilesetRecord(record({ kind: 'tileset', bytes: 9 }), gzipBytes)).toThrow(
      'bytes',
    )
    expect(() =>
      assertTilesetRecord(record({ kind: 'tileset', mediaType: 'image/png' }), gzipBytes),
    ).toThrow('mediaType')
    expect(() =>
      assertTilesetRecord(record({ kind: 'tileset', path: '../escape.rle' }), gzipBytes),
    ).toThrow('路径')
    expect(() => assertTilesetRecord(record({ kind: 'tileset', sha256: 'zz' }), gzipBytes)).toThrow(
      'sha256',
    )
  })

  test('sprite and battle-sprite guards enforce their own kinds with the same bytes contract', () => {
    const sprite = record({ kind: 'sprite' })
    const battle = record({ kind: 'battle-sprite' })
    expect(() => assertSpriteRecord(sprite, gzipBytes)).not.toThrow()
    expect(() => assertBattleSpriteRecord(battle, gzipBytes)).not.toThrow()
    expect(() => assertSpriteRecord(battle, gzipBytes)).toThrow('sprite')
    expect(() => assertBattleSpriteRecord(sprite, gzipBytes)).toThrow('battle-sprite')
    expect(() => assertSpriteRecord(sprite, plainBytes)).toThrow('gzip')
    expect(() => assertBattleSpriteRecord(battle, plainBytes)).toThrow('gzip')
  })

  test('AssetInUseError carries the asset id and reference count in its message', () => {
    const error = new AssetInUseError('sprite.idle', [
      {
        target: { kind: 'item', id: 'x' },
        source: { kind: 'catalog' },
        relation: { kind: 'asset', assetId: 'sprite.idle', expectedKind: 'sprite' },
        where: 'items[0]',
        detail: 'icon',
      },
    ] as never)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AssetInUseError')
    expect(error.assetId).toBe('sprite.idle')
    expect(error.message).toBe('资源 sprite.idle 仍被 1 处引用，不能删除')
  })
})

describe('collectBattleDataReferences 剩余合同', () => {
  test('skill references come from initial magic and the cooperative skill, sorted by where', () => {
    const references = collectBattleDataReferences(baseState(), 'skill')
    // 输出按 where 字典序排序：actor-cooperative… 排在 actor-initial… 之前。
    expect(references.map((entry) => [entry.kind, entry.targetId])).toEqual([
      ['actor-cooperative-magic', 'skill.duo'],
      ['actor-initial-magic', 'skill.fire'],
      ['actor-initial-magic', 'skill.ice'],
    ])
    expect(references[0]?.where).toBe('actors[0](hero).battler.cooperativeMagicSkillId')
    expect(references[0]?.locator).toEqual({ kind: 'actor', actorId: 'hero' })
  })

  test('enemy and poison targets on a skill-only project return only their own domain', () => {
    const enemy = collectBattleDataReferences(baseState(), 'enemy')
    expect(enemy.every((entry) => entry.target === 'enemy')).toBe(true)
    const poison = collectBattleDataReferences(baseState(), 'poison', {
      includeScriptCommands: false,
    })
    expect(poison.every((entry) => entry.target === 'poison')).toBe(true)
    expect(
      collectBattleDataReferences(baseState(), 'poison').every(
        (entry) => entry.target === 'poison',
      ),
    ).toBe(true)
  })
})
