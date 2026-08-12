import { describe, expect, test } from 'vitest'
import { createGameOverDialogueCue } from './game-over-dialog.js'

describe('createGameOverDialogueCue', () => {
  test('死亡红屏一次画两行无框文字，不复用 narration 卷轴', () => {
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
