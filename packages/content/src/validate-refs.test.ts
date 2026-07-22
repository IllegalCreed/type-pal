import { expect, test } from 'vitest'
import {
  type ContentBundle,
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
  skills: [{ id: '1' } as never],
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

test('干净 bundle → 无 issue', () => {
  expect(validateReferences(base)).toEqual([])
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
test('SkillCost.items[].itemId 不在 items → 报 warn', () => {
  const b = clone(base)
  ;(b.skills[0] as { cost?: unknown }).cost = { items: [{ itemId: 'no-wine', amount: 1 }] }
  expect(validateReferences(b).some((i) => /no-wine/.test(i.where + i.message))).toBe(true)
})
