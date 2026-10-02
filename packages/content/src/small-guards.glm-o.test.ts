/** TEST-GLM-WAVE-O-1 O08/O09：商店/奖励/精灵/敌队/敌脚本/运行时校验/对话身份小 guard 残余。
 *  旧证：shop.test.ts / rewards.test.ts / sprite / enemy-team / author-dialogue /
 *  validate-runtime 各自覆盖主干；本卡按 gap-map 直击未覆盖臂。
 */

import type { ActorDef, Command, ItemData, ShopDef, WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { resolveDialogueIdentity } from './author-dialogue.js'
import { buildWorld, instantiate } from './character.js'
import { collectCommandTargetReferences } from './command-target-reference.js'
import { validateEnemyTeamStructure } from './enemy-team.js'
import { sellableItems, shopBuy, shopSell, validateShops } from './shop.js'
import { spriteDefinitionFrameDemand, spriteDefinitionFrameIndices } from './sprite.js'
import { checkThrowSpec } from './validate.js'
import { validateRuntimeScenes } from './validate-runtime.js'

const world = (over: Partial<WorldState> = {}): WorldState =>
  ({
    party: [],
    learnedSkills: {},
    inventory: [{ itemId: 'i1', count: 2 }],
    money: 100,
    ...over,
  }) as WorldState

const item = (id: string, over: Partial<ItemData> = {}): ItemData =>
  ({
    id,
    name: id,
    desc: [],
    buyPrice: 10,
    sellPrice: 5,
    sellable: true,
    ...over,
  }) as ItemData

describe('O09 validateShops / shopBuy / shopSell / sellableItems', () => {
  const shop: ShopDef = { id: 1, items: ['i1'] }

  test('非数组 / 非对象条目 / 负 id / 重复 id / 非法 items 逐轴拒绝', () => {
    expect(() => validateShops('x')).toThrow('shops 期望数组')
    expect(() => validateShops([null])).toThrow('shops[0] 期望商店对象')
    expect(() => validateShops([{ id: -1, items: [] }])).toThrow('shops[0].id 必须为非负安全整数')
    expect(() => validateShops([shop, { ...shop, id: 1 }])).toThrow('shops 重复 id 1')
    expect(() => validateShops([{ id: 1, items: [''] }])).toThrow(/items 必须为物品 id 数组/)
  })

  test('shopBuy：钱不够 null；成功扣钱入包', () => {
    const items = { i1: item('i1', { buyPrice: 50 }) }
    expect(shopBuy(world({ money: 10 }), 'i1', items)).toBeNull()
    const after = shopBuy(world(), 'i1', items)!
    expect(after.money).toBe(50)
    expect(after.inventory).toEqual([{ itemId: 'i1', count: 3 }])
  })

  test('shopSell：不可卖 / 背包没有 → null；成功出包得款并清零条目', () => {
    const items = { i1: item('i1', { sellable: false }) }
    expect(shopSell(world(), 'i1', items)).toBeNull()
    const empty = world({ inventory: [] })
    expect(shopSell(empty, 'i1', { i1: item('i1') })).toBeNull()
    const after = shopSell(world(), 'i1', { i1: item('i1', { sellPrice: 7 }) })!
    expect(after.money).toBe(107)
    // count 2 → 卖 1 剩 1（不清零整条）。
    expect(after.inventory).toEqual([{ itemId: 'i1', count: 1 }])
  })

  test('sellableItems 过滤 count=0 与不可卖', () => {
    const items = { i1: item('i1'), i2: item('i2', { sellable: false }) }
    const w = world({
      inventory: [
        { itemId: 'i1', count: 1 },
        { itemId: 'i2', count: 3 },
      ],
    })
    expect(sellableItems(w, items)).toEqual(['i1'])
  })
})

describe('O09 spriteDefinitionFrameDemand / FrameIndices', () => {
  test('directional 帧需求 = framesPerDir*4 + poses 绝对帧', () => {
    const demand = spriteDefinitionFrameDemand({
      layout: { kind: 'directional', framesPerDir: 3 },
      poses: { wave: { label: 'w', steps: [{ frame: 20, durationMs: 100 }] } },
    })
    expect(demand).toBe(21)
    expect(
      spriteDefinitionFrameIndices({
        layout: { kind: 'directional', framesPerDir: 2 },
      }).size,
    ).toBe(8)
  })

  test('static 帧需求 = 1', () => {
    expect(spriteDefinitionFrameDemand({ layout: { kind: 'static' } })).toBe(1)
  })
})

describe('O09 validateEnemyTeamStructure：槽位形状', () => {
  test('非数组 / 槽位非数组 / 非字符串槽 / 非法 id 逐轴拒绝；null 槽合法', () => {
    expect(() => validateEnemyTeamStructure('x')).toThrow()
    expect(() => validateEnemyTeamStructure([{ id: 't', slots: 'x' }])).toThrow()
    expect(() => validateEnemyTeamStructure([{ id: 't', slots: [42] }])).toThrow()
    expect(() => validateEnemyTeamStructure([{ id: '', slots: [] }])).toThrow()
    expect(validateEnemyTeamStructure([{ id: 't', slots: ['e1', null] }])).toEqual([
      { id: 't', slots: ['e1', null] },
    ])
  })
})

describe('O09 checkRuntimeScenes：运行态场景入口', () => {
  test('非法场景（entry 缺 facing）拒绝；合法最小场景通过', () => {
    expect(() =>
      validateRuntimeScenes([
        {
          id: 's',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'south' },
          entities: [],
        },
      ]),
    ).toThrow(/facing: 期望 up\/down\/left\/right/)
    expect(() =>
      validateRuntimeScenes([
        {
          id: 's',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
        },
      ]),
    ).not.toThrow()
  })
})

describe('O09 checkThrowSpec：投掷规格边界', () => {
  const legal = {
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 1, elemental: 0 }],
    sound: 'sound.pal.028',
    presentation: {
      kind: 'magic',
      animation: { effectSprite: 1 },
    },
  }

  test('effects 空 / target 非法 逐轴拒绝', () => {
    expect(() => checkThrowSpec({ ...legal, effects: [] })).toThrow(/effects: 不得为空/)
    expect(() => checkThrowSpec({ ...legal, target: 'allAllies' })).toThrow(
      'throw.target: 期望 oneEnemy/allEnemies',
    )
  })

  test('presentation 非 magic 拒绝', () => {
    expect(() =>
      checkThrowSpec({
        ...legal,
        presentation: { kind: 'fade', animation: { effectSprite: 1 } },
      }),
    ).toThrow('throw.presentation.kind: 期望 magic')
  })
})

describe('O09 resolveDialogueIdentity / collectCommandTargetReferences', () => {
  const actors: ActorDef[] = [
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'hero-sprite',
      portraits: { default: 'portrait.hero' },
    },
  ]

  test('身份：actor 绑定命中 actor 得头像；未知 actor 拒绝；narration 空', () => {
    const byId = Object.fromEntries(actors.map((entry) => [entry.id, entry]))
    const hit = resolveDialogueIdentity({ kind: 'actor', actor: 'hero' }, byId)
    // 无显式 portrait 时回退 speaker = actor name textId；portrait 仅在显式声明时透传。
    expect(hit).toEqual({ speaker: 'name.hero' })
    expect(() => resolveDialogueIdentity({ kind: 'actor', actor: 'ghost' }, byId)).toThrow(/ghost/)
    expect(resolveDialogueIdentity({ kind: 'narration' }, byId)).toEqual({})
  })

  test('loadScene 命令收集目标场景引用', () => {
    const command: Command = { kind: 'loadScene', scene: 's-target', entryId: 'default' }
    const refs = collectCommandTargetReferences(command, 'p')
    expect(refs.length).toBeGreaterThan(0)
    expect(JSON.stringify(refs)).toContain('s-target')
  })
})

describe('O09 buildWorld / instantiate：实例域边界', () => {
  test('instantiate：无 battler fail-loud；battler 角色取 baseStats', () => {
    expect(() => instantiate({ id: 'npc', name: 'n', spriteId: 's' })).toThrow(
      'instantiate: 角色 "npc" 无 battler(不可入队/参战)',
    )
    const hero = instantiate({
      id: 'hero',
      name: 'name.hero',
      spriteId: 's',
      battler: {
        baseStats: {
          level: 2,
          hp: 150,
          maxHP: 150,
          mp: 30,
          maxMP: 30,
          attack: 9,
          defense: 8,
          magicAttack: 7,
          speed: 6,
          luck: 5,
        },
        initialEquipment: {},
        initialMagic: [],
        battleSprite: 'b',
      },
    })
    expect(hero.hp).toBe(150)
  })

  test('buildWorld：入口 party 引用缺失 actor → 精确 missing-actor 诊断', () => {
    // actorsById 只含 hero（真实合法表）；ghost 是真正缺键。
    expect(() =>
      buildWorld(
        { party: ['ghost'], money: 0, inventory: [] },
        {
          hero: {
            id: 'hero',
            name: 'name.hero',
            spriteId: 'hero-sprite',
            battler: {
              baseStats: {
                level: 1,
                hp: 100,
                maxHP: 100,
                mp: 30,
                maxMP: 30,
                attack: 10,
                defense: 10,
                magicAttack: 10,
                speed: 10,
                luck: 10,
              },
              initialEquipment: {},
              initialMagic: [],
              battleSprite: 'hero-battle',
            },
          },
        },
      ),
    ).toThrow('buildWorld: 角色 "ghost" 不在 actors 表')
  })
})
