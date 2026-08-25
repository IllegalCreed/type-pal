import type { Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  blockingItemReferences,
  collectCanonicalItemReferences,
  collectItemReferences,
} from './item-references.js'
import type { ScriptEditorState } from './script-editor.js'

function state(): EditorState {
  return {
    manifest: {
      id: 'refs',
      name: 'refs',
      contentVersion: 18,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: {
            party: [],
            money: 0,
            inventory: [{ itemId: 'target', count: 1 }],
          },
        },
        {
          id: 'chapter-2',
          label: '第二章',
          scene: 's',
          startWorld: {
            party: [],
            money: 0,
            inventory: [{ itemId: 'target', count: 2 }],
          },
        },
      ],
    },
    scenes: [
      {
        id: 's',
        mapId: 'm',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        onEnter: [
          {
            entry: {
              prepare: [{ kind: 'giveItem', itemId: 'target' }],
              reveal: { kind: 'cut' },
            },
            body: [
              {
                kind: 'branch',
                cond: {
                  kind: 'any',
                  of: [
                    { kind: 'itemEquipped', itemId: 'target' },
                    { kind: 'not', cond: { kind: 'hasItem', itemId: 'target' } },
                  ],
                },
                then: [{ kind: 'giveItem', itemId: 'target', count: 1 }],
              },
            ],
          },
        ],
        onTeleport: [{ body: [{ kind: 'loseItem', itemId: 'target' }] }],
        entities: [
          {
            id: 'e',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'ghost',
            pages: [
              {
                trigger: {
                  mode: 'interact',
                  stages: [
                    {
                      body: [
                        {
                          kind: 'branch',
                          cond: { kind: 'hasItem', itemId: 'target', atLeast: 2 },
                          then: [],
                        },
                        {
                          kind: 'setEntityAuto',
                          entity: 'e',
                          stages: [{ body: [{ kind: 'loseItem', itemId: 'target' }] }],
                        },
                      ],
                    },
                  ],
                },
              },
              {
                auto: {
                  stages: [
                    {
                      body: [
                        {
                          kind: 'branch',
                          cond: { kind: 'ownsItem', itemId: 'target' },
                          then: [],
                        },
                      ],
                    },
                  ],
                },
              },
            ],
            hostile: {
              enemyTeam: 'team',
              onLose: [{ kind: 'giveItem', itemId: 'target' }],
            },
          },
        ],
      },
    ],
    actors: [
      {
        id: 'actor',
        name: 'actor',
        spriteId: 'ghost',
        battler: { initialEquipment: { weapon: 'target' }, initialMagic: [] },
      },
    ],
    skills: [
      {
        id: 'skill',
        name: 'skill',
        desc: '',
        cost: { items: [{ itemId: 'target', amount: 1 }] },
        usableOutsideBattle: false,
        target: 'oneEnemy',
        effects: [],
        animation: { effectSprite: 0 },
      },
    ],
    levelUp: {},
    items: [
      {
        id: 'target',
        name: '目标',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: 'target', count: 1 }],
                  products: [{ itemId: 'product', count: 1 }],
                },
              ],
            },
          ],
        },
      },
      {
        id: 'owner',
        name: '引用者',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'pool',
              maxRoll: 1,
              rewards: [{ itemId: 'target', count: 1 }],
            },
          ],
        },
      },
      {
        id: 'product',
        name: '产物',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
      },
    ],
    locale: {},
    sprites: [],
    battleSprites: [],
    enemies: [
      {
        id: 'enemy',
        name: 'enemy',
        battleSprite: 'enemy-sprite',
        yPosOffset: 0,
        stats: {},
        ai: { resistanceToSorcery: 0 },
        sounds: {},
        steal: { itemId: 'target', count: 1 },
        attackEquivItem: { itemId: 'target', rate: 20 },
        onDefeated: [{ kind: 'loseItem', itemId: 'target' }],
      },
    ],
    enemyTeams: [],
    shops: [{ id: 7, items: ['target'] }],
    poisons: [
      {
        id: 9,
        name: '养蛊',
        curability: 'incurable',
        color: 0,
        playerTicks: [{ grantItem: 'target' }],
        enemyTicks: [{ grantItem: 'target' }],
      },
    ],
    worlds: [
      {
        party: [
          {
            id: 'hero',
            actorId: 'actor',
            hp: 1,
            maxHP: 1,
            mp: 0,
            maxMP: 0,
            attack: 0,
            magicAttack: 0,
            defense: 0,
            speed: 0,
            luck: 0,
            level: 1,
            equipment: { weapon: 'target' },
          },
        ],
        money: 0,
        learnedSkills: {},
        inventory: [{ itemId: 'target', count: 3 }],
        reserve: [
          {
            id: 'reserve-hero',
            actorId: 'actor',
            hp: 1,
            maxHP: 1,
            mp: 0,
            maxMP: 0,
            attack: 0,
            magicAttack: 0,
            defense: 0,
            speed: 0,
            luck: 0,
            level: 1,
            equipment: { weapon: 'target' },
          },
        ],
      },
    ],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    scriptIndex: {
      version: 1,
      chunks: { shared: { path: 'content/scripts/shared.json' } },
      library: { 'shared/use': { chunk: 'shared', name: '共享用途' } },
    },
    scriptChunks: {
      shared: {
        version: 1,
        scripts: { 'shared/use': [{ kind: 'giveItem', itemId: 'target' }] },
      },
    },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState
}

function recursiveState(): EditorState {
  const current = state()
  current.scriptIndex!.chunks.recursive = { path: 'content/scripts/recursive.json', bytes: 0 }
  current.scriptIndex!.library!['shared/recursive'] = {
    name: '递归物品引用',
    self: 'none',
  }
  current.scriptChunks.recursive = {
    version: 1,
    id: 'recursive',
    scripts: {
      'shared/recursive': [
        {
          kind: 'branch',
          cond: { kind: 'all', of: [{ kind: 'hasItem', itemId: 'target' }] },
          then: [],
          else: [{ kind: 'giveItem', itemId: 'target' }],
        },
        { kind: 'confirm', onNo: [{ kind: 'loseItem', itemId: 'target' }] },
        {
          kind: 'startBattle',
          enemyTeamId: 'team-1',
          onLose: [{ kind: 'giveItem', itemId: 'target' }],
          onFlee: [{ kind: 'loseItem', itemId: 'target' }],
        },
        { kind: 'teleportOut', onFail: [{ kind: 'giveItem', itemId: 'target' }] },
      ],
    },
  }
  return current
}

describe('collectItemReferences', () => {
  test.each([
    {
      name: '场景 entry.prepare',
      source: 'scene',
      access: 'reward',
      where: 'scenes[0](s).onEnter0/entry/prepare/0.itemId',
      locator: {
        kind: 'scene-script',
        sceneId: 's',
        sourceKey: '__onEnter__',
        commandPath: '0/entry/prepare/0',
      },
    },
    {
      name: '场景进场嵌套装备条件',
      source: 'scene',
      access: 'read',
      where: 'scenes[0](s).onEnter0/0.cond.of[0]',
      locator: {
        kind: 'scene-script',
        sceneId: 's',
        sourceKey: '__onEnter__',
        commandPath: '0/0',
      },
    },
    {
      name: '场景进场 not/hasItem 条件',
      source: 'scene',
      access: 'read',
      where: 'scenes[0](s).onEnter0/0.cond.of[1].cond',
      locator: {
        kind: 'scene-script',
        sceneId: 's',
        sourceKey: '__onEnter__',
        commandPath: '0/0',
      },
    },
    {
      name: '场景进场分支奖励',
      source: 'scene',
      access: 'reward',
      where: 'scenes[0](s).onEnter0/0/then/0.itemId',
      locator: {
        kind: 'scene-script',
        sceneId: 's',
        sourceKey: '__onEnter__',
        commandPath: '0/0/then/0',
      },
    },
    {
      name: '场景传送出口',
      source: 'scene',
      access: 'lose',
      where: 'scenes[0](s).onTeleport0/0.itemId',
      locator: {
        kind: 'scene-script',
        sceneId: 's',
        sourceKey: '__onTeleport__',
        commandPath: '0/0',
      },
    },
    {
      name: '实体第一页触发条件',
      source: 'scene',
      access: 'read',
      where: 'scenes[0](s).entities[0].pages[0].trigger.stages0/0.cond',
      locator: {
        kind: 'scene-script',
        sceneId: 's',
        sourceKey: 'e:trigger',
        pageIndex: 0,
        commandPath: '0/0',
      },
    },
    {
      name: '页切换内联脚本',
      source: 'scene',
      access: 'lose',
      where: 'scenes[0](s).entities[0].pages[0].trigger.stages0/1/stages/0/body/0.itemId',
      locator: undefined,
    },
    {
      name: '实体第二页自动条件',
      source: 'scene',
      access: 'read',
      where: 'scenes[0](s).entities[0].pages[1].auto.stages0/0.cond',
      locator: {
        kind: 'scene-script',
        sceneId: 's',
        sourceKey: 'e:auto',
        pageIndex: 1,
        commandPath: '0/0',
      },
    },
    {
      name: '敌对实体战败命令',
      source: 'scene',
      access: 'reward',
      where: 'scenes[0](s).entities[0].hostile.onLose/0.itemId',
      locator: undefined,
    },
    {
      name: '共享脚本',
      source: 'script',
      access: 'reward',
      where: 'scriptChunks["shared"].scripts["shared/use"]0/0.itemId',
      locator: { kind: 'shared-script', scriptId: 'shared/use', commandPath: '0/0' },
    },
    {
      name: '商店货单',
      source: 'shop',
      access: 'configure',
      where: 'shops[0](7).items[0]',
      locator: { kind: 'shop', shopId: 7 },
    },
    {
      name: '主要入口背包',
      source: 'entry',
      access: 'hold',
      where: 'manifest.entryPoints[0](main).startWorld.inventory[0].itemId',
      locator: { kind: 'entry-point', entryPointId: 'main' },
    },
    {
      name: '命名入口背包',
      source: 'entry',
      access: 'hold',
      where: 'manifest.entryPoints[1](chapter-2).startWorld.inventory[0].itemId',
      locator: { kind: 'entry-point', entryPointId: 'chapter-2' },
    },
    {
      name: '角色初始装备',
      source: 'actor',
      access: 'hold',
      where: 'actors[0](actor).battler.initialEquipment.weapon',
      locator: { kind: 'actor', actorId: 'actor' },
    },
    {
      name: '技能物品消耗',
      source: 'skill',
      access: 'consume',
      where: 'skills[0](skill).cost.items[0].itemId',
      locator: { kind: 'skill', skillId: 'skill' },
    },
    {
      name: '敌人可偷物品',
      source: 'enemy',
      access: 'reward',
      where: 'enemies[0](enemy).steal.itemId',
      locator: { kind: 'enemy', enemyId: 'enemy' },
    },
    {
      name: '敌人普攻等价物品',
      source: 'enemy',
      access: 'read',
      where: 'enemies[0](enemy).attackEquivItem.itemId',
      locator: { kind: 'enemy', enemyId: 'enemy' },
    },
    {
      name: '敌人战后剧情',
      source: 'enemy',
      access: 'lose',
      where: 'enemies[0](enemy).onDefeated/0.itemId',
      locator: undefined,
    },
    {
      name: '玩家中毒产物',
      source: 'poison',
      access: 'reward',
      where: 'poisons[0](9).playerTicks[0].grantItem',
      locator: { kind: 'poison', poisonId: 9 },
    },
    {
      name: '敌人中毒产物',
      source: 'poison',
      access: 'reward',
      where: 'poisons[0](9).enemyTicks[0].grantItem',
      locator: { kind: 'poison', poisonId: 9 },
    },
    {
      name: '物品配方材料',
      source: 'item',
      access: 'consume',
      where: 'items[0](target).use.effects[0].recipes[0].ingredients[0].itemId',
      locator: { kind: 'item', itemId: 'target' },
      ownerItemId: 'target',
    },
    {
      name: '物品资源池奖励',
      source: 'item',
      access: 'reward',
      where: 'items[1](owner).use.effects[0].rewards[0].itemId',
      locator: { kind: 'item', itemId: 'owner' },
      ownerItemId: 'owner',
    },
    {
      name: '存档背包',
      source: 'save',
      access: 'hold',
      where: 'worlds[0].inventory[0].itemId',
      locator: undefined,
    },
    {
      name: '存档队伍装备',
      source: 'save',
      access: 'hold',
      where: 'worlds[0].party[0].equipment.weapon',
      locator: undefined,
    },
    {
      name: '存档后备队装备',
      source: 'save',
      access: 'hold',
      where: 'worlds[0].reserve[0].equipment.weapon',
      locator: undefined,
    },
  ])('$name 可独立定位', ({ name: _name, ...expected }) => {
    const reference = collectItemReferences(state()).find(
      (entry) => entry.itemId === 'target' && entry.where === expected.where,
    )
    const { locator, ...fields } = expected
    expect(reference).toMatchObject(fields)
    expect(reference?.locator).toEqual(locator)
    if (expected.locator === undefined)
      expect(reference?.unavailableReason).toEqual(expect.any(String))
  })

  test.each([
    ['all 条件', 'read', 'scriptChunks["recursive"].scripts["shared/recursive"]0/0.cond.of[0]'],
    [
      'branch.else',
      'reward',
      'scriptChunks["recursive"].scripts["shared/recursive"]0/0/else/0.itemId',
    ],
    [
      'confirm.onNo',
      'lose',
      'scriptChunks["recursive"].scripts["shared/recursive"]0/1/onNo/0.itemId',
    ],
    [
      'startBattle.onLose',
      'reward',
      'scriptChunks["recursive"].scripts["shared/recursive"]0/2/onLose/0.itemId',
    ],
    [
      'startBattle.onFlee',
      'lose',
      'scriptChunks["recursive"].scripts["shared/recursive"]0/2/onFlee/0.itemId',
    ],
    [
      'teleportOut.onFail',
      'reward',
      'scriptChunks["recursive"].scripts["shared/recursive"]0/3/onFail/0.itemId',
    ],
  ])('递归控制流 %s 被扫描', (_name, access, where) => {
    expect(
      collectItemReferences(recursiveState()).find(
        (reference) => reference.itemId === 'target' && reference.where === where,
      ),
    ).toMatchObject({
      source: 'script',
      access,
      locator: { kind: 'shared-script', scriptId: 'shared/recursive' },
    })
  })

  test('四种页切换内联脚本含 entry.prepare，均显式标为暂不可深链', () => {
    const current = state()
    type PageSwitchBase =
      | { kind: 'setEntityAuto' | 'setEntityTrigger'; entity: string }
      | { kind: 'setSceneOnEnter' | 'setSceneOnTeleport'; scene: string }
    const nested = (command: PageSwitchBase, prepare = false): Command =>
      ({
        ...command,
        stages: [
          prepare
            ? {
                entry: {
                  prepare: [{ kind: 'giveItem', itemId: 'target' }],
                  reveal: { kind: 'cut' },
                },
                body: [],
              }
            : { body: [{ kind: 'giveItem', itemId: 'target' }] },
        ],
      }) as Command
    current.scenes[0]!.onEnter!.push({
      body: [
        nested({ kind: 'setEntityAuto', entity: 'e' }, true),
        nested({ kind: 'setEntityTrigger', entity: 'e' }),
        nested({ kind: 'setSceneOnEnter', scene: 's' }),
        nested({ kind: 'setSceneOnTeleport', scene: 's' }),
      ],
    })

    const nestedReferences = collectItemReferences(current).filter(
      (reference) =>
        reference.itemId === 'target' && reference.where.startsWith('scenes[0](s).onEnter1/'),
    )
    expect(nestedReferences.map((reference) => reference.where)).toEqual([
      'scenes[0](s).onEnter1/0/stages/0/entry/prepare/0.itemId',
      'scenes[0](s).onEnter1/1/stages/0/body/0.itemId',
      'scenes[0](s).onEnter1/2/stages/0/body/0.itemId',
      'scenes[0](s).onEnter1/3/stages/0/body/0.itemId',
    ])
    for (const reference of nestedReferences) {
      expect(reference.locator).toBeUndefined()
      expect(reference.unavailableReason).toContain('嵌套脚本')
    }
  })

  test('覆盖全部脚本页、共享脚本与嵌套/不可跳来源', () => {
    const refs = collectItemReferences(state()).filter((reference) => reference.itemId === 'target')

    expect(refs.some((reference) => reference.label === 's 进场脚本')).toBe(true)
    expect(refs.some((reference) => reference.label.includes('第 2 页'))).toBe(true)
    expect(
      refs.some(
        (reference) =>
          reference.locator?.kind === 'shared-script' && reference.locator.commandPath === '0/0',
      ),
    ).toBe(true)
    const nestedConditions = refs.filter(
      (reference) => reference.label === 's 进场脚本' && reference.access === 'read',
    )
    expect(nestedConditions.map((reference) => reference.where)).toEqual([
      'scenes[0](s).onEnter0/0.cond.of[0]',
      'scenes[0](s).onEnter0/0.cond.of[1].cond',
    ])
    expect(new Set(nestedConditions.map((reference) => reference.where)).size).toBe(2)
    expect(
      refs.some(
        (reference) =>
          reference.where.includes('/stages/') &&
          reference.locator === undefined &&
          reference.unavailableReason?.includes('嵌套脚本'),
      ),
    ).toBe(true)
    expect(
      refs.some(
        (reference) =>
          reference.label.includes('战败命令') && reference.unavailableReason !== undefined,
      ),
    ).toBe(true)
  })

  test('覆盖数据域、运行态与其他物品的 use 边', () => {
    const refs = collectItemReferences(state()).filter((reference) => reference.itemId === 'target')
    const sources = new Set(refs.map((reference) => reference.source))

    expect(sources).toEqual(
      new Set([
        'scene',
        'script',
        'shop',
        'entry',
        'actor',
        'skill',
        'enemy',
        'poison',
        'item',
        'save',
      ]),
    )
    expect(refs.some((reference) => reference.where.includes('.use.effects'))).toBe(true)
    expect(refs.some((reference) => reference.label.includes('战后剧情'))).toBe(true)
  })

  test('敌人战后分支递归扫描物品条件与两臂物品写入', () => {
    const current = state()
    current.enemies![0]!.onDefeated = [
      {
        kind: 'branch',
        cond: { kind: 'hasItem', itemId: 'target' },
        then: [{ kind: 'giveItem', itemId: 'target', count: 2 }],
        else: [{ kind: 'loseItem', itemId: 'target', count: 3 }],
      },
    ]
    expect(
      collectItemReferences(current)
        .filter((reference) => reference.source === 'enemy' && reference.label.includes('战后剧情'))
        .map(({ access, where }) => ({ access, where })),
    ).toEqual([
      {
        access: 'read',
        where: 'enemies[0](enemy).onDefeated/0.cond',
      },
      {
        access: 'reward',
        where: 'enemies[0](enemy).onDefeated/0/then/0.itemId',
      },
      {
        access: 'lose',
        where: 'enemies[0](enemy).onDefeated/0/else/0.itemId',
      },
    ])
  })

  test('删除守卫排除随 owner 一起删除的自有边，但保留外部物品边', () => {
    const current = state()
    expect(
      blockingItemReferences(current, 'target').some(
        (reference) => reference.ownerItemId === 'target',
      ),
    ).toBe(false)
    expect(
      blockingItemReferences(current, 'target').some(
        (reference) => reference.ownerItemId === 'owner',
      ),
    ).toBe(true)
  })

  test('canonical PAL 天书引用保留作者位置与可跳转 locator', () => {
    const filler = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        kind: 'setFlag' as const,
        flag: `filler-${index}`,
        value: true,
      }))
    const canonical: ScriptEditorState = {
      scenes: [
        {
          id: 's151',
          mapId: 'm151',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
          hooks: {
            onEnter: {
              initial: 'default',
              variants: {
                default: {
                  label: '默认进场行为',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'initial',
                    stages: [
                      {
                        id: 'initial',
                        body: [...filler(60), { kind: 'loseItem', itemId: '290', count: 1 }],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          id: 's154',
          mapId: 'm154',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'e2493',
              sprite: 'npc',
              pos: { col: 0, row: 0, height: 0 },
              behaviors: {
                trigger: {
                  'legacy-001': {
                    label: '触发行为 1',
                    order: 0,
                    flow: {
                      kind: 'stages',
                      initial: 'initial',
                      stages: [
                        {
                          id: 'initial',
                          body: [...filler(40), { kind: 'giveItem', itemId: '290', count: 1 }],
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      ],
      items: [],
      sharedScripts: {},
    }

    const references = collectCanonicalItemReferences(canonical).filter(
      (reference) => reference.itemId === '290',
    )
    expect(references).toHaveLength(2)
    expect(references).toEqual([
      expect.objectContaining({
        access: 'lose',
        source: 'scene',
        label: '场景 s151 / 进场脚本“默认进场行为” / 步骤 1 / 脚本正文 / 第 61 条指令',
        detail: '失去 ×1',
        locator: {
          kind: 'canonical-script',
          reference: expect.objectContaining({
            locator: expect.objectContaining({
              owner: {
                kind: 'scene-hook',
                sceneId: 's151',
                slot: 'onEnter',
                hookId: 'default',
              },
              container: { kind: 'step', stepId: 'initial', section: 'body' },
              commandPath: '60',
            }),
          }),
        },
      }),
      expect.objectContaining({
        access: 'reward',
        source: 'scene',
        label: '场景 s154 / 实体 e2493 / 交互脚本“触发行为 1” / 步骤 1 / 脚本正文 / 第 41 条指令',
        detail: '获得 ×1',
        locator: {
          kind: 'canonical-script',
          reference: expect.objectContaining({
            locator: expect.objectContaining({
              owner: {
                kind: 'entity-behavior',
                sceneId: 's154',
                entityId: 'e2493',
                channel: 'trigger',
                behaviorId: 'legacy-001',
              },
              container: { kind: 'step', stepId: 'initial', section: 'body' },
              commandPath: '40',
            }),
          }),
        },
      }),
    ])
  })

  test('canonical 连续流程条件参与删除守卫，物品私有脚本自有边不阻止自删除', () => {
    const canonical: ScriptEditorState = {
      scenes: [
        {
          id: 's',
          mapId: 'm',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'e',
              sprite: 'npc',
              pos: { col: 0, row: 0, height: 0 },
              behaviors: {
                trigger: {
                  talk: {
                    label: '交谈',
                    order: 0,
                    flow: {
                      kind: 'stateMachine',
                      machine: {
                        id: 'dialog',
                        label: '连续交谈',
                        initial: 'start',
                        states: {
                          start: {
                            label: '开始',
                            body: [{ kind: 'confirm', id: 'choice', onNo: [] }],
                            next: {
                              kind: 'commandOutcome',
                              commandId: 'choice',
                              command: 'confirm',
                              outcome: 'no',
                              then: {
                                kind: 'branch',
                                cond: { kind: 'flag', flag: 'outer', is: true },
                                then: {
                                  kind: 'branch',
                                  cond: { kind: 'hasItem', itemId: 'target' },
                                  then: { kind: 'stay' },
                                  else: { kind: 'stay' },
                                },
                                else: { kind: 'stay' },
                              },
                              else: { kind: 'stay' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
      items: [
        {
          id: 'target',
          name: '目标',
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
                  body: [{ kind: 'giveItem', itemId: 'target' }],
                },
              },
            ],
          },
        },
      ],
      sharedScripts: {},
    }

    const references = collectCanonicalItemReferences(canonical).filter(
      (reference) => reference.itemId === 'target',
    )
    expect(references).toHaveLength(2)
    expect(references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          access: 'read',
          label: expect.stringContaining('连续流程“连续交谈”'),
          unavailableReason: expect.stringContaining('状态去向条件'),
          where: expect.stringContaining('.next.then.then.cond'),
        }),
        expect.objectContaining({
          access: 'reward',
          ownerItemId: 'target',
          locator: expect.objectContaining({ kind: 'canonical-script' }),
        }),
      ]),
    )
    expect(references.find((reference) => reference.access === 'read')?.locator).toBeUndefined()
    expect(
      blockingItemReferences(state(), 'target', canonical).some(
        (reference) =>
          reference.ownerItemId === 'target' && reference.locator?.kind === 'canonical-script',
      ),
    ).toBe(false)
  })
})
