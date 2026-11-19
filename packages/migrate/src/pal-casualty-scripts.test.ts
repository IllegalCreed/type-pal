import { expect, test } from 'vitest'
import { translateCasualtyScript } from './pal-casualty-scripts.js'
import type { SourceCmd } from './source-facts.js'

test('translates ordered probability gates, resource recovery, and four temporary stats', () => {
  const commands: SourceCmd[] = [
    { op: 'raw', opcode: 6, operands: [75, 10, 0] },
    { op: 'raw', opcode: 6, operands: [66, 15, 0] },
    { op: 'raw', opcode: 6, operands: [50, 17, 0] },
    // 兜底 @3
    { op: 'setDialogStyleBottom' },
    { op: 'showDialog', messageIndex: 13470, text: '　啊～！' },
    { op: 'setDialogStyleNarration' },
    { op: 'showDialog', messageIndex: 13471, text: '斗志燃烧，体力恢复' },
    { op: 'raw', opcode: 0x1b, operands: [0, 9999, 0] },
    { op: 'raw', opcode: 0x30, operands: [17, 5, 0] },
    { op: 'end' },
    // 门1 @10
    { op: 'setDialogStyleBottom' },
    { op: 'showDialog', messageIndex: 13472, text: '　可恶的家伙！' },
    { op: 'raw', opcode: 0x1c, operands: [0, 9999, 0] },
    { op: 'raw', opcode: 0x30, operands: [18, 10, 0] },
    { op: 'end' },
    // 门2 @15
    { op: 'raw', opcode: 0x30, operands: [20, 90, 0] },
    { op: 'end' },
    // 门3 @17
    { op: 'raw', opcode: 0x30, operands: [21, 90, 0] },
    { op: 'end' },
  ]
  const locale = { existing: 'keep' }
  const script = translateCasualtyScript(commands, 0, locale)
  expect(script).toEqual({
    gates: [
      {
        chance: 75,
        branch: {
          lines: [{ text: 'dlg.13472', style: 'bottom' }],
          effects: [
            { kind: 'heal', resource: 'mp' },
            { kind: 'tempStatBuff', stat: 'magic', percent: 10 },
          ],
        },
      },
      {
        chance: 66,
        branch: {
          lines: [],
          effects: [{ kind: 'tempStatBuff', stat: 'speed', percent: 90 }],
        },
      },
      {
        chance: 50,
        branch: {
          lines: [],
          effects: [{ kind: 'tempStatBuff', stat: 'luck', percent: 90 }],
        },
      },
    ],
    fallback: {
      lines: [
        { text: 'dlg.13470', style: 'bottom' },
        { text: 'dlg.13471', style: 'narration', autoAdvance: 1400 },
      ],
      effects: [
        { kind: 'heal', resource: 'hp' },
        { kind: 'tempStatBuff', stat: 'attack', percent: 5 },
      ],
    },
  })
  expect(locale).toEqual({
    existing: 'keep',
    'dlg.13470': '　啊～！',
    'dlg.13471': '斗志燃烧，体力恢复',
    'dlg.13472': '　可恶的家伙！',
  })
})

test('a redraw before a new cue adds no structured effect or dialogue row', () => {
  const commands: SourceCmd[] = [
    { op: 'raw', opcode: 6, operands: [75, 2, 0] },
    { op: 'end' },
    { op: 'setDialogStyleBottom' },
    { op: 'showDialog', messageIndex: 13486, text: '灵儿' },
    { op: 'raw', opcode: 5, operands: [0, 0, 0] },
    { op: 'setDialogStyleTop' },
    { op: 'showDialog', messageIndex: 13487, text: '月如' },
    { op: 'end' },
  ]
  expect(translateCasualtyScript(commands, 0, {}).gates[0]?.branch).toEqual({
    lines: [
      { text: 'dlg.13486', style: 'bottom' },
      { text: 'dlg.13487', style: 'top' },
    ],
    effects: [],
  })
})

test.each([
  ['unsupported opcode', { op: 'raw', opcode: 0x99 }, '不支持的 opcode 0x99'],
  ['unsupported command', { op: 'invented' }, '不支持的指令 invented'],
  ['nonzero redraw flags', { op: 'raw', opcode: 5, operands: [0, 1, 0] }, '0x05 参数非空'],
  ['unknown stat', { op: 'raw', opcode: 0x30, operands: [19, 10] }, '0x30 参数无效'],
  ['negative stat delta', { op: 'raw', opcode: 0x30, operands: [17, -1] }, '0x30 参数无效'],
  ['missing message', { op: 'showDialog', text: 'missing id' }, 'showDialog 缺 messageIndex/text'],
] satisfies [
  string,
  SourceCmd,
  string,
][])('casualty rejects %s without altering source commands', (_label, command, error) => {
  const commands: SourceCmd[] = [
    { op: 'raw', opcode: 6, operands: [75, 2, 0] },
    { op: 'end' },
    command,
    { op: 'end' },
  ]
  const before = structuredClone(commands)
  expect(() => translateCasualtyScript(commands, 0, {})).toThrow(error)
  expect(commands).toEqual(before)
})
