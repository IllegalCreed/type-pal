import { describe, expect, test } from 'vitest'
import { createGameOverDialogueCue } from './game-over-dialog.js'

describe('createGameOverDialogueCue', () => {
  test('死亡提示交给居中对白，两行文案与占位行都立即展示', () => {
    const cue = createGameOverDialogueCue()

    expect(cue.slot).toBe('center')
    expect(cue.rows).toEqual([
      { text: '', speed: 0 },
      { text: 'gameover.1', speed: 0 },
      { text: 'gameover.2', speed: 0 },
      { text: '', speed: 0 },
    ])
  })
})
