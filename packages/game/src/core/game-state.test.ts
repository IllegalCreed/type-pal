import { describe, it, expect } from 'vitest'
import { createInitialGameState, npcFromEventObject, type Facing, type GameState } from './game-state.js'
import type { SceneEventObject } from '@type-pal/shared'

describe('GameState', () => {
  it('初始态:无 NPC、explore 模式、无对话框', () => {
    const gs = createInitialGameState({ col: 0, row: 0, facing: 'down' })
    expect(gs.party.col).toBe(0)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.currentDialogStyle).toBe('center')
    expect(gs.frameNum).toBe(0)
  })

  it('Facing 四向', () => {
    const facings: Facing[] = ['up', 'down', 'left', 'right']
    expect(facings).toHaveLength(4)
  })

  it('GameState 可 JSON 序列化(含 eventCursor.commands)', () => {
    const gs = createInitialGameState({ col: 10, row: 20, facing: 'right' })
    gs.eventCursor = {
      commands: [
        { op: 'showDialog', messageIndex: 5, text: 'hi' },
        { op: 'end' },
      ],
      labelMap: { L_0: 0 },
      ip: 0,
      waiting: 'dialog',
    }
    gs.dialogBox = { text: 'hi', style: 'center' }
    gs.currentDialogStyle = 'top'

    const parsed = JSON.parse(JSON.stringify(gs)) as GameState
    expect(parsed.party.col).toBe(10)
    expect(parsed.eventCursor?.ip).toBe(0)
    expect(parsed.eventCursor?.waiting).toBe('dialog')
    expect(parsed.eventCursor?.commands).toHaveLength(2)
    expect(parsed.eventCursor?.commands[0]?.op).toBe('showDialog')
    expect(parsed.dialogBox?.text).toBe('hi')
    expect(parsed.currentDialogStyle).toBe('top')
  })
})

describe('npcFromEventObject', () => {
  it('SceneEventObject 像素坐标 → cell 坐标(x/32, y/16),其它字段透传', () => {
    const eo: SceneEventObject = {
      id: 3, x: 512, y: 800, spriteNum: 42, triggerLabel: 'L_59',
    }
    const npc = npcFromEventObject(eo)
    expect(npc.id).toBe(3)
    expect(npc.col).toBe(16) // 512 / 32
    expect(npc.row).toBe(50) // 800 / 16
    expect(npc.spriteNum).toBe(42)
    expect(npc.triggerLabel).toBe('L_59')
  })

  it('triggerLabel 缺时透传 undefined', () => {
    const eo: SceneEventObject = { id: 0, x: 0, y: 0, spriteNum: 0 }
    expect(npcFromEventObject(eo).triggerLabel).toBeUndefined()
  })
})
