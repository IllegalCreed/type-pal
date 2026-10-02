// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P04（actor-references.glm-p）：人物引用闭包的选择性扫描、
 * 空 id 守卫、detail 标签策略与自删除豁免（P04 首批）。
 * 去重（真实旧 fullName 锚）：
 * - actor-references.test.ts › Actor 引用闭包 › 16 个作者外部定位变体逐项进入删除门禁并都有
 *   可跳转 locator（已证 16 kind 全集与 locator 存在性）；本文件核 includeScriptCommands
 *   开关臂、空 id 守卫、detail 精确值与 actorReferenceBlocksDeletion 豁免表——均为旧集未断言轴。
 * - actor-references.test.ts › 物品私有脚本中的人物命令进入删除门禁（已证 item 私有脚本臂）；
 *   本文件 scriptChunks 分片 where 精确串与 sharedScripts 臂为不同来源轴。
 * 合法输入：pEditorState typed 夹具（无强转）；collectActorReferences 为只读收集器。
 */
import { describe, expect, test } from 'vitest'
import { pEditorState } from '../__tests__/glm-p/kit.js'
import { actorReferenceBlocksDeletion, collectActorReferences } from './actor-references.js'
import type { EditorState } from './edit-session.js'

const pos = { col: 1, row: 1, height: 0 }

function actorWithCover(coveredBy?: string): EditorState['actors'] {
  return [
    {
      id: 'solo',
      name: 'name.solo',
      spriteId: 'sprite.solo',
      battler: {
        baseStats: {
          level: 1,
          hp: 10,
          maxHP: 10,
          mp: 5,
          maxMP: 5,
          attack: 5,
          defense: 5,
          magicAttack: 0,
          speed: 5,
          luck: 5,
        },
        initialEquipment: {},
        initialMagic: [],
        battleSprite: 'battle.solo',
        ...(coveredBy ? { coveredBy } : {}),
      },
    },
  ]
}

function enemyTaggingHero(): NonNullable<EditorState['enemies']>[number] {
  return {
    id: 'enemy-1',
    name: 'name.enemy-1',
    battleSprite: 'battle.enemy-1',
    yPosOffset: 0,
    stats: {
      health: 10,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 5,
      magicStrength: 0,
      defense: 0,
      dexterity: 5,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', when: { kind: 'playerInParty', role: 'hero' }, do: { kind: 'attack' } }],
    },
    sounds: {},
    choreography: [
      {
        at: 'battleStart',
        body: [
          {
            kind: 'applyActorGrowth',
            actor: 'hero',
            delta: {
              level: 0,
              maxHP: 0,
              maxMP: 0,
              attack: 0,
              magicAttack: 0,
              defense: 0,
              speed: 0,
              luck: 0,
            },
          },
        ],
      },
    ],
  }
}

function baseState(overrides: Partial<EditorState>, entityActor = 'hero'): EditorState {
  return pEditorState({
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'inst-1', pos, actor: entityActor }],
      },
    ],
    manifest: {
      ...pEditorState().manifest,
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: {
            party: ['hero'],
            money: 0,
            inventory: [],
            seedStats: { hero: { hp: 9 } },
            seedConditions: { hero: { poisonResistance: 1 } },
          },
        },
      ],
    },
    ...overrides,
  })
}

describe('P04-G01 collectActorReferences 选择性扫描与空 id 守卫', () => {
  test('includeScriptCommands:false 仅排除命令扫描臂；实体/入口/敌人条件臂保留', () => {
    const state = baseState({
      scriptChunks: {
        'chunk-a': {
          version: 1,
          id: 'chunk-a',
          scripts: { 'teleport-lib': [{ kind: 'setParty', members: ['hero'] }] },
        },
      },
      enemies: [enemyTaggingHero()],
    })
    const keptKinds = [
      'scene-entity-actor',
      'entry-point-party',
      'entry-point-seed-stats',
      'entry-point-seed-condition',
      'enemy-condition-player-in-party',
      'enemy-apply-actor-growth',
    ] as const
    const kindsOf = (refs: ReturnType<typeof collectActorReferences>) =>
      refs.map((reference) => reference.kind).sort()

    const full = collectActorReferences(state)
    expect(
      kindsOf(full.filter((r) => keptKinds.includes(r.kind as (typeof keptKinds)[number]))),
    ).toEqual([...keptKinds].sort())
    expect(kindsOf(full).includes('command-set-party-member')).toBe(true)

    const excluded = collectActorReferences(state, { includeScriptCommands: false })
    expect(kindsOf(excluded).includes('command-set-party-member')).toBe(false)
    expect(
      kindsOf(excluded.filter((r) => keptKinds.includes(r.kind as (typeof keptKinds)[number]))),
    ).toEqual([...keptKinds].sort())
  })

  test('空串 actor id 不产出任何引用边；同场非空 id 照常收集', () => {
    const state = baseState({
      scenes: [
        {
          id: 's001',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            { id: 'inst-empty', pos, actor: '' },
            { id: 'inst-2', pos, actor: 'hero' },
          ],
        },
      ],
      manifest: {
        ...pEditorState().manifest,
        entryPoints: [
          {
            id: 'main',
            label: '主要入口',
            scene: 's001',
            startWorld: { party: ['', 'hero'], money: 0, inventory: [] },
          },
        ],
      },
    })
    const references = collectActorReferences(state)
    expect(references.filter((reference) => reference.actorId === '')).toEqual([])
    const entityRefs = references.filter((reference) => reference.kind === 'scene-entity-actor')
    expect(entityRefs).toHaveLength(1)
    expect(entityRefs[0]).toMatchObject({
      actorId: 'hero',
      where: 'scenes[0](s001).entities[1](inst-2).actor',
      locator: { kind: 'scene-entity', sceneId: 's001', entityId: 'inst-2' },
    })
    const partyRefs = references.filter((reference) => reference.kind === 'entry-point-party')
    expect(partyRefs).toHaveLength(1)
    expect(partyRefs[0]).toMatchObject({
      actorId: 'hero',
      where: 'manifest.entryPoints[0](main).startWorld.party[1]',
    })
  })
})

describe('P04-G02 引用 detail 标签策略与自删除豁免', () => {
  test('显式 detail 三值与策略回退两值精确', () => {
    const state = baseState({
      actors: actorWithCover('hero'),
      items: [
        {
          id: 'sword',
          name: 'item.sword',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          equip: {
            slot: 'weapon',
            equipableBy: ['hero'],
            effects: [{ kind: 'battleSprite', byActor: { hero: 'battle.hero' } }],
          },
        },
      ],
      levelUp: { hero: [{ level: 2, skillId: 'skill' }] },
    })
    const detailOf = (kind: string): string | undefined =>
      collectActorReferences(state).find((reference) => reference.kind === kind)?.detail
    expect(detailOf('scene-entity-actor')).toBe('人物预制实例')
    expect(detailOf('item-equipable-by')).toBe('物品可装备人物')
    expect(detailOf('item-battle-sprite-by-actor')).toBe('装备战斗形象映射')
    expect(detailOf('actor-covered-by')).toBe('援护者')
    expect(detailOf('level-up-owner')).toBe('随人物复制/删除的伴随数据')
  })

  test('actorReferenceBlocksDeletion：自援护与伴随数据豁免，外部实体引用阻塞', () => {
    const state = baseState(
      { actors: actorWithCover('solo'), levelUp: { solo: [{ level: 2, skillId: 'skill' }] } },
      'solo',
    )
    const references = collectActorReferences(state)
    const coveredBy = references.find((reference) => reference.kind === 'actor-covered-by')
    expect(coveredBy).toMatchObject({ actorId: 'solo', ownerActorId: 'solo' })
    expect(actorReferenceBlocksDeletion(coveredBy!)).toBe(false)
    const levelUp = references.find((reference) => reference.kind === 'level-up-owner')
    expect(levelUp).toMatchObject({ actorId: 'solo', ownerActorId: 'solo' })
    expect(actorReferenceBlocksDeletion(levelUp!)).toBe(false)
    const entityRef = references.find((reference) => reference.kind === 'scene-entity-actor')
    expect(entityRef).toMatchObject({ actorId: 'solo' })
    expect(actorReferenceBlocksDeletion(entityRef!)).toBe(true)
  })
})

describe('P04-G03 scriptChunks 分片命令以 shared-script locator 入账', () => {
  test('where 精确含 JSON 引号键；label 取脚本 id；locator 指向分片脚本', () => {
    const state = baseState({
      scriptChunks: {
        'chunk-a': {
          version: 1,
          id: 'chunk-a',
          scripts: { 'teleport-lib': [{ kind: 'setParty', members: ['hero'] }] },
        },
      },
    })
    const reference = collectActorReferences(state).find(
      (entry) => entry.kind === 'command-set-party-member',
    )
    expect(reference).toMatchObject({
      actorId: 'hero',
      label: '脚本 teleport-lib',
      where: 'scriptChunks["chunk-a"].scripts["teleport-lib"][0].members[0]',
      locator: { kind: 'shared-script', scriptId: 'teleport-lib' },
    })
  })
})
