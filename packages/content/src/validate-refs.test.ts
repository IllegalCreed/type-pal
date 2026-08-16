import { describe, expect, test } from 'vitest'
import {
  type ContentBundle,
  collectBattleSpriteDefinitionReferences,
  collectSpriteActionReferences,
  validateReferences,
} from './validate-refs.js'

// 深拷贝(content 是纯逻辑包,tsconfig 无 DOM lib → 不用 structuredClone;JSON 法对这些纯数据 fixture 足够)。
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const base: ContentBundle = {
  scenes: [
    {
      id: 's',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [{ id: 'e', pos: { col: 0, row: 0, height: 0 }, sprite: 'ghost' }],
    },
  ],
  actors: [
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'hero-sprite',
      battler: {
        battleSprite: 'hero-battle-sprite',
        baseStats: {} as never,
        initialEquipment: {},
        initialMagic: [],
      },
    },
  ],
  battleSprites: [
    {
      id: 'hero-battle-sprite',
      label: '主角战斗精灵',
      asset: 'battle-sprite.hero',
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
    },
  ],
  skills: [
    {
      id: '1',
      name: 'skill.1',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [{ kind: 'damage', power: 1, elemental: 0 }],
      animation: { effectSprite: 1 },
    },
  ],
  levelUp: {},
  items: [{ id: 'i1' } as never],
  locale: { 'dlg.talk.0': '…', 'name.hero': '主角' },
  sprites: [
    {
      id: 'ghost',
      asset: 'sprite.ghost',
      label: 'g',
      layout: { kind: 'directional', framesPerDir: 3 },
      poses: {
        idle: { label: '待机', steps: [{ frame: 0, durationMs: 100 }], loopFrom: 0 },
      },
    },
    {
      id: 'hero-sprite',
      asset: 'sprite.hero',
      label: 'h',
      layout: { kind: 'directional', framesPerDir: 3 },
    },
  ],
  startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
  mapIndex: {
    version: 1,
    maps: [{ id: 'map-001', name: '测试地图', path: 'content/maps/map-001.json' }],
  },
}

function enemyReferenceBundle(): ContentBundle {
  const b = clone(base)
  b.battleSprites.push(
    {
      id: 'enemy-source-sprite',
      label: '敌人源',
      asset: 'battle-sprite.enemy-source',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 1 },
        magic: { start: 1, count: 0 },
        attack: { start: 1, count: 0 },
        idleTicksPerFrame: 1,
        actTicksPerFrame: 0,
      },
    },
    {
      id: 'enemy-target-sprite',
      label: '敌人目标',
      asset: 'battle-sprite.enemy-target',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 1 },
        magic: { start: 1, count: 0 },
        attack: { start: 1, count: 0 },
        idleTicksPerFrame: 1,
        actTicksPerFrame: 0,
      },
    },
  )
  b.enemies = [
    {
      id: 'enemy-source',
      name: 'enemy.source',
      battleSprite: 'enemy-source-sprite',
      yPosOffset: 0,
      stats: {},
      sounds: {},
      ai: {
        resistanceToSorcery: 0,
        rules: [
          {
            at: 'act',
            when: { kind: 'playerInParty', role: 'hero' },
            do: { kind: 'cast', skillId: '1' },
          },
        ],
        fallback: {
          action: { kind: 'cast', skillId: '1' },
          chancePercent: 25,
        },
        hooks: {
          ready: {
            initial: 'ready',
            states: {
              ready: {
                body: [
                  {
                    kind: 'setFallback',
                    fallback: {
                      action: { kind: 'cast', skillId: '1' },
                      chancePercent: 50,
                    },
                  },
                  {
                    kind: 'effect',
                    id: 'transform',
                    effect: { kind: 'transform', enemyId: 'enemy-target' },
                  },
                  {
                    kind: 'applyActorGrowth',
                    actor: 'hero',
                    delta: {
                      level: 0,
                      maxHP: 1,
                      maxMP: 1,
                      attack: 1,
                      magicAttack: 1,
                      defense: 1,
                      speed: 1,
                      luck: 1,
                    },
                  },
                ],
                next: {
                  kind: 'random',
                  choices: [
                    {
                      weight: 1,
                      then: {
                        kind: 'branch',
                        cond: {
                          kind: 'not',
                          cond: { kind: 'playerInParty', role: 'hero' },
                        },
                        then: { kind: 'restart' },
                        else: { kind: 'stay' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      choreography: [
        {
          at: 'turnStart',
          when: { kind: 'playerInParty', role: 'hero' },
          body: [
            {
              kind: 'playActorCastEffect',
              actor: 'hero',
              effect: 'pre-magic-white-flash',
            },
          ],
        },
      ],
      onDefeated: [
        {
          kind: 'branch',
          cond: {
            kind: 'all',
            of: [
              { kind: 'hasItem', itemId: 'i1' },
              { kind: 'inParty', actorId: 'hero' },
              { kind: 'currentScene', scene: 's' },
              { kind: 'entityInScene', target: { scene: 's', entity: 'e' } },
            ],
          },
          then: [{ kind: 'giveItem', itemId: 'i1', count: 1 }],
          else: [{ kind: 'loseItem', itemId: 'i1', count: 1 }],
        },
      ],
    },
    {
      id: 'enemy-target',
      name: 'enemy.target',
      battleSprite: 'enemy-target-sprite',
      yPosOffset: 0,
      stats: {},
      sounds: {},
      ai: { resistanceToSorcery: 0, rules: [] },
    },
  ] as never
  return b
}

test('干净 bundle → 无 issue', () => {
  expect(validateReferences(base)).toEqual([])
})
test('敌 hook/fallback/演出/战后脚本的逻辑引用完整时无 issue', () => {
  expect(validateReferences(enemyReferenceBundle())).toEqual([])
})
test('敌方可达 cast 对有效 execution fail-closed，override 可隔离玩家专属公共效果', () => {
  const b = enemyReferenceBundle()
  b.skills[0]!.effects = [{ kind: 'healMp', amount: 1 }]
  let issues = validateReferences(b).filter((issue) => issue.message.includes('敌方施法技能'))
  expect(issues.map((issue) => issue.where)).toEqual(
    expect.arrayContaining([
      'enemies[0](enemy-source).ai.rules[0].do.skillId',
      'enemies[0](enemy-source).ai.fallback.action.skillId',
      'enemies[0](enemy-source).ai.hooks.ready.states["ready"].body[0].fallback.action.skillId',
    ]),
  )
  expect(issues.every((issue) => issue.message.includes('healMp'))).toBe(true)

  b.skills[0]!.execution = {
    enemy: { effects: [{ kind: 'damage', power: 1, elemental: 0 }] },
  }
  issues = validateReferences(b).filter((issue) => issue.message.includes('敌方施法技能'))
  expect(issues).toEqual([])
})

test('技能 execution 分支的 summon/trance 进入 BattleSpriteDef 静态引用闭包', () => {
  const b = clone(base)
  b.skills[0]!.execution = {
    player: {
      effects: [
        { kind: 'summon', battleSprite: 'summon-only' },
        { kind: 'trance', battleSprite: 'trance-only' },
      ],
    },
  }
  const references = collectBattleSpriteDefinitionReferences(b)
  expect(references).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        battleSprite: 'summon-only',
        where: 'skills[0](1).execution.player.effects[0].battleSprite',
      }),
      expect.objectContaining({
        battleSprite: 'trance-only',
        where: 'skills[0](1).execution.player.effects[1].battleSprite',
      }),
    ]),
  )
})
test('敌脚本逻辑引用递归保留精确路径并拒绝非战斗角色', () => {
  const b = enemyReferenceBundle()
  b.actors.push({ id: 'villager', name: 'name.hero', spriteId: 'ghost' })
  const source = b.enemies![0]!
  source.ai.fallback = {
    action: { kind: 'cast', skillId: 'missing-fallback-skill' },
    chancePercent: 25,
  }
  source.ai.rules![0]!.when = { kind: 'playerInParty', role: 'missing-rule-actor' }
  const ready = source.ai.hooks!.ready!.states.ready!
  ready.body = [
    {
      kind: 'setFallback',
      fallback: {
        action: { kind: 'cast', skillId: 'missing-hook-skill' },
        chancePercent: 50,
      },
    },
    {
      kind: 'effect',
      id: 'transform',
      effect: { kind: 'transform', enemyId: 'missing-hook-enemy' },
    },
    {
      kind: 'playActorCastEffect',
      actor: 'villager',
      effect: 'pre-magic-white-flash',
    },
  ]
  ready.next = {
    kind: 'random',
    choices: [
      {
        weight: 1,
        then: {
          kind: 'branch',
          cond: {
            kind: 'not',
            cond: { kind: 'playerInParty', role: 'missing-transition-actor' },
          },
          then: { kind: 'stay' },
          else: { kind: 'stay' },
        },
      },
    ],
  }
  source.choreography![0]!.body = [
    {
      kind: 'applyActorGrowth',
      actor: 'missing-choreography-actor',
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
  ]
  source.onDefeated = [
    {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'hasItem', itemId: 'missing-condition-item' },
          { kind: 'inParty', actorId: 'missing-on-defeated-actor' },
          { kind: 'currentScene', scene: 'missing-scene' },
          {
            kind: 'entityInScene',
            target: { scene: 's', entity: 'missing-entity' },
          },
        ],
      },
      then: [{ kind: 'giveItem', itemId: 'missing-give-item', count: 1 }],
    },
  ]

  const issues = validateReferences(b)
  const paths = issues.map((issue) => issue.where)
  expect(paths).toEqual(
    expect.arrayContaining([
      'enemies[0](enemy-source).ai.rules[0].when.role',
      'enemies[0](enemy-source).ai.fallback.action.skillId',
      'enemies[0](enemy-source).choreography[0].body[0].actor',
      'enemies[0](enemy-source).ai.hooks.ready.states["ready"].body[0].fallback.action.skillId',
      'enemies[0](enemy-source).ai.hooks.ready.states["ready"].body[1].effect.enemyId',
      'enemies[0](enemy-source).ai.hooks.ready.states["ready"].body[2].actor',
      'enemies[0](enemy-source).ai.hooks.ready.states["ready"].next.choices[0].then.cond.cond.role',
      'enemies[0](enemy-source).onDefeated[0].cond.of[0].itemId',
      'enemies[0](enemy-source).onDefeated[0].cond.of[1].actorId',
      'enemies[0](enemy-source).onDefeated[0].cond.of[2].scene',
      'enemies[0](enemy-source).onDefeated[0].cond.of[3].target.entity',
      'enemies[0](enemy-source).onDefeated[0].then[0].itemId',
    ]),
  )
  expect(
    issues.some(
      (issue) => issue.where.endsWith('.body[2].actor') && issue.message.includes('不是可战斗角色'),
    ),
  ).toBe(true)
})
test('图章模板 tilesetId 悬空 → 报 error(W7G)', () => {
  const b = clone(base)
  b.tilesets = [{ id: 'known', name: '已知', category: 'test', asset: 'tileset.known' }]
  b.stamps = [
    {
      id: 'tree',
      name: '树',
      tilesetId: 'missing',
      origin: 'authored',
      layerSlots: [{ id: 'ground', name: '地面', depthMode: 'flat' }],
      visual: [{ layerSlotId: 'ground', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
      collision: [],
    },
  ]
  expect(
    validateReferences(b).some(
      (issue) => issue.severity === 'error' && issue.where.includes('stamps[0]'),
    ),
  ).toBe(true)
})
test('levelUp.skillId 不在 skills → 报 warn(demo 已知未迁全)', () => {
  const b = clone(base)
  b.levelUp = { hero: [{ level: 7, skillId: '349' }] }
  expect(validateReferences(b).some((i) => /349/.test(i.where + i.message))).toBe(true)
})
test('prop 实体 sprite 不在 sprites 注册表 → 报 error', () => {
  const b = clone(base)
  ;(b.scenes[0]!.entities[0] as { sprite?: string }).sprite = 'unknown'
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /unknown/.test(i.where + i.message),
    ),
  ).toBe(true)
})
test('actor 实体指向不存在角色 → 报 error(C0)', () => {
  const b = clone(base)
  const e = b.scenes[0]!.entities[0] as unknown as Record<string, unknown>
  delete e.sprite
  e.actor = 'nobody'
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /actor/.test(i.where) && /nobody/.test(i.message),
    ),
  ).toBe(true)
})
test('actor.spriteId 不在 sprites 注册表 → 报 error(C0)', () => {
  const b = clone(base)
  b.actors[0]!.spriteId = 'no-sheet'
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /spriteId/.test(i.where) && /no-sheet/.test(i.message),
    ),
  ).toBe(true)
})
test('嵌套场景/chunk 命令中的换装与 followers 共用 SpriteDef 语义闭包', () => {
  const b = clone(base)
  b.scenes[0]!.onEnter = [
    {
      body: [
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'x', is: true },
          then: [
            { kind: 'setActorSprite', actor: 'hero', sprite: 'missing-costume' },
            { kind: 'setFollowers', sprites: ['missing-follower'] },
          ],
        },
      ],
    },
  ]
  b.scriptChunks = {
    shared: {
      version: 1,
      id: 'shared',
      scripts: {
        appearance: [{ kind: 'setActorAppearance', actor: 'hero', spriteId: 'missing-appearance' }],
      },
    },
  }
  const errors = validateReferences(b).filter((issue) => issue.severity === 'error')
  expect(errors.map((issue) => issue.message)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('missing-costume'),
      expect.stringContaining('missing-follower'),
      expect.stringContaining('missing-appearance'),
    ]),
  )
  expect(errors.some((issue) => issue.where.includes('scriptChunks'))).toBe(true)
})
test('页绑定与嵌套命令按 (sprite, action) 复合引用校验', () => {
  const clean = clone(base)
  clean.scenes[0]!.entities[0]!.pages = [
    { animation: { sprite: 'ghost', action: 'idle', loop: true } },
  ]
  clean.scenes[0]!.onEnter = [
    {
      body: [
        {
          kind: 'playEntityAction',
          entity: 'e',
          sprite: 'ghost',
          action: 'idle',
          loop: false,
        },
      ],
    },
  ]
  expect(validateReferences(clean)).toEqual([])

  clean.scenes[0]!.entities[0]!.pages![0]!.animation!.action = 'missing-page-action'
  ;(
    clean.scenes[0]!.onEnter![0]!.body[0] as Extract<
      import('./script.js').Command,
      { kind: 'playEntityAction' }
    >
  ).action = 'missing-command-action'
  const errors = validateReferences(clean).filter((issue) => issue.severity === 'error')
  expect(errors.map((issue) => issue.message)).toEqual(
    expect.arrayContaining([
      expect.stringContaining('missing-page-action'),
      expect.stringContaining('missing-command-action'),
    ]),
  )
  expect(errors.some((issue) => issue.where.includes('.pages[0].animation.action'))).toBe(true)
  expect(errors.some((issue) => issue.where.includes('.onEnter'))).toBe(true)
})
test('动作引用保留场景页与 ScriptTree 精确路径', () => {
  const b = clone(base)
  b.scenes[0]!.entities[0]!.pages = [
    {},
    {
      animation: { sprite: 'ghost', action: 'idle', loop: true },
      trigger: {
        on: 'interact',
        stages: [
          {
            body: [
              {
                kind: 'branch',
                cond: { kind: 'flag', flag: 'x', is: true },
                then: [
                  {
                    kind: 'playEntityAction',
                    entity: 'e',
                    sprite: 'ghost',
                    action: 'idle',
                    loop: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ]
  b.scenes[0]!.onEnter = [
    {
      entry: {
        prepare: [
          {
            kind: 'playEntityAction',
            entity: 'e',
            sprite: 'ghost',
            action: 'idle',
            loop: true,
          },
        ],
        reveal: { kind: 'cut' },
      },
      body: [],
    },
  ]
  b.scriptChunks = {
    shared: {
      version: 1,
      id: 'shared',
      scripts: {
        wave: [
          {
            kind: 'confirm',
            onNo: [
              {
                kind: 'playEntityAction',
                entity: 'e',
                sprite: 'ghost',
                action: 'idle',
                loop: false,
              },
            ],
          },
        ],
      },
    },
  }
  b.scriptIndex = {
    version: 1,
    shards: { shared: 1, global: {} },
    chunks: { shared: { path: 'content/scripts/shared.json', bytes: 1 } },
    library: { wave: { name: '测试动作', self: 'none' } },
  }

  expect(collectSpriteActionReferences(b).map((reference) => reference.locator)).toEqual(
    expect.arrayContaining([
      { kind: 'page-animation', sceneId: 's', entityId: 'e', pageIndex: 1 },
      {
        kind: 'scene-command',
        sceneId: 's',
        sourceKey: 'e:trigger',
        entityId: 'e',
        pageIndex: 1,
        path: '0/0/then/0',
      },
      {
        kind: 'scene-command',
        sceneId: 's',
        sourceKey: '__onEnter__',
        path: '0/entry/prepare/0',
      },
      { kind: 'script-command', scriptId: 'wave', path: '0/0/onNo/0' },
    ]),
  )
})
test('未登记的内部共享脚本动作引用保持只读，不伪造不可达定位', () => {
  const b = clone(base)
  b.scriptChunks = {
    shared: {
      version: 1,
      id: 'shared',
      scripts: {
        internal: [
          {
            kind: 'playEntityAction',
            entity: 'e',
            sprite: 'ghost',
            action: 'idle',
            loop: true,
          },
        ],
      },
    },
  }
  const references = collectSpriteActionReferences(b)
  expect(references).toEqual([expect.objectContaining({ action: 'idle' })])
  expect(references[0]?.locator).toBeUndefined()
})
test('canonical v13 行为、hooks 与共享脚本动作可校验且不会按旧 inline stages 崩溃', () => {
  const b = clone(base)
  b.scenes = [
    {
      id: 's',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'e',
          pos: { col: 0, row: 0, height: 0 },
          sprite: 'ghost',
          pages: [{ id: 'default', trigger: 'main' }],
          initialPage: 'default',
          behaviors: {
            trigger: {
              main: {
                label: 'main',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'main',
                  stages: [
                    {
                      id: 'main',
                      body: [
                        {
                          kind: 'playEntityAction',
                          target: { scene: 's', entity: 'e' },
                          sprite: 'ghost',
                          action: 'behavior-action',
                          loop: true,
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
      hooks: {
        onEnter: {
          initial: 'main',
          variants: {
            main: {
              label: 'main',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'main',
                stages: [
                  {
                    id: 'main',
                    body: [
                      {
                        kind: 'playEntityAction',
                        target: { scene: 's', entity: 'e' },
                        sprite: 'ghost',
                        action: 'hook-action',
                        loop: false,
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
  ] as unknown as ContentBundle['scenes']
  b.sharedScripts = {
    shared: {
      name: 'shared',
      self: 'none',
      body: [
        {
          kind: 'playEntityAction',
          target: { scene: 's', entity: 'e' },
          sprite: 'ghost',
          action: 'shared-action',
          loop: false,
        },
      ],
    },
  }

  expect(collectSpriteActionReferences(b).map((reference) => reference.action)).toEqual(
    expect.arrayContaining(['behavior-action', 'hook-action', 'shared-action']),
  )
})
test('动态脚本绑定内联 stages 的动作仍进入校验与删除保护，但不伪造 ScriptTree 路径', () => {
  const b = clone(base)
  b.scenes[0]!.onEnter = [
    {
      body: [
        {
          kind: 'setEntityAuto',
          entity: 'e',
          stages: [
            {
              body: [
                {
                  kind: 'playEntityAction',
                  entity: 'e',
                  sprite: 'ghost',
                  action: 'missing-inline-action',
                  loop: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const references = collectSpriteActionReferences(b)
  expect(references).toEqual([
    expect.objectContaining({ action: 'missing-inline-action', sprite: 'ghost' }),
  ])
  expect(references[0]?.locator).toBeUndefined()
  expect(validateReferences(b)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('missing-inline-action') }),
    ]),
  )
})
test('页动作声明的 sprite 也进入定义级引用门禁', () => {
  const b = clone(base)
  b.scenes[0]!.entities[0]!.pages = [
    { animation: { sprite: 'missing-page-sprite', action: 'idle', loop: true } },
  ]
  const errors = validateReferences(b).filter((issue) => issue.severity === 'error')
  expect(errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        where: expect.stringContaining('.animation.sprite'),
        message: expect.stringContaining('missing-page-sprite'),
      }),
    ]),
  )
})
test('可见存档 appearance/followers/sceneScriptOverrides 也进入删除与校验引用图', () => {
  const b = clone(base)
  b.worlds = [
    {
      party: [
        {
          id: 'hero',
          template: 'hero',
          appearance: { spriteId: 'missing-save-appearance' },
        },
      ],
      money: 0,
      learnedSkills: {},
      inventory: [],
      script: {
        flags: {},
        vars: {},
        entityState: {},
        entityStage: {},
        followers: ['missing-save-follower'],
        sceneScriptOverrides: {
          s001: {
            onEnter: [
              {
                body: [{ kind: 'setFollowers', sprites: ['missing-save-override'] }],
              },
            ],
          },
        },
      },
    } as never,
  ]
  const errors = validateReferences(b).filter((issue) => issue.severity === 'error')
  expect(errors.map((issue) => issue.message).join('\n')).toMatch(/missing-save-appearance/)
  expect(errors.map((issue) => issue.message).join('\n')).toMatch(/missing-save-follower/)
  expect(errors.map((issue) => issue.message).join('\n')).toMatch(/missing-save-override/)
})
test('actor.battler.initialEquipment 指向不存在物品 → 报 warn', () => {
  const b = clone(base)
  b.actors[0]!.battler!.initialEquipment = { weapon: 'no-item' }
  expect(validateReferences(b).some((i) => /no-item/.test(i.where + i.message))).toBe(true)
})

test('E18-1:coveredBy 指向不存在角色 → error;指向纯 NPC → error', () => {
  const b = clone(base)
  ;(b.actors[0] as unknown as { battler: { coveredBy?: string } }).battler!.coveredBy = 'nobody'
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /coveredBy/.test(i.where) && /nobody/.test(i.message),
    ),
  ).toBe(true)
  ;(b.actors[0] as unknown as { battler: { coveredBy?: string } }).battler!.coveredBy = 'npc'
  b.actors.push({ id: 'npc', name: 'name.npc', spriteId: 'ghost' } as never)
  expect(
    validateReferences(b).some(
      (i) =>
        i.severity === 'error' && /coveredBy/.test(i.where) && /不是可战斗角色/.test(i.message),
    ),
  ).toBe(true)
})

test('E18-1:coveredBy 指向自己 → warn 不 error;互护合法零 issue', () => {
  const b = clone(base)
  b.actors.push({
    id: 'hero2',
    name: 'name.hero',
    spriteId: 'hero-sprite',
    battler: {
      battleSprite: 'hero-battle-sprite',
      baseStats: {} as never,
      initialEquipment: {},
      initialMagic: [],
    },
  })
  ;(b.actors[0] as unknown as { battler: { coveredBy?: string } }).battler!.coveredBy = 'hero'
  const self = validateReferences(b)
  expect(self.some((i) => i.severity === 'error' && /coveredBy/.test(i.where))).toBe(false)
  expect(self.some((i) => i.severity === 'warn' && /指向自己/.test(i.message))).toBe(true)
  // 互护(0→1、1→0):合法形态,不得有 coveredBy 类 error/warn。
  ;(b.actors[0] as unknown as { battler: { coveredBy?: string } }).battler!.coveredBy = 'hero2'
  ;(b.actors[1] as unknown as { battler: { coveredBy?: string } }).battler!.coveredBy = 'hero'
  const mutual = validateReferences(b)
  expect(mutual.some((i) => /coveredBy/.test(i.where))).toBe(false)
})

test('E18-1:cooperativeMagicSkillId 不在 skills → error', () => {
  const b = clone(base)
  ;(b.actors[0] as unknown as { battler: { cooperativeMagicSkillId?: string } })
    .battler!.cooperativeMagicSkillId = 'no-such-skill'
  expect(
    validateReferences(b).some(
      (i) => i.severity === 'error' && /cooperativeMagicSkillId/.test(i.where),
    ),
  ).toBe(true)
})

test('E18-1:casualty 台词文本 id 不在 locale → warn;空壳 → warn', () => {
  const b = clone(base)
  ;(b.actors[0] as unknown as { battler: { casualty?: unknown } }).battler!.casualty = {
    friendDeath: {
      gates: [],
      fallback: { lines: [{ text: 'dlg.missing', style: 'bottom' }], effects: [] },
    },
  }
  const issues = validateReferences(b)
  expect(issues.some((i) => i.severity === 'warn' && /dlg.missing/.test(i.message))).toBe(true)
  expect(issues.some((i) => i.severity === 'warn' && /空壳/.test(i.message))).toBe(false)
  ;(b.actors[0] as unknown as { battler: { casualty?: unknown } }).battler!.casualty = {
    dying: { gates: [], fallback: { lines: [], effects: [] } },
  }
  const shell = validateReferences(b)
  expect(shell.some((i) => i.severity === 'warn' && /空壳/.test(i.message))).toBe(true)
})

test('E18-1:合法三字段(gates+fallback+互护)→ 零 issue', () => {
  const b = clone(base)
  b.actors.push({
    id: 'hero2',
    name: 'name.hero',
    spriteId: 'hero-sprite',
    battler: {
      battleSprite: 'hero-battle-sprite',
      baseStats: {} as never,
      initialEquipment: {},
      initialMagic: [],
      coveredBy: 'hero',
    },
  })
  const hero = b.actors[0] as unknown as {
    battler: { coveredBy?: string; cooperativeMagicSkillId?: string; casualty?: unknown }
  }
  hero.battler!.coveredBy = 'hero2'
  hero.battler!.cooperativeMagicSkillId = '1'
  hero.battler!.casualty = {
    friendDeath: {
      gates: [
        { chance: 75, branch: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] } },
      ],
      fallback: { lines: [], effects: [{ kind: 'heal', resource: 'hp' }] },
    },
  }
  expect(validateReferences(b)).toEqual([])
})
test('startWorld.party 指向不存在角色 → 报 error', () => {
  const b = clone(base)
  b.startWorld.party = ['nobody']
  expect(
    validateReferences(b).some((i) => i.severity === 'error' && /nobody/.test(i.where + i.message)),
  ).toBe(true)
})
test('startWorld.party 引无 battler 的 actor → 报 error(C0:入队必须可战斗)', () => {
  const b = clone(base)
  b.actors.push({ id: 'villager', name: 'name.hero', spriteId: 'ghost' })
  b.startWorld.party = ['villager']
  expect(
    validateReferences(b).some(
      (i) =>
        i.severity === 'error' && /villager.*battler|battler.*villager/.test(i.where + i.message),
    ),
  ).toBe(true)
})
test('startWorld.learnedSkills 指向不存在技能 → 报 warn', () => {
  const b = clone(base)
  b.startWorld.learnedSkills = { hero: ['999'] }
  expect(validateReferences(b).some((i) => /999/.test(i.where + i.message))).toBe(true)
})
test('EquipSpec.equipableBy 指向不存在角色 → 报 warn', () => {
  const b = clone(base)
  ;(b.items[0] as { equip?: unknown }).equip = {
    slot: 'weapon',
    equipableBy: ['ghost-man'],
    effects: [],
  }
  expect(validateReferences(b).some((i) => /ghost-man/.test(i.where + i.message))).toBe(true)
})
test('EquipEffect.grantSkill.skillId 不在 skills → 报 warn', () => {
  const b = clone(base)
  ;(b.items[0] as { equip?: unknown }).equip = {
    slot: 'accessory',
    equipableBy: ['hero'],
    effects: [{ kind: 'grantSkill', skillId: '336' }],
  }
  expect(validateReferences(b).some((i) => /336/.test(i.where + i.message))).toBe(true)
})
test('EquipEffect.battleSprite 按角色校验 actor/equipableBy/资源/profile 并保留逐角色路径', () => {
  const make = (
    actorId: string,
    battleSprite: string,
    equipableBy: string[] = [actorId],
  ): ContentBundle => {
    const b = clone(base)
    b.actors.push({ id: 'villager', name: 'name.hero', spriteId: 'ghost' })
    b.battleSprites.push({
      ...clone(b.battleSprites[0]!),
      id: 'enemy-shape',
      profile: { kind: 'enemy', framesPerAction: 1, idleAction: 0 },
    } as never)
    b.items = [
      {
        id: 'weapon',
        name: '武器',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        equip: {
          slot: 'weapon',
          equipableBy,
          effects: [{ kind: 'battleSprite', byActor: { [actorId]: battleSprite } }],
        },
      },
    ]
    return b
  }

  expect(validateReferences(make('hero', 'hero-battle-sprite'))).toEqual([])
  for (const [bundle, expected] of [
    [make('missing-actor', 'hero-battle-sprite'), '不在 actors'],
    [make('villager', 'hero-battle-sprite'), '不是可战斗角色'],
    [make('hero', 'hero-battle-sprite', []), '不在本物品 equipableBy'],
    [make('hero', 'missing-sprite'), '不在 battleSprites 注册表'],
    [make('hero', 'enemy-shape'), 'profile 期望 player-fighter'],
  ] as const) {
    const issues = validateReferences(bundle)
    expect(issues.some((issue) => issue.message.includes(expected))).toBe(true)
    expect(issues.some((issue) => issue.where.includes('.effects[0].byActor.'))).toBe(true)
  }
})
test('SkillCost.items[].itemId 不在 items → 报 warn', () => {
  const b = clone(base)
  ;(b.skills[0] as { cost?: unknown }).cost = { items: [{ itemId: 'no-wine', amount: 1 }] }
  expect(validateReferences(b).some((i) => /no-wine/.test(i.where + i.message))).toBe(true)
})

test('C8 use/throw 的配方、奖励、毒与共享脚本引用全部进入闭包', () => {
  const b = clone(base)
  b.poisons = [{ id: 551, name: '赤毒', curability: 'common', color: 1 }]
  b.scriptChunks = {
    shared: {
      version: 1,
      id: 'shared',
      scripts: { existing: [] },
    },
  }
  b.items = [
    {
      id: 'tool',
      name: '工具',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: 'missing-material', count: 1 }],
                products: [{ itemId: 'missing-product', count: 1 }],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'pool',
      name: '资源池',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'value',
            maxRoll: 1,
            rewards: [{ itemId: 'missing-reward', count: 1 }],
          },
        ],
      },
    },
    {
      id: 'scripted',
      name: '剧情',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [{ kind: 'runScript', script: { chunk: 'shared', id: 'missing-script' } }],
      },
    },
    {
      id: 'poison',
      name: '毒物',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '999' }],
      },
    },
  ]
  const joined = validateReferences(b)
    .map((issue) => `${issue.where} ${issue.message}`)
    .join('\n')
  for (const missing of [
    'missing-material',
    'missing-product',
    'missing-reward',
    'missing-script',
    '999',
  ])
    expect(joined).toContain(missing)
  expect(joined).toContain('.throw.effects[0].poisonId')
})

test('迁移诊断 target.item 也必须存在', () => {
  const b = clone(base)
  b.migrationDiagnostics = {
    version: 1,
    diagnostics: [
      {
        id: 'item-use:missing',
        severity: 'warn',
        target: {
          domain: 'item',
          objectId: 'missing',
          capability: 'use',
          label: '失踪物品',
        },
        category: 'manual-review',
        reason: '待处理',
        source: { kind: 'legacy-script', label: 'L_1', address: 1 },
      },
    ],
  }
  expect(validateReferences(b)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        severity: 'error',
        where: 'migrationDiagnostics.diagnostics[0].target.objectId',
      }),
    ]),
  )
})

test('Actor typed 引用补齐 setActorSprite/setActorAppearance/setParty 并保留精确路径', () => {
  const b = clone(base)
  b.scenes[0]!.onEnter = [
    {
      body: [
        { kind: 'setActorSprite', actor: 'ghost-actor', sprite: 'ghost' },
        { kind: 'setActorAppearance', actor: 'ghost-actor', portrait: 'portrait.none' },
        { kind: 'setParty', members: ['hero', 'ghost-actor'] },
      ],
    },
  ]
  const issues = validateReferences(b).filter((issue) => /ghost-actor/.test(issue.message))
  expect(issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ severity: 'error', where: expect.stringContaining('[0].actor') }),
      expect.objectContaining({ severity: 'error', where: expect.stringContaining('[1].actor') }),
      expect.objectContaining({ severity: 'error', where: expect.stringContaining('[2].members[1]') }),
    ]),
  )
})

test('悬空 learnedSkills/levelUp actor 键是 warn，且 levelUp 技能校验仍保留', () => {
  const b = clone(base)
  b.startWorld.learnedSkills = { ghost: ['1'] }
  b.levelUp = { ghost: [{ level: 2, skillId: 'missing-skill' }] }
  const issues = validateReferences(b)
  expect(issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        severity: 'warn',
        where: 'startWorld.learnedSkills[ghost]',
      }),
      expect.objectContaining({ severity: 'warn', where: 'levelUp[ghost]' }),
      expect.objectContaining({ severity: 'warn', where: 'levelUp[ghost][0].skillId' }),
    ]),
  )
})

describe('validateReferences · battleField 三层引用(B2-1)', () => {
  const field = (id: number) => ({
    id,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  })

  function battleFieldBundle(): ContentBundle {
    const bundle = clone(base)
    bundle.battleFields = [field(24)]
    const scene = bundle.scenes[0]!
    scene.battleFieldId = 24
    scene.entities[0]!.hostile = { battleFieldId: 25 } as never
    ;(scene as unknown as Record<string, unknown>).hooks = {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [
                    {
                      kind: 'branch',
                      when: { kind: 'flag', key: 'battle' },
                      then: [{ kind: 'startBattle', teamId: 'team', fieldId: 26 }],
                      else: [],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    }
    return bundle
  }

  test('场景默认、hostile 与递归 startBattle 都会拒绝 dangling id', () => {
    const issues = validateReferences(battleFieldBundle()).filter((issue) =>
      issue.message.startsWith('战场 '),
    )
    expect(issues).toEqual([
      expect.objectContaining({
        severity: 'error',
        where: 'scenes[0].entities[0].hostile.battleFieldId',
        message: '战场 25 不在 battleFields',
      }),
      expect.objectContaining({
        severity: 'error',
        message: '战场 26 不在 battleFields',
      }),
    ])
  })

  test('三层引用全部命中已声明表时不产生战场问题', () => {
    const bundle = battleFieldBundle()
    bundle.battleFields = [field(24), field(25), field(26)]
    expect(
      validateReferences(bundle).filter((issue) => issue.message.startsWith('战场 ')),
    ).toEqual([])
  })
})
