import { describe, expect, it } from 'vitest'
import {
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
