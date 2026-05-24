import { describe, it, expect } from 'vitest'
import { createInitialGameState, npcFromEventObject, type Facing, type GameState, type Mode } from './game-state.js'
import type { SceneEventObject } from '@type-pal/shared'

describe('GameState', () => {
  it('初始态:无 NPC、explore 模式、无对话框', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.party.x).toBe(0)
    expect(gs.mode).toBe('explore')
    expect(gs.dialogBox).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.currentDialogStyle).toBe('center')
    expect(gs.frameNum).toBe(0)
  })

  it('初始态:partyMembers / inventory 默认空数组,battleState 缺省', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(gs.partyMembers).toEqual([])
    expect(gs.inventory).toEqual([])
    expect(gs.battleState).toBeUndefined()
  })

  it('Mode 三态(M3 加 battle)', () => {
    const modes: Mode[] = ['explore', 'event', 'battle']
    expect(modes).toHaveLength(3)
    // 类型层面允许赋值 'battle'(若被收窄会编译失败,代守护)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.mode = 'battle'
    expect(gs.mode).toBe('battle')
  })

  it('Facing 四向', () => {
    const facings: Facing[] = ['up', 'down', 'left', 'right']
    expect(facings).toHaveLength(4)
  })

  it('GameState 可 JSON 序列化(含 eventCursor.commands)', () => {
    const gs = createInitialGameState({ x: 10 * 16, y: 20 * 8, facing: 'right' })
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
    expect(parsed.party.x).toBe(10 * 16)
    expect(parsed.eventCursor?.ip).toBe(0)
    expect(parsed.eventCursor?.waiting).toBe('dialog')
    expect(parsed.eventCursor?.commands).toHaveLength(2)
    expect(parsed.eventCursor?.commands[0]?.op).toBe('showDialog')
    expect(parsed.dialogBox?.text).toBe('hi')
    expect(parsed.currentDialogStyle).toBe('top')
  })
})

describe('npcFromEventObject', () => {
  it('System A:eo.x/y 直接透传(1:1 sdlpal pixel),其它字段透传', () => {
    const eo: SceneEventObject = {
      id: 3, x: 512, y: 800, spriteNum: 42, triggerLabel: 'L_59', triggerMode: 0,
    }
    const npc = npcFromEventObject(eo)
    expect(npc.id).toBe(3)
    expect(npc.x).toBe(512)
    expect(npc.y).toBe(800)
    expect(npc.spriteNum).toBe(42)
    expect(npc.triggerLabel).toBe('L_59')
  })

  it('半 tile 位置原样保留(eo.x=720 / eo.y=664)', () => {
    // System A 1:1 透传,sdlpal scene.c:301-322 +7 锚点偏移在 present 渲染层加,
    // 不写进 logical x/y(contact 距离判断 scene.c:624 用原 eo.x/y)。
    const eo: SceneEventObject = {
      id: 7, x: 720, y: 664, spriteNum: 0, triggerMode: 0,
    }
    const npc = npcFromEventObject(eo)
    expect(npc.x).toBe(720)
    expect(npc.y).toBe(664)
  })

  it('triggerLabel 缺时透传 undefined', () => {
    const eo: SceneEventObject = { id: 0, x: 0, y: 0, spriteNum: 0, triggerMode: 0 }
    expect(npcFromEventObject(eo).triggerLabel).toBeUndefined()
  })
})
