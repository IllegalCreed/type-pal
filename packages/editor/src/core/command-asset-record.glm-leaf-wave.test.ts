import type { AssetRecordV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadLegalUiProject } from '../ui/__tests__/glm-leaf-workflows/legal-session.js'
import { collectBattleDataReferences } from './battle-data-references.js'
import {
  AssetInUseError,
  assertBattleSpriteRecord,
  assertSpriteRecord,
  assertTilesetRecord,
  sameAssetRecord,
} from './command-asset-record.js'
import { UpdateActorCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
  createProjectReferenceSource,
} from './project-reference.js'
import { AddSkillCommand } from './skill-commands.js'

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

/** 合法项目 + 真实命令：新建技能、把初始仙术/专属合体技写入 hero（保存门可见）。 */
async function legalSkillState(): Promise<EditorState> {
  const legal = await loadLegalUiProject('glm-leaf-battle-refs')
  const session = new EditSession(legal.state)
  session.dispatch(new AddSkillCommand('skill.fire', '火'))
  session.dispatch(new AddSkillCommand('skill.ice', '冰'))
  session.dispatch(new AddSkillCommand('skill.duo', '合击'))
  const hero = session.getState().actors[0]!
  session.dispatch(
    new UpdateActorCommand(hero.id, {
      battler: {
        ...hero.battler!,
        initialMagic: ['skill.fire', 'skill.ice'],
        cooperativeMagicSkillId: 'skill.duo',
      },
    }),
  )
  return session.getState()
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
    // 经真实 reference index 产出一条结构化边（无强转）。
    const index = createProjectReferenceIndex(
      buildProjectReferenceSnapshot([
        {
          target: { kind: 'asset', id: 'sprite.idle' },
          source: createProjectReferenceSource({ kind: 'item', id: 'x' }, '物品 x'),
          relation: { kind: 'asset-use', expectedKind: 'sprite' },
          where: 'items[0].icon',
          detail: '图标',
          locator: { kind: 'unavailable', reason: '只读来源' },
          deletePolicy: 'block',
        },
      ]),
    )
    const error = new AssetInUseError('sprite.idle', index.allReferences())
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AssetInUseError')
    expect(error.assetId).toBe('sprite.idle')
    expect(error.message).toBe('资源 sprite.idle 仍被 1 处引用，不能删除')
  })
})

describe('collectBattleDataReferences 剩余合同', () => {
  test('skill references come from initial magic and the cooperative skill, sorted by where', async () => {
    const references = collectBattleDataReferences(await legalSkillState(), 'skill')
    // 输出按 where 字典序排序：actor-cooperative… 排在 actor-initial… 之前。
    expect(references.map((entry) => [entry.kind, entry.targetId])).toEqual([
      ['actor-cooperative-magic', 'skill.duo'],
      ['actor-initial-magic', 'skill.fire'],
      ['actor-initial-magic', 'skill.ice'],
    ])
    expect(references[0]?.where).toBe('actors[0](hero).battler.cooperativeMagicSkillId')
    expect(references[0]?.locator).toEqual({ kind: 'actor', actorId: 'hero' })
  })

  test('enemy and poison targets on a skill-only project return only their own domain', async () => {
    const enemy = collectBattleDataReferences(await legalSkillState(), 'enemy')
    expect(enemy.every((entry) => entry.target === 'enemy')).toBe(true)
    const state = await legalSkillState()
    const poison = collectBattleDataReferences(state, 'poison', {
      includeScriptCommands: false,
    })
    expect(poison.every((entry) => entry.target === 'poison')).toBe(true)
    expect(
      collectBattleDataReferences(state, 'poison').every((entry) => entry.target === 'poison'),
    ).toBe(true)
  })
})
