import { describe, expect, test } from 'vitest'
import { itemUseSupportsContext } from './item.js'
import {
  checkThrowSpec,
  validateActors,
  validateBattleFields,
  validateEnemies,
  validateItems,
  validateLocale,
  validateScenes,
  validateSkills,
  validateSprites,
  validateStartWorldResources,
} from './validate.js'

const mkScene = (over: Record<string, unknown> = {}): unknown => ({
  id: 's',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  ...over,
})
const mkEnt = (ref: Record<string, unknown>): Record<string, unknown> => ({
  id: 'e',
  pos: { col: 0, row: 0, height: 0 },
  ...ref,
})

describe('validateScenes · 实体 actor ⊕ sprite(C0)', () => {
  test('actor 形态 / sprite 形态 → 各自通过', () => {
    expect(() =>
      validateScenes([mkScene({ entities: [mkEnt({ actor: 'youhun' })] })]),
    ).not.toThrow()
    expect(() => validateScenes([mkScene({ entities: [mkEnt({ sprite: 'vase' })] })])).not.toThrow()
  })
  test('两者都有 → throw(M3a:恰一 actor/sprite/zone)', () => {
    expect(() =>
      validateScenes([mkScene({ entities: [mkEnt({ actor: 'a', sprite: 's' })] })]),
    ).toThrow('现 2 个')
  })
  test('两者都无 → throw', () => {
    expect(() => validateScenes([mkScene({ entities: [mkEnt({})] })])).toThrow('现 0 个')
  })
  test('zone 触发区:zone:true 单独合法', () => {
    expect(() => validateScenes([mkScene({ entities: [mkEnt({ zone: true })] })])).not.toThrow()
  })
})

const layout = { kind: 'directional', framesPerDir: 3 }

describe('validateSprites(含 layout,C0)', () => {
  test('合法数组 → 原样返回', () => {
    const sprites = [
      { id: 'ghost', asset: 'sprite.ghost', label: '游魂', layout },
      { id: 'oldman', asset: 'sprite.oldman', label: '老者', layout: { kind: 'static' } },
      {
        id: 'pool',
        asset: 'sprite.pool',
        label: '血池',
        layout: { kind: 'static' },
        poses: {
          ripple: {
            label: '水波',
            order: 0,
            steps: [
              { frame: 0, durationMs: 100 },
              { frame: 1, durationMs: 200 },
            ],
            loopFrom: 0,
          },
        },
      },
    ]
    expect(validateSprites(sprites)).toEqual(sprites)
  })
  test('非数组 → throw', () => {
    expect(() => validateSprites({})).toThrow('期望数组')
  })
  test('缺 asset → throw', () => {
    expect(() => validateSprites([{ id: 'ghost', label: '游魂', layout }])).toThrow('缺键 "asset"')
  })
  test('旧 spriteNum/path 与空 asset → throw', () => {
    expect(() =>
      validateSprites([
        { id: 'ghost', asset: 'sprite.ghost', spriteNum: 16, label: '游魂', layout },
      ]),
    ).toThrow('spriteNum: 已退役')
    expect(() =>
      validateSprites([
        {
          id: 'ghost',
          asset: 'sprite.ghost',
          path: 'assets/sprites/ghost.rle',
          label: '游魂',
          layout,
        },
      ]),
    ).toThrow('path: 已退役')
    expect(() => validateSprites([{ id: 'ghost', asset: '', label: '游魂', layout }])).toThrow(
      '期望非空 AssetId',
    )
  })
  test('缺 layout → throw', () => {
    expect(() => validateSprites([{ id: 'ghost', asset: 'sprite.ghost', label: '游魂' }])).toThrow(
      '缺键 "layout"',
    )
  })
  test('layout.kind 非法 → throw', () => {
    expect(() =>
      validateSprites([{ id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'walk' } }]),
    ).toThrow('kind 非法')
  })
  test('directional 缺 framesPerDir → throw', () => {
    expect(() =>
      validateSprites([
        { id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'directional' } },
      ]),
    ).toThrow('缺 framesPerDir')
  })
  test('v4 拒绝旧 layout.loop 第二真值', () => {
    expect(() =>
      validateSprites([{ id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'loop' } }]),
    ).toThrow('kind 非法')
  })
  test('布局计数必须是正整数，动作时间线完整校验', () => {
    for (const framesPerDir of [0, -1, 1.5])
      expect(() =>
        validateSprites([
          {
            id: 'g',
            asset: 'sprite.g',
            label: 'x',
            layout: { kind: 'directional', framesPerDir },
          },
        ]),
      ).toThrow(/正整数/)
    expect(() =>
      validateSprites([
        {
          id: 'g',
          asset: 'sprite.g',
          label: 'x',
          layout: { kind: 'static' },
          poses: { 坏动作: { label: '坏动作', steps: [] } },
        },
      ]),
    ).toThrow(/非空数组/)
    expect(() =>
      validateSprites([
        {
          id: 'g',
          asset: 'sprite.g',
          label: 'x',
          layout: { kind: 'static' },
          poses: { 坏动作: { label: '坏动作', steps: [{ frame: 0, durationMs: 0 }] } },
        },
      ]),
    ).toThrow(/durationMs: 期望正整数/)
    expect(() =>
      validateSprites([
        {
          id: 'g',
          asset: 'sprite.g',
          label: 'x',
          layout: { kind: 'static' },
          poses: {
            坏动作: {
              label: '坏动作',
              steps: [{ frame: 0, durationMs: 100, cues: [{ kind: 'dialog', asset: 'x' }] }],
            },
          },
        },
      ]),
    ).toThrow(/只允许 sound/)
    expect(() =>
      validateSprites([
        {
          id: 'g',
          asset: 'sprite.g',
          label: 'x',
          layout: { kind: 'static' },
          poses: {
            坏动作: {
              label: '坏动作',
              steps: [{ frame: 0, durationMs: 100 }],
              mode: 'loop',
            },
          },
        },
      ]),
    ).toThrow(/mode: 未知字段/)
  })
  test('id 唯一，且可与 catalog 的 sprite kind 交叉校验', () => {
    const def = { id: 'g', asset: 'sprite.g', label: 'x', layout: { kind: 'static' } }
    const record = {
      path: 'assets/authored/sprites/g.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 1,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' as const },
    }
    expect(() => validateSprites([def, def])).toThrow('重复 id')
    expect(() => validateSprites([def], { version: 1, assets: {} })).toThrow('不在 catalog')
    expect(() =>
      validateSprites([def], {
        version: 1,
        assets: { 'sprite.g': { ...record, kind: 'tileset' } },
      }),
    ).toThrow('期望 sprite')
    expect(
      validateSprites([def], {
        version: 1,
        assets: { 'sprite.g': { ...record, kind: 'sprite' } },
      }),
    ).toEqual([def])
  })
})

describe('validateActors(C0)', () => {
  const battler = {
    battleSprite: 'hero-battle-sprite',
    baseStats: {},
    initialEquipment: {},
    initialMagic: [],
  }
  test('合法(带/不带 battler)→ 原样返回', () => {
    const actors = [
      { id: 'youhun', name: 'name.youhun', spriteId: 'ghost' },
      { id: 'hero', name: 'name.hero', spriteId: 'hero-s', battler },
    ]
    expect(validateActors(actors)).toEqual(actors)
  })
  test('缺 spriteId → throw', () => {
    expect(() => validateActors([{ id: 'a', name: 'n' }])).toThrow('缺键 "spriteId"')
  })
  test('name 非 string → throw', () => {
    expect(() => validateActors([{ id: 'a', name: 1, spriteId: 's' }])).toThrow('name 非string')
  })
  test('battler 缺 baseStats → throw', () => {
    expect(() =>
      validateActors([
        { id: 'a', name: 'n', spriteId: 's', battler: { initialEquipment: {}, initialMagic: [] } },
      ]),
    ).toThrow('缺键 "baseStats"')
  })
  test('战斗音效只接受可选 AssetId，拒绝旧数字', () => {
    expect(() =>
      validateActors([
        {
          id: 'a',
          name: 'n',
          spriteId: 's',
          battler: { ...battler, sounds: { attack: 9 } },
        },
      ]),
    ).toThrow('期望非空 AssetId')
  })
  test('立绘组与 face 只接受 AssetId，expressions 全量检查', () => {
    expect(() =>
      validateActors([
        {
          id: 'a',
          name: 'n',
          spriteId: 's',
          portraits: { default: 'portrait.a', expressions: { hurt: 'portrait.a.hurt' } },
          face: 'face.a',
        },
      ]),
    ).not.toThrow()
    expect(() =>
      validateActors([{ id: 'a', name: 'n', spriteId: 's', portraits: { default: 1 } }]),
    ).toThrow('期望非空 AssetId')
    expect(() =>
      validateActors([
        {
          id: 'a',
          name: 'n',
          spriteId: 's',
          portraits: { default: 'portrait.a', expressions: { hurt: 2 } },
        },
      ]),
    ).toThrow('期望非空 AssetId')
    expect(() => validateActors([{ id: 'a', name: 'n', spriteId: 's', face: 1 }])).toThrow(
      '期望非空 AssetId',
    )
  })
})

test('技能、物品和敌人音效 guard 拒绝旧数字与负号协议', () => {
  expect(() =>
    validateSkills({
      skills: [
        {
          id: '1',
          name: 'n',
          cost: {},
          target: 'oneEnemy',
          effects: [],
          animation: { effectSprite: 1, sound: 45 },
        },
      ],
      levelUp: {},
    }),
  ).toThrow('期望非空 AssetId')
  expect(() =>
    validateItems([
      {
        id: '151',
        name: '引路蜂',
        desc: [],
        icon: 1,
        buyPrice: 1,
        sellPrice: 1,
        sellable: true,
        use: { target: 'oneAlly', consuming: true, effects: [], sound: 45 },
      },
    ]),
  ).toThrow('期望非空 AssetId')
  expect(() =>
    validateEnemies([
      {
        id: 'enemy-1',
        name: 'name.enemy-1',
        battleSprite: 'enemy-battle-1',
        yPosOffset: 0,
        stats: {},
        ai: {},
        sounds: { magic: -47 },
      },
    ]),
  ).toThrow('期望非空 AssetId')
})

test('物品图标和战场背景拒绝旧数字/路径字段，缺席语义合法', () => {
  const item = {
    id: '277',
    name: '无图物品',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
  expect(validateItems([item])).toEqual([item])
  expect(() => validateItems([{ ...item, icon: 1 }])).toThrow('期望非空 AssetId')
  expect(() =>
    validateBattleFields([
      {
        id: 6,
        bg: 'battle/bg/006.png',
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ]),
  ).toThrow('旧路径字段已退役')
  expect(() =>
    validateBattleFields([
      {
        id: 6,
        background: 6,
        screenWave: 0,
        magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ]),
  ).toThrow('期望非空 AssetId')
})

describe('validateItems · 装备战斗形象按角色覆写', () => {
  const item = (effects: unknown[]) => ({
    id: 'weapon',
    name: '测试武器',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    equip: { slot: 'weapon', equipableBy: ['hero', 'mage'], effects },
  })

  test('空映射与多角色映射合法，旧 sprite 字段 fail-closed', () => {
    expect(() =>
      validateItems([
        item([{ kind: 'battleSprite', byActor: {} }]),
        {
          ...item([{ kind: 'battleSprite', byActor: { hero: 'fighter-1', mage: 'fighter-2' } }]),
          id: 'weapon-2',
        },
      ]),
    ).not.toThrow()
    expect(() => validateItems([item([{ kind: 'battleSprite', sprite: 'fighter-1' }])])).toThrow(
      /sprite: 未知字段/,
    )
  })

  test('映射键值与单效果约束完整校验', () => {
    expect(() => validateItems([item([{ kind: 'battleSprite', byActor: { hero: '' } }])])).toThrow(
      /BattleSpriteDef.id/,
    )
    expect(() =>
      validateItems([item([{ kind: 'battleSprite', byActor: { ' hero ': 'fighter-1' } }])]),
    ).toThrow(/ActorDef.id/)
    expect(() =>
      validateItems([
        item([
          { kind: 'battleSprite', byActor: { hero: 'fighter-1' } },
          { kind: 'battleSprite', byActor: { mage: 'fighter-2' } },
        ]),
      ]),
    ).toThrow(/最多一个/)
  })
})

describe('validateItems · C8 用途能力契约', () => {
  const item = (use: unknown) => ({
    id: 'item',
    name: '测试物品',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    use,
  })

  test('合法的世界、战斗和剧情用途均通过，gate 缺省 chance 表示原版 100 阈值', () => {
    expect(() =>
      validateItems([
        item({
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'gate' }, { kind: 'healHp', amount: 10 }],
        }),
        {
          ...item({
            target: 'allAllies',
            consuming: true,
            battleOnly: true,
            effects: [{ kind: 'hideParty', turns: 3 }],
          }),
          id: 'battle',
        },
        {
          ...item({
            target: 'scene',
            consuming: false,
            menuAfterUse: 'close',
            effects: [
              { kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: '这里不能使用' },
            ],
          }),
          id: 'scene',
        },
      ]),
    ).not.toThrow()
  })

  test.each([
    [{ consuming: true, effects: [{ kind: 'healHp', amount: 1 }] }, /target: 期望/],
    [
      { target: 'oneAlly', consuming: 'yes', effects: [{ kind: 'healHp', amount: 1 }] },
      /consuming: 期望 boolean/,
    ],
    [
      { target: 'enemy', consuming: true, effects: [{ kind: 'healHp', amount: 1 }] },
      /target: 期望/,
    ],
    [{ target: 'oneAlly', consuming: true, effects: [{ kind: 'healHp', amount: 0 }] }, /不得为 0/],
    [
      { target: 'oneAlly', consuming: true, effects: [{ kind: 'revive', hpPercent: 101 }] },
      /不得大于 100/,
    ],
    [
      { target: 'oneAlly', consuming: true, effects: [{ kind: 'removeStatus', statuses: [] }] },
      /不得为空/,
    ],
    [{ target: 'oneAlly', consuming: true, effects: [{ kind: 'curePoison' }] }, /至少需要一个/],
    [{ target: 'oneAlly', consuming: true, effects: [{ kind: 'gate', chance: 0 }] }, /期望正数/],
    [
      { target: 'oneAlly', consuming: true, effects: [{ kind: 'hideParty', turns: 1 }] },
      /必须使用 allAllies/,
    ],
    [
      {
        target: 'scene',
        consuming: true,
        battleOnly: true,
        effects: [{ kind: 'runSceneHook', hook: 'onTeleport' }],
      },
      /battleOnly 用途包含不可用于战斗/,
    ],
    [
      {
        target: 'oneAlly',
        consuming: true,
        effects: [{ kind: 'runScript', script: { chunk: 'c', id: 's' } }],
      },
      /必须使用 scene/,
    ],
    [
      {
        target: 'scene',
        consuming: true,
        effects: [
          { kind: 'runSceneHook', hook: 'onTeleport' },
          { kind: 'healHp', amount: 1 },
        ],
      },
      /必须作为唯一效果/,
    ],
    [
      { target: 'scene', consuming: true, effects: [{ kind: 'healHp', amount: 1 }] },
      /scene 目标必须包含/,
    ],
    [
      {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: 'in', count: 1 }],
                products: [{ itemId: 'out', count: 1 }],
              },
            ],
          },
          { kind: 'healHp', amount: 1 },
        ],
      },
      /不能与角色或战斗效果混合/,
    ],
  ] as const)('拒绝非法用途 %#', (use, expected) => {
    expect(() => validateItems([item(use)])).toThrow(expected)
  })

  test('用途允许暂存空效果链，但投掷必须至少有一个效果', () => {
    expect(() =>
      validateItems([item({ target: 'scene', consuming: true, effects: [] })]),
    ).not.toThrow()
    expect(() =>
      validateItems([
        {
          ...item(undefined),
          id: 'empty-throw',
          throw: { target: 'oneEnemy', effects: [] },
        },
      ]),
    ).toThrow(/throw\.effects: 不得为空/)
    expect(itemUseSupportsContext({ target: 'scene', consuming: true, effects: [] }, 'world')).toBe(
      false,
    )
    expect(
      itemUseSupportsContext({ target: 'oneAlly', consuming: true, effects: [] }, 'battle'),
    ).toBe(false)
  })

  test.each([
    {
      target: 'oneEnemy',
      effects: [
        {
          kind: 'magicDamage',
          baseDamage: Number.MAX_SAFE_INTEGER + 1,
          element: 'none',
          strength: { kind: 'fixed', value: 1 },
        },
      ],
    },
    {
      target: 'oneEnemy',
      effects: [
        {
          kind: 'magicDamage',
          baseDamage: 1,
          element: 'none',
          strength: { kind: 'fixed', value: Number.MAX_SAFE_INTEGER + 1 },
        },
      ],
    },
    {
      target: 'oneEnemy',
      effects: [
        {
          kind: 'magicDamage',
          baseDamage: 1,
          element: 'none',
          strength: {
            kind: 'casterAttack',
            bonus: Number.MAX_SAFE_INTEGER + 1,
            multiplier: { kind: 'uniformInt', min: 0, max: 3 },
          },
        },
      ],
    },
    {
      target: 'oneEnemy',
      effects: [{ kind: 'fixedDamage', amount: Number.MAX_SAFE_INTEGER + 1 }],
    },
    {
      target: 'oneEnemy',
      effects: [
        {
          kind: 'currentHpDamage',
          numerator: 1,
          denominator: 2,
          bonus: 1,
          cap: Number.MAX_SAFE_INTEGER + 1,
        },
      ],
    },
    {
      target: 'oneEnemy',
      effects: [
        {
          kind: 'applyStatus',
          status: 'sleep',
          turns: Number.MAX_SAFE_INTEGER + 1,
          onResist: 'continue',
        },
      ],
    },
    {
      target: 'oneEnemy',
      effects: [{ kind: 'killIfHpAtMost', percent: Number.MAX_SAFE_INTEGER + 1 }],
    },
    {
      target: 'oneEnemy',
      effects: [
        {
          kind: 'damageAndHealCaster',
          damage: 1,
          heal: Number.MAX_SAFE_INTEGER + 1,
        },
      ],
    },
  ])('投掷全部数值边界拒绝非安全整数 %#', (thrown) => {
    expect(() => checkThrowSpec(thrown)).toThrow(/安全整数/)
  })

  test('兼容壳允许当前物品的 v5 私有脚本与普通效果组合', () => {
    const privateRuntime = {
      kind: 'runScript' as const,
      script: { chunk: '__script-v5-runtime', id: 'item:item:use' },
    }
    expect(() =>
      validateItems([
        item({
          target: 'scene',
          consuming: false,
          effects: [privateRuntime],
        }),
        {
          ...item(undefined),
          id: 'mixed',
          use: {
            target: 'oneAlly',
            consuming: true,
            effects: [
              {
                kind: 'runScript',
                script: { chunk: '__script-v5-runtime', id: 'item:mixed:use' },
              },
              { kind: 'healHp', amount: 1 },
            ],
          },
        },
      ]),
    ).not.toThrow()
    expect(() =>
      validateItems([
        item({
          target: 'oneAlly',
          consuming: true,
          effects: [privateRuntime, { kind: 'healHp', amount: 1 }],
        }),
      ]),
    ).not.toThrow()
    expect(() =>
      validateItems([
        item({
          target: 'oneAlly',
          consuming: true,
          effects: [
            {
              kind: 'runScript',
              script: { chunk: '__script-v5-runtime', id: 'item:other:use' },
            },
            { kind: 'healHp', amount: 1 },
          ],
        }),
      ]),
    ).toThrow(/必须作为唯一效果/)
  })

  test('配方与资源池完整校验，投掷拒绝世界专用效果', () => {
    expect(() =>
      validateItems([
        item({
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [{ ingredients: [], products: [{ itemId: 'out', count: 1 }] }],
            },
          ],
        }),
      ]),
    ).toThrow(/ingredients: 不得为空/)
    expect(() =>
      validateItems([
        item({
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 2,
              rewards: [{ itemId: 'one', count: 1 }],
            },
          ],
        }),
      ]),
    ).toThrow(/至少覆盖 maxRoll 档/)
    expect(() =>
      validateItems([
        {
          ...item(undefined),
          throw: {
            target: 'oneEnemy',
            effects: [
              {
                kind: 'craftRecipe',
                recipes: [
                  {
                    ingredients: [{ itemId: 'in', count: 1 }],
                    products: [{ itemId: 'out', count: 1 }],
                  },
                ],
              },
            ],
          },
        },
      ]),
    ).toThrow(/未知投掷效果/)
  })

  test('消耗型配方工具不能又把自身列为材料', () => {
    expect(() =>
      validateItems([
        item({
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: 'item', count: 1 }],
                  products: [{ itemId: 'out', count: 1 }],
                },
              ],
            },
          ],
        }),
      ]),
    ).toThrow(/不能同时作为自身配方材料/)
  })
})

describe('validateStartWorldResources', () => {
  const startWorld = (resources?: unknown): unknown => ({
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
    ...(resources === undefined ? {} : { resources }),
  })

  test('允许零值与自定义非负安全整数', () => {
    expect(() => validateStartWorldResources(startWorld({ herb: 0, essence: 9 }))).not.toThrow()
  })

  test.each([
    [{ '': 1 }, /资源键不能为空/],
    [{ ' herb': 1 }, /不得包含首尾空格/],
    [{ 'herb ': 1 }, /不得包含首尾空格/],
    [{ collectValue: 1 }, /保留资源/],
    [{ herb: -1 }, /非负安全整数/],
    [{ herb: 1.5 }, /非负安全整数/],
    [{ herb: Number.POSITIVE_INFINITY }, /非负安全整数/],
  ])('拒绝非法资源池 %#', (resources, expected) => {
    expect(() => validateStartWorldResources(startWorld(resources))).toThrow(expected)
  })
})

describe('validateLocale · 对话行边界', () => {
  test('新内容禁止 locale 内换行；loader 兼容边界可显式保留旧软换行', () => {
    expect(() => validateLocale({ old: '第一行\n第二行' })).toThrow(/DialogueCue\.rows/)
    expect(validateLocale({ old: '第一行\n第二行' }, { allowLegacySoftWrap: true })).toEqual({
      old: '第一行\n第二行',
    })
  })
})
