import type { SceneDef } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { Playback } from './playback.js'

const scene: SceneDef = {
  id: 's001',
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
}

describe('Playback', () => {
  test('scene-entry previews run their presentation and reach real dialogue', async () => {
    const playback = new Playback(scene)
    playback.play('s:s001:canonical:default', [
      {
        entry: { prepare: [], reveal: { kind: 'cut' } },
        body: [{ kind: 'dialog', cue: { rows: [{ text: 'dlg.preview' }] } }],
      },
    ])

    await vi.waitFor(() => expect(playback.view.dialog?.cue.rows[0]?.text).toBe('dlg.preview'))
    expect(playback.mode).toBe('running')
    playback.stop()
  })

  test('reports non-abort failures and leaves running mode', async () => {
    const playback = new Playback(scene)
    playback.play('canonical:test', [
      {
        body: [{ kind: 'not-a-command' } as never],
      },
    ])

    await vi.waitFor(() => expect(playback.mode).toBe('done'))
    expect(playback.view.logs.at(-1)).toMatch(/预览中断/)
  })
})
