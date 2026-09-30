import { describe, expect, it } from 'vitest'
import { raw, type SourceInstruction, unchanged } from './__tests__/pure-migration-fixtures.js'
import {
  buildLabelIndex,
  buildSourceAddressLabelIndex,
  translateCraftRecipeScript,
  translateResourcePoolScript,
} from './pal-item-message-source.js'
import type { SourceCmd } from './source-facts.js'

describe('shared narrow source message decoding', () => {
  it('fills physical addresses without mutating commands and rejects mislabeled addresses', () => {
    const commands: SourceCmd[] = [{ op: 'end', label: 'L_0' }, { op: 'end' }]
    const before = structuredClone(commands)
    expect([...buildSourceAddressLabelIndex(commands)]).toEqual([
      ['L_0', 0],
      ['L_1', 1],
    ])
    expect(commands).toEqual(before)
    expect(() => buildSourceAddressLabelIndex([{ op: 'end', label: 'L_1' }])).toThrow(
      /数组地址不一致/,
    )
  })

  it('reads a strict shared narration failure arm and rejects blank or malformed arms', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x34, operands: [3] },
      { op: 'end' },
      { op: 'setDialogStyleNarration' },
      { op: 'showDialog', text: ' 无任何效果 ' },
      { op: 'end' },
    ]
    const labels = buildSourceAddressLabelIndex(commands)
    expect(translateResourcePoolScript(commands, labels, 1, [100])).toMatchObject({
      unavailableMessage: '无任何效果',
      maxRoll: 1,
    })
    expect(translateResourcePoolScript(commands, labels, 1, [])).toBeUndefined()
    commands[4]!.text = '  '
    expect(translateResourcePoolScript(commands, labels, 1, [100])).toBeUndefined()
    commands[4]!.text = 'message'
    commands[5]!.op = 'goto'
    expect(translateResourcePoolScript(commands, labels, 1, [100])).toBeUndefined()
  })

  it('rejects recipe cycles and missing terminal failure narration', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x20, operands: [117, 1, 1] },
      { op: 'giveItem' },
    ]
    expect(
      translateCraftRecipeScript(commands, buildSourceAddressLabelIndex(commands), 1),
    ).toBeUndefined()
  })
})

describe('self-contained craft and resource-pool translation', () => {
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
})
