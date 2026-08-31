import type { ItemData, SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyPalGeneratedCraftMessages,
  applyPalGeneratedResourcePoolMessages,
  applyPalItemOverlays,
  applyPalSkillOverlays,
} from './pal-authored-overlays.js'

describe('PAL 已审计内容 overlay', () => {
  test('隐蛊使用效果在上游纯函数中回补且幂等', () => {
    const source = [{ id: '141', name: '隐蛊' }] as ItemData[]
    const once = applyPalItemOverlays(source)
    expect(once[0]?.use).toEqual({
      target: 'allAllies',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'hideParty', turns: 3 }],
    })
    expect(applyPalItemOverlays(once)).toEqual(once)
    expect(source[0]?.use).toBeUndefined()
  })

  test('傀儡状态用途由上游明确限制为战斗内使用', () => {
    const source = [
      {
        id: '152',
        name: '傀儡虫',
        use: {
          target: 'oneAlly',
          consuming: true,
          effects: [{ kind: 'applyStatus', status: 'puppet', turns: 9 }],
        },
      },
    ] as ItemData[]
    const once = applyPalItemOverlays(source)
    expect(once[0]?.use?.battleOnly).toBe(true)
    expect(applyPalItemOverlays(once)).toEqual(once)
    expect(source[0]?.use?.battleOnly).toBeUndefined()
  })

  test('current publication 只同步同轮 producer 的 craft failure message', () => {
    const recipes = [
      {
        ingredients: [{ itemId: '117', count: 1 }],
        products: [{ itemId: '148', count: 1 }],
      },
    ]
    const current = [
      {
        id: '999',
        name: '作者标题',
        desc: ['作者说明'],
        buyPrice: 123,
        sellPrice: 45,
        sellable: true,
        use: {
          target: 'scene',
          consuming: false,
          effects: [{ kind: 'craftRecipe', recipes }],
        },
      },
    ] as ItemData[]
    const generated = [
      {
        ...structuredClone(current[0]!),
        name: 'producer 标题不得覆盖作者标题',
        use: {
          ...structuredClone(current[0]!.use!),
          effects: [
            {
              kind: 'craftRecipe' as const,
              recipes: structuredClone(recipes),
              unavailableMessage: '源失败原文',
            },
          ],
        },
      },
    ]

    const once = applyPalGeneratedCraftMessages(current, generated)
    expect(once).toEqual([
      {
        ...current[0],
        use: {
          ...current[0]!.use,
          effects: [{ kind: 'craftRecipe', recipes, unavailableMessage: '源失败原文' }],
        },
      },
    ])
    expect(applyPalGeneratedCraftMessages(once, generated)).toEqual(once)
    expect(current[0]!.use!.effects[0]).not.toHaveProperty('unavailableMessage')

    const generatedWithoutMessage = structuredClone(generated)
    const generatedCraft = generatedWithoutMessage[0]!.use!.effects[0]!
    if (generatedCraft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    Reflect.deleteProperty(generatedCraft, 'unavailableMessage')
    expect(applyPalGeneratedCraftMessages(once, generatedWithoutMessage)).toEqual(once)
  })

  test('producer craft message 的空白值或配方结构不一致时 fail-loud', () => {
    const current = [
      {
        id: '999',
        name: '作者物品',
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: '117', count: 1 }],
                  products: [{ itemId: '148', count: 1 }],
                },
              ],
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    const generatedCraft = generated[0]!.use!.effects[0]!
    if (generatedCraft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    generatedCraft.unavailableMessage = '源失败原文'
    generatedCraft.recipes[0]!.products[0] = { itemId: '149', count: 1 }
    expect(() => applyPalGeneratedCraftMessages(current, generated)).toThrow(/recipes drift/)

    generatedCraft.recipes[0]!.products[0] = { itemId: '148', count: 1 }
    generatedCraft.unavailableMessage = '   '
    expect(() => applyPalGeneratedCraftMessages(current, generated)).toThrow(/message 非法/)
  })

  test('producer message ownership 的重复 id、缺 current 与 craft 数量歧义全部 fail-loud', () => {
    const current = [
      {
        id: '999',
        name: '作者物品',
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'craftRecipe',
              recipes: [
                {
                  ingredients: [{ itemId: '117', count: 1 }],
                  products: [{ itemId: '148', count: 1 }],
                },
              ],
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    const generatedCraft = generated[0]!.use!.effects[0]!
    if (generatedCraft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    generatedCraft.unavailableMessage = '源失败原文'

    expect(() => applyPalGeneratedCraftMessages([...current, current[0]!], generated)).toThrow(
      /current 重复 item id/,
    )
    expect(() => applyPalGeneratedCraftMessages(current, [...generated, generated[0]!])).toThrow(
      /generated 重复 item id/,
    )
    expect(() => applyPalGeneratedCraftMessages([], generated)).toThrow(/current 缺物品 999/)

    const missingCraft = structuredClone(current)
    missingCraft[0]!.use!.effects = []
    expect(() => applyPalGeneratedCraftMessages(missingCraft, generated)).toThrow(/craft 数量漂移/)
  })

  test('current publication 只同步同轮 producer 的 resource-pool failure message', () => {
    const rewards = [
      { itemId: '100', count: 1 },
      { itemId: '105', count: 1 },
    ]
    const current = [
      {
        id: '888',
        name: '作者葫芦',
        desc: ['作者说明'],
        buyPrice: 321,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 2,
              rewards,
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    generated[0]!.name = 'producer 标题不得覆盖作者标题'
    const generatedPool = generated[0]!.use!.effects[0]!
    if (generatedPool.kind !== 'drawFromResourcePool') throw new Error('expected pool')
    generatedPool.unavailableMessage = '无任何效果'

    const once = applyPalGeneratedResourcePoolMessages(current, generated)
    expect(once).toEqual([
      {
        ...current[0],
        use: {
          ...current[0]!.use,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 2,
              rewards,
              unavailableMessage: '无任何效果',
            },
          ],
        },
      },
    ])
    expect(applyPalGeneratedResourcePoolMessages(once, generated)).toEqual(once)
    expect(current[0]!.use!.effects[0]).not.toHaveProperty('unavailableMessage')
  })

  test('producer resource-pool message 的空白值或结构漂移时 fail-loud', () => {
    const current = [
      {
        id: '888',
        name: '作者葫芦',
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'drawFromResourcePool',
              resource: 'collectValue',
              maxRoll: 1,
              rewards: [{ itemId: '100', count: 1 }],
            },
          ],
        },
      },
    ] as ItemData[]
    const generated = structuredClone(current)
    const generatedPool = generated[0]!.use!.effects[0]!
    if (generatedPool.kind !== 'drawFromResourcePool') throw new Error('expected pool')
    generatedPool.unavailableMessage = '无任何效果'
    generatedPool.resource = 'other'
    expect(() => applyPalGeneratedResourcePoolMessages(current, generated)).toThrow(
      /resource pool drift/,
    )

    generatedPool.resource = 'collectValue'
    generatedPool.unavailableMessage = ' 无任何效果 '
    expect(() => applyPalGeneratedResourcePoolMessages(current, generated)).toThrow(/message 非法/)
  })

  test('四个动态技能稳定追加，已有时以审计定义覆盖', () => {
    const source = [
      { id: '296', name: '气疗术' },
      { id: '314', name: 'stale' },
    ] as SkillData[]
    const once = applyPalSkillOverlays(source)
    expect(once.map((skill) => skill.id)).toEqual(['296', '314', '344', '392', '394'])
    expect(once.find((skill) => skill.id === '314')?.name).toBe('风卷残云')
    expect(once.find((skill) => skill.id === '344')?.cost.money).toBe(500)
    expect(once.find((skill) => skill.id === '392')?.effects).toEqual([{ kind: 'fleeBattle' }])
    expect(once.find((skill) => skill.id === '394')?.effects[0]?.kind).toBe('moneyDamage')
    expect(applyPalSkillOverlays(once)).toEqual(once)
    expect(source[1]?.name).toBe('stale')
  })

  test('R13-6B 分支、前震屏和酒神资源公式在上游回补', () => {
    const source = [
      {
        id: '303',
        name: '回梦',
        effects: [{ kind: 'gate', chance: 60 }],
        animation: { effectSprite: 40 },
      },
      {
        id: '304',
        name: '夺魂',
        effects: [
          { kind: 'gate', magicResist: true },
          { kind: 'gate', chance: 33 },
          { kind: 'instantKill' },
        ],
        animation: { effectSprite: 39 },
      },
      {
        id: '305',
        name: '鬼降',
        effects: [{ kind: 'gate', chance: 44 }],
        animation: { effectSprite: 41 },
      },
      {
        id: '330',
        name: '天罡战气',
        effects: [{ kind: 'damage', power: 320, elemental: 4 }],
        animation: { effectSprite: 12 },
      },
      ...['334', '342', '357', '378', '380', '385'].map((id) => ({
        id,
        name: `震屏技能 ${id}`,
        effects: [{ kind: 'damage' as const, power: 1, elemental: 0 }],
        animation: { effectSprite: 1 },
      })),
      {
        id: '370',
        name: '酒神',
        effects: [
          { kind: 'summon', battleSprite: 'player-summon-15', speed: 1, sound: 'sound.pal.301' },
          { kind: 'damage', power: 3, elemental: 0 },
        ],
        animation: { effectSprite: 34 },
        cost: { mp: 1 },
      },
    ] as SkillData[]
    const frozen = applyPalSkillOverlays(source)
    expect(frozen.find((skill) => skill.id === '303')?.execution).toBeUndefined()
    expect(frozen.find((skill) => skill.id === '330')?.animation.preShake).toBeUndefined()
    expect(frozen.find((skill) => skill.id === '370')?.cost.items).toBeUndefined()
    expect(frozen.find((skill) => skill.id === '370')?.lifetimeLimit).toBeUndefined()

    const out = applyPalSkillOverlays(source, { r13SixBExecution: true })
    const byId = new Map(out.map((skill) => [skill.id, skill]))
    expect(
      Object.fromEntries(
        ['330', '334', '342', '357', '378', '380', '385'].map((id) => [
          id,
          byId.get(id)?.animation.preShake,
        ]),
      ),
    ).toEqual({
      '330': { frames: 20, level: 4 },
      '334': { frames: 20, level: 4 },
      '342': { frames: 14, level: 4 },
      '357': { frames: 24, level: 4 },
      '378': { frames: 14, level: 4 },
      '380': { frames: 14, level: 4 },
      '385': { frames: 14, level: 4 },
    })
    expect(byId.get('303')?.execution?.enemy?.effects).toEqual([
      { kind: 'gate', chance: 70 },
      { kind: 'applyStatus', status: 'sleep', turns: 3 },
      { kind: 'resourceDelta', resource: 'hp', delta: -1 },
    ])
    expect(byId.get('304')?.execution?.enemy?.effects).toEqual([
      { kind: 'gate', chance: 30 },
      { kind: 'instantKill' },
    ])
    expect(byId.get('305')?.execution?.enemy?.effects).toEqual([
      { kind: 'gate', chance: 50 },
      { kind: 'applyStatus', status: 'confused', turns: 3 },
      { kind: 'resourceDelta', resource: 'hp', delta: -1 },
    ])
    expect(byId.get('370')?.cost.items).toEqual([{ itemId: '86', amount: 1 }])
    expect(byId.get('370')?.lifetimeLimit).toBe(9)
    expect(byId.get('370')?.execution?.player?.prepare).toEqual([
      { kind: 'remainingResourceDamage', resource: 'mp', multiplier: 8, consume: 'all' },
    ])
    expect(byId.get('370')?.execution?.player?.effects).toEqual([
      { kind: 'summon', battleSprite: 'player-summon-15', speed: 1, sound: 'sound.pal.301' },
    ])
  })
})
