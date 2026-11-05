import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { describe, expect, test, vi } from 'vitest'

import { buildLabelMap, tickEventSystem } from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'

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
  test('脚本慢速跨样式与姓名保持到下一正文，姓名不改速', () => {
    const commands: Command[] = [
      { op: 'showDialog', text: '$10慢~00', messageIndex: 0 },
      { op: 'setDialogStyleTop', arg0: 0, arg1: 0, arg2: 0 },
      { op: 'showDialog', text: '李逍遥：', messageIndex: 1 },
      { op: 'showDialog', text: '天地', messageIndex: 2 },
      { op: 'end' },
    ]
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }

    for (let frame = 0; frame < 20; frame++) {
      gs.nowMs = 1000 + frame * 200
      tickEventSystem(gs, {
        held: new Set(),
        pressed: new Set(gs.dialogBox?.phase === 'waiting-page-key' ? ['Confirm'] : []),
        frameNum: frame,
      })
      if (gs.dialogBox?.currentLineText === '天地') break
    }
    expect(gs.dialogBox?.titleText).toBe('李逍遥：')
    expect(gs.dialogBox?.currentLineText).toBe('天地')
    expect(gs.dialogBox?.currentLineRevealAt).toEqual([0, 112])
    expect(gs.dialogIDelayFrames).toBe(14)
  })

  function run(commands: Command[], fast = false) {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'event'
    gs.nowMs = 1000
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }

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
      tickEventSystem(gs, input)
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
    const debug = vi.spyOn(console, 'debug')
    try {
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
      expect(debug).not.toHaveBeenCalled()
    } finally {
      debug.mockRestore()
    }
  })
})

// Explicit wall-clock steps keep long text in typing when a key arrives.
const LONG_LINE = '这是一句足够长的对话用来观察按键是否跳过逐字显示'

function startDialogue(commands: Command[]): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.mode = 'event'
  gs.nowMs = 1000
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
  return gs
}

function stepDialogue(gs: GameState, pressed: AbstractKey[] = []): void {
  gs.nowMs += 100
  tickEventSystem(gs, {
    held: new Set(),
    pressed: new Set(pressed),
    frameNum: Math.floor(gs.nowMs / 100),
  })
}

function dialogueLines(texts: string[]): Command[] {
  return texts.map((text, messageIndex) => ({ op: 'showDialog', messageIndex, text }))
}

function waitForPage(gs: GameState): void {
  for (let tick = 0; tick < 60 && gs.dialogBox?.phase !== 'waiting-page-key'; tick++) {
    stepDialogue(gs)
  }
  expect(gs.dialogBox?.phase).toBe('waiting-page-key')
}

describe('dialogue keys and page boundaries', () => {
  test('one Confirm reveals all three lines in the same tick and stops at the end-key wait', () => {
    const texts = [1, 2, 3].map((n) => `${LONG_LINE}${n}`)
    const gs = startDialogue([...dialogueLines(texts), { op: 'end' }])
    stepDialogue(gs)
    expect(gs.dialogBox?.phase).toBe('typing')
    expect(gs.eventCursor?.ip).toBe(0)
    stepDialogue(gs, ['Confirm'])
    expect(gs.dialogBox?.shownLines).toEqual(texts.slice(0, 2))
    expect(gs.dialogBox?.currentLineText).toBe(texts[2])
    expect(gs.dialogBox?.charsRevealed).toBe(LONG_LINE.length + 1)
    expect(gs.dialogBox?.userSkip).toBe(true)
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(gs.eventCursor?.ip).toBe(3)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(texts)
  })

  test.each([
    'Cancel',
    'Down',
  ] as const)('%s turns a full page without consuming the fifth line', (key) => {
    const texts = ['甲一句', '甲二句', '甲三句', '甲四句', '乙五句']
    const gs = startDialogue([...dialogueLines(texts), { op: 'end' }])
    waitForPage(gs)
    expect(gs.eventCursor?.ip).toBe(4)
    expect(gs.dialogBox?.shownLines).toEqual(texts.slice(0, 3))
    expect(gs.dialogBox?.currentLineText).toBe(texts[3])
    stepDialogue(gs, [key])
    expect(gs.dialogBox?.phase).toBe('typing')
    expect(gs.dialogBox?.shownLines).toEqual([])
    expect(gs.dialogBox?.currentLineText).toBe(texts[4])
    expect(gs.eventCursor?.waiting).toBe('dialog')
  })

  test('a seven-line dialogue turns one page, then waits to close its three-line final page', () => {
    const texts = ['甲一句', '甲二句', '甲三句', '甲四句', '乙五句', '乙六句', '乙七句']
    const gs = startDialogue([...dialogueLines(texts), { op: 'end' }])
    let pageKeyHits = 0
    for (let tick = 0; tick < 60 && gs.dialogBox?.phase !== 'waiting-end-key'; tick++) {
      if (gs.dialogBox?.phase === 'waiting-page-key') {
        pageKeyHits++
        stepDialogue(gs, ['Confirm'])
      } else {
        stepDialogue(gs)
      }
    }
    expect(pageKeyHits).toBe(1)
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(gs.dialogBox?.shownLines).toEqual(texts.slice(4, 6))
    expect(gs.dialogBox?.currentLineText).toBe(texts[6])
    expect(gs.dialogBox?.dialogLineCount).toBe(3)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(texts)
    stepDialogue(gs, ['Confirm'])
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })

  test.each([
    'Cancel',
    'Up',
  ] as const)('%s allows timed typing to continue without skipping the line', (key) => {
    const gs = startDialogue([...dialogueLines([LONG_LINE]), { op: 'end' }])
    stepDialogue(gs)
    expect(gs.dialogBox?.phase).toBe('typing')
    const before = gs.dialogBox?.charsRevealed ?? 0
    stepDialogue(gs, [key])
    expect(gs.dialogBox?.phase).toBe('typing')
    expect(gs.dialogBox?.charsRevealed).toBeGreaterThan(before)
    expect(gs.dialogBox?.charsRevealed).toBeLessThan(LONG_LINE.length)
    expect(gs.dialogBox?.userSkip).toBeFalsy()
    expect(gs.eventCursor?.ip).toBe(0)
    expect(gs.eventCursor?.waiting).toBe('dialog')
  })

  test('Menu skips typing and reaches the end-key wait like Confirm', () => {
    const gs = startDialogue([...dialogueLines([LONG_LINE]), { op: 'end' }])
    stepDialogue(gs)
    expect(gs.dialogBox?.phase).toBe('typing')
    stepDialogue(gs, ['Menu'])
    expect(gs.dialogBox?.charsRevealed).toBe(LONG_LINE.length)
    expect(gs.dialogBox?.userSkip).toBe(true)
    expect(gs.dialogBox?.phase).toBe('waiting-end-key')
    expect(gs.eventCursor?.ip).toBe(1)
    expect(gs.eventCursor?.waiting).toBe('dialog')
  })

  test('a control-only line occupies one page row but is excluded from history', () => {
    const gs = startDialogue([
      ...dialogueLines(['甲起句', '$00', '乙二句', '乙三句', '乙四句']),
      { op: 'end' },
    ])
    waitForPage(gs)
    expect(gs.eventCursor?.ip).toBe(4)
    expect(gs.dialogBox?.shownLines).toEqual(['甲起句', '', '乙二句'])
    expect(gs.dialogBox?.currentLineText).toBe('乙三句')
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(['甲起句', '乙二句', '乙三句'])
    stepDialogue(gs, ['Confirm'])
    expect(gs.dialogBox?.shownLines).toEqual([])
    expect(gs.dialogBox?.currentLineText).toBe('乙四句')
    expect(gs.dialogBox?.dialogLineCount).toBe(1)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual([
      '甲起句',
      '乙二句',
      '乙三句',
      '乙四句',
    ])
  })

  test('Confirm skips four lines, waits before the fifth, then resumes timed typing on the new page', () => {
    const texts = Array.from({ length: 8 }, (_, n) => `${LONG_LINE}${n + 1}`)
    const gs = startDialogue([...dialogueLines(texts), { op: 'end' }])
    stepDialogue(gs)
    expect(gs.dialogBox?.phase).toBe('typing')
    stepDialogue(gs, ['Confirm'])
    expect(gs.dialogBox?.phase).toBe('waiting-page-key')
    expect(gs.eventCursor?.ip).toBe(4)
    expect(gs.dialogBox?.shownLines).toEqual(texts.slice(0, 3))
    expect(gs.dialogBox?.currentLineText).toBe(texts[3])
    expect(gs.dialogBox?.userSkip).toBe(true)
    stepDialogue(gs, ['Confirm'])
    expect(gs.dialogBox?.userSkip).toBe(false)
    expect(gs.dialogBox?.phase).toBe('typing')
    expect(gs.dialogBox?.charsRevealed).toBe(0)
    expect(gs.dialogBox?.shownLines).toEqual([])
    expect(gs.dialogBox?.currentLineText).toBe(texts[4])
    stepDialogue(gs)
    expect(gs.dialogBox?.charsRevealed).toBeGreaterThan(0)
    expect(gs.dialogBox?.charsRevealed).toBeLessThan(LONG_LINE.length)
  })
})
