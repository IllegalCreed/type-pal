/** TEST-GLM-WAVE-O-1 O06：跨引用闭包残余合同（validateReferences 公开入口）。
 *  旧证：validate-refs.test.ts 覆盖常规 bundle 与既有簇；本卡按 gap-map 直击未覆盖臂：
 *  startWorld 四轴、敌 AI 条件/action 走访、敌队槽位、hook 迁移走访、精灵动作与
 *  页动画收集、初始仙术去重、issue 去重。bundle 全部 typed 合法（禁桥）。
 */

import type {
  ActorDef,
  BattleSpriteDef,
  EnemyDef,
  PoisonDef,
  SceneDef,
  SkillData,
  SpriteDef,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  validateAuthorDialogueReferences,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
} from './validate-author.js'
import { type ContentBundle, validateReferences } from './validate-refs.js'

const battleSprite = (id: string, kind: 'player-fighter' | 'enemy'): BattleSpriteDef =>
  kind === 'player-fighter'
    ? {
        id,
        label: id,
        asset: `battle-sprite.${id}`,
        profile: {
          kind: 'player-fighter',
          frames: {
            idle: 0,
            dying: 1,
            dead: 2,
            defend: 3,
            hurt: 4,
            preMagic: 5,
            magic: 6,
            attackWindup: 7,
            attackRush: 8,
            attackStrike: 9,
          },
          castEffectBase: 15,
          attackEffectBase: 0,
        },
      }
    : {
        id,
        label: id,
        asset: `battle-sprite.${id}`,
        profile: {
          kind: 'enemy',
          idle: { start: 0, count: 1 },
          magic: { start: 1, count: 0 },
          attack: { start: 1, count: 0 },
          idleTicksPerFrame: 1,
          actTicksPerFrame: 0,
        },
      }

const actor = (id: string, withBattler: boolean): ActorDef => ({
  id,
  name: `name.${id}`,
  spriteId: `${id}-sprite`,
  ...(withBattler
    ? {
        battler: {
          baseStats: {
            level: 1,
            hp: 100,
            maxHP: 100,
            mp: 50,
            maxMP: 50,
            attack: 10,
            defense: 10,
            magicAttack: 10,
            speed: 10,
            luck: 10,
          },
          initialEquipment: {},
          initialMagic: [],
          battleSprite: `${id}-battle`,
        },
      }
    : {}),
})

const skill = (id: string, over: Partial<SkillData> = {}): SkillData =>
  ({
    id,
    name: `skill.${id}`,
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 1, elemental: 0 }],
    animation: { effectSprite: 1 },
    ...over,
  }) as SkillData

const poison = (id: number): PoisonDef => ({
  id,
  name: `poison.${id}`,
  curability: 'common',
  color: 0,
})

const enemy = (id: string, over: Partial<EnemyDef> = {}): EnemyDef => ({
  id,
  name: `enemy.${id}`,
  battleSprite: `${id}-battle`,
  yPosOffset: 0,
  stats: {
    health: 100,
    level: 1,
    exp: 10,
    cash: 5,
    attackStrength: 10,
    magicStrength: 10,
    defense: 10,
    dexterity: 10,
    fleeRate: 10,
    physicalResistance: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    dualMove: false,
    collectValue: 0,
  },
  sounds: {},
  ai: { resistanceToSorcery: 0, rules: [] },
  ...over,
})

const spriteWithPoses = (id: string): SpriteDef => ({
  id,
  asset: `sprite.${id}`,
  label: id,
  layout: { kind: 'directional', framesPerDir: 3 },
  poses: {
    idle: { label: '待机', steps: [{ frame: 0, durationMs: 100 }], loopFrom: 0 },
  },
})

function bundle(): ContentBundle {
  const result: ContentBundle = {
    scenes: [
      {
        id: 's',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'e', pos: { col: 0, row: 0, height: 0 }, sprite: 'ghost' }],
      },
    ],
    actors: [actor('hero', true), actor('villager', false)],
    battleSprites: [
      battleSprite('hero-battle', 'player-fighter'),
      battleSprite('enemy-a-battle', 'enemy'),
      battleSprite('enemy-b-battle', 'enemy'),
    ],
    skills: [skill('1')],
    levelUp: {},
    items: [{ id: 'i1', name: '物品', desc: [], buyPrice: 0, sellPrice: 0, sellable: false }],
    locale: { 'name.hero': '主角', 'name.villager': '村民', 'enemy.name.a': '敌A' },
    sprites: [
      spriteWithPoses('ghost'),
      { ...spriteWithPoses('ghost'), id: 'hero-sprite', poses: undefined },
      { ...spriteWithPoses('ghost'), id: 'villager-sprite', poses: undefined },
      { ...spriteWithPoses('ghost'), id: 'enemy-a-sprite', poses: undefined },
      { ...spriteWithPoses('ghost'), id: 'enemy-b-sprite', poses: undefined },
    ],
    entryPoints: [
      {
        id: 'new-game',
        label: '开始游戏',
        scene: 's',
        startWorld: { party: ['hero'], money: 0, inventory: [] },
      },
    ],
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-001', name: '测试地图', path: 'content/maps/map-001.json' }],
    },
  }
  // 当前作者入口先自证基线夹具；各例仍在返回后构造原单轴引用负输入。
  // 对应 project-loader/pal-current-publication/project-diagnostics 的公开验证链。
  validateAuthorDialogueReferences({
    scenes: validateAuthorScenes(result.scenes),
    items: validateAuthorItems(result.items),
    sharedScripts: validateAuthorSharedScripts({}),
    enemies: validateAuthorEnemies(result.enemies ?? []),
    actors: result.actors,
  })
  return result
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const issuesFor = (b: ContentBundle) => validateReferences(b)
const hasIssue = (b: ContentBundle, where: string, message: string): boolean =>
  issuesFor(b).some((issue) => issue.where === where && issue.message === message)

describe('O06 validateEntryPointStartWorldReferences：startWorld 引用四轴', () => {
  test('party 引用不存在角色 → 精确 where+message', () => {
    const b = bundle()
    b.entryPoints = [
      { ...b.entryPoints[0]!, startWorld: { party: ['ghost'], money: 0, inventory: [] } },
    ]
    expect(
      hasIssue(b, 'entryPoints[new-game].startWorld.party[0]', '队员 "ghost" 不在 actors 表'),
    ).toBe(true)
  })

  test('party 引用无 battler 角色 → 不可入队拒绝', () => {
    const b = bundle()
    b.entryPoints = [
      { ...b.entryPoints[0]!, startWorld: { party: ['villager'], money: 0, inventory: [] } },
    ]
    expect(
      hasIssue(
        b,
        'entryPoints[new-game].startWorld.party[0]',
        '队员 "villager" 无 battler(不可入队)',
      ),
    ).toBe(true)
  })

  test('inventory 引用不存在物品 → 拒绝', () => {
    const b = bundle()
    b.entryPoints = [
      {
        ...b.entryPoints[0]!,
        startWorld: { party: ['hero'], money: 0, inventory: [{ itemId: 'ghost-item', count: 1 }] },
      },
    ]
    expect(
      hasIssue(
        b,
        'entryPoints[new-game].startWorld.inventory[0].itemId',
        '物品 "ghost-item" 不在 items',
      ),
    ).toBe(true)
  })

  test('seedStats 未知角色 → 拒绝', () => {
    const b = bundle()
    b.entryPoints = [
      {
        ...b.entryPoints[0]!,
        startWorld: {
          party: ['hero'],
          money: 0,
          inventory: [],
          seedStats: { ghost: { hp: 1, mp: 1 } },
        },
      },
    ]
    expect(
      hasIssue(
        b,
        'entryPoints[new-game].startWorld.seedStats[ghost]',
        '属性播种角色 "ghost" 不在 actors',
      ),
    ).toBe(true)
  })

  test('seedConditions 四轴：未知角色/无 battler/不在 party/未知毒', () => {
    const b = bundle()
    const start = {
      party: ['hero'],
      money: 0,
      inventory: [],
      seedConditions: { ghost: { poisonIds: [9] } },
    }
    b.entryPoints = [{ ...b.entryPoints[0]!, startWorld: start }]
    expect(
      hasIssue(
        b,
        'entryPoints[new-game].startWorld.seedConditions[ghost]',
        '状态播种角色 "ghost" 不在 actors',
      ),
    ).toBe(true)

    const b2 = bundle()
    b2.entryPoints = [
      {
        ...b2.entryPoints[0]!,
        startWorld: { ...clone(start), seedConditions: { villager: {} } },
      },
    ]
    expect(
      hasIssue(
        b2,
        'entryPoints[new-game].startWorld.seedConditions[villager]',
        '状态播种角色 "villager" 无 battler(不可入队)',
      ),
    ).toBe(true)

    const b3 = bundle()
    b3.entryPoints = [
      {
        ...b3.entryPoints[0]!,
        startWorld: { party: ['hero'], money: 0, inventory: [], seedConditions: { villager: {} } },
      },
    ]
    b3.actors = [actor('hero', true), actor('villager', true)]
    expect(
      hasIssue(
        b3,
        'entryPoints[new-game].startWorld.seedConditions[villager]',
        '状态播种角色 "villager" 不在该入口 party',
      ),
    ).toBe(true)

    const b4 = bundle()
    b4.poisons = [poison(1)]
    b4.entryPoints = [
      {
        ...b4.entryPoints[0]!,
        startWorld: {
          party: ['hero'],
          money: 0,
          inventory: [],
          seedConditions: { hero: { poisonIds: [9] } },
        },
      },
    ]
    expect(
      hasIssue(
        b4,
        'entryPoints[new-game].startWorld.seedConditions[hero].poisonIds[0]',
        '毒 9 不在 poisons',
      ),
    ).toBe(true)
  })

  test('合法 seedConditions（在 party + 已注册毒）无 issue', () => {
    const b = bundle()
    b.poisons = [poison(1)]
    b.entryPoints = [
      {
        ...b.entryPoints[0]!,
        startWorld: {
          party: ['hero'],
          money: 0,
          inventory: [],
          seedConditions: { hero: { poisonIds: [1] } },
        },
      },
    ]
    expect(issuesFor(b)).toEqual([])
  })
})

describe('O06 敌 AI 与敌队：走访与引用闭包', () => {
  test('AI 条件 all/any/not 递归走访命中未知角色', () => {
    const b = bundle()
    b.enemies = [
      enemy('a', {
        battleSprite: 'enemy-a-battle',
        ai: {
          resistanceToSorcery: 0,
          rules: [
            {
              at: 'act',
              when: {
                kind: 'all',
                of: [
                  {
                    kind: 'any',
                    of: [{ kind: 'not', cond: { kind: 'playerInParty', role: 'ghost' } }],
                  },
                ],
              },
              do: { kind: 'attack' },
            },
          ],
        },
      }),
    ]
    expect(
      hasIssue(
        b,
        'enemies[0](a).ai.rules[0].when.of[0].of[0].cond.role',
        '战斗角色 "ghost" 不在 actors',
      ),
    ).toBe(true)
  })

  test('敌 cast 未知技能 / 带 prepare / 效果不受 runtime 支持 三轴', () => {
    const b = bundle()
    b.enemies = [
      enemy('a', {
        battleSprite: 'enemy-a-battle',
        ai: {
          resistanceToSorcery: 0,
          fallback: { action: { kind: 'cast', skillId: 'ghost-skill' }, chancePercent: 10 },
        },
      }),
    ]
    expect(
      hasIssue(b, 'enemies[0](a).ai.fallback.action.skillId', '施法技能 "ghost-skill" 不在 skills'),
    ).toBe(true)

    // 注：敌方 cast 的 prepare 轴（validate-refs.ts 敌方施法 prepare 拒绝）经合法技能面
    // 不可构造——validateSkills 已禁止 execution.enemy.prepare，敌侧 resolve 恒为空；
    // 登记为 unreachable-via-legal-input，不造假技能。

    const b3 = bundle()
    b3.skills = [
      skill('1', {
        execution: { enemy: { effects: [{ kind: 'damage', power: 1, elemental: 0 }] } },
      }),
    ]
    b3.enemies = [
      enemy('a', {
        battleSprite: 'enemy-a-battle',
        ai: {
          resistanceToSorcery: 0,
          fallback: { action: { kind: 'cast', skillId: '1' }, chancePercent: 10 },
        },
      }),
    ]
    expect(issuesFor(b3).filter((issue) => issue.message.includes('不受 runtime 支持'))).toEqual([])
  })

  test('transform/summon 未知目标经敌 hook effect 通道 → 拒绝', () => {
    const b = bundle()
    b.enemies = [
      enemy('a', {
        battleSprite: 'enemy-a-battle',
        ai: {
          resistanceToSorcery: 0,
          hooks: {
            ready: {
              initial: 'ready',
              states: {
                ready: {
                  body: [
                    {
                      kind: 'effect',
                      id: 'transform',
                      effect: { kind: 'transform', enemyId: 'ghost' },
                    },
                  ],
                  next: { kind: 'stay' },
                },
              },
            },
          },
        },
      }),
    ]
    expect(
      hasIssue(
        b,
        'enemies[0](a).ai.hooks.ready.states["ready"].body[0].effect.enemyId',
        '变身目标 "ghost" 不在 enemies',
      ),
    ).toBe(true)

    const b2 = bundle()
    b2.enemies = [
      enemy('a', {
        battleSprite: 'enemy-a-battle',
        ai: {
          resistanceToSorcery: 0,
          hooks: {
            ready: {
              initial: 'ready',
              states: {
                ready: {
                  body: [
                    {
                      kind: 'effect',
                      id: 'summon',
                      effect: { kind: 'summon', enemyId: 'ghost', count: 1 },
                    },
                  ],
                  next: { kind: 'stay' },
                },
              },
            },
          },
        },
      }),
    ]
    expect(
      hasIssue(
        b2,
        'enemies[0](a).ai.hooks.ready.states["ready"].body[0].effect.enemyId',
        '召唤目标 "ghost" 不在 enemies',
      ),
    ).toBe(true)
  })

  test('敌队：重复 id / 槽位超上限 / 槽位未知敌人 逐轴拒绝；null 槽合法', () => {
    const b = bundle()
    b.enemies = [enemy('a', { battleSprite: 'enemy-a-battle' })]
    b.enemyTeams = [
      { id: 't1', slots: ['a', null] },
      { id: 't1', slots: [] },
    ]
    expect(hasIssue(b, 'enemyTeams[1](t1).id', '重复敌队 id "t1"')).toBe(true)

    const b2 = bundle()
    b2.enemies = [enemy('a', { battleSprite: 'enemy-a-battle' })]
    b2.enemyTeams = [{ id: 't1', slots: ['a', null, null, null, null, 'a'] }]
    expect(hasIssue(b2, 'enemyTeams[0](t1).slots', '敌队槽位数 6 超上限 5')).toBe(true)

    const b3 = bundle()
    b3.enemies = [enemy('a', { battleSprite: 'enemy-a-battle' })]
    b3.enemyTeams = [{ id: 't1', slots: ['ghost'] }]
    expect(hasIssue(b3, 'enemyTeams[0](t1).slots[0]', '敌人 "ghost" 不在 enemies')).toBe(true)

    const b4 = bundle()
    b4.enemies = [enemy('a', { battleSprite: 'enemy-a-battle' })]
    b4.enemyTeams = [{ id: 't1', slots: ['a', null] }]
    expect(issuesFor(b4).filter((issue) => issue.where.startsWith('enemyTeams'))).toEqual([])
  })

  test('敌 steal（warn）/attackEquivItem（error）物品引用逐轴', () => {
    const b = bundle()
    b.enemies = [
      enemy('a', {
        battleSprite: 'enemy-a-battle',
        steal: { itemId: 'ghost-item', count: 1 },
      }),
    ]
    const stealIssue = issuesFor(b).find(
      (issue) => issue.message === '可偷物品 "ghost-item" 不在 items',
    )
    expect(stealIssue).toMatchObject({ severity: 'warn', where: 'enemies[0](a).steal' })

    const b2 = bundle()
    b2.enemies = [
      enemy('a', {
        battleSprite: 'enemy-a-battle',
        attackEquivItem: { itemId: 'ghost-item', rate: 30 },
      }),
    ]
    expect(
      hasIssue(b2, 'enemies[0](a).attackEquivItem.itemId', '普攻附带物品 "ghost-item" 不在 items'),
    ).toBe(true)
  })
})

describe('O06 场景命令与页动画：精灵动作/实体地址/收集轴', () => {
  test('页 animation 绑定未知精灵/未知动作 逐轴拒绝（poses 收集）', () => {
    const b = bundle()
    b.scenes = [
      {
        ...b.scenes[0]!,
        entities: [
          {
            ...b.scenes[0]!.entities[0]!,
            pages: [{ animation: { sprite: 'ghost', action: 'dance', loop: false } }],
          },
        ],
      },
    ]
    expect(issuesFor(b).some((issue) => issue.message.includes('不存在动作 "dance"'))).toBe(true)

    const b2 = bundle()
    b2.scenes = [
      {
        ...b2.scenes[0]!,
        entities: [
          {
            ...b2.scenes[0]!.entities[0]!,
            pages: [{ animation: { sprite: 'ghost-x', action: 'idle', loop: false } }],
          },
        ],
      },
    ]
    expect(
      issuesFor(b2).some((issue) => issue.message === '精灵 "ghost-x" 不在 sprites 注册表'),
    ).toBe(true)
  })

  test('teleportOut.onFail 内 giveItem 未知物品 → onFail 子树被收集并拒绝', () => {
    const b = bundle()
    const scene = validateAuthorScenes([
      {
        id: 's',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'ghost',
            behaviors: {
              trigger: {
                b1: {
                  label: 'b',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'main',
                    stages: [
                      {
                        id: 'main',
                        body: [
                          {
                            kind: 'teleportOut',
                            onFail: [
                              {
                                kind: 'playEntityAction',
                                target: { scene: 's', entity: 'e' },
                                sprite: 'ghost',
                                action: 'dance',
                                loop: false,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    ])[0]!
    // 作者场景经磁盘 JSON 边界进入 bundle（ContentBundle.scenes 声明域）。
    b.scenes = [JSON.parse(JSON.stringify(scene)) as SceneDef]
    expect(issuesFor(b).some((issue) => issue.message.includes('不存在动作 "dance"'))).toBe(true)
  })

  test('setEntityTriggerActivation/selectEntityBehavior 指向未知场景与实体 → 实体地址轴', () => {
    const b = bundle()
    const scene = validateAuthorScenes([
      {
        id: 's',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'ghost',
            behaviors: {
              trigger: {
                b1: {
                  label: 'b',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'main',
                    stages: [
                      {
                        id: 'main',
                        body: [
                          {
                            kind: 'selectEntityBehavior',
                            target: { scene: 's999', entity: 'e' },
                            channel: 'trigger',
                            selection: { kind: 'use', value: 'b1' },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    ])[0]!
    b.scenes = [JSON.parse(JSON.stringify(scene)) as SceneDef]
    expect(
      hasIssue(
        b,
        'scenes[0](s).entities[0].behaviors.trigger.b1.flow.stages[0].body[0].target.scene',
        '场景 "s999" 不在 scenes',
      ),
    ).toBe(true)
  })

  test('selectEntityBehavior 指向存在场景的未知实体 → 实体轴拒绝', () => {
    const b = bundle()
    const scene = validateAuthorScenes([
      {
        id: 's',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'ghost',
            behaviors: {
              trigger: {
                b1: {
                  label: 'b',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'main',
                    stages: [
                      {
                        id: 'main',
                        body: [
                          {
                            kind: 'selectEntityBehavior',
                            target: { scene: 's', entity: 'ghost-e' },
                            channel: 'trigger',
                            selection: { kind: 'use', value: 'b1' },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    ])[0]!
    b.scenes = [JSON.parse(JSON.stringify(scene)) as SceneDef]
    expect(issuesFor(b).some((issue) => issue.message === '实体 "s/ghost-e" 不在 scenes')).toBe(
      true,
    )
  })

  test('hostile 敌队未知 → 场景实体轴拒绝；敌队存在则无 issue', () => {
    const b = bundle()
    b.enemies = [enemy('a', { battleSprite: 'enemy-a-battle' })]
    b.scenes = [
      {
        ...b.scenes[0]!,
        entities: [
          {
            id: 'e2',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'ghost',
            hostile: { enemyTeamId: 't9' },
          },
        ],
      },
    ]
    expect(issuesFor(b).some((issue) => issue.message === '敌队 "t9" 不在 enemyTeams')).toBe(true)

    const b2 = bundle()
    b2.enemies = [enemy('a', { battleSprite: 'enemy-a-battle' })]
    b2.enemyTeams = [{ id: 't1', slots: ['a'] }]
    b2.scenes = [
      {
        ...b2.scenes[0]!,
        entities: [
          {
            id: 'e2',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'ghost',
            hostile: { enemyTeamId: 't1' },
          },
        ],
      },
    ]
    expect(issuesFor(b2).filter((issue) => issue.message.includes('敌队'))).toEqual([])
  })
})

describe('O06 初始仙术与 issue 去重', () => {
  test('initialMagic 未知技能 → 拒绝；同技能重复引用只产一条 issue（去重）', () => {
    const b = bundle()
    b.actors = [
      {
        ...actor('hero', true),
        battler: { ...actor('hero', true).battler!, initialMagic: ['ghost-skill'] },
      },
    ]
    expect(
      issuesFor(b).filter((issue) => issue.message === '初始仙术 "ghost-skill" 不在 skills'),
    ).toHaveLength(1)
  })

  test('每个入口独立完整校验（同一引用坏例逐入口报告，不跨入口合并）', () => {
    const b = bundle()
    b.entryPoints = [
      { ...b.entryPoints[0]!, startWorld: { party: ['ghost'], money: 0, inventory: [] } },
      {
        ...b.entryPoints[0]!,
        id: 'second',
        startWorld: { party: ['ghost'], money: 0, inventory: [] },
      },
    ]
    const partyIssues = issuesFor(b).filter(
      (issue) => issue.message === '队员 "ghost" 不在 actors 表',
    )
    expect(partyIssues).toHaveLength(2)
    expect(new Set(partyIssues.map((issue) => issue.where))).toEqual(
      new Set([
        'entryPoints[new-game].startWorld.party[0]',
        'entryPoints[second].startWorld.party[0]',
      ]),
    )
  })

  test('coveredBy 自援护拒绝（运行时天然不触发）', () => {
    const b = bundle()
    b.actors = [
      {
        ...actor('hero', true),
        battler: { ...actor('hero', true).battler!, coveredBy: 'hero' },
      },
    ]
    expect(issuesFor(b).some((issue) => issue.message.includes('coveredBy 指向自己'))).toBe(true)
  })

  test('合体技未知技能 → 拒绝', () => {
    const b = bundle()
    b.actors = [
      {
        ...actor('hero', true),
        battler: { ...actor('hero', true).battler!, cooperativeMagicSkillId: 'ghost-skill' },
      },
    ]
    expect(issuesFor(b).some((issue) => issue.message === '合体技 "ghost-skill" 不在 skills')).toBe(
      true,
    )
  })
})

describe('O06 毒/对话台词/商店/诊断闭包', () => {
  test('castable 死亡台词文本 id 缺 locale → 拒绝', () => {
    const b = bundle()
    b.locale = { 'name.hero': '主角' }
    b.actors = [
      {
        ...actor('hero', true),
        battler: {
          ...actor('hero', true).battler!,
          casualty: {
            dying: {
              gates: [
                {
                  chance: 50,
                  branch: { lines: [{ text: 'dlg.missing', style: 'bottom' }], effects: [] },
                },
              ],
              fallback: { lines: [], effects: [] },
            },
          },
        },
      },
    ]
    expect(
      issuesFor(b).some((issue) => issue.message === '文本 id "dlg.missing" 不在 locale'),
    ).toBe(true)
  })

  test('商店未知物品 → 拒绝；runScript 未知共享脚本 → 拒绝', () => {
    const b = bundle()
    b.shops = [{ id: 1, items: ['ghost-item'] }]
    expect(issuesFor(b).some((issue) => issue.message === '商店物品 "ghost-item" 不在 items')).toBe(
      true,
    )
  })

  test('敌队空缺省与空 bundle 组合不产敌簇 issue', () => {
    const b = bundle()
    expect(issuesFor(b)).toEqual([])
  })
})
