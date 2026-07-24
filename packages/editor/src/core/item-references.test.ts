import type { Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { blockingItemReferences, collectItemReferences } from './item-references.js'

function state(): EditorState {
  return {
    manifest: {
      id: 'refs',
      name: 'refs',
      contentVersion: 4,
      entryScene: 's',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: {
        party: [],
        money: 0,
        learnedSkills: {},
        inventory: [{ itemId: 'target', count: 1 }],
      },
      entryPoints: [
        {
          id: 'chapter-2',
          label: '第二章',
          scene: 's',
          startWorld: {
            party: [],
            money: 0,
            learnedSkills: {},
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
        throw: {
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
        choreography: [{ at: 'battleStart', body: [{ kind: 'giveItem', itemId: 'target' }] }],
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
          team: 1,
          onLose: [{ kind: 'giveItem', itemId: 'target' }],
          onFlee: [{ kind: 'loseItem', itemId: 'target' }],
          choreography: [
            {
              at: 'battleStart',
              body: [{ kind: 'giveItem', itemId: 'target' }],
            },
          ],
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
      name: '默认开局背包',
      source: 'entry',
      access: 'hold',
      where: 'manifest.startWorld.inventory[0].itemId',
      locator: { kind: 'entry-point' },
    },
    {
      name: '命名入口背包',
      source: 'entry',
      access: 'hold',
      where: 'manifest.entryPoints[0](chapter-2).startWorld.inventory[0].itemId',
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
      name: '敌人战斗演出',
      source: 'enemy',
      access: 'reward',
      where: 'enemies[0](enemy).choreography[0].body/0.itemId',
      locator: undefined,
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
      where: 'items[1](owner).throw.effects[0].rewards[0].itemId',
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

  test('startBattle.choreography 引用可删除守卫但不伪装成可深链', () => {
    const reference = collectItemReferences(recursiveState()).find(
      (entry) =>
        entry.itemId === 'target' &&
        entry.where ===
          'scriptChunks["recursive"].scripts["shared/recursive"]0/2/choreography/0/body/0.itemId',
    )

    expect(reference).toMatchObject({
      source: 'script',
      access: 'reward',
      locator: undefined,
      unavailableReason: expect.stringContaining('战斗编舞脚本'),
    })
    expect(blockingItemReferences(recursiveState(), 'target')).toContainEqual(reference)
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

  test('运行态场景脚本覆写进入只读保存引用与删除守卫', () => {
    const current = state()
    current.worlds![0]!.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      sceneScriptOverrides: {
        s: {
          onEnter: [{ body: [{ kind: 'loseItem', itemId: 'target' }] }],
          onTeleport: [{ body: [{ kind: 'giveItem', itemId: 'target' }] }],
        },
      },
    }

    const references = collectItemReferences(current).filter((reference) =>
      reference.where.startsWith('worlds[0].script.sceneScriptOverrides["s"]'),
    )
    expect(references).toEqual([
      expect.objectContaining({
        source: 'save',
        access: 'lose',
        where: 'worlds[0].script.sceneScriptOverrides["s"].onEnter0/0.itemId',
        locator: undefined,
        unavailableReason: expect.stringContaining('只读'),
      }),
      expect.objectContaining({
        source: 'save',
        access: 'reward',
        where: 'worlds[0].script.sceneScriptOverrides["s"].onTeleport0/0.itemId',
        locator: undefined,
        unavailableReason: expect.stringContaining('只读'),
      }),
    ])
    expect(
      blockingItemReferences(current, 'target').some((reference) =>
        reference.where.includes('sceneScriptOverrides'),
      ),
    ).toBe(true)
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

  test('覆盖数据域、运行态、其他物品的 use 与 throw 边', () => {
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
    expect(refs.some((reference) => reference.where.includes('.throw.effects'))).toBe(true)
    expect(refs.some((reference) => reference.label.includes('战斗演出'))).toBe(true)
    expect(refs.some((reference) => reference.label.includes('战后剧情'))).toBe(true)
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
})
