import { describe, it, expect } from 'vitest'
import { createInitialGameState, type Facing, type GameState } from './game-state.js'

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

  it('GameState 可 JSON 序列化', () => {
    const gs = createInitialGameState({ col: 10, row: 20, facing: 'right' })
    const json = JSON.stringify(gs)
    const parsed = JSON.parse(json) as GameState
    expect(parsed.party.col).toBe(10)
  })
})
