import { describe, expect, test } from 'vitest'
import { unchanged } from './__tests__/pal-source-fixtures.js'
import {
  buildSourceAddressLabelIndex,
  translateCraftRecipeScript,
  translateResourcePoolScript,
} from './pal-item-message-source.js'
import type { SourceCmd } from './source-facts.js'

function craftCommands(): SourceCmd[] {
  return [
    { op: 'end' },
    { op: 'raw', opcode: 0x20, operands: [23, 0, 5] },
    { op: 'giveItem', itemId: 24, count: 0 },
    { op: 'giveItem', itemId: 25 },
    { op: 'end' },
    { label: 'L_5', op: 'setDialogStyleNarration' },
    { op: 'showDialog', text: '  缺少材料  ' },
    { op: 'end' },
  ]
}

function poolCommands(): SourceCmd[] {
  return [
    { op: 'end' },
    { op: 'raw', opcode: 0x34, operands: [3, 0, 0] },
    { op: 'end' },
    { label: 'L_3', op: 'setDialogStyleNarration' },
    { op: 'showDialog', text: '  没有资源 ' },
    { op: 'end' },
  ]
}

const craft = (commands: readonly SourceCmd[]) =>
  translateCraftRecipeScript(commands, buildSourceAddressLabelIndex(commands), 1)

const pool = (commands: readonly SourceCmd[], rewards: readonly number[] = [25, 23, 25]) =>
  translateResourcePoolScript(commands, buildSourceAddressLabelIndex(commands), 1, rewards)

test('fills implicit physical labels and rejects an explicit label for a different address', () => {
  const commands: SourceCmd[] = [{ op: 'end', label: 'L_0' }, { op: 'end' }]
  expect([...unchanged(commands, buildSourceAddressLabelIndex)]).toEqual([
    ['L_0', 0],
    ['L_1', 1],
  ])
  expect(() => buildSourceAddressLabelIndex([{ op: 'end', label: 'L_1' }])).toThrow(
    '数组地址不一致: index=0, label=L_1',
  )
})

describe('原始炼化配方读取', () => {
  test('reads the physical source addresses, implicit counts, ordered products and trimmed message', () => {
    expect(unchanged(craftCommands(), craft)).toEqual({
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
  })

  test.each([
    { label: 'no product', command: { op: 'end' } },
    { label: 'missing product id', command: { op: 'giveItem' } },
    { label: 'unresolved success jump', command: { op: 'goto', to: 'L_99' } },
  ])('refuses an incomplete recipe with $label', ({ command }) => {
    const commands = craftCommands()
    commands[2] = command
    expect(unchanged(commands, craft)).toBeUndefined()
  })

  test.each([
    { label: 'a zero failure address', raw: { op: 'raw', opcode: 0x20, operands: [23, 1, 0] } },
    {
      label: 'a dangling failure address',
      raw: { op: 'raw', opcode: 0x20, operands: [23, 1, 99] },
    },
    { label: 'a failure loop', raw: { op: 'raw', opcode: 0x20, operands: [23, 1, 1] } },
    { label: 'an empty material id', raw: { op: 'raw', opcode: 0x20, operands: [0, 1, 5] } },
    { label: 'a different opcode', raw: { op: 'raw', opcode: 0x21, operands: [23, 1, 5] } },
  ])('does not turn $label into a recipe', ({ raw }) => {
    const commands = craftCommands()
    commands[1] = raw
    expect(craft(commands)).toBeUndefined()
  })

  test('refuses a recipe chain whose materials lead to distinct product blocks', () => {
    const commands: SourceCmd[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x20, operands: [117, 1, 3] },
      { op: 'goto', to: 'L_8' },
      { op: 'raw', opcode: 0x20, operands: [118, 1, 5] },
      { op: 'goto', to: 'L_9' },
      { label: 'L_5', op: 'setDialogStyleNarration' },
      { op: 'showDialog', text: '缺少材料' },
      { op: 'end' },
      { label: 'L_8', op: 'giveItem', itemId: 148, count: 1 },
      { label: 'L_9', op: 'giveItem', itemId: 149, count: 1 },
      { op: 'end' },
    ]
    expect(craft(commands)).toBeUndefined()
  })

  test('requires the same strict terminal narration contract as the resource pool', () => {
    const commands = craftCommands()
    commands[7] = { op: 'showDialog', text: '未结束' }
    expect(craft(commands)).toBeUndefined()
  })

  test('returns no recipe when the start address is absent', () => {
    expect(craft([])).toBeUndefined()
  })
})

describe('原始资源池读取', () => {
  test('preserves reward order and duplicates, and reads the exact failure narrative', () => {
    const input = { commands: poolCommands(), rewards: [25, 23, 25] }
    expect(unchanged(input, ({ commands, rewards }) => pool(commands, rewards))).toEqual({
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
  })

  test('returns no pool when the start address or reward table is absent', () => {
    expect(pool([])).toBeUndefined()
    expect(pool(poolCommands(), [])).toBeUndefined()
  })

  test.each([0, 99])('rejects an invalid failure address %d', (address) => {
    const commands = poolCommands()
    commands[1] = { op: 'raw', opcode: 0x34, operands: [address, 0, 0] }
    expect(pool(commands)).toBeUndefined()
  })

  test.each([
    { label: 'no narration style', address: 3, command: { label: 'L_3', op: 'showDialog' } },
    { label: 'blank text', address: 4, command: { op: 'showDialog', text: '   ' } },
    { label: 'inside instruction', address: 4, command: { op: 'raw', opcode: 0x41 } },
    { label: 'no end', address: 5, command: { op: 'goto', to: 'L_0' } },
    { label: 'unlabeled instruction after end', address: 6, command: { op: 'raw', opcode: 0x41 } },
    { label: 'nonlinear success', address: 2, command: { op: 'goto', to: 'L_0' } },
  ])('rejects the resource-pool program with $label', ({ address, command }) => {
    const commands = poolCommands()
    commands[address] = command
    expect(pool(commands)).toBeUndefined()
  })
})
