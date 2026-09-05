import type { ActorReferenceKind } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { actorReferenceBlocksDeletion, collectActorReferences } from './actor-references.js'
import type { EditorState } from './edit-session.js'

function state(): EditorState {
  return {
    manifest: {
      id: 'actor-refs',
      name: 'actor refs',
      contentVersion: 20,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: {
            party: ['hero'],
            money: 0,
            seedStats: { hero: { hp: 1 } },
            seedConditions: { hero: { poisonResistance: 1 } },
            inventory: [],
          },
        },
        {
          id: 'alt',
          label: '另一入口',
          scene: 's',
          startWorld: {
            party: ['hero'],
            money: 0,
            seedStats: { hero: { mp: 1 } },
            inventory: [],
          },
        },
      ],
    },
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'hero-instance', pos: { col: 1, row: 1, height: 0 }, actor: 'hero' }],
        onEnter: [
          {
            body: [
              { kind: 'branch', cond: { kind: 'inParty', actorId: 'hero' }, then: [] },
              { kind: 'setActorSprite', actor: 'hero', sprite: 'sprite.hero' },
              { kind: 'setActorAppearance', actor: 'hero', portrait: 'portrait.hero' },
              { kind: 'setParty', members: ['hero'] },
              {
                kind: 'applyActorCondition',
                actor: 'hero',
                condition: { kind: 'status', status: 'protect', turns: 7 },
              },
              {
                kind: 'dialog',
                cue: {
                  identity: { kind: 'actor', actor: 'hero', portrait: { kind: 'default' } },
                  slot: 'bottom',
                  rows: ['dialog.hero'],
                },
              },
            ],
          },
        ],
      },
    ],
    actors: [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'sprite.hero',
        portraits: { default: 'portrait.hero' },
      },
      {
        id: 'friend',
        name: 'name.friend',
        spriteId: 'sprite.hero',
        battler: { coveredBy: 'hero' },
      },
    ],
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
    enemies: [
      {
        id: 'enemy',
        name: 'enemy',
        ai: {
          rules: [
            {
              when: { kind: 'playerInParty', role: 'hero' },
              do: { kind: 'attack' },
            },
          ],
        },
        choreography: [
          {
            body: [
              { kind: 'applyActorGrowth', actor: 'hero', delta: {} },
              { kind: 'playActorCastEffect', actor: 'hero', skillId: 'skill' },
            ],
          },
        ],
      },
    ],
    skills: [],
    levelUp: { hero: [{ level: 2, skillId: 'skill' }] },
    locale: { 'name.hero': '主角', 'name.friend': '队友' },
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

const EXTERNAL_KINDS = [
  'scene-entity-actor',
  'entry-point-party',
  'entry-point-seed-stats',
  'entry-point-seed-condition',
  'condition-in-party',
  'enemy-condition-player-in-party',
  'actor-covered-by',
  'item-equipable-by',
  'item-battle-sprite-by-actor',
  'command-set-actor-sprite',
  'command-set-actor-appearance',
  'command-set-party-member',
  'command-actor-condition',
  'enemy-apply-actor-growth',
  'enemy-play-actor-cast-effect',
  'dialogue-actor',
] as const satisfies readonly ActorReferenceKind[]

describe('Actor 引用闭包', () => {
  const blockingReferences = (current: EditorState, actorId: string) =>
    collectActorReferences(current).filter(
      (reference) => reference.actorId === actorId && actorReferenceBlocksDeletion(reference),
    )

  test('16 个作者外部定位变体逐项进入删除门禁并都有可跳转 locator', () => {
    const references = blockingReferences(state(), 'hero')
    expect(new Set(references.map((reference) => reference.kind))).toEqual(new Set(EXTERNAL_KINDS))
    for (const kind of EXTERNAL_KINDS) {
      const found = references.find((reference) => reference.kind === kind)
      expect(found, kind).toBeDefined()
      expect(found?.where, kind).toBeTruthy()
      expect(found?.locator, kind).toBeDefined()
    }
  })

  test('levelUp 是伴随数据而不是自我引用阻塞', () => {
    const references = collectActorReferences(state()).filter(
      (reference) => reference.actorId === 'hero' && reference.kind === 'level-up-owner',
    )
    expect(references).toHaveLength(1)
    const current = state()
    current.scenes = []
    for (const entry of current.manifest.entryPoints) {
      entry.startWorld.party = []
      entry.startWorld.seedStats = {}
      entry.startWorld.seedConditions = {}
    }
    current.actors = current.actors.filter((actor) => actor.id === 'hero')
    current.items = []
    current.enemies = []
    expect(blockingReferences(current, 'hero')).toEqual([])
  })

  test('物品私有脚本中的人物命令进入删除门禁', () => {
    const current = state()
    current.scenes = []
    for (const entry of current.manifest.entryPoints) {
      entry.startWorld.party = []
      entry.startWorld.seedStats = {}
      entry.startWorld.seedConditions = {}
    }
    current.actors = current.actors.filter((actor) => actor.id === 'hero')
    current.items = [
      {
        id: 'private-script-item',
        name: '私有脚本物品',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'itemPrivateScript',
              script: {
                id: 'use',
                label: '换队伍',
                body: [{ kind: 'setParty', members: ['hero'] }],
              },
            },
          ],
        },
      },
    ] as never
    current.enemies = []
    const reference = blockingReferences(current, 'hero').find(
      (entry) => entry.kind === 'command-set-party-member',
    )
    expect(reference).toMatchObject({
      label: '物品 私有脚本物品',
      locator: { kind: 'item', itemId: 'private-script-item' },
    })
    expect(reference?.where).toContain('items[0](private-script-item)')
  })

  test.each([
    ['world-party-template', 'party'],
    ['world-reserve-template', 'reserve'],
  ] as const)('%s 是条件性只读阻塞且明确不可跳转', (kind, collection) => {
    const current = state()
    current.worlds = [
      {
        party: collection === 'party' ? [{ template: 'hero' }] : [],
        reserve: collection === 'reserve' ? [{ template: 'hero' }] : [],
      },
    ] as never
    const reference = blockingReferences(current, 'hero').find((entry) => entry.kind === kind)
    expect(reference).toMatchObject({ kind, locator: undefined })
    expect(reference?.unavailableReason).toMatch(/只读/)
  })
})
