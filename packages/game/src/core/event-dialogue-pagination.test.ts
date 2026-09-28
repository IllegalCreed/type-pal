import type { Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { buildLabelMap, tickEventSystem } from './event-system.js'
import { createInitialGameState } from './game-state.js'

// 原始提取 all.json:3571–3576 / messageIndex1327–1332，001第一段跨页正文。
const openingLines = [
  '婶婶～　',
  '你不要每次叫人起床都拿锅',
  '呀、铲呀，乱敲一通的，会',
  '吓死人哪！',
  '咱们这木床又不牢靠，万一我',
  '给摔死了，咱们李家就绝后啦',
]

describe('event dialogue page continuation', () => {
  function run(commands: Command[], fast = false) {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.nowMs = 1000
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
    const bus = createCommandBus()
    const visible: string[] = []
    for (let tick = 0; tick < 1000 && gs.eventCursor; tick++) {
      const confirm =
        fast ||
        gs.dialogBox?.phase === 'waiting-page-key' ||
        gs.dialogBox?.phase === 'waiting-end-key'
      const input: InputSnapshot = {
        held: new Set(),
        pressed: new Set(confirm ? ['Confirm'] : []),
        frameNum: tick,
      }
      gs.nowMs += 100
      tickEventSystem(gs, input, bus)
      const dialog = gs.dialogBox
      const complete = [
        ...(dialog?.shownLines ?? []),
        ...(dialog?.currentLineText && dialog.phase !== 'typing' ? [dialog.currentLineText] : []),
      ]
      for (const line of complete) if (!visible.includes(line.trim())) visible.push(line.trim())
    }
    expect(gs.eventCursor).toBeUndefined()
    return { gs, visible }
  }

  test('001翻页后仍展示并记录尚未消费的第五行', () => {
    const commands: Command[] = [
      { op: 'setDialogStyleTop', arg0: 8 },
      ...openingLines.map(
        (text, index): Command => ({
          op: 'showDialog',
          messageIndex: 1327 + index,
          text,
        }),
      ),
      { op: 'end' },
    ]
    const { gs, visible } = run(commands)
    expect(visible).toEqual(openingLines.map((text) => text.trim()))
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(
      openingLines.map((text) => text.trim()),
    )
  })

  test.each([
    ['setDialogStyleTop', false],
    ['setDialogStyleBottom', false],
    ['setDialogStyleCenter', false],
    ['setDialogStyleTop', true],
    ['setDialogStyleBottom', true],
    ['setDialogStyleCenter', true],
  ] as const)('%s / fast=%s 连续三页无漏行重行', (op, fast) => {
    const lines = Array.from({ length: 10 }, (_, n) => `正文第${n + 1}行`)
    const { gs, visible } = run(
      [
        { op },
        ...lines.map((text, messageIndex): Command => ({ op: 'showDialog', text, messageIndex })),
        { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
        { op: 'end' },
      ],
      fast,
    )
    expect(visible).toEqual(lines)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(lines)
    expect(gs.dwCash).toBe(7)
  })

  test.each([
    { op: 'setDialogStyleBottom', arg0: 1 },
    { op: 'raw', opcode: 5, operands: [0, 0, 0] },
    { op: 'raw', opcode: 0x8e, operands: [0, 0, 0] },
  ] satisfies Command[])('分页后接 $op/$opcode 完整消费，后续副作用仅一次', (boundary) => {
    const lines = ['甲一', '甲二', '甲三', '甲四', '甲五', '甲六']
    const { gs, visible } = run([
      { op: 'setDialogStyleTop', arg0: 8 },
      ...lines.map((text, messageIndex): Command => ({ op: 'showDialog', text, messageIndex })),
      boundary,
      { op: 'showDialog', text: '乙方最后一句', messageIndex: 8 },
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
      { op: 'end' },
    ])
    expect(visible).toEqual([...lines, '乙方最后一句'])
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual([...lines, '乙方最后一句'])
    expect(gs.dwCash).toBe(7)
  })
})
