/** F02: B11-1 source grammar and four-entry/36-key contract without PAL disk assets. */
import { validateActors } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  casualtyFixture,
  casualtyLocaleKeys,
  type TextCommand,
} from './__tests__/coverage-wave2/f-casualty-overlays.js'
import {
  applyPalCasualtyOverlays,
  PAL_CASUALTY_LOCALE_KEYS,
  translateCasualtyScript,
} from './pal-casualty-scripts.js'

test('all four casualty entries preserve actor input and publish exactly the frozen 36 locale keys', () => {
  const input = casualtyFixture(),
    before = structuredClone(input)
  const output = applyPalCasualtyOverlays(input.actors, input.commands, input.objectPlayers)
  validateActors(output.actors)
  expect(PAL_CASUALTY_LOCALE_KEYS).toEqual(casualtyLocaleKeys)
  expect(output.locale).toEqual(
    Object.fromEntries(casualtyLocaleKeys.map((key) => [key, `fixture:${key}`])),
  )
  expect(output.actors.slice(3)).toEqual(before.actors.slice(3))
  const expectedActors = structuredClone(before.actors)
  for (const [index, slot, group] of [
    [0, 'friendDeath', 0],
    [1, 'dying', 1],
    [2, 'friendDeath', 2],
    [2, 'dying', 3],
  ] as const) {
    expectedActors[index]!.battler!.casualty = {
      ...expectedActors[index]!.battler!.casualty,
      [slot]: {
        gates: [
          {
            chance: 75,
            branch: {
              lines: casualtyLocaleKeys
                .slice(group * 9, group * 9 + 9)
                .map((text) => ({ text, style: 'bottom' as const })),
              effects: [],
            },
          },
        ],
        fallback: { lines: [], effects: [] },
      },
    }
  }
  expect(output.actors).toEqual(expectedActors)
  output.actors[0]!.battler!.baseStats.hp = 1
  expect(input).toEqual(before)
})
test('locale-set drift rejects the complete overlay instead of silently dropping a source message', () => {
  const input = casualtyFixture()
  const message = input.commands.find((command) => command.op === 'showDialog')!
  message.messageIndex = 99999
  const before = structuredClone(input)
  expect(() => applyPalCasualtyOverlays(input.actors, input.commands, input.objectPlayers)).toThrow(
    '台词 locale 键与 P0 冻结集合漂移',
  )
  expect(input).toEqual(before)
})
test('translation preserves probability order, style changes, heal resources and fixed-stat mapping', () => {
  const input: TextCommand[] = [
      { op: 'raw', opcode: 6, operands: [75, 5, 0] },
      { op: 'raw', opcode: 6, operands: [50, 9, 0] },
      { op: 'setDialogStyleTop' },
      { op: 'showDialog', messageIndex: 1, text: 'top' },
      { op: 'end' },
      { op: 'setDialogStyleNarration' },
      { op: 'showDialog', messageIndex: 2, text: 'narration' },
      { op: 'raw', opcode: 0x1b },
      { op: 'end' },
      { op: 'raw', opcode: 0x1c },
      { op: 'raw', opcode: 0x30, operands: [20, 90, 0] },
      { op: 'raw', opcode: 5, operands: [0, 0, 0] },
      { op: 'end' },
    ],
    before = structuredClone(input),
    locale = { existing: 'keep' }
  expect(translateCasualtyScript(input, 0, locale)).toEqual({
    gates: [
      {
        chance: 75,
        branch: {
          lines: [{ text: 'dlg.2', style: 'narration' }],
          effects: [{ kind: 'heal', resource: 'hp' }],
        },
      },
      {
        chance: 50,
        branch: {
          lines: [],
          effects: [
            { kind: 'heal', resource: 'mp' },
            { kind: 'tempStatBuff', stat: 'speed', percent: 90 },
          ],
        },
      },
    ],
    fallback: { lines: [{ text: 'dlg.1', style: 'top' }], effects: [] },
  })
  expect(locale).toEqual({ existing: 'keep', 'dlg.1': 'top', 'dlg.2': 'narration' })
  expect(input).toEqual(before)
})
test.each([
  ['unsupported opcode', { op: 'raw', opcode: 0x99 }, '不支持的 opcode 0x99'],
  ['unsupported command', { op: 'invented' }, '不支持的指令 invented'],
  ['redraw drift', { op: 'raw', opcode: 5, operands: [0, 1, 0] }, '0x05 参数非空'],
  ['unknown stat', { op: 'raw', opcode: 0x30, operands: [19, 10] }, '0x30 参数无效'],
  ['negative stat delta', { op: 'raw', opcode: 0x30, operands: [17, -1] }, '0x30 参数无效'],
  ['missing message', { op: 'showDialog', text: 'missing id' }, 'showDialog 缺 messageIndex/text'],
] as const)('casualty rejects %s without altering source commands', (_label, command, error) => {
  const input: TextCommand[] = [
      { op: 'raw', opcode: 6, operands: [75, 2, 0] },
      { op: 'end' },
      {
        op: command.op,
        ...('opcode' in command ? { opcode: command.opcode } : {}),
        ...('text' in command ? { text: command.text } : {}),
        ...('operands' in command ? { operands: [...command.operands] } : {}),
      },
      { op: 'end' },
    ],
    before = structuredClone(input)
  expect(() => translateCasualtyScript(input, 0, {})).toThrow(error)
  expect(input).toEqual(before)
})
