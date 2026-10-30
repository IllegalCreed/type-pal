import type { Command, InputSnapshot } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBattleLifecycleFixture } from '../core/battle/battle-lifecycle.test-fixtures.js'
import { tickBattleDialog } from '../core/battle/battle-system.js'

import { buildLabelMap, runScript, setGlobalEvents, tickEventSystem } from '../core/event-system.js'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { getScriptDescLines } from '../core/menu/script-desc.js'
import { eventCursor } from '../core/save/v1-world.js'
import { setEnglishWordTable } from '../core/word-lookup.js'
import { makeItem } from '../present/__tests__/grok-present/world.js'
import { parseDialogText } from '../present/dialog-box.js'
import { parseImportedSave, serializeSave } from '../tools/save-io.js'
import { setLanguage } from './language.js'
import {
  getMissingEnglishMessageGroups,
  resolveMessageGroup,
  setEnglishMessages,
  wrapEnglishDialogLine,
} from './messages.js'

const sourceLines: Command[] = [
  { op: 'showDialog', messageIndex: 100, text: '原甲', label: 'L_1' },
  { op: 'showDialog', messageIndex: 101, text: '原乙' },
  { op: 'raw', opcode: 0x8e, operands: [0, 0, 0] },
  { op: 'showDialog', messageIndex: 102, text: '原丙' },
]
const englishLines = ['First.', 'Second.', 'Third.', 'Fourth.', 'Fifth.', null, 'Sixth.', 'Last.']

function input(confirm = false, frameNum = 0): InputSnapshot {
  return { held: new Set(), pressed: new Set(confirm ? ['Confirm'] : []), frameNum }
}

function explore(commands: Command[], ip = 0): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.mode = 'event'
  gs.nowMs = 1000
  gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip }
  return gs
}

function finish(gs: GameState, fast = false): number {
  let pages = 0
  for (let frame = 0; frame < 500 && gs.eventCursor; frame++) {
    if (gs.dialogBox?.phase === 'waiting-page-key') pages++
    const confirm =
      fast ||
      gs.dialogBox?.phase === 'waiting-page-key' ||
      gs.dialogBox?.phase === 'waiting-end-key'
    gs.nowMs += 100
    tickEventSystem(gs, input(confirm, frame))
  }
  expect(gs.eventCursor).toBeUndefined()
  return pages
}

beforeEach(() => {
  setLanguage('en')
  setEnglishMessages([{ start: 100, end: 102, lines: englishLines }])
})
afterEach(() => {
  setEnglishMessages([])
  setEnglishWordTable({})
  setGlobalEvents([])
  setLanguage('zh-CN')
  localStorage.removeItem('tp-language')
})

describe('translated message groups', () => {
  it('matches the actual span across RestoreScreen and reports unsupported middle entry', () => {
    const commands: Command[] = [{ op: 'end' }, ...sourceLines, { op: 'end' }]
    expect(resolveMessageGroup(commands, 1)).toEqual({
      resumeIp: 5,
      lineIndex: 0,
      lines: englishLines,
    })
    expect(resolveMessageGroup(commands, 2)).toBeUndefined()
    expect(getMissingEnglishMessageGroups()).toEqual([{ start: 101, end: 102 }])
    expect(resolveMessageGroup(commands, 0)).toBeUndefined()
    const gs = explore(commands, 2)
    finish(gs)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(['原乙', '原丙'])
  })

  it.each([
    false,
    true,
  ])('exploration displays every translated row with page/clear and one reward (skip=%s)', (fast) => {
    const commands: Command[] = [
      { op: 'setDialogStyleTop', arg0: 8 },
      ...sourceLines,
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
      { op: 'end' },
    ]
    const gs = explore(commands)
    expect(finish(gs, fast)).toBe(3) // automatic full page, explicit null, pre-reward clear
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(
      englishLines.filter((s) => s !== null),
    )
    expect(gs.dwCash).toBe(7)
    expect(commands).toHaveLength(7)
    expect(buildLabelMap(commands).L_1).toBe(1)
  })

  it('pins an active English group through preference changes and resumes from a V1 snapshot', () => {
    const commands: Command[] = [
      { op: 'setDialogStyleTop' },
      ...sourceLines,
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
      { op: 'showDialog', messageIndex: 200, text: '中文后段' },
      { op: 'end' },
    ]
    setEnglishMessages([
      { start: 100, end: 102, lines: englishLines },
      { start: 200, end: 200, lines: ['Next group.'] },
    ])
    const gs = explore(commands)
    tickEventSystem(gs, input())
    expect(gs.dialogBox?.currentLineText).toBe('First.')
    for (let frame = 0; frame < 50 && gs.dialogBox?.currentLineText !== 'Third.'; frame++) {
      gs.nowMs += 100
      tickEventSystem(gs, input(false, frame))
    }
    expect(gs.eventCursor?.localizedDialog?.lineIndex).toBe(2)
    setLanguage('zh-CN')
    const loaded = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    Object.assign(loaded, parseImportedSave(serializeSave(gs)))
    finish(loaded, true)
    expect(loaded.dialogHistory?.map((line) => line.text)).toEqual([
      ...englishLines.filter((s) => s !== null),
      '中文后段',
    ])
    expect(loaded.dwCash).toBe(7)
    expect(
      eventCursor({ ip: 1, localizedDialog: { resumeIp: 5, lineIndex: 0, lines: [42] } }),
    ).toBe(false)
  })

  it('preserves the current Chinese group while the next group adopts English', () => {
    setLanguage('zh-CN')
    setEnglishMessages([
      { start: 100, end: 102, lines: englishLines },
      { start: 200, end: 200, lines: ['Next group.'] },
    ])
    const gs = explore([
      { op: 'setDialogStyleTop' },
      ...sourceLines,
      { op: 'showDialog', messageIndex: 200, text: '中文后段' },
      { op: 'end' },
    ])
    tickEventSystem(gs, input())
    setLanguage('en')
    finish(gs, true)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual([
      '原甲',
      '原乙',
      '原丙',
      'Next group.',
    ])
  })

  it('narration advances translated rows on both timeout and key completion', () => {
    const gs = explore([{ op: 'setDialogStyleNarration' }, ...sourceLines, { op: 'end' }])
    tickEventSystem(gs, input())
    for (let frame = 0; frame < 15; frame++) {
      gs.nowMs += 100
      tickEventSystem(gs, input())
    }
    expect(gs.dialogBox?.currentLineText).toBe('Second.')
    finish(gs, true)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(
      englishLines.filter((s) => s !== null),
    )
  })

  it('battle and description callers expand the same source group without expanding instructions', () => {
    const commands: Command[] = [
      { op: 'end' },
      ...sourceLines,
      { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
      { op: 'end', advance: true },
    ]
    const { gs, state, bus } = createBattleLifecycleFixture({ commands })
    expect(
      runScript({
        commands,
        ip: 1,
        bus,
        runtimeMode: 'battle',
        battleCtx: { gs, state, caster: { type: 'enemy', idx: 0 } },
      }),
    ).toBe(7)
    expect(
      state.battleDialogQueue?.filter((line) => line.text !== undefined).map((line) => line.text),
    ).toEqual(englishLines.filter((s) => s !== null))
    let waits = 0
    for (let frame = 0; frame < 500; frame++) {
      const box = gs.dialogBox
      if (box?.phase === 'waiting-end-key' || box?.phase === 'waiting-page-key') waits++
      if (!tickBattleDialog(state, gs, input(true, frame))) break
    }
    expect(waits).toBe(3)
    expect(gs.dialogBox).toBeUndefined()
    expect(state.battleDialogQueue).toHaveLength(0)
    expect(gs.dwCash).toBe(7)
    setGlobalEvents(commands)
    expect(getScriptDescLines(1)).toEqual(englishLines.filter((s) => s !== null))
  })

  it('explicit clear preserves the title and portrait in exploration and battle', () => {
    setEnglishMessages([
      { start: 100, end: 102, lines: ['Hero:', 'Before.', null, 'After.', null] },
    ])
    const commands: Command[] = [
      { op: 'setDialogStyleBottom', arg0: 8 },
      ...sourceLines,
      { op: 'end' },
    ]
    const gs = explore(commands)

    for (let frame = 0; frame < 100 && gs.dialogBox?.phase !== 'waiting-page-key'; frame++) {
      gs.nowMs += 100
      tickEventSystem(gs, input(false, frame))
    }
    expect(gs.dialogBox?.titleText).toBe('Hero:')
    expect(gs.dialogBox?.portraitIcon).toBe(8)
    tickEventSystem(gs, input(true))
    expect(gs.dialogBox?.currentLineText).toBe('After.')
    expect(gs.dialogBox?.titleText).toBe('Hero:')
    expect(gs.dialogBox?.portraitIcon).toBe(8)
    finish(gs)
    expect(gs.dialogHistory?.map((line) => line.text)).toEqual(['Hero:', 'Before.', 'After.'])

    const battle = createBattleLifecycleFixture({ commands })
    runScript({
      commands,
      ip: 0,
      bus: battle.bus,
      runtimeMode: 'battle',
      battleCtx: {
        gs: battle.gs,
        state: battle.state,
        caster: { type: 'enemy', idx: 0 },
      },
    })
    for (let frame = 0; frame < 100 && battle.gs.dialogBox?.phase !== 'waiting-page-key'; frame++) {
      tickBattleDialog(battle.state, battle.gs, input(false, frame))
    }
    expect(battle.gs.dialogBox?.titleText).toBe('Hero:')
    tickBattleDialog(battle.state, battle.gs, input(true))
    tickBattleDialog(battle.state, battle.gs, input())
    expect(battle.gs.dialogBox?.currentLineText).toBe('After.')
    expect(battle.gs.dialogBox?.titleText).toBe('Hero:')
    expect(battle.gs.dialogBox?.portraitIcon).toBe(8)
  })

  it('battle timed dialogue clears and continues without another confirmation', () => {
    setEnglishMessages([
      {
        start: 100,
        end: 102,
        lines: ['Li Xiaoyao:', '$02 Tss! Demon Mistress~40', null, 'Farewell.'],
      },
    ])
    const commands: Command[] = [
      { op: 'setDialogStyleBottom', arg0: 8 },
      ...sourceLines,
      { op: 'end' },
    ]
    const { gs, state, bus } = createBattleLifecycleFixture({ commands })
    runScript({
      commands,
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: { gs, state, caster: { type: 'enemy', idx: 0 } },
    })
    let waitedForPageKey = false
    for (let frame = 0; frame < 100 && gs.dialogBox?.currentLineText !== 'Farewell.'; frame++) {
      tickBattleDialog(state, gs, input(false, frame))
      waitedForPageKey ||= gs.dialogBox?.phase === 'waiting-page-key'
    }
    expect(gs.dialogBox?.currentLineText).toBe('Farewell.')
    expect(waitedForPageKey).toBe(false)
    expect(gs.dialogBox?.shownLines).toEqual([])
    expect(gs.dialogBox?.titleText).toBe('Li Xiaoyao:')
    expect(gs.dialogBox?.portraitIcon).toBe(8)
  })

  it('battle narration clear after timeout adds no empty dialog or extra wait', () => {
    setEnglishMessages([{ start: 100, end: 102, lines: ['The jewel is free.', null, 'Take it.'] }])
    const commands: Command[] = [{ op: 'setDialogStyleNarration' }, ...sourceLines, { op: 'end' }]
    const { gs, state, bus } = createBattleLifecycleFixture({ commands })
    runScript({
      commands,
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: { gs, state, caster: { type: 'enemy', idx: 0 } },
    })
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox?.currentLineText).toBe('The jewel is free.')
    // The narration remains for 1.4 seconds: 35 battle ticks at 40 ms, without Confirm.
    for (let frame = 1; frame <= 34; frame++) {
      tickBattleDialog(state, gs, input(false, frame))
    }
    expect(gs.dialogBox?.currentLineText).toBe('The jewel is free.')
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox).toBeUndefined()
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox).toBeUndefined()
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox?.currentLineText).toBe('Take it.')
    expect(gs.dialogBox?.style).toBe('narration')
  })

  it.each([
    { itemId: 110, name: "God's Tea", chineseName: '神仙茶' },
    { itemId: 135, name: 'Knock-Out', chineseName: '迷魂香' },
  ])('battle stealing displays the literal WORD name $name in red without losing punctuation', ({
    itemId,
    name,
    chineseName,
  }) => {
    setEnglishWordTable({ [itemId]: name })
    const commands: Command[] = [{ op: 'raw', opcode: 0x6a, operands: [0, 0, 0] }, { op: 'end' }]
    const { gs, state, bus } = createBattleLifecycleFixture({ commands })
    const enemy = state.enemies[0]!
    enemy.e.stealItem = itemId
    enemy.e.stealItemCount = 1
    runScript({
      commands,
      ip: 0,
      bus,
      runtimeMode: 'battle',
      battleCtx: {
        gs,
        state,
        caster: { type: 'enemy', idx: 0 },
        target: { type: 'enemy', idx: 0 },
        items: [makeItem(itemId, chineseName)],
      },
    })
    tickBattleDialog(state, gs, input())
    expect(gs.dialogBox?.currentLineText).toBe(`Got ${name}`)
    expect(gs.dialogBox?.currentLineColors?.slice(4)).toEqual(Array<number>(name.length).fill(0x17))
    expect(gs.inventory).toEqual([{ itemId, count: 1 }])
    expect(enemy.e.stealItemCount).toBe(0)
  })

  it('wraps words without exposing escapes, control suffixes or losing persistent color/speed', () => {
    const lines = wrapEnglishDialogLine('@Alpha beta\\- gamma@ $01omega~02hidden suffix', 64)
    expect(lines).toEqual(['@Alpha', 'beta\\-', 'gamma@', '$01omega~02hidden suffix'])
    let color = 0x4f
    let delay = 3
    const visible: string[] = []
    for (const line of lines) {
      const parsed = parseDialogText(line, color, false, delay)
      expect([...parsed.text].length * 8).toBeLessThanOrEqual(64)
      visible.push(parsed.text)
      color = parsed.endColor
      delay = parsed.endIDelay
    }
    expect(visible).toEqual(['Alpha', 'beta-', 'gamma', 'omega'])
    expect(color).toBe(0x4f)
    expect(delay).toBe(1)
    expect(wrapEnglishDialogLine('Supercalifragilistic', 40)).toEqual([
      'Super',
      'calif',
      'ragil',
      'istic',
    ])
  })
})
