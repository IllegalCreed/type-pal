import type { EntityAddress, ItemUseEffect } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { raw, type SourceInstruction, unchanged } from './__tests__/pure-migration-fixtures.js'
import {
  buildLabelIndex,
  shouldMigrateUseAsSharedScript,
  translateCraftRecipeScript,
  translatePlaceEntityInFrontUseScript,
  translateResourcePoolScript,
  translateUseScript,
} from './migrate-content.js'

function run(commands: SourceInstruction[], ip = 10) {
  return unchanged(commands, (c) => translateUseScript(c, buildLabelIndex(c), ip))
}

describe('self-contained item use translation', () => {
  it('ordered supported effects keep distinct world semantics and signed/default boundaries', () => {
    const commands = [
      raw(0x1b, [0, 5], 'L_10'),
      raw(0x1c, [0, 6]),
      raw(0x1d, [0, 7]),
      raw(0x22, [0, 1]),
      raw(0x2d, [5, 3]),
      raw(0x2f, [0]),
      raw(0x2f, [2]),
      raw(0x2f, [0]),
      raw(0x2b, [0, 552]),
      raw(0x2c, [0, 2]),
      raw(0x2c, [0, 3]),
      raw(0x29, [0, 551]),
      raw(0x06, [60]),
      raw(0x61),
      raw(0x5a),
      raw(0x62, [2]),
      raw(0x63, [3]),
      raw(0x8d),
      raw(0x8d, [2]),
      raw(0x38),
      raw(0x17, [17, 22, 65535]),
      { op: 'end' },
    ]
    const effects: ItemUseEffect[] = [
      { kind: 'healHp', amount: 5 },
      { kind: 'healMp', amount: 6 },
      { kind: 'healHp', amount: 7 },
      { kind: 'healMp', amount: 7 },
      { kind: 'revive', hpPercent: 10 },
      { kind: 'applyStatus', status: 'bravery', turns: 3 },
      { kind: 'removeStatus', statuses: ['confused', 'sleep'] },
      { kind: 'curePoison', poisonId: '552' },
      { kind: 'curePoison', curesTier: 'common' },
      { kind: 'curePoison', curesTier: 'severe' },
      { kind: 'applyPoison', poisonId: '551' },
      { kind: 'gate', chance: 60 },
      { kind: 'dieIfNotPoisoned' },
      { kind: 'scaleCurrentHp', numerator: 1, denominator: 2 },
      { kind: 'modifyHostileAwareness', rangeMultiplier: 0, durationMs: 200 },
      { kind: 'modifyHostileAwareness', rangeMultiplier: 3, durationMs: 300 },
      { kind: 'levelUp', levels: 1 },
      { kind: 'levelUp', levels: 2 },
      { kind: 'runSceneHook', hook: 'onTeleport', unavailableMessage: '无任何效果' },
      { kind: 'extraPoisonRes', amount: -1 },
    ]
    expect(run(commands)).toEqual({ effects, lossyNotes: [] })
  })

  it('permanent growth rows retain separate attributes, including negative delta', () => {
    expect(
      run([
        raw(0x19, [7, 2], 'L_10'),
        raw(0x19, [8, 3]),
        raw(0x19, [17, 4]),
        raw(0x19, [18, 5]),
        raw(0x19, [19, 6]),
        raw(0x19, [20, 7]),
        raw(0x19, [21, 65535]),
      ]),
    ).toEqual({
      effects: [
        { kind: 'permanentStatBoost', stat: 'maxHP', delta: 2 },
        { kind: 'permanentStatBoost', stat: 'maxMP', delta: 3 },
        { kind: 'permanentStatBoost', stat: 'attack', delta: 4 },
        { kind: 'permanentStatBoost', stat: 'magicAttack', delta: 5 },
        { kind: 'permanentStatBoost', stat: 'defense', delta: 6 },
        { kind: 'permanentStatBoost', stat: 'speed', delta: 7 },
        { kind: 'permanentStatBoost', stat: 'luck', delta: -1 },
      ],
      lossyNotes: [],
    })
  })

  it.each([
    [0x2d, [99], '0x2D 未知状态 id 99'],
    [0x2f, [99], '0x2F 未知状态 id 99'],
    [0x19, [99], '0x19 未知 row 99'],
    [0x17, [12, 22], '0x17 未支持的 Extra 属性(层1 行22)'],
    [0x20, [], 'op 0x20（按材料数量分支）尚未转换为结构化物品用途'],
    [0x34, [], 'op 0x34（灵葫资源炼丹）尚未转换为结构化物品用途'],
    [0x5c, [], 'op 0x5c（队伍隐身回合）尚未转换为结构化物品用途'],
    [0x81, [], 'op 0x81（面向场景对象触发剧情）需迁移为稳定共享脚本'],
    [0x84, [], 'op 0x84（把使用物放置为场景对象）需迁移为稳定场景脚本'],
    [0x99, [], 'op 0x99 尚未转换为结构化物品用途'],
  ] as const)('unsupported use opcode %i explicitly retains reason', (opcode, operands, reason) => {
    expect(
      run([raw(0x1b, [0, 2], 'L_10'), raw(opcode, [...operands]), raw(0x1c, [0, 99])]),
    ).toEqual({ effects: [{ kind: 'healHp', amount: 2 }], lossyNotes: [], pendingReason: reason })
  })

  it('entry failures, tail-call cycles and nonraw commands never masquerade as successful use', () => {
    expect(run([], 0)).toEqual({ effects: [], lossyNotes: [], pendingReason: 'L_0 不存在' })
    expect(run([])).toEqual({ effects: [], lossyNotes: [], pendingReason: 'L_10 不存在' })
    expect(run([{ label: 'L_10', op: 'goto' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: 'goto ? 不可跟进',
    })
    expect(run([{ label: 'L_10', op: 'goto', to: 'L_10' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: 'goto L_10 不可跟进',
    })
    expect(run([{ label: 'L_10', op: 'showDialog', text: 'hi' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: '剧情类(showDialog)→ B2 脚本',
    })
  })

  it('tail, marker and presentation-only ops keep source order and explicit lossy note', () => {
    expect(
      run([
        { label: 'L_10', op: 'goto', to: 'L_20' },
        raw(0x99),
        { label: 'L_20' },
        raw(167),
        raw(0x05),
        raw(0xa1),
        raw(0x68, [33]),
        { op: 'raw', opcode: 0x1b },
      ]),
    ).toEqual({
      effects: [{ kind: 'healHp', amount: 0 }],
      lossyNotes: ['0x68 战斗分支(L_33)未表达 —— 战斗期'],
    })
    expect(run([{ label: 'L_10', op: 'raw' }])).toEqual({
      effects: [],
      lossyNotes: [],
      pendingReason: 'op 0x0 尚未转换为结构化物品用途',
    })
  })

  it('item use sound omission, repeat and conflict preserve sound identity', () => {
    const commands = [
      raw(0x47, [0], 'L_10'),
      raw(0x47, [2]),
      raw(0x47, [3]),
      raw(0x47, [3]),
      { op: 'end' },
    ]
    const calls: number[] = []
    expect(
      unchanged(commands, (c) =>
        translateUseScript(c, buildLabelIndex(c), 10, (n) => {
          calls.push(n)
          return n === 3 ? 'sound.custom' : undefined
        }),
      ),
    ).toEqual({ effects: [], sound: 'sound.custom', lossyNotes: [] })
    expect(calls).toEqual([2, 3, 3])
    expect(run([raw(0x47, [2], 'L_10'), raw(0x47, [3])])).toEqual({
      effects: [],
      sound: 'sound.pal.002',
      lossyNotes: [],
      pendingReason: '多个不同 0x47 音效(sound.pal.002,sound.pal.003)',
    })
  })

  it('craft maps implicit quantities and ordered products without changing actual instruction objects', () => {
    const commands: SourceInstruction[] = [
      raw(0x20, [23, 0, 40], 'L_10'),
      { op: 'giveItem', itemId: 24, count: 0 },
      { op: 'giveItem', itemId: 25 },
      { op: 'end' },
      { label: 'L_40', op: 'setDialogStyleNarration' },
      { op: 'showDialog', text: '  缺少材料  ' },
      { op: 'end' },
    ]
    const result = unchanged(commands, (c) => translateCraftRecipeScript(c, buildLabelIndex(c), 10))
    expect(result).toEqual({
      kind: 'craftRecipe',
      recipes: [
        {
          ingredients: [{ itemId: '23', count: 1 }],
          products: [
            { itemId: '24', count: 1 },
            { itemId: '25', count: 1 },
          ],
        },
      ],
      unavailableMessage: '缺少材料',
    })
    const noProduct = structuredClone(commands)
    noProduct[1] = { op: 'end' }
    expect(
      unchanged(noProduct, (c) => translateCraftRecipeScript(c, buildLabelIndex(c), 10)),
    ).toBeUndefined()
    const invalidProduct = structuredClone(commands)
    invalidProduct[1] = { op: 'giveItem' }
    expect(
      unchanged(invalidProduct, (c) => translateCraftRecipeScript(c, buildLabelIndex(c), 10)),
    ).toBeUndefined()
  })

  it('craft rejects unresolved success goto, missing source and invalid material without false output', () => {
    const commands: SourceInstruction[] = [
      raw(0x20, [23, 1, 40], 'L_10'),
      { op: 'goto', to: 'L_99' },
      { label: 'L_40', op: 'setDialogStyleNarration' },
      { op: 'showDialog', text: 'fail' },
      { op: 'end' },
    ]
    expect(
      unchanged(commands, (c) => translateCraftRecipeScript(c, buildLabelIndex(c), 10)),
    ).toBeUndefined()
    expect(translateCraftRecipeScript([], new Map(), 10)).toBeUndefined()
    expect(
      translateCraftRecipeScript([raw(0x20, [0, 1, 40], 'L_10')], new Map([['L_10', 0]]), 10),
    ).toBeUndefined()
    expect(
      translateCraftRecipeScript([raw(0x21, [], 'L_10')], new Map([['L_10', 0]]), 10),
    ).toBeUndefined()
  })

  it('resource-pool maps reward order and preserves independent input arrays', () => {
    const input = {
      commands: [
        raw(0x34, [40], 'L_10'),
        { op: 'end' },
        { label: 'L_40', op: 'setDialogStyleNarration' },
        { op: 'showDialog', text: '  没有资源 ' },
        { op: 'end' },
        { label: 'L_50', op: 'end' },
      ],
      rewards: [25, 23, 25],
    }
    expect(
      unchanged(input, (v) =>
        translateResourcePoolScript(v.commands, buildLabelIndex(v.commands), 10, v.rewards),
      ),
    ).toEqual({
      kind: 'drawFromResourcePool',
      resource: 'collectValue',
      maxRoll: 3,
      rewards: [
        { itemId: '25', count: 1 },
        { itemId: '23', count: 1 },
        { itemId: '25', count: 1 },
      ],
      unavailableMessage: '没有资源',
    })
    expect(translateResourcePoolScript([], new Map(), 10, [25])).toBeUndefined()
  })

  it('place-entity copies the resolved stable address and signed state, leaving legacy input intact', () => {
    const commands = [
      raw(0x84, [7, 65535, 40], 'L_10'),
      { op: 'end' },
      { label: 'L_40', op: 'setDialogStyleNarration' },
      { op: 'showDialog', text: ' 被挡住 ' },
      raw(0x41),
      { op: 'end' },
    ]
    const addresses = new Map<number, EntityAddress>([[7, { scene: 'room', entity: 'vase' }]])
    const result = unchanged({ commands, addresses }, (v) =>
      translatePlaceEntityInFrontUseScript(
        v.commands,
        buildLabelIndex(v.commands),
        10,
        v.addresses,
      ),
    )
    expect(result).toEqual({
      kind: 'placeEntityInFront',
      target: { scene: 'room', entity: 'vase' },
      state: -1,
      unavailableMessage: '被挡住',
    })
    if (result?.kind !== 'placeEntityInFront') throw new Error('wrong translation')
    result.target.entity = 'changed'
    expect(addresses.get(7)).toEqual({ scene: 'room', entity: 'vase' })
    expect(
      translatePlaceEntityInFrontUseScript(commands, buildLabelIndex(commands), 10),
    ).toBeUndefined()
    expect(translatePlaceEntityInFrontUseScript(commands, new Map(), 10, addresses)).toBeUndefined()
  })

  it('shared-script decision consumes its bounded window, not unrelated later scene commands', () => {
    const classify = (commands: SourceInstruction[]) =>
      unchanged(commands, (c) => shouldMigrateUseAsSharedScript(c, buildLabelIndex(c), 10))
    expect(classify([raw(0x05, [], 'L_10'), raw(167), { op: 'setDialogStyleNarration' }])).toBe(
      true,
    )
    expect(classify([{ label: 'L_10', op: 'showDialog', text: 'hello' }])).toBe(true)
    expect(classify([raw(0x81, [], 'L_10'), raw(0x94), { op: 'loadScene' }])).toBe(true)
    expect(classify([raw(0x81, [], 'L_10'), { op: 'loadScene' }])).toBe(false)
    expect(
      classify([
        raw(0x81, [], 'L_10'),
        raw(0x94),
        ...Array.from({ length: 30 }, () => raw(0x05)),
        { op: 'loadScene' },
      ]),
    ).toBe(false)
    expect(classify([raw(0x05, [], 'L_10')])).toBe(false)
    expect(classify([{ label: 'L_10' }])).toBe(false)
    expect(classify([])).toBe(false)
  })
})
