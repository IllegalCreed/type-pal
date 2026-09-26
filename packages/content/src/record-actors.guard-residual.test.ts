/**
 * TEST-GLM-CONTENT-GUARDS-3 G6：validateActors 残差。
 * 去重：validate.test.ts（E18-1 三字段/C0 结构、立绘 AssetId expressions、战斗音效、
 * 初始仙术重复、chance 越界、style/effect kind/percent<1）、validate-actors.boundaries
 * （基础字段/battler 边界）、rewards.boundaries 正控——本文件只补冻结池内：
 * expressions 空表情名、casualty fallback 空文本、heal resource chi、
 * tempStatBuff stat 域与 percent 非整数，以及非战斗人物+可选域全量正控。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { validateActors } from './validate.js'

const nonCombatActor = () => ({
  id: 'actor-villager',
  name: 'name.villager',
  spriteId: 'sprite.villager',
  face: 'face.villager',
  portraits: { default: 'portrait.villager', expressions: { smile: 'portrait.smile' } },
  sounds: { hit: 'sound.hit' },
})

const battlerActor = (over: Record<string, unknown> = {}) => ({
  id: 'hero',
  name: 'name.hero',
  spriteId: 'hero-sprite',
  battler: {
    battleSprite: 'hero-battle-sprite',
    baseStats: {
      health: 100,
      level: 1,
      exp: 0,
      cash: 0,
      attackStrength: 10,
      magicStrength: 4,
      defense: 8,
      dexterity: 6,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    initialEquipment: {},
    initialMagic: [],
    ...over,
  },
})

const validCasualty = () => ({
  friendDeath: {
    gates: [{ chance: 75, branch: { lines: [{ text: 'dlg.1', style: 'bottom' }], effects: [] } }],
    fallback: { lines: [], effects: [{ kind: 'heal', resource: 'hp' }] },
  },
})

describe('G6 validateActors 残差', () => {
  test('非战斗人物与可选域全量正控通过且输入保真', () => {
    expectAcceptsUnchanged((value) => validateActors(value), [nonCombatActor()])
    expectAcceptsUnchanged(
      (value) => validateActors(value),
      [
        battlerActor({
          coveredBy: 'hero2',
          cooperativeMagicSkillId: '99',
          casualty: validCasualty(),
        }),
      ],
    )
  })

  test('portraits.expressions 空表情名拒绝', () => {
    const bad = [
      {
        ...nonCombatActor(),
        portraits: { default: 'portrait.villager', expressions: { '': 'portrait.x' } },
      },
    ]
    const before = deepSnapshot(bad)
    expectExactError(() => validateActors(bad), 'actors[0].portraits.expressions: 表情名不能为空')
    expect(bad).toEqual(before)
  })

  test.each([
    [
      'casualty fallback 空文本',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: { lines: [{ text: '', style: 'bottom' }], effects: [] },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.lines[0].text: 期望非空 TextId',
    ],
    [
      'casualty heal resource chi',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: { lines: [], effects: [{ kind: 'heal', resource: 'chi' }] },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.effects[0].resource: 期望 hp|mp',
    ],
    [
      'casualty tempStatBuff stat 域',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: { lines: [], effects: [{ kind: 'tempStatBuff', stat: 'hp', percent: 2 }] },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.effects[0].stat: 期望 attack|magic|speed|luck',
    ],
    [
      'casualty tempStatBuff percent 非整数',
      {
        casualty: {
          friendDeath: {
            gates: [],
            fallback: {
              lines: [],
              effects: [{ kind: 'tempStatBuff', stat: 'attack', percent: 1.5 }],
            },
          },
        },
      },
      'actors[0].battler.casualty.friendDeath.fallback.effects[0].percent: 期望整数 ≥1',
    ],
  ] as const)('%s拒绝且实际输入不变', (_label, over, error) => {
    expectAcceptsUnchanged(
      (value) => validateActors(value),
      [battlerActor({ casualty: validCasualty() })],
    )
    const bad = [battlerActor(over)]
    const before = deepSnapshot(bad)
    expectExactError(() => validateActors(bad), error)
    expect(bad).toEqual(before)
  })
})
